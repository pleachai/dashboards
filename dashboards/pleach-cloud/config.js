// Pleach Cloud points burndown. Sequential P0→P-Launch phases; every issue carries
// a Fibonacci estimate, scope = sum of points, % = donePts / scope, with a capacity
// + launch burndown against the target date. Tickets grouped by projectMilestone.
module.exports = {
  slug: 'pleach-cloud',
  title: 'Pleach Cloud',
  team: 'PLE',
  mode: 'points',
  project: '6abec744-6563-4940-8ddc-f5e6c83a39c8', // Pleach Cloud
  milestones: {
    'P0 · Repo & account setup': { key: 'P0', color: '#8b9bff', sub: 'Foundation' },
    'P1 · Identity': { key: 'P1', color: '#6ad0ff', sub: 'Auth & accounts' },
    'P2 · Verification + Telemetry': { key: 'P2', color: '#5ec8e6', sub: 'Trust & signal' },
    'P3 · Resources + Brain': { key: 'P3', color: '#7c8cff', sub: 'Agent resources' },
    'P4 · Billing + Team tier': { key: 'P4', color: '#ffb454', sub: 'Monetization' },
    'P5 · Enterprise': { key: 'P5', color: '#ff8a5c', sub: 'Enterprise' },
    'P-Launch · Production infra & cutover': { key: 'P-Launch', color: '#5ee6a8', sub: 'Infra & cutover' },
  },
  parkedNumbers: [],
  startDate: '2026-06-01',
  target: '2026-09-01', // burndown deadline — adjust as the plan firms up
  velocity: 5,          // baseline human-verification pace (pts / working day)
};
