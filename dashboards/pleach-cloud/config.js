// Pleach Cloud roadmap dashboard. Sequential P0→P-Launch phases; each Linear
// issue in a phase is a roadmap item. % built = done items / total items.
module.exports = {
  slug: 'pleach-cloud',
  title: 'Pleach Cloud',
  team: 'PLE',
  mode: 'readiness',
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
  // no target/velocity — this is a roadmap, not a date-gated burndown
};
