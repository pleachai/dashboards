/* Mac v2 — Multi-Agent Runtime readiness dashboard. Each milestone is a phase;
   % complete = done stories / total stories. Hedge project, no burndown.
   Source: function ?d=mac-v2 → ./data.json fallback. */
const SLUG = 'mac-v2';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function tryJSON(url) {
  const r = await fetch(url, { cache: 'no-store' });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (_) {}
  return { ok: r.ok, status: r.status, json: j, isHtml: /^\s*</.test(t) };
}

async function load() {
  const fn = await tryJSON(`/.netlify/functions/data?d=${SLUG}`);
  if (fn.ok && fn.json && !fn.json.error) return show(fn.json, 'live');
  const sn = await tryJSON('./data.json');
  if (sn.ok && sn.json) return show(sn.json, 'snapshot');
  document.getElementById('phases').innerHTML = `<div class="callout"><b>Couldn't load Mac v2 data.</b><br>${esc(fn.json && fn.json.error ? fn.json.error : 'function HTTP ' + fn.status)}</div>`;
}

function show(m, mode) {
  document.getElementById('src').innerHTML = mode === 'live' ? '<i class="dot live"></i>live' : '<i class="dot"></i>snapshot';
  document.getElementById('updated').textContent = m.generatedAt ? new Date(m.generatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const up = m.unphased || [];
  const total = m.totalCount + up.length;
  const done = m.doneCount + up.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const kpi = (v, l, c) => `<div class="k"><b ${c ? `style="color:${c}"` : ''}>${v}</b><small>${l}</small></div>`;
  document.getElementById('summary').innerHTML = `
    <div class="prog"><div class="progtop"><span>${pct}% complete</span><span>${done} of ${total} stories done${up.length ? ` · ${up.length} unphased` : ''}</span></div>
    <div class="track"><div class="fill" style="width:${pct}%"></div></div></div>
    <div class="kpis">${kpi(total, 'stories')}${kpi(done + ' (' + pct + '%)', 'done', '#5ee6a8')}${kpi(total - done, 'open')}${up.length ? kpi(up.length, 'unphased', '#ffb454') : ''}${kpi('hedge', 'branch · no deadline', '#8fa6b2')}</div>`;
  let html = `<div class="phases">${m.milestones.map(phase).join('')}</div>`;
  if (up.length) {
    const items = up.map((t) => `<li class="chk ${t.done ? 'done' : ''}"><span class="box">${t.done ? '✓' : ''}</span><span class="ctitle">PLE-${t.n} · ${esc(t.title)}</span></li>`).join('');
    html += `<div class="parked" style="display:block;margin-top:16px"><h3 style="margin-bottom:8px">⚠ Unphased — ${up.length} issues not yet assigned to a milestone</h3><ul class="checks" style="max-width:none">${items}</ul><p class="note">Assign these to a milestone (M1–M5 / M-PROOF) in Linear and they’ll move into the cards above.</p></div>`;
  }
  document.getElementById('phases').innerHTML = html;
}

function phase(g) {
  const items = (g.items || []).map((t) =>
    `<li class="chk ${t.done ? 'done' : ''}"><span class="box">${t.done ? '✓' : ''}</span><span class="ctitle">${esc(t.title)}</span></li>`
  ).join('');
  const body = g.items && g.items.length ? `<ul class="checks">${items}</ul>`
    : `<div class="empty">No stories yet — add issues to the “${esc(g.name)}” milestone in Linear and they’ll appear here.</div>`;
  return `<section class="pcard">
    <header><span class="dotc" style="background:${g.color}"></span><h2>${esc(g.key)}</h2><span class="pct" style="color:${g.color}">${g.readyPct}%</span></header>
    <div class="psub">${esc(g.sub || '')} · ${g.doneCount}/${g.totalCount} done</div>
    <div class="mbar"><div class="mfill" style="width:${g.readyPct}%;background:${g.color}"></div></div>
    ${body}
  </section>`;
}

load().catch((e) => { document.getElementById('phases').innerHTML = `<div class="callout">Failed to load: ${esc(e.message)}</div>`; });
