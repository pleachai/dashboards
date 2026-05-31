/* Launch Readiness rollup — product (points) + GTM (readiness) vs the shared
   Jul 1 gate, per phase. Pulls both dashboards' models. */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PHASES = ['Alpha', 'Beta', 'Launch'];

async function tryJSON(url) { const r = await fetch(url, { cache: 'no-store' }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (_) {} return { ok: r.ok, status: r.status, json: j }; }
async function getModel(slug) {
  const fn = await tryJSON(`/.netlify/functions/data?d=${slug}`);
  if (fn.ok && fn.json && !fn.json.error) return { m: fn.json, mode: 'live' };
  const sn = await tryJSON(`../${slug}/data.json`);
  if (sn.ok && sn.json) return { m: sn.json, mode: 'snapshot' };
  return { m: null, mode: 'error', err: fn.json && fn.json.error ? fn.json.error : `HTTP ${fn.status}` };
}
const workdaysBetween = (a, b) => { let n = 0, t = new Date(a + 'T00:00:00Z'); const e = new Date(b + 'T00:00:00Z'); while (t < e) { const d = t.getUTCDay(); if (d !== 0 && d !== 6) n++; t = new Date(t.getTime() + 86400000); } return n; };
const byKey = (m) => Object.fromEntries((m.milestones || []).map((g) => [g.key, g]));
const prodPct = (g) => (g && g.totalPts ? Math.round((g.donePts / g.totalPts) * 100) : 0);

async function load() {
  const [prod, gtm] = await Promise.all([getModel('mac-v1'), getModel('gtm')]);
  const mode = prod.mode === 'live' && gtm.mode === 'live' ? 'live' : 'snapshot';
  document.getElementById('src').innerHTML = mode === 'live' ? '<i class="dot live"></i>live' : '<i class="dot"></i>snapshot';
  if (!prod.m || !gtm.m) { document.getElementById('gates').innerHTML = `<div class="callout"><b>Couldn't load.</b> Product → ${esc(prod.err || 'ok')} · GTM → ${esc(gtm.err || 'ok')}</div>`; return; }
  const P = prod.m, G = gtm.m;
  document.getElementById('updated').textContent = P.generatedAt ? new Date(P.generatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const tgt = new Date(P.target); const wd = workdaysBetween(P.startDate, P.target);
  const kpi = (v, l, c) => `<div class="k"><b ${c ? `style="color:${c}"` : ''}>${v}</b><small>${l}</small></div>`;
  const overall = Math.round((P.pct + G.readyPct) / 2);
  document.getElementById('summary').innerHTML = `
    <div class="prog"><div class="progtop"><span>${overall}% launch-ready (blended)</span><span>Product ${P.pct}% · GTM ${G.readyPct}% · ${wd}d to ${MN[tgt.getUTCMonth()]} ${tgt.getUTCDate()}</span></div>
    <div class="track"><div class="fill" style="width:${overall}%"></div></div></div>
    <div class="kpis">${kpi(P.pct + '%', 'product done', '#6ad0ff')}${kpi(P.total, 'product pts left')}${kpi(G.readyPct + '%', 'GTM ready', '#5ee6a8')}${kpi(G.totalCount - G.doneCount, 'GTM items left')}${kpi(wd + 'd', 'to launch')}</div>`;

  const PB = byKey(P), GB = byKey(G);
  const COL = { Alpha: '#ff8a5c', Beta: '#6ad0ff', Launch: '#5ee6a8' };
  const cell = (label, pct, sub, link) => {
    const go = pct >= 100; const cls = go ? 'go' : 'risk';
    return `<a class="tcell ${cls}" href="${link}" style="text-decoration:none;display:block">
      <div class="top"><span>${label}</span><b style="color:${go ? '#5ee6a8' : '#ffb454'}">${pct}%</b></div>
      <div class="track"><div class="fill" style="width:${pct}%;background:${go ? '#5ee6a8' : 'linear-gradient(90deg,#ffb454,#ff8a5c)'}"></div></div>
      <div style="font-size:10.5px;color:var(--mut);margin-top:6px">${sub}</div></a>`;
  };
  document.getElementById('gates').innerHTML = '<div class="card">' + PHASES.map((k) => {
    const p = PB[k], g = GB[k]; const pp = prodPct(p), gp = g ? g.readyPct : 0;
    const go = pp >= 100 && gp >= 100;
    return `<div class="gate">
      <div class="lab"><span class="dotc" style="background:${COL[k]}"></span>${k}<span class="verdictrow ${go ? 'go' : 'risk'}" style="margin-left:6px">${go ? 'GO' : 'in progress'}</span></div>
      ${cell('Product', pp, p ? `${p.donePts}/${p.totalPts} pts` : 'no data', '../mac-v1/')}
      ${cell('GTM', gp, g ? `${g.doneCount}/${g.totalCount} items` : 'no data', '../gtm/')}
    </div>`;
  }).join('') + '</div><p class="note">A phase is <b>GO</b> when both Product (points complete) and GTM (items ready) hit 100%. Click any cell to open that track.</p>';
}
load().catch((e) => { document.getElementById('gates').innerHTML = `<div class="callout">Failed to load: ${esc(e.message)}</div>`; });
