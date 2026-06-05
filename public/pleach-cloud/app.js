/* Pleach Cloud roadmap — sequential P0→P-Launch phases; % built = done/total
   items per phase. Source: function ?d=pleach-cloud → ./data.json. */
const SLUG = 'pleach-cloud';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function tryJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (_) {}
  return { ok: r.ok, status: r.status, json: j };
}

async function load() {
  const fn = await tryJSON(`/.netlify/functions/data?d=${SLUG}`);
  if (fn.ok && fn.json && !fn.json.error) return show(fn.json, 'live');
  const sn = await tryJSON('./data.json');
  if (sn.ok && sn.json) return show(sn.json, 'snapshot');
  document.getElementById('phases').innerHTML = `<div class="callout"><b>Couldn't load Cloud data.</b><br>${esc(fn.json && fn.json.error ? fn.json.error : 'function HTTP ' + fn.status)}</div>`;
}

function show(m, mode) {
  document.getElementById('src').innerHTML = mode === 'live' ? '<i class="dot live"></i>live' : '<i class="dot"></i>snapshot';
  document.getElementById('updated').textContent = m.generatedAt ? new Date(m.generatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const up = m.unphased || [];
  const total = m.totalCount + up.length;
  const done = m.doneCount + up.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  // current phase = first phase that isn't 100% done (with any items)
  const active = m.milestones.find((g) => g.totalCount > 0 && g.readyPct < 100);
  const kpi = (v, l, c) => `<div class="k"><b ${c ? `style="color:${c}"` : ''}>${v}</b><small>${l}</small></div>`;
  document.getElementById('summary').innerHTML = `
    <div class="prog"><div class="progtop"><span>${pct}% built</span><span>${done} of ${total} roadmap items done${up.length ? ` · ${up.length} unphased` : ''}</span></div>
    <div class="track"><div class="fill" style="width:${pct}%"></div></div></div>
    <div class="kpis">${kpi(total, 'items')}${kpi(done + ' (' + pct + '%)', 'shipped', '#5ee6a8')}${kpi(total - done, 'open')}${kpi(active ? active.key : '—', 'current phase', active ? active.color : '')}${up.length ? kpi(up.length, 'unphased', '#ffb454') : ''}</div>`;
  let html = `<div class="phases">${m.milestones.map(phase).join('')}</div>`;
  if (up.length) {
    const items = up.map((t) => `<li class="chk ${t.done ? 'done' : ''}"><span class="box">${t.done ? '✓' : ''}</span><span class="ctitle">PLE-${t.n} · ${esc(t.title)}</span></li>`).join('');
    html += `<div class="parked" style="display:block;margin-top:16px"><h3 style="margin-bottom:8px">⚠ Unphased — ${up.length} issues not yet assigned to a P-phase</h3><ul class="checks" style="max-width:none">${items}</ul></div>`;
  }
  document.getElementById('phases').innerHTML = html;
}

function phase(g) {
  const items = (g.items || []).map((t) =>
    `<li class="chk ${t.done ? 'done' : ''}"><span class="box">${t.done ? '✓' : ''}</span><span class="ctitle">${esc(t.title)}</span></li>`
  ).join('');
  const body = g.items && g.items.length ? `<ul class="checks">${items}</ul>`
    : `<div class="empty">No items yet — add issues to “${esc(g.name)}” in Linear.</div>`;
  return `<section class="pcard" style="border-top:3px solid ${g.color}">
    <header><span class="dotc" style="background:${g.color}"></span><h2>${g.key}</h2><span class="pct" style="color:${g.color}">${g.readyPct}%</span></header>
    <div class="psub">${esc(g.sub || '')} · ${g.doneCount}/${g.totalCount} done</div>
    <div class="mbar"><div class="mfill" style="width:${g.readyPct}%;background:${g.color}"></div></div>
    ${body}
  </section>`;
}

load().catch((e) => { document.getElementById('phases').innerHTML = `<div class="callout">Failed to load: ${esc(e.message)}</div>`; });
