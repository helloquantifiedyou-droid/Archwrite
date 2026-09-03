// Serverless proxy to the Anthropic API. Keeps ANTHROPIC_API_KEY server-side —
// the browser never sees it. The frontend posts {system, messages, max_tokens}
// (the same shape it used to send directly to Anthropic) and this forwards it
// with the real key attached, then relays the response back.

const MODEL = 'claude-sonnet-5';
// Vercel's Node serverless functions cap request bodies around 4.5MB before this
// code even runs — this stays comfortably under that, on top of the frontend's
// own pre-flight size check (which resizes photos and rejects an oversized batch
// before sending), so this is a second line of defense, not the primary guard.
const MAX_BODY_BYTES = 4_200_000;

module.exports = async (req, res) => {
  // TEMPORARY: visit this endpoint directly in a browser (GET, no POST needed)
  // to see which env vars this function can actually see, without exposing any
  // values. Remove this block once ANTHROPIC_API_KEY shows up correctly.
  if (req.method === 'GET' && req.query && req.query.debug === '1') {
    const relevantKeys = Object.keys(process.env).filter(k => !k.startsWith('VERCEL') && !k.startsWith('npm_') && !k.startsWith('NODE') && !k.startsWith('PATH') && !k.startsWith('HOME') && !k.startsWith('LANG'));
    res.status(200).json({
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      anthropicKeyLength: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.length : 0,
      otherVisibleEnvVarNames: relevantKeys
    });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const bodySize = JSON.stringify(body).length;
  if (bodySize > MAX_BODY_BYTES) {
    res.status(413).json({ error: 'Request too large.' });
    return;
  }

  const { system, messages, max_tokens } = body;
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Missing "messages".' });
    return;
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: max_tokens || 4096,
        system,
        messages
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data.error?.message || 'Upstream error' });
      return;
    }
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Request failed.' });
  }
};
