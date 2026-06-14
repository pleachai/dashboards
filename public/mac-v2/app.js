/* mac-v2 dashboard — renders board + burndowns from the live model.
   Source: /.netlify/functions/data?d=mac-v1 (live) → ./data.json (fallback). */
const SLUG = 'mac-v2';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const A = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(' ');
const E = (tag, attrs, inner) => `<${tag} ${A(attrs)}${inner == null ? '/>' : `>${inner}</${tag}>`}`;
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const clean = (t) => t.replace(/^(Bug|Feature|Improvement|UX|Release|Reliability|Cleanup|Auth|Compliance|Marketing|Onboarding|Rethink|Roles|Slack|Future):?\s*/i, '');
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const KEYCOL = { Alpha: '#ff8a5c', Beta: '#6ad0ff', Launch: '#5ee6a8' };

async function tryJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  const text = await r.text();
  let j = null; try { j = JSON.parse(text); } catch (_) {}
  return { ok: r.ok, status: r.status, json: j, isHtml: /^\s*</.test(text) };
}

async function finish(m, mode) {
  const h = await tryJSON('./history.json');
  m.history = (h.json && Array.isArray(h.json.points)) ? h.json.points : [];
  show(m, mode);
}

async function load() {
  const fn = await tryJSON(`/.netlify/functions/data?d=${SLUG}`);
  if (fn.ok && fn.json && !fn.json.error) { return finish(fn.json, 'live'); }
  const fnMsg = fn.json && fn.json.error ? `function: ${fn.json.error}` : fn.isHtml ? `function not deployed (HTTP ${fn.status})` : `function HTTP ${fn.status}`;
  const sn = await tryJSON('./data.json');
  if (sn.ok && sn.json) { return finish(sn.json, 'snapshot'); }
  document.getElementById('tab-board').innerHTML = `<div class="callout"><b>Couldn't load data.</b><br>Live → ${esc(fnMsg)}<br>Fallback → ${esc(sn.isHtml ? 'snapshot missing (HTTP ' + sn.status + ')' : 'snapshot HTTP ' + sn.status)}</div>`;
}

