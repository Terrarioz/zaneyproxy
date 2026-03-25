# ZaneyProxy v2

A real working web proxy — GitHub Pages frontend + Cloudflare Worker backend.

---

## How it works

```
You (browser)
    │
    ▼
GitHub Pages  ──── sends request ────►  Cloudflare Worker
(index.html)                                │
                                            │  fetches page server-side
                                            ▼
                                       Target website
                                            │
                                    ◄───────┘
                         relays HTML/CSS/JS back to you
```

The Worker fetches pages **server-side** so there are no CORS or iframe-blocking issues.

---

## Deploy the Worker (5 minutes, free)

### Option A — Cloudflare Dashboard (easiest, no CLI)

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and create a free account.
2. Click **Workers & Pages** → **Create** → **Create Worker**.
3. Click **Edit code**, delete all the default code, and paste the entire contents of `worker/index.js`.
4. Click **Deploy**.
5. Copy your worker URL — it looks like:
   `https://zaneyproxy.YOUR-NAME.workers.dev`

### Option B — Wrangler CLI

```bash
# Install wrangler
npm install -g wrangler

# Login
npx wrangler login

# Deploy (run from the worker/ folder)
cd worker
npx wrangler deploy
```

Your worker URL will be printed in the terminal.

---

## Deploy the Frontend to GitHub Pages

1. Create a new GitHub repo.
2. Upload **only `index.html`** from this folder (not the `worker/` folder).
3. Go to **Settings → Pages → Source: main branch / root**.
4. Save — your site will be live at:
   `https://yourusername.github.io/reponame/`

---

## Connect them

1. Open your GitHub Pages site.
2. Paste your Worker URL into the setup box at the top.
3. Click **Save** — it's stored in your browser for future visits.
4. Start browsing!

---

## Notes

- Some sites (e.g. YouTube, complex SPAs with heavy client-side routing) may not render
  perfectly inside an iframe regardless of proxy — use **Direct Tab** mode for those.
- Cloudflare Workers free tier: 100,000 requests/day — plenty for personal use.
- The worker URL is only saved in **your** browser's localStorage — nobody else sees it.

---

## File structure

```
index.html          ← GitHub Pages frontend
README.md           ← This file
worker/
  index.js          ← Cloudflare Worker code
  wrangler.toml     ← Wrangler config (for CLI deploy)
```
