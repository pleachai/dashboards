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

// Returns the render-ready model for a dashboard config. Project-scoped, and
// carries both points (for burndown dashboards) and item counts (for readiness
// dashboards). mode = 'points' | 'readiness'.
async function buildModel(cfg) {
  const readiness = cfg.mode === 'readiness';
  const projFilter = cfg.project ? `, project:{id:{eq:"${cfg.project}"}}` : '';
  const q = `query{ issues(first:250, filter:{ team:{key:{eq:"${cfg.team}"}}${projFilter}, state:{type:{nin:["canceled","duplicate"]}} }){ nodes{ number title estimate state{type} projectMilestone{name} labels{nodes{name}} } } }`;
  const data = await post(q);
  const nodes = data.issues.nodes;
  const parked = new Set(cfg.parkedNumbers || []);

  const order = Object.keys(cfg.milestones);
  const groups = order.map((name) => ({ name, ...cfg.milestones[name], tickets: [], items: [], pts: 0, donePts: 0, doneCount: 0, totalCount: 0 }));
  const byName = Object.fromEntries(groups.map((g) => [g.name, g]));
  const parkedTickets = [];
  const unphased = [];

  for (const i of nodes) {
    const done = i.state.type === 'completed';
    const t = { n: i.number, title: i.title, est: i.estimate || 0, mod: moduleOf(i.labels.nodes.map((x) => x.name)), done };
    if (parked.has(i.number)) { if (!done) parkedTickets.push(t); continue; }
    const g = i.projectMilestone && byName[i.projectMilestone.name];
    if (!g) { if (readiness) unphased.push(t); continue; } // in-project but not bucketed into a phase
    g.totalCount++; if (done) g.doneCount++;
    if (done) g.donePts += t.est; else { g.tickets.push(t); g.pts += t.est; }
    if (readiness) g.items.push(t);
  }
  unphased.sort((a, b) => (a.done === b.done ? a.n - b.n : a.done ? 1 : -1));
  for (const g of groups) {
    g.tickets.sort((a, b) => a.n - b.n);
    g.items.sort((a, b) => (a.done === b.done ? a.n - b.n : a.done ? 1 : -1)); // open first, then done
    g.totalPts = g.pts + g.donePts;
    g.readyPct = g.totalCount ? Math.round((g.doneCount / g.totalCount) * 100) : 0;
  }
  parkedTickets.sort((a, b) => a.n - b.n);

  const total = groups.reduce((s, g) => s + g.pts, 0);
  const donePts = groups.reduce((s, g) => s + g.donePts, 0);
  const scope = total + donePts;
  const doneCount = groups.reduce((s, g) => s + g.doneCount, 0);
  const totalCount = groups.reduce((s, g) => s + g.totalCount, 0);
  return {
    slug: cfg.slug, title: cfg.title, mode: cfg.mode || 'points',
    startDate: cfg.startDate, target: cfg.target, velocity: cfg.velocity,
    milestones: groups,
    parked: parkedTickets,
    unphased: readiness ? unphased : [],
    total, donePts, scope,
    pct: scope ? Math.round((donePts / scope) * 100) : 0,          // points-based
    doneCount, totalCount,
    readyPct: totalCount ? Math.round((doneCount / totalCount) * 100) : 0, // count-based
  };
}

// Map known Linear project ids -> dashboard slug (for hub deep-links).
const PROJECT_SLUG = {
  '6e605e28-afb2-42dd-8121-09fd23b30d35': 'mac-v1',
  '801df140-db2d-4f49-a6a7-2f8e8b4a84f5': 'gtm',
  '6abec744-6563-4940-8ddc-f5e6c83a39c8': 'pleach-cloud',
};

// Portfolio rollup: one row per Linear project with done/total + %.
// Counts are fetched one project at a time — a single query over all projects'
// issues exceeds Linear's complexity limit.
async function buildPortfolio(team = 'PLE') {
  const list = await post(`query{ projects(first:50){ nodes{ id name state } } }`);
  const projects = [];
  for (const p of list.projects.nodes || []) {
    let total = 0, done = 0, openPts = 0, donePts = 0;
    try {
      const d = await post(`query{ issues(first:250, filter:{ project:{id:{eq:"${p.id}"}}, state:{type:{nin:["canceled","duplicate"]}} }){ nodes{ state{type} estimate } } }`);
      for (const i of d.issues.nodes) {
        total++; const est = i.estimate || 0;
        if (i.state.type === 'completed') { done++; donePts += est; } else { openPts += est; }
      }
    } catch (_) { /* leave counts at 0 for this project */ }
    projects.push({ name: p.name, state: p.state, total, done, openPts, donePts, pct: total ? Math.round((done / total) * 100) : 0, slug: PROJECT_SLUG[p.id] || null });
  }
  // dashboards first, then by activity (started > planned > backlog), then name
  const rank = { started: 0, planned: 1, backlog: 2, paused: 3, completed: 4, canceled: 5 };
  projects.sort((a, b) => (!!b.slug - !!a.slug) || ((rank[a.state] ?? 9) - (rank[b.state] ?? 9)) || a.name.localeCompare(b.name));
  return { projects };
}

module.exports = { post, buildModel, buildPortfolio, PROJECT_SLUG };
