/* GTM readiness dashboard — each phase is a checklist of GTM must-haves;
   % ready = done items / total items. Source: function ?d=gtm → ./data.json. */
const SLUG = 'gtm';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function tryJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (_) {}
  return { ok: r.ok, status: r.status, json: j, isHtml: /^\s*</.test(t) };
}
const workdaysBetween = (a, b) => { let n = 0, t = new Date(a + 'T00:00:00Z'); const e = new Date(b + 'T00:00:00Z'); while (t < e) { const d = t.getUTCDay(); if (d !== 0 && d !== 6) n++; t = new Date(t.getTime() + 86400000); } return n; };

async function load() {
  const fn = await tryJSON(`/.netlify/functions/data?d=${SLUG}`);
  if (fn.ok && fn.json && !fn.json.error) return show(fn.json, 'live');
  const sn = await tryJSON('./data.json');
  if (sn.ok && sn.json) return show(sn.json, 'snapshot');
  document.getElementById('phases').innerHTML = `<div class="callout"><b>Couldn't load GTM data.</b><br>${esc(fn.json && fn.json.error ? fn.json.error : 'function HTTP ' + fn.status)}</div>`;
}

function show(m, mode) {
  document.getElementById('src').innerHTML = mode === 'live' ? '<i class="dot live"></i>live' : '<i class="dot"></i>snapshot';
  document.getElementById('updated').textContent = m.generatedAt ? new Date(m.generatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const wd = workdaysBetween(m.startDate, m.target); const tgt = new Date(m.target);
  const kpi = (v, l, c) => `<div class="k"><b ${c ? `style="color:${c}"` : ''}>${v}</b><small>${l}</small></div>`;
  document.getElementById('summary').innerHTML = `
    <div class="prog"><div class="progtop"><span>${m.readyPct}% launch-ready</span><span>${m.doneCount} of ${m.totalCount} GTM items done</span></div>
    <div class="track"><div class="fill" style="width:${m.readyPct}%"></div></div></div>
    <div class="kpis">${kpi(m.totalCount, 'GTM items')}${kpi(m.doneCount + ' (' + m.readyPct + '%)', 'ready', '#5ee6a8')}${kpi(m.totalCount - m.doneCount, 'open')}${kpi(wd + 'd', 'to ' + MN[tgt.getUTCMonth()] + ' ' + tgt.getUTCDate())}</div>`;
  document.getElementById('phases').innerHTML = `<div class="phases">${m.milestones.map(phase).join('')}</div>`;
}

function phase(g) {
  const cls = { Alpha: 'alpha', Beta: 'beta', Launch: 'launch' }[g.key] || '';
  const items = (g.items || []).map((t) =>
    `<li class="chk ${t.done ? 'done' : ''}"><span class="box">${t.done ? '✓' : ''}</span><span class="ctitle">${esc(t.title)}</span></li>`
  ).join('');
  const body = g.items && g.items.length ? `<ul class="checks">${items}</ul>`
    : `<div class="empty">No GTM items yet — add issues to the “${esc(g.name)}” milestone in Linear and they’ll appear here.</div>`;
  return `<section class="pcard ${cls}">
    <header><span class="dotc" style="background:${g.color}"></span><h2>${g.key}</h2><span class="pct" style="color:${g.color}">${g.readyPct}%</span></header>
    <div class="psub">${esc(g.sub || '')} · ${g.doneCount}/${g.totalCount} ready</div>
    <div class="mbar"><div class="mfill" style="width:${g.readyPct}%;background:${g.color}"></div></div>
    ${body}
  </section>`;
}

load().catch((e) => { document.getElementById('phases').innerHTML = `<div class="callout">Failed to load: ${esc(e.message)}</div>`; });
