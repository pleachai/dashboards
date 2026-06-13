/* Launch rollup — one cross-project points burndown over the launch scope (all of
   Mac v1 + the `launch`-tagged Cloud subset). Source: /.netlify/functions/data?d=launch
   (live) → ./data.json (fallback). Shared SVG/date helpers come from ../burndown.js. */
const SLUG = 'launch';

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
  if (fn.ok && fn.json && !fn.json.error) return finish(fn.json, 'live');
  const sn = await tryJSON('./data.json');
  if (sn.ok && sn.json) return finish(sn.json, 'snapshot');
  document.getElementById('tab-burndown').innerHTML = `<div class="callout"><b>Couldn't load launch data.</b></div>`;
}

function show(m, mode) {
  window.__model = m; window.__mode = mode;
  document.getElementById('src').innerHTML = mode === 'live' ? '<i class="dot live"></i>live' : '<i class="dot"></i>snapshot';
  document.getElementById('updated').textContent = m.generatedAt ? new Date(m.generatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  document.getElementById('summary').innerHTML = summary(m);
  document.getElementById('tab-burndown').innerHTML = burndownTab(m);
  document.getElementById('tab-breakdown').innerHTML = breakdownTab(m);
  document.getElementById('tab-modules').innerHTML = modulesTab(m);
}

/* ---------- summary ---------- */
function summary(m) {
  const wd = workdaysBetween(m.startDate, m.target);
  const vreq = m.total / wd;
  const onTrack = vreq <= m.velocity;
  const tgt = new Date(m.target);
  const kpi = (v, l, c) => `<div class="k"><b ${c ? `style="color:${c}"` : ''}>${v}</b><small>${l}</small></div>`;
  return `
    <div class="prog">
      <div class="progtop"><span>${m.pct}% launch-ready</span><span>${m.donePts} of ${m.scope} pts done · ${m.total} remaining</span></div>
      <div class="track"><div class="fill" style="width:${m.pct}%"></div></div>
    </div>
    <div class="kpis">
      ${kpi(m.scope, 'launch scope')}
      ${kpi(m.donePts + ' (' + m.pct + '%)', 'shipped', '#5ee6a8')}
      ${kpi(m.total, 'remaining')}
      ${kpi(wd + 'd', 'to ' + MN[tgt.getUTCMonth()] + ' ' + tgt.getUTCDate())}
      ${kpi(vreq.toFixed(1) + '/d', 'required pace', onTrack ? '#5ee6a8' : '#ffb454')}
      <div class="k flag ${onTrack ? 'ok' : 'risk'}">${onTrack ? '✓ on track @ ' + m.velocity + '/d' : '⚠ above ' + m.velocity + '/d baseline'}</div>
    </div>`;
}

/* ---------- burndown tab ---------- */
function burndownTab(m) {
  const v = m.velocity, total = m.total;
  const totalWD = workdaysBetween(m.startDate, m.target), vreq = total / totalWD;
  const calSpan = Math.max(41, Math.round((new Date(m.target) - new Date(m.startDate)) / 86400000) + 8);
  const days = buildDays(m.startDate, calSpan);
  const dlIdx = days.findIndex((d) => d.iso === m.target);
  const hit = (vv) => { for (let i = 0; i < days.length; i++) if (Math.max(0, total - vv * days[i].wd) <= 0) return i; return days.length - 1; };
  const hist = m.history || [];
  const c1 = burndown({ total, days, deadlineIdx: dlIdx, series: [{ color: '#5ee6a8', v: vreq, w: 3 }], trail: hist, axisLabel: `required pace ${vreq.toFixed(2)} pts/day to launch` });
  const c2 = burndown({ total, days, deadlineIdx: dlIdx, series: [{ color: '#5ee6a8', v: vreq }, { color: '#ffb454', v, landDot: true }, { color: '#6ad0ff', v: 2 * v, dash: true, landDot: true }], axisLabel: 'pace scenarios vs launch date' });
  const five = hit(v), miss = days[five].wd - totalWD;
  const leg = (c, t) => `<span><i class="sw" style="background:${c}"></i>${t}</span>`;
  let pace = '<span style="color:var(--mut2)">Actual trail builds daily (cron)</span>';
  if (hist.length >= 2) { const a = hist[0], b = hist[hist.length - 1]; const span = workdaysBetween(a.date, b.date) || 1; const ap = (a.remaining - b.remaining) / span; pace = leg('var(--tx)', `Actual (~${ap > 0 ? ap.toFixed(1) : '0'}/d so far)`); }
  return `<div class="row">
    <div class="card"><h3>🎯 Launch burndown <small>— whole launch scope vs ${MN[new Date(m.target).getUTCMonth()]} ${new Date(m.target).getUTCDate()}</small></h3>${c1}<div class="legend">${leg('#5ee6a8', `Required (${vreq.toFixed(1)}/d)`)}${pace}</div></div>
    <div class="card"><h3>⚖️ Scenarios <small>— pace vs launch date</small></h3>${c2}<div class="legend">${leg('#5ee6a8', `Required (${vreq.toFixed(1)}/d)`)}${leg('#ffb454', `Solo (${v}/d)`)}${leg('#6ad0ff', `2 reviewers (${2 * v}/d)`)}</div></div>
  </div>
  <div class="callout">📉 <b>Verdict:</b> at ${v} pts/day the launch scope lands ~${MN[days[five].m]} ${days[five].day} — ${miss > 0 ? `<b>~${miss} working days late</b>` : '<b>on time</b>'}. To hit ${MN[new Date(m.target).getUTCMonth()]} ${new Date(m.target).getUTCDate()} you need <b>${vreq.toFixed(1)} pts/day</b>${vreq > v ? ` (~${((vreq / v - 1) * 100).toFixed(0)}% above baseline)` : ''}.</div>`;
}

/* ---------- breakdown tab ---------- */
function breakdownTab(m) {
  const rows = (m.breakdown || []).map((b) => {
    const donePct = b.totalPts ? Math.round((b.donePts / b.totalPts) * 100) : 0;
    const col = b.slug === 'mac-v1' ? '#6ad0ff' : '#5ee6a8';
    return `<tr>
      <td class="ph"><i class="dotc" style="background:${col}"></i><a href="../${b.slug}/" style="color:inherit">${esc(b.name)}</a></td>
      <td class="n"><b>${b.openPts}</b></td>
      <td class="n">${b.openCount}</td>
      <td class="n">${b.donePts}</td>
      <td class="n">${donePct}%</td>
    </tr>`;
  }).join('');
  return `<div class="row"><div class="card"><h3>🧩 Launch scope by source <small>— Mac v1 (whole project) + the launch-tagged Cloud subset</small></h3>
    <table><tr><th>Source</th><th class="n">Open pts</th><th class="n">Open tk</th><th class="n">Done pts</th><th class="n">% done</th></tr>${rows}
    <tr class="tot"><td class="ph">Total</td><td class="n">${m.total}</td><td class="n">${m.openCount}</td><td class="n">${m.donePts}</td><td class="n">${m.pct}%</td></tr></table>
    <p class="note">Click a source to open its full dashboard. Cloud rows reflect only tickets tagged <code>launch</code>.</p>
  </div></div>`;
}

/* ---------- modules tab ---------- */
function modulesTab(m) {
  const mods = (m.modules || []).filter((g) => g.openCount > 0);
  if (!mods.length) return '<div class="callout">No module data.</div>';
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
  return `<div class="row"><div class="card"><h3>🧩 Launch work by module <small>— worst first · ${totOpen} open pts across ${mods.length} modules</small></h3>
    <table><tr><th>Module</th><th>Open work</th><th class="n">Open pts</th><th class="n">Open tk</th><th class="n">Done pts</th><th class="n">% done</th></tr>${rows}</table>
    <p class="note">Open points per module across the whole launch scope — the longest bars are where the most unshipped launch work sits.</p>
  </div></div>`;
}

/* ---------- tabs ---------- */
document.querySelectorAll('.tabbtn').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tabbtn').forEach((x) => x.classList.toggle('on', x === b));
  document.querySelectorAll('.tabpane').forEach((p) => p.classList.toggle('on', p.id === 'tab-' + b.dataset.t));
}));
addEventListener('themechange', () => { if (window.__model) show(window.__model, window.__mode || 'snapshot'); });
load().catch((e) => { document.getElementById('tab-burndown').innerHTML = `<div class="callout">Failed to load: ${esc(e.message)}</div>`; });
