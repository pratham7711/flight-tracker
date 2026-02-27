/**
 * Vercel serverless function — authenticated OpenSky Network proxy
 * Uses OAuth2 client credentials flow for higher rate limits (4000 credits/day vs 400)
 *
 * GET /api/flights
 * GET /api/flights?lamin=...&lomin=...&lamax=...&lomax=...  (optional bbox)
 */

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

// In-memory token cache (lives for the duration of the serverless function warm instance)
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();

  // Reuse token if still valid (with 30s buffer)
  if (cachedToken && now < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing OPENSKY_CLIENT_ID or OPENSKY_CLIENT_SECRET env vars');
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`OAuth2 token request failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  // expires_in is in seconds
  tokenExpiresAt = now + (data.expires_in ?? 300) * 1000;

  return cachedToken;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Build OpenSky URL with optional bbox params
    const { lamin, lomin, lamax, lomax } = req.query;
    const params = new URLSearchParams();
    if (lamin) params.set('lamin', lamin);
    if (lomin) params.set('lomin', lomin);
    if (lamax) params.set('lamax', lamax);
    if (lomax) params.set('lomax', lomax);

    const url = `${OPENSKY_URL}${params.toString() ? `?${params}` : ''}`;

    // Get OAuth2 token
    const token = await getAccessToken();

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'FlightTracker/1.0',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (response.status === 429) {
      return res.status(429).json({ error: 'OpenSky rate limit reached. Try again in a few seconds.' });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: `OpenSky returned ${response.status}: ${response.statusText}`,
      });
    }

    const data = await response.json();

    // Cache for 8s on Vercel CDN (just under the 10s poll interval)
    res.setHeader('Cache-Control', 's-maxage=8, stale-while-revalidate=5');
    return res.status(200).json(data);

  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'OpenSky request timed out' });
    }
    console.error('[flights proxy] Error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch flight data' });
  }
}
