/* Shared burndown SVG + date helpers. Loaded as a classic <script> BEFORE a page's
   app.js, so these top-level consts/functions are visible to it. Extracted verbatim
   from the per-project renderer so every dashboard draws an identical chart. */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const A = (o) => Object.entries(o).map(([k, v]) => `${k}="${v}"`).join(' ');
const E = (tag, attrs, inner) => `<${tag} ${A(attrs)}${inner == null ? '/>' : `>${inner}</${tag}>`}`;
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildDays(startISO, calDays) {
  const out = []; let t = new Date(startISO + 'T00:00:00Z'); let wd = 0;
  for (let k = 0; k <= calDays; k++) { const dow = t.getUTCDay(); const we = dow === 0 || dow === 6; if (!we) wd++; out.push({ iso: t.toISOString().slice(0, 10), m: t.getUTCMonth(), day: t.getUTCDate(), dow, we, wd }); t = new Date(t.getTime() + 86400000); }
  return out;
}
const workdaysBetween = (a, b) => buildDays(a, Math.round((new Date(b) - new Date(a)) / 86400000)).filter((d) => !d.we && d.iso < b).length;

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