function show(m, mode) {
  window.__model = m; window.__mode = mode;
  const dot = mode === 'live' ? '<i class="dot live"></i>live' : '<i class="dot"></i>snapshot';
  document.getElementById('src').innerHTML = dot;
  document.getElementById('updated').textContent = m.generatedAt ? new Date(m.generatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  document.getElementById('summary').innerHTML = summary(m);
  document.getElementById('tab-board').innerHTML = board(m);
  document.getElementById('tab-capacity').innerHTML = capacity(m);
  document.getElementById('tab-launch').innerHTML = launch(m);
  { const el = document.getElementById('tab-modules'); if (el) el.innerHTML = modules(m); }
}

/* ---------- date helpers ---------- */
function buildDays(startISO, calDays) {
  const out = []; let t = new Date(startISO + 'T00:00:00Z'); let wd = 0;
  for (let k = 0; k <= calDays; k++) { const dow = t.getUTCDay(); const we = dow === 0 || dow === 6; if (!we) wd++; out.push({ iso: t.toISOString().slice(0, 10), m: t.getUTCMonth(), day: t.getUTCDate(), dow, we, wd }); t = new Date(t.getTime() + 86400000); }
  return out;
}
const workdaysBetween = (a, b) => buildDays(a, Math.round((new Date(b) - new Date(a)) / 86400000)).filter((d) => !d.we && d.iso < b).length;

/* ---------- summary strip ---------- */
function summary(m) {
  const wd = workdaysBetween(m.startDate, m.target);
  const vreq = (m.total / wd);
  const onTrack = vreq <= m.velocity;
  const tgt = new Date(m.target);
  const kpi = (v, l, c) => `<div class="k"><b ${c ? `style="color:${c}"` : ''}>${v}</b><small>${l}</small></div>`;
  const seg = m.milestones.map((g) => `<span style="flex:${g.totalPts || 1};background:${g.color};opacity:${g.totalPts ? 1 : 0}" title="${g.key}: ${g.donePts}/${g.totalPts}"></span>`).join('');
  return `
    <div class="prog">
      <div class="progtop"><span>${m.pct}% complete</span><span>${m.donePts} of ${m.scope} pts done · ${m.total} remaining</span></div>
      <div class="track"><div class="fill" style="width:${m.pct}%"></div></div>
    </div>
    <div class="kpis">
      ${kpi(m.scope, 'total scope')}
      ${kpi(m.donePts + ' (' + m.pct + '%)', 'shipped', '#5ee6a8')}
      ${kpi(m.total, 'remaining')}
      ${kpi(wd + 'd', 'to ' + MN[tgt.getUTCMonth()] + ' ' + tgt.getUTCDate())}
      ${kpi(vreq.toFixed(1) + '/d', 'required pace', onTrack ? '#5ee6a8' : '#ffb454')}
      <div class="k flag ${onTrack ? 'ok' : 'risk'}">${onTrack ? '✓ on track @ ' + m.velocity + '/d' : '⚠ above ' + m.velocity + '/d baseline'}</div>
    </div>`;
}

/* ---------- board ---------- */
function ticket(t) {
  return `<a class="it" href="https://linear.app/pleach/issue/PLE-${t.n}" target="_blank" rel="noopener"><span class="pt">${t.est || '·'}</span><span class="id">PLE-${t.n}</span><span class="ti">${esc(trunc(clean(t.title), 52))}</span>${t.mod ? `<span class="tag">${esc(t.mod)}</span>` : ''}</a>`;
}
function milestoneCol(g) {
  const cls = { Alpha: 'alpha', Beta: 'beta', Launch: 'launch' }[g.key] || '';
  const p = g.totalPts ? Math.round((g.donePts / g.totalPts) * 100) : 0;
  return `<section class="col ${cls}">
    <header><span class="dotc" style="background:${g.color}"></span><h2>${g.key}</h2><span class="cnt">${g.tickets.length} open · ${g.pts}pt</span></header>
    <div class="mbar"><div class="mfill" style="width:${p}%;background:${g.color}"></div></div>
    <div class="msub">${g.donePts}/${g.totalPts} pt shipped · ${p}% · <span class="gsub">${esc(g.sub || '')}</span></div>
    <ul>${g.tickets.map(ticket).join('')}</ul>
  </section>`;
}
function board(m) {
  const cols = m.milestones.map(milestoneCol).join('');
  const parked = m.parked.length ? `<div class="parked"><h3>🅿️ Parked</h3><div class="pl">${m.parked.map(ticket).join('')}</div></div>` : '';
  return `<div class="boardgrid">${cols}</div>${parked}`;
}

/* ---------- shared burndown SVG ---------- */
function themePal() {
  return document.documentElement.dataset.theme === 'light'
    ? { plot: '#eef2f7', weekend: '#e4e9f0', grid: '#d3dae3', minor: '#e6ebf1', axis: '#5d6b7d', trail: '#1a2330', ring: '#ffffff' }
    : { plot: '#0c1116', weekend: '#10161d', grid: '#222b35', minor: '#1a222b', axis: '#7d8a9c', trail: '#ffffff', ring: '#0b0d10' };
}
function burndown({ total, days, series, deadlineIdx, phases, axisLabel, trail }) {
  const P = themePal();
  const W = 1080, H = 420, ml = 50, mr = 16, mt = 24, mb = 42, pw = W - ml - mr, ph = H - mt - mb;
  const N = days.length - 1, maxPts = Math.max(25, Math.ceil(total / 25) * 25);
  const X = (i) => +(ml + (i / N) * pw).toFixed(1), Y = (p) => +(mt + (1 - p / maxPts) * ph).toFixed(1);
  const rem = (i, v) => Math.max(0, total - v * days[i].wd);
  const hit = (v) => { for (let i = 0; i < days.length; i++) if (rem(i, v) <= 0) return i; return N; };
  let g = E('rect', { x: ml, y: mt, width: pw, height: ph, fill: P.plot, rx: 6 });
  for (let i = 0; i < days.length - 1; i++) if (days[i].we) g += E('rect', { x: X(i), y: mt, width: (X(i + 1) - X(i)).toFixed(1), height: ph, fill: P.weekend });
  for (let p = 0; p <= maxPts; p += 25) g += E('line', { x1: ml, y1: Y(p), x2: W - mr, y2: Y(p), stroke: P.grid, 'stroke-width': 1 }) + E('text', { x: ml - 7, y: Y(p) + 4, fill: P.axis, 'font-size': 11, 'text-anchor': 'end' }, p);
  for (let i = 0; i < days.length; i++) { const d = days[i]; if (d.dow === 1 || i === 0) g += E('line', { x1: X(i), y1: mt, x2: X(i), y2: mt + ph, stroke: P.minor, 'stroke-width': 1 }) + E('text', { x: X(i), y: mt + ph + 16, fill: P.axis, 'font-size': 10, 'text-anchor': 'middle' }, `${MN[d.m]} ${d.day}`); }
  if (deadlineIdx != null && deadlineIdx >= 0) g += E('line', { x1: X(deadlineIdx), y1: mt - 4, x2: X(deadlineIdx), y2: mt + ph, stroke: '#ff5c7a', 'stroke-width': 2, 'stroke-dasharray': '1 0' }) + E('text', { x: X(deadlineIdx) - 6, y: mt + 7, fill: '#ff5c7a', 'font-size': 11, 'font-weight': 700, 'text-anchor': 'end' }, 'DEADLINE');
  for (const s of series) {
    let pts = `${X(0)},${Y(total)}`; for (let i = 0; i < days.length; i++) pts += ` ${X(i)},${Y(rem(i, s.v))}`;
    g += E('polyline', { points: pts, fill: 'none', stroke: s.color, 'stroke-width': s.w || 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', ...(s.dash ? { 'stroke-dasharray': '3 4' } : {}) });
    if (s.landDot) { const idx = hit(s.v); g += E('circle', { cx: X(idx), cy: Y(0), r: 3.5, fill: s.color }) + E('text', { x: X(idx) + 5, y: Y(0) - 6, fill: s.color, 'font-size': 10 }, `${MN[days[idx].m]} ${days[idx].day}`); }
  }
  for (const pm of phases || []) { let idx = N; for (let i = 0; i < days.length; i++) if (rem(i, pm.v) <= pm.thr + 1e-9) { idx = i; break; } g += E('circle', { cx: X(idx), cy: Y(rem(idx, pm.v)), r: 4, fill: pm.color, stroke: P.ring, 'stroke-width': 1.5 }) + E('text', { x: X(idx) + 6, y: Y(rem(idx, pm.v)) - 6, fill: pm.color, 'font-size': 10, 'font-weight': 700 }, `${pm.label} ${MN[days[idx].m]}${days[idx].day}`); }
  // actual trail: real remaining points logged per day
  if (trail && trail.length) {
    const tp = trail.map((p) => ({ i: days.findIndex((d) => d.iso === p.date), v: p.remaining })).filter((p) => p.i >= 0);
    if (tp.length) {
      g += E('polyline', { points: tp.map((p) => `${X(p.i)},${Y(p.v)}`).join(' '), fill: 'none', stroke: P.trail, 'stroke-width': 2.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
      for (const p of tp) g += E('circle', { cx: X(p.i), cy: Y(p.v), r: 3, fill: P.trail });
      const last = tp[tp.length - 1];
      g += E('text', { x: X(last.i) + 6, y: Y(last.v) + 4, fill: P.trail, 'font-size': 10, 'font-weight': 700 }, `actual ${last.v}`);
    }
  }
  g += E('text', { x: ml, y: mt - 7, fill: P.axis, 'font-size': 10.5 }, axisLabel || 'points remaining');
  return E('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `0 0 ${W} ${H}`, width: '100%', height: 'auto', style: 'display:block' }, g);
}

/* ---------- capacity tab ---------- */
function capacity(m) {
  const v = m.velocity, total = m.total, dL = Math.ceil(total / v);
  const days = buildDays(m.startDate, dL * 1.5 + 14);
  let cum = 0; const phases = m.milestones.map((g) => { cum += g.pts; return { label: g.key + ' ✓', v, thr: total - cum, color: g.color }; });
  const svg = burndown({ total, days, series: [{ color: '#8b9bff', v, w: 3 }], phases, axisLabel: `remaining work @ ${v} pts/working-day` });
  const rows = m.milestones.map((g) => `<tr><td class="ph"><i class="dotc" style="background:${g.color}"></i>${g.key}</td><td class="n">${g.pts}</td><td class="n">${(g.pts / v).toFixed(1)}</td></tr>`).join('');
  return `<div class="row">
    <div class="card"><h3>📉 Capacity burndown <small>— remaining ${total} pts, phases sequential @ ${v}/day</small></h3>${svg}</div>
    <div class="card narrow"><table><tr><th>Phase</th><th class="n">Open</th><th class="n">Days</th></tr>${rows}<tr class="tot"><td class="ph">Total</td><td class="n">${total}</td><td class="n">${(total / v).toFixed(1)}</td></tr></table>
    <div class="kpi3"><div><b>${dL}</b><small>verify-days</small></div><div><b>~${(dL / 5).toFixed(1)}</b><small>wk · 1 person</small></div><div><b>~${(dL / 10).toFixed(1)}</b><small>wk · 2 people</small></div></div>
    <p class="note">AI implements in parallel; the serial bottleneck is one human verifying at ${v} pts/day. A second reviewer ≈ halves the calendar.</p></div></div>`;
}

/* ---------- launch tab ---------- */
function launch(m) {
  const v = m.velocity, total = m.total;
  const totalWD = workdaysBetween(m.startDate, m.target), vreq = total / totalWD;
  const days = buildDays(m.startDate, Math.max(41, Math.round((new Date(m.target) - new Date(m.startDate)) / 86400000) + 8));
  const dlIdx = days.findIndex((d) => d.iso === m.target);
  const hit = (vv) => { for (let i = 0; i < days.length; i++) if (Math.max(0, total - vv * days[i].wd) <= 0) return i; return days.length - 1; };
  const remAt = (idx, vv) => Math.max(0, total - vv * days[idx].wd);
  let cum = 0; const phases = m.milestones.map((g) => { cum += g.pts; return { label: g.key + ' ✓', v: vreq, thr: total - cum, color: g.color }; });
  const hist = m.history || [];
  const c1 = burndown({ total, days, deadlineIdx: dlIdx, series: [{ color: '#5ee6a8', v: vreq, w: 3 }], phases, trail: hist, axisLabel: `required pace ${vreq.toFixed(2)} pts/day` });
  const c2 = burndown({ total, days, deadlineIdx: dlIdx, series: [{ color: '#5ee6a8', v: vreq }, { color: '#ffb454', v, landDot: true }, { color: '#6ad0ff', v: 2 * v, dash: true, landDot: true }], axisLabel: 'pace scenarios vs deadline' });
  const five = hit(v), ten = hit(2 * v), remDL5 = remAt(dlIdx > 0 ? dlIdx - 1 : 0, v), missDays = days[five].wd - totalWD;
  const leg = (c, t) => `<span><i class="sw" style="background:${c}"></i>${t}</span>`;
  let pace = '';
  if (hist.length >= 2) { const a = hist[0], b = hist[hist.length - 1]; const span = workdaysBetween(a.date, b.date) || 1; const ap = (a.remaining - b.remaining) / span; pace = leg('var(--tx)', `Actual (~${ap > 0 ? ap.toFixed(1) : '0'}/d so far)`); }
  else if (hist.length === 1) pace = leg('var(--tx)', 'Actual (logging…)');
  return `<div class="row">
    <div class="card"><h3>🎯 Target vs actual <small>— required pace + your real trail</small></h3>${c1}<div class="legend">${leg('#5ee6a8', `Required (${vreq.toFixed(1)}/d)`)}${pace || '<span style="color:var(--mut2)">Actual trail builds daily (cron)</span>'}</div></div>
    <div class="card"><h3>⚖️ Scenarios <small>— pace vs deadline</small></h3>${c2}<div class="legend">${leg('#5ee6a8', `Required (${vreq.toFixed(1)}/d)`)}${leg('#ffb454', `Solo (${v}/d)`)}${leg('#6ad0ff', `2 reviewers (${2 * v}/d)`)}</div></div>
  </div>
  <div class="callout">📉 <b>Verdict:</b> at ${v} pts/day you finish ~${MN[days[five].m]} ${days[five].day} — ${missDays > 0 ? `<b>~${missDays} working days late</b> (${remDL5} pts open on deadline)` : '<b>on time</b>'}. To hit it solo you need <b>${vreq.toFixed(1)} pts/day</b>${vreq > v ? ` (~${((vreq / v - 1) * 100).toFixed(0)}% above baseline)` : ''}.</div>
  <div class="opts"><div class="opt"><h4>① Add a 2nd reviewer</h4><p>${2 * v}/day → lands <span class="land">~${MN[days[ten].m]} ${days[ten].day}</span>. Big buffer.</p></div><div class="opt"><h4>② Lift solo pace to ${vreq.toFixed(1)}/day</h4><p>Faster review throughput. Tight, little slack.</p></div><div class="opt"><h4>③ Cut ~${remDL5} pts from the trailing phase</h4><p>Defer trailing redesigns to fit at ${v}/day.</p></div></div>`;
}

function modules(m) {
  const mods = (m.modules || []).filter((g) => g.openCount > 0);
  if (!mods.length) return '<div class="callout">No module labels yet.</div>';
  const maxOpen = Math.max(...mods.map((x) => x.openPts), 1);
  const pal = ['#ff8a5c', '#6ad0ff', '#5ee6a8', '#b48ead', '#ffb454', '#7c8cff', '#8fa6b2', '#5ec8e6', '#ff5c7a', '#8b9bff', '#6ee7b7', '#f59e0b'];
  const totOpen = mods.reduce((s, g) => s + g.openPts, 0);
  const rows = mods.map((g, i) => {
    const col = pal[i % pal.length];
    const donePct = g.totalPts ? Math.round((g.donePts / g.totalPts) * 100) : 0;
    const w = Math.round((g.openPts / maxOpen) * 100);
    return `<tr>
      <td class="ph"><i class="dotc" style="background:${col}"></i>${esc(g.name)}</td>
      <td><div style="background:rgba(127,127,127,.18);border-radius:5px;overflow:hidden;height:13px;min-width:80px"><div style="width:${w}%;height:100%;background:${col}"></div></div></td>
      <td class="n"><b>${g.openPts}</b></td>
      <td class="n">${g.openCount}</td>
      <td class="n">${g.donePts}</td>
      <td class="n">${donePct}%</td>
    </tr>`;
  }).join('');
  return `<div class="row"><div class="card"><h3>🧩 Open work by module <small>— worst first · ${totOpen} open pts across ${mods.length} modules</small></h3>
    <table><tr><th>Module</th><th>Open work</th><th class="n">Open pts</th><th class="n">Open tk</th><th class="n">Done pts</th><th class="n">% done</th></tr>${rows}</table>
    <p class="note">Open points per module across all phases — the longest bars are where the most unshipped work sits.</p>
  </div></div>`;
}

/* ---------- tabs ---------- */
document.querySelectorAll('.tabbtn').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabbtn').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tabpane').forEach((p) => p.classList.toggle('on', p.id === 'tab-' + b.dataset.t));
}));
addEventListener('themechange', () => { if (window.__model) show(window.__model, window.__mode || 'snapshot'); });
load().catch((e) => { document.getElementById('tab-board').innerHTML = `<div class="callout">Failed to load: ${esc(e.message)}</div>`; });
