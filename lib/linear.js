// Shared Linear client + model builder. Used by the Netlify function (live) and
// scripts/snapshot.js (local/offline fallback). Reads LINEAR_API_KEY from env.
const https = require('https');

function post(query, variables) {
  const key = process.env.LINEAR_API_KEY;
  if (!key) return Promise.reject(new Error('LINEAR_API_KEY not set'));
  const auth = key.startsWith('lin_oauth') ? `Bearer ${key}` : key;
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const req = https.request('https://api.linear.app/graphql', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (r) => {
      let d = ''; r.on('data', (c) => (d += c));
      r.on('end', () => { try { const j = JSON.parse(d); if (j.errors) return reject(new Error(JSON.stringify(j.errors))); resolve(j.data); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

const moduleOf = (labels) => {
  const m = labels.find((n) => n.startsWith('module:'));
  return m ? m.replace('module:', '') : (labels.find((n) => ['Bug', 'Feature', 'Improvement'].includes(n)) || '').toLowerCase();
};

// Returns the render-ready model for a dashboard config. Includes both open
// (remaining) and completed work per milestone so the UI can show progress.
async function buildModel(cfg) {
  const q = `query{ issues(first:250, filter:{ team:{key:{eq:"${cfg.team}"}}, state:{type:{nin:["canceled","duplicate"]}} }){ nodes{ number title estimate state{type} projectMilestone{name} labels{nodes{name}} } } }`;
  const data = await post(q);
  const nodes = data.issues.nodes;
  const parked = new Set(cfg.parkedNumbers || []);

  const order = Object.keys(cfg.milestones);
  const groups = order.map((name) => ({ name, ...cfg.milestones[name], tickets: [], pts: 0, donePts: 0 }));
  const byName = Object.fromEntries(groups.map((g) => [g.name, g]));
  const parkedTickets = [];

  for (const i of nodes) {
    const done = i.state.type === 'completed';
    const t = { n: i.number, title: i.title, est: i.estimate || 0, mod: moduleOf(i.labels.nodes.map((x) => x.name)), done };
    if (parked.has(i.number)) { if (!done) parkedTickets.push(t); continue; }
    const g = i.projectMilestone && byName[i.projectMilestone.name];
    if (!g) continue;
    if (done) g.donePts += t.est;
    else { g.tickets.push(t); g.pts += t.est; }
  }
  for (const g of groups) { g.tickets.sort((a, b) => a.n - b.n); g.totalPts = g.pts + g.donePts; }
  parkedTickets.sort((a, b) => a.n - b.n);

  const total = groups.reduce((s, g) => s + g.pts, 0);
  const donePts = groups.reduce((s, g) => s + g.donePts, 0);
  const scope = total + donePts;
  return {
    slug: cfg.slug, title: cfg.title,
    startDate: cfg.startDate, target: cfg.target, velocity: cfg.velocity,
    milestones: groups,
    parked: parkedTickets,
    total,        // open / remaining pts (drives burndown)
    donePts, scope,
    pct: scope ? Math.round((donePts / scope) * 100) : 0,
  };
}

module.exports = { post, buildModel };
