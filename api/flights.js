/**
 * Vercel serverless function — proxies OpenSky Network API
 * Handles CORS so the React app can call /api/flights from the browser in production.
 *
 * GET /api/flights
 * GET /api/flights?lamin=...&lomin=...&lamax=...&lomax=...  (optional bbox)
 */
export default async function handler(req, res) {
  // Allow browser requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forward any bbox query params if provided
    const { lamin, lomin, lamax, lomax } = req.query;
    const params = new URLSearchParams();
    if (lamin) params.set('lamin', lamin);
    if (lomin) params.set('lomin', lomin);
    if (lamax) params.set('lamax', lamax);
    if (lomax) params.set('lomax', lomax);

    const queryString = params.toString();
    const url = `https://opensky-network.org/api/states/all${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FlightTracker/1.0',
      },
      // 9s timeout — OpenSky can be slow under load
      signal: AbortSignal.timeout(9000),
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: `OpenSky returned ${response.status}: ${response.statusText}`,
      });
    }

    const data = await response.json();

    // Cache for 8s (just under the 10s poll interval)
    res.setHeader('Cache-Control', 's-maxage=8, stale-while-revalidate=5');
    return res.status(200).json(data);
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'OpenSky request timed out' });
    }
    console.error('[flights proxy] Error:', err);
    return res.status(500).json({ error: 'Failed to fetch flight data' });
  }
}
