// Writes public/<slug>/data.json for every registered dashboard — the offline /
// local-preview fallback, and refreshed at Netlify build time too.
const fs = require('fs');
const path = require('path');
const registry = require('../lib/registry');
const { buildModel } = require('../lib/linear');

(async () => {
  for (const slug of Object.keys(registry)) {
    const m = await buildModel(registry[slug]);
    m.generatedAt = new Date().toISOString();
    const dir = path.join(__dirname, '..', 'public', slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(m, null, 2));
    console.log(`snapshot ${slug}: ${m.total} pts, ${m.milestones.map((g) => g.key + ' ' + g.pts).join(' / ')}`);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
