/* Mac v1 dashboard — renders board + burndowns from the live model.
   Data source: /.netlify/functions/data?d=mac-v1 (live), falling back to ./data.json (local/offline). */
const SLUG = 'mac-v1';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const A = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(' ');
const E = (tag, attrs, inner) => `<${tag} ${A(attrs)}${inner == null ? '/>' : `>${inner}</${tag}>`}`;
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const clean = (t) => t.replace(/^(Bug|Feature|Improvement|UX|Release|Reliability|Cleanup|Auth|Compliance|Marketing|Onboarding|Rethink|Roles|Slack|Future):?\s*/i, '');
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function load() {
  let model;
  try {
    const r = await fetch(`/.netlify/functions/data?d=${SLUG}`, { cache: 'no-store' });
    if (!r.ok) throw new Error('fn ' + r.status);
    model = await r.json();
    document.getElementById('src').textContent = 'live · Linear';
  } catch (e) {
    const r = await fetch('./data.json', { cache: 'no-store' });
    model = await r.json();
    document.getElementById('src').textContent = 'snapshot';
  }
  window.__model = model;
  render(model);
}

function render(m) {
  const upd = m.generatedAt ? new Date(m.generatedAt) : null;
  document.getElementById('updated').textContent = upd ? `updated ${upd.toLocaleString()}` : '';
  document.getElementById('tab-board').innerHTML = board(m);
  document.getElementById('tab-capacity').innerHTML = capacity(m);
  document.getElementById('tab-launch').innerHTML = launch(m);
}

/* ---------- Board ---------- */
function ticket(t) {
  return `<li class="it"><span class="pt">${t.est || '·'}</span><span class="id">PLE-${t.n}</span><span class="ti">${esc(trunc(clean(t.title), 54))}</span>${t.mod ? `<span class="tag">${esc(t.mod)}</span>` : ''}</li>`;
}
function board(m) {
  const cls = { Alpha: 'alpha', Beta: 'beta', Launch: 'launch' };
  const cols = m.milestones.map((g) =>
    `<section class="col ${cls[g.key] || ''}"><header><h2>${g.key}</h2><span class="cnt">${g.tickets.length} · ${g.pts}pt</span></header><p class="sub">${esc(g.sub || '')}</p><ul>${g.tickets.map(ticket).join('')}</ul></section>`
  ).join('');
  const parked = `<div class="parked"><h3>🅿️ Parked</h3><div class="pl">${m.parked.map(ticket).join('')}</div></div>`;
  const dL = Math.ceil(m.total / m.velocity);
  return `<div class="bmeta">${m.total} pts · ${m.milestones.map((g) => `${g.key} <b>${g.pts}</b>`).join(' · ')} · ~<b>${dL}</b> verify-days @ ${m.velocity}/day</div><div class="boardgrid beta-host">${cols}</div>${parked}`;
}

/* ---------- date helpers ---------- */
function buildDays(startISO, calDays) {
  const out = []; let t = new Date(startISO + 'T00:00:00Z'); let wd = 0;
  for (let k = 0; k <= calDays; k++) {
    const dow = t.getUTCDay(); const we = dow === 0 || dow === 6; if (!we) wd++;
    out.push({ iso: t.toISOString().slice(0, 10), m: t.getUTCMonth(), day: t.getUTCDate(), dow, we, wd });
    t = new Date(t.getTime() + 86400000);
  }
  return out;
}
const workdaysBetween = (a, b) => buildDays(a, Math.round((new Date(b) - new Date(a)) / 86400000)).filter((d) => !d.we && d.iso < b).length;

