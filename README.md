# Pleach Dashboards

Live business + delivery dashboards, sourced from **Linear**, deployed on **Netlify**.
Data is fetched **live on page load** via a Netlify Function that holds the Linear key
server-side — the key never reaches the browser. A build-time JSON snapshot is the
offline / local fallback.

```
lib/linear.js        # Linear GraphQL client + buildModel()
lib/registry.js      # slug -> dashboard config (add a line per dashboard)
dashboards/<slug>/   # per-dashboard config
public/              # static site (publish dir); public/<slug>/ is one dashboard
public/<slug>/app.js # client renderer (board + burndown charts)
netlify/functions/data.js  # GET /.netlify/functions/data?d=<slug>  -> live model JSON
scripts/snapshot.js  # writes public/<slug>/data.json fallback
```

## Local preview

```bash
# one-time: generate the data snapshot (needs the Linear key)
LINEAR_API_KEY=lin_xxx npm run snapshot
# then open public/mac-v1/index.html, or run the full stack with the live function:
npm i -g netlify-cli && LINEAR_API_KEY=lin_xxx netlify dev
```

`open public/mac-v1/index.html` works offline against the snapshot; `netlify dev`
serves the live function at `/.netlify/functions/data`.

## Deploy to Netlify (live, auto-updating)

1. `git init && git add . && git commit -m "init dashboards"` and push to a **private** GitHub repo.
2. In Netlify: **Add new site → Import from Git** → pick the repo. Build settings come from
   `netlify.toml` (publish `public/`, functions `netlify/functions`).
3. **Site settings → Environment variables**: add `LINEAR_API_KEY`.
4. Deploy. Site serves the hub at `/` and the dashboard at `/mac-v1/`, fetching live data on load.

### Auto-updating
- **Live on load** is already on: every page load calls the function, which queries Linear
  fresh (60s CDN cache + stale-while-revalidate for speed). No rebuild needed for data changes.
- The deploy-time `snapshot` only refreshes the offline fallback; redeploy (or push) to refresh it.

### Privacy (recommended)
This exposes the roadmap publicly. Lock it down with **Netlify → Site settings → Access &
security → Visitor access → Password protection** (or Netlify Identity for per-user login).

## Add another dashboard
1. `dashboards/<slug>/config.js` (team, milestones, target, velocity).
2. Register it in `lib/registry.js`.
3. `public/<slug>/index.html` + `app.js` (copy mac-v1, tweak the slug), and link it from `public/index.html`.
