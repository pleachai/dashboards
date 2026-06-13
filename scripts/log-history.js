// Appends today's remaining-points to public/<slug>/history.json so the burndown
// can draw a real actual-vs-ideal trail. Idempotent: re-running same day updates
// today's entry. Run daily via .github/workflows/snapshot.yml (cron).
const fs = require('fs');
const path = require('path');
const registry = require('../lib/registry');
const { buildModel, buildLaunch } = require('../lib/linear');

(async () => {
  if (!process.env.LINEAR_API_KEY) { console.warn('[history] LINEAR_API_KEY not set — skipping.'); return; }
  const date = new Date().toISOString().slice(0, 10);
  for (const slug of Object.keys(registry)) {
    let m;
    try { const cfg = registry[slug]; m = cfg.aggregate ? await buildLaunch(cfg) : await buildModel(cfg); } catch (e) { console.warn(`[history] ${slug} skipped: ${e.message}`); continue; }
    const file = path.join(__dirname, '..', 'public', slug, 'history.json');
    let h = { points: [] };
    try { h = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {}
    if (!Array.isArray(h.points)) h.points = [];
    const entry = { date, remaining: m.total, done: m.donePts, scope: m.scope };
    const i = h.points.findIndex((p) => p.date === date);
    if (i >= 0) h.points[i] = entry; else h.points.push(entry);
    h.points.sort((a, b) => (a.date < b.date ? -1 : 1));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(h, null, 2));
    console.log(`history ${slug}: ${date} -> remaining ${m.total} (${h.points.length} pts logged)`);
  }
})().catch((e) => { console.warn('[history] non-fatal:', e.message); });
