// Writes public/<slug>/data.json for every registered dashboard — the offline /
// local-preview fallback, and refreshed at Netlify build time too.
const fs = require('fs');
const path = require('path');
const registry = require('../lib/registry');
const { buildModel, buildPortfolio } = require('../lib/linear');

// Best-effort: the snapshot is only the offline/local fallback. The live
// Netlify function is the real data source, so never fail the build here —
// e.g. when LINEAR_API_KEY isn't set at build time.
(async () => {
  if (!process.env.LINEAR_API_KEY) {
    console.warn('[snapshot] LINEAR_API_KEY not set — skipping fallback snapshot (live function still serves data at runtime).');
    return;
  }
  try {
    const p = await buildPortfolio(); p.generatedAt = new Date().toISOString();
    fs.writeFileSync(path.join(__dirname, '..', 'public', 'portfolio.json'), JSON.stringify(p, null, 2));
    console.log(`snapshot portfolio: ${p.projects.length} projects`);
  } catch (e) { console.warn('[snapshot] portfolio skipped:', e.message); }
  for (const slug of Object.keys(registry)) {
    try {
      const m = await buildModel(registry[slug]);
      m.generatedAt = new Date().toISOString();
      const dir = path.join(__dirname, '..', 'public', slug);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(m, null, 2));
      console.log(`snapshot ${slug}: ${m.total} pts, ${m.milestones.map((g) => g.key + ' ' + g.pts).join(' / ')}`);
    } catch (e) {
      console.warn(`[snapshot] ${slug} skipped: ${e.message}`);
    }
  }
})().catch((e) => { console.warn('[snapshot] non-fatal:', e.message); });
