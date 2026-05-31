// Config for the "Mac v1" launch dashboard. Add a sibling folder + config to
// stand up another dashboard; register it in lib/registry.js.
module.exports = {
  slug: 'mac-v1',
  title: 'Mac v1',
  team: 'PLE',
  // Milestone display name -> chart key/color/subtitle. Tickets are grouped by
  // their Linear projectMilestone name.
  milestones: {
    'Mac v1 Alpha':  { key: 'Alpha',  color: '#ff8a5c', sub: 'Stability · signing+OTA · login · analytics' },
    'Mac v1 Beta':   { key: 'Beta',   color: '#6ad0ff', sub: 'Soft launch · V1 features' },
    'Mac v1 Launch': { key: 'Launch', color: '#5ee6a8', sub: 'Public-ready' },
  },
  parkedNumbers: [88, 89, 96, 106], // open but intentionally out of V1
  startDate: '2026-06-01',          // burndown start (working days counted Mon-Fri from here)
  target:    '2026-07-01',          // launch deadline
  velocity:  5,                     // baseline human-verification pace (pts / working day)
};
