// Register every dashboard config here. The function + snapshot script resolve
// a dashboard by slug from this map. Add a new dashboard → add one line.
module.exports = {
  'mac-v1': require('../dashboards/mac-v1/config'),
  'mac-v2': require('../dashboards/mac-v2/config'),
  'gtm': require('../dashboards/gtm/config'),
  'pleach-cloud': require('../dashboards/pleach-cloud/config'),
  'launch': require('../dashboards/launch/config'),
};
