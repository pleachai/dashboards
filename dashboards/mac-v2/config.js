// Mac v2 — Multi-Agent Runtime. Points burndown: every issue carries a Fibonacci
// estimate; scope = sum of points, % = donePts / scope, with a capacity + launch
// burndown against the target date. Tickets are grouped by projectMilestone.
module.exports = {
  slug: 'mac-v2',
  title: 'Mac v2 · Multi-Agent Runtime',
  team: 'PLE',
  mode: 'points',
  project: '9a2c86fc-54ce-4bc5-b65c-0fc1f606d3fd', // Workforce — Mac v2: Multi-Agent Runtime
  // Keys MUST match the Linear projectMilestone names exactly.
  milestones: {
    'M1 · The runtime seam':                    { key: 'M1',    color: '#6ad0ff', sub: 'Interface + event bus + tmux refactor · no user-visible change' },
    'M2 · Structured on the subscription':      { key: 'M2',    color: '#5ee6a8', sub: 'Tool-call/diff observability on the sub · free win' },
    'M-PROOF · Prove portability':              { key: 'PROOF', color: '#ffb454', sub: '★ Qwen-via-Bedrock end-to-end — this makes the hedge real' },
    'M3 · SdkRuntime + structured experience':  { key: 'M3',    color: '#b48ead', sub: 'Agent-SDK adapter · steering · gating (metered)' },
    'M4 · More backends & cloud':               { key: 'M4',    color: '#ff8a5c', sub: 'Codex/Qwen terminals · cloud location' },
    'M5 · Views & mobile parity':               { key: 'M5',    color: '#8fa6b2', sub: 'Engine picker · chips · Settings → Engines · mobile' },
  },
  parkedNumbers: [],
  startDate: '2026-06-11',
  target: '2026-09-01', // burndown deadline — adjust as the plan firms up
  velocity: 5,          // baseline human-verification pace (pts / working day)
};
