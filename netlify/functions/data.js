// Live data endpoint: GET /.netlify/functions/data?d=mac-v1
// Holds LINEAR_API_KEY server-side; the browser never sees it.
const registry = require('../../lib/registry');
const { buildModel } = require('../../lib/linear');

exports.handler = async (event) => {
  const slug = (event.queryStringParameters && event.queryStringParameters.d) || 'mac-v1';
  const cfg = registry[slug];
  if (!cfg) return { statusCode: 404, body: JSON.stringify({ error: `unknown dashboard '${slug}'` }) };
  try {
    const model = await buildModel(cfg);
    model.generatedAt = new Date().toISOString();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        // serve cached for 60s, allow stale-while-revalidate for snappy loads
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(model),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};
