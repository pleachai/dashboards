// Mac v2 — Multi-Agent Runtime. Points burndown: every issue carries a Fibonacci
// estimate; scope = sum of points, % = donePts / scope, with a capacity + launch
// burndown against the target date. Tickets are grouped by projectMilestone.
module.exports = {
  slug: 'mac-v2',
  title: 'Mac v2 · Multi-Agent Runtime',
  team: 'PLE',
  mode: 'points',
  project: '9a2c86fc-54ce-4bc5-b65c-0fc1f606d3fd', // Workforce — Mac v2: Multi-Agent Runtime
  // Keys MUST match the Linear projectMilestone names exactly (Linear is the source of
  // truth — if the team renames a milestone there, mirror it here or its tickets vanish).
  milestones: {
    'M1 · The seam — interface · event bus · runtime families': { key: 'M1',    color: '#6ad0ff', sub: 'Interface · event bus · runtime families · no user-visible change' },
    'M2 · Terminal observability — Claude CLI':                  { key: 'M2',    color: '#5ee6a8', sub: 'Tool-call/diff observability on the Claude CLI' },
    'M-PROOF · Prove the hedge — a non-Claude backend':         { key: 'PROOF', color: '#ffb454', sub: '★ A non-Claude backend end-to-end — makes the hedge real' },
    'M3 · Terminal backend #2 — Codex CLI':                      { key: 'M3',    color: '#b48ead', sub: 'Second terminal backend — Codex CLI' },
    'M4 · SDK runtime + first driver — Claude Agent SDK':        { key: 'M4',    color: '#7c8cff', sub: 'SDK runtime + first driver — Claude Agent SDK' },
    'M5 · More vendor SDK drivers':                              { key: 'M5',    color: '#ff8a5c', sub: 'More vendor SDK drivers' },
    'M6 · Engine UX · cost · cloud · settings · mobile':         { key: 'M6',    color: '#8fa6b2', sub: 'Engine picker · cost · cloud · settings · mobile' },
  },
  parkedNumbers: [],
  startDate: '2026-06-11',
  target: '2026-09-01', // burndown deadline — adjust as the plan firms up
  velocity: 5,          // baseline human-verification pace (pts / working day)
};
