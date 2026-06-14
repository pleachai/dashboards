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
  const up = m.unphased || [];
  const total = m.totalCount + up.length;
  const done = m.doneCount + up.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const kpi = (v, l, c) => `<div class="k"><b ${c ? `style="color:${c}"` : ''}>${v}</b><small>${l}</small></div>`;
  document.getElementById('summary').innerHTML = `
    <div class="prog"><div class="progtop"><span>${pct}% launch-ready</span><span>${done} of ${total} GTM items done${up.length ? ` · ${up.length} unphased` : ''}</span></div>
    <div class="track"><div class="fill" style="width:${pct}%"></div></div></div>
    <div class="kpis">${kpi(total, 'GTM items')}${kpi(done + ' (' + pct + '%)', 'ready', '#5ee6a8')}${kpi(total - done, 'open')}${up.length ? kpi(up.length, 'unphased', '#ffb454') : ''}${kpi(wd + 'd', 'to ' + MN[tgt.getUTCMonth()] + ' ' + tgt.getUTCDate())}</div>`;
  let html = `<div class="phases">${m.milestones.map(phase).join('')}</div>`;
  if (up.length) {
    const items = up.map((t) => `<a class="chk ${t.done ? 'done' : ''}" href="https://linear.app/pleach/issue/PLE-${t.n}" target="_blank" rel="noopener"><span class="box">${t.done ? '✓' : ''}</span><span class="ctitle">PLE-${t.n} · ${esc(t.title)}</span></a>`).join('');
    html += `<div class="parked" style="display:block;margin-top:16px"><h3 style="margin-bottom:8px">⚠ Unphased — ${up.length} GTM issues not yet assigned to a phase</h3><ul class="checks" style="max-width:none">${items}</ul><p class="note">Assign these to <b>GTM Alpha / Beta / Launch</b> in Linear and they’ll move into the phase cards above.</p></div>`;
  }
  document.getElementById('phases').innerHTML = html;
}

function phase(g) {
  const cls = { Alpha: 'alpha', Beta: 'beta', Launch: 'launch' }[g.key] || '';
  const items = (g.items || []).map((t) =>
    `<a class="chk ${t.done ? 'done' : ''}" href="https://linear.app/pleach/issue/PLE-${t.n}" target="_blank" rel="noopener"><span class="box">${t.done ? '✓' : ''}</span><span class="ctitle">${esc(t.title)}</span></a>`
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
