// GTM launch-readiness dashboard. Each milestone is a phase; each Linear issue
// in that milestone is a readiness item. % ready = done items / total items.
module.exports = {
  slug: 'gtm',
  title: 'GTM',
  team: 'PLE',
  mode: 'readiness',
  project: '801df140-db2d-4f49-a6a7-2f8e8b4a84f5', // GTM
  milestones: {
    'GTM Alpha':  { key: 'Alpha',  color: '#ff8a5c', sub: 'Tight — internal/dogfood GTM' },
    'GTM Beta':   { key: 'Beta',   color: '#6ad0ff', sub: 'Super tight — tester-facing GTM' },
    'GTM Launch': { key: 'Launch', color: '#5ee6a8', sub: 'Launch-ready — full GTM' },
  },
  parkedNumbers: [],
  startDate: '2026-06-01',
  target: '2026-07-01',
  velocity: 5,
};