/* ---------- shared burndown SVG ---------- */
function burndown({ total, days, series, deadlineIdx, phases, axisLabel }) {
  const W = 1080, H = 430, ml = 52, mr = 18, mt = 26, mb = 44, pw = W - ml - mr, ph = H - mt - mb;
  const N = days.length - 1, maxPts = Math.ceil(total / 25) * 25;
  const X = (i) => +(ml + (i / N) * pw).toFixed(1), Y = (p) => +(mt + (1 - p / maxPts) * ph).toFixed(1);
  const rem = (i, v) => Math.max(0, total - v * days[i].wd);
  let g = E('rect', { x: ml, y: mt, width: pw, height: ph, fill: '#0e1318' });
  for (let i = 0; i < days.length - 1; i++) if (days[i].we) g += E('rect', { x: X(i), y: mt, width: (X(i + 1) - X(i)).toFixed(1), height: ph, fill: '#151b22' });
  for (let p = 0; p <= maxPts; p += 25) g += E('line', { x1: ml, y1: Y(p), x2: W - mr, y2: Y(p), stroke: '#2a3340', 'stroke-width': 1 }) + E('text', { x: ml - 7, y: Y(p) + 4, fill: '#8893a4', 'font-size': 11, 'text-anchor': 'end' }, p);
  for (let i = 0; i < days.length; i++) { const d = days[i]; if (d.dow === 1 || i === 0) g += E('line', { x1: X(i), y1: mt, x2: X(i), y2: mt + ph, stroke: '#222a33', 'stroke-width': 1 }) + E('text', { x: X(i), y: mt + ph + 17, fill: '#8893a4', 'font-size': 10.5, 'text-anchor': 'middle' }, `${MN[d.m]} ${d.day}`); }
  if (deadlineIdx != null) g += E('line', { x1: X(deadlineIdx), y1: mt - 4, x2: X(deadlineIdx), y2: mt + ph, stroke: '#ff5c7a', 'stroke-width': 2 }) + E('text', { x: X(deadlineIdx) - 6, y: mt + 6, fill: '#ff5c7a', 'font-size': 12, 'font-weight': 700, 'text-anchor': 'end' }, 'DEADLINE');
  for (const s of series) {
    let pts = `${X(0)},${Y(total)}`;
    for (let i = 0; i < days.length; i++) pts += ` ${X(i)},${Y(rem(i, s.v))}`;
    g += E('polyline', { points: pts, fill: 'none', stroke: s.color, 'stroke-width': s.w || 2.6, 'stroke-linejoin': 'round', ...(s.dash ? { 'stroke-dasharray': '3 3' } : {}) });
    if (s.landDot) { const li = days.findIndex((d) => rem(days.indexOf(d), s.v) <= 0 && true); const idx = (() => { for (let i = 0; i < days.length; i++) if (rem(i, s.v) <= 0) return i; return N; })(); g += E('circle', { cx: X(idx), cy: Y(0), r: 4, fill: s.color }) + E('text', { x: X(idx) + 5, y: Y(0) - 6, fill: s.color, 'font-size': 10.5 }, `${MN[days[idx].m]} ${days[idx].day}`); }
  }
  for (const ph_ of phases || []) { const idx = (() => { for (let i = 0; i < days.length; i++) if (rem(i, ph_.v) <= ph_.thr + 1e-9) return i; return N; })(); g += E('circle', { cx: X(idx), cy: Y(rem(idx, ph_.v)), r: 4.5, fill: ph_.color }) + E('text', { x: X(idx) + 6, y: Y(rem(idx, ph_.v)) - 6, fill: ph_.color, 'font-size': 10.5, 'font-weight': 700 }, `${ph_.label} ${MN[days[idx].m]}${days[idx].day}`); }
  g += E('text', { x: ml, y: mt - 8, fill: '#6f7a8b', 'font-size': 11 }, axisLabel || 'points remaining');
  return E('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${W} ${H}`, width: '100%', height: 'auto', style: 'display:block' }, g);
}

/* ---------- Capacity tab (no deadline) ---------- */
function capacity(m) {
  const v = m.velocity, total = m.total;
  const dL = Math.ceil(total / v);
  const days = buildDays(m.startDate, dL * 1.5 + 14);
  let cum = 0; const phases = m.milestones.map((g, i) => { cum += g.pts; return { label: g.key + ' ✓', v, thr: total - cum, color: g.color }; });
  const svg = burndown({ total, days, series: [{ color: '#7c8cff', v, w: 3 }], phases, axisLabel: `points remaining — ${v} pts/working-day (1 verifier)` });
  const rows = m.milestones.map((g) => `<tr><td class="ph" style="color:${g.color}">${g.key}</td><td class="n">${g.pts}</td><td class="n">${(g.pts / v).toFixed(1)}</td></tr>`).join('');
  return `<div class="row">
    <div class="card"><h3>📉 Capacity burndown <small>— phases sequential @ ${v} pts/day</small></h3>${svg}</div>
    <div class="card narrow"><table><tr><th>Phase</th><th class="n">Pts</th><th class="n">Days</th></tr>${rows}<tr><td class="ph">Total</td><td class="n">${total}</td><td class="n">${(total / v).toFixed(1)}</td></tr></table>
    <div class="kpi"><div><b>${dL}</b><small>verify-days</small></div><div><b>~${(dL / 5).toFixed(1)}</b><small>weeks (1p)</small></div><div><b>~${(dL / 10).toFixed(1)}</b><small>weeks (2p)</small></div></div>
    <p class="note">AI implements in parallel across sessions; the serial bottleneck is one human verifying at ${v} pts/day. Add a reviewer ≈ halve the calendar.</p></div></div>`;
}

/* ---------- Launch tab (deadline) ---------- */
function launch(m) {
  const v = m.velocity, total = m.total;
  const totalWD = workdaysBetween(m.startDate, m.target);
  const vreq = total / totalWD;
  const days = buildDays(m.startDate, 41);
  const dlIdx = days.findIndex((d) => d.iso === m.target);
  const firstHit = (vv) => { for (let i = 0; i < days.length; i++) { let cum = 0; if (Math.max(0, total - vv * days[i].wd) <= 0) return i; } return days.length - 1; };
  const remAt = (idx, vv) => Math.max(0, total - vv * days[idx].wd);
  let cum = 0; const phases = m.milestones.map((g) => { cum += g.pts; return { label: g.key + ' ✓', v: vreq, thr: total - cum, color: g.color }; });
  const c1 = burndown({ total, days, deadlineIdx: dlIdx, series: [{ color: '#5ee6a8', v: vreq, w: 3 }], phases, axisLabel: `required pace ${vreq.toFixed(2)} pts/day` });
  const c2 = burndown({ total, days, deadlineIdx: dlIdx, series: [
    { color: '#5ee6a8', v: vreq }, { color: '#ffb454', v, landDot: true }, { color: '#6ad0ff', v: 2 * v, dash: true, landDot: true },
  ], axisLabel: 'pace scenarios vs deadline' });
  const five = firstHit(v), ten = firstHit(2 * v);
  const remDL5 = remAt(dlIdx > 0 ? dlIdx - 1 : 0, v);
  const missDays = days[five].wd - totalWD;
  const tgt = new Date(m.target);
  const leg = (c, t) => `<span><i class="sw" style="background:${c}"></i>${t}</span>`;
  return `<div class="lmeta">${total} pts · ${totalWD} working days to ${MN[tgt.getUTCMonth()]} ${tgt.getUTCDate()} · required <b>${vreq.toFixed(2)}</b> pts/day · <span style="color:#8893a4">weekends shaded · excludes in-flight & parked</span></div>
  <div class="row">
    <div class="card"><h3>🎯 Target burndown <small>— required pace + phase checkpoints</small></h3>${c1}</div>
    <div class="card"><h3>⚖️ Scenarios <small>— pace vs deadline</small></h3>${c2}<div class="legend">${leg('#5ee6a8', `Required (${vreq.toFixed(1)}/d)`)}${leg('#ffb454', '1 verifier (5/d)')}${leg('#6ad0ff', '2 verifiers (10/d)')}</div></div>
  </div>
  <div class="verdict">📉 <b>Verdict:</b> at ${v} pts/day you finish ~${MN[days[five].m]} ${days[five].day} — <b>~${missDays} working days late</b> (${remDL5} pts open on deadline). To hit it solo you need <b>${vreq.toFixed(1)} pts/day</b> (~${((vreq / v - 1) * 100).toFixed(0)}% above baseline).</div>
  <div class="opts"><div class="opt"><h4>① Add a 2nd verifier</h4><p>10/day → lands <span class="land">~${MN[days[ten].m]} ${days[ten].day}</span>. Big buffer.</p></div><div class="opt"><h4>② Lift solo pace to ${vreq.toFixed(1)}/day</h4><p>~17% faster review. Tight, no slack.</p></div><div class="opt"><h4>③ Cut ~${remDL5} pts from Beta</h4><p>Defer trailing redesigns to fit at ${v}/day.</p></div></div>`;
}

/* ---------- tabs ---------- */
function tabs() {
  document.querySelectorAll('.tabbtn').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.tabbtn').forEach((x) => x.classList.toggle('on', x === b));
    document.querySelectorAll('.tabpane').forEach((p) => p.classList.toggle('on', p.id === 'tab-' + b.dataset.t));
  }));
}
tabs();
load().catch((e) => { document.getElementById('tab-board').innerHTML = `<p style="color:#ff5c7a">Failed to load: ${esc(e.message)}</p>`; });
