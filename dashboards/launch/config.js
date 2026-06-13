// Launch rollup — the single cross-project burndown for the Jul 1 launch. Scope =
// all of Mac v1 (the whole project) UNION every ticket tagged `launch` (the curated
// Pleach Cloud subset). One aggregate points burndown to a single target date, with a
// per-source breakdown (Mac v1 vs Cloud) and a module roll-up. Built by buildLaunch()
// (aggregate:true), so it slots into the snapshot + history cron like any dashboard.
module.exports = {
  slug: 'launch',
  title: 'Launch',
  aggregate: true,
  team: 'PLE',
  macProject: '6e605e28-afb2-42dd-8121-09fd23b30d35', // Mac v1 (included wholesale)
  launchLabel: 'launch',                              // curated cross-project launch items
  startDate: '2026-06-01',
  target: '2026-07-01', // single launch date — adjust as the gate firms up
  velocity: 5,          // baseline human-verification pace (pts / working day)
};
