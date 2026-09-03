# PR & Story Writer — standalone site

This is a self-hosted version of the PR & Story Writer tool. Unlike the Claude
Artifact version, it works from any domain and doesn't depend on claude.ai —
AI generation is handled by `api/generate.js`, a serverless function that
keeps your Anthropic API key on the server, never in the browser.

## Deploying (Vercel + your own domain)

1. **Get an Anthropic API key.** Go to https://console.anthropic.com,
   create an API key, and set up billing (usage is billed per generation).
2. **Push this folder to a new GitHub repo.**
   ```bash
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
   (Create the empty repo on github.com first — don't initialize it with a
   README, since this folder already has one.)
3. **Import the repo into Vercel.** Go to https://vercel.com, sign up
   (you can use "Continue with GitHub"), click "Add New… → Project", and
   import the repo you just pushed. Vercel auto-detects the `api/` folder
   as serverless functions and everything else as static files — no build
   configuration needed.
4. **Add your API key as an environment variable.** In the Vercel project
   → Settings → Environment Variables, add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: the key from step 1
   Then redeploy (Vercel prompts you to after adding a new env var).
5. **Connect your domain.** In the Vercel project → Settings → Domains,
   add your domain. Vercel shows you the exact DNS record (an A record for
   an apex domain like `example.com`, or a CNAME for a subdomain like
   `www.example.com`) to add at your domain registrar. DNS changes can take
   a few minutes to a few hours to propagate.

Once connected, `https://your-domain.com` serves the live tool.

## Making future edits

Any future change to `index.html`, `examples.js`, or `api/generate.js`
just needs `git push` — Vercel automatically redeploys on every push to the
repo's default branch. No manual re-upload needed.

## Cost and abuse note

Every click of "Generate" costs Anthropic API usage, billed to whichever
key is set as `ANTHROPIC_API_KEY`. Because this is a public site, anyone who
finds the URL can trigger generations. `api/generate.js` caps request size,
but doesn't rate-limit by visitor — for a public launch, consider adding
rate limiting (Vercel's own Firewall/Edge Config, or a simple IP-based
limiter) so a bot or bad actor can't run up a large bill.
