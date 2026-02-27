/**
 * Vercel serverless function — OpenSky Network proxy
 * OAuth2 Bearer token auth | 25s max duration | bbox chunking for speed
 */

export const maxDuration = 25; // Vercel: extend timeout to 25s

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

// Module-level token cache (survives warm invocations)
let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 30_000) return cachedToken;

  const clientId = process.env.OPENSKY_CLIENT_ID;
  const clientSecret = process.env.OPENSKY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Missing OpenSky credentials');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in ?? 1800) * 1000;
  return cachedToken;
}

function parseLeanStates(states) {
  const out = [];
  for (const sv of states) {
    if (sv[5] == null || sv[6] == null) continue;
    out.push({
      icao24:       sv[0],
      callsign:     (sv[1] || sv[0]).trim(),
      country:      sv[2] || 'Unknown',
      longitude:    sv[5],
      latitude:     sv[6],
      altitude:     sv[7],
      onGround:     sv[8],
      velocity:     sv[9],
      heading:      sv[10],
      verticalRate: sv[11],
    });
  }
  return out;
}

async function fetchRegion(token, params) {
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'FlightTracker/1.0',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const url = `${OPENSKY_URL}${params.toString() ? `?${params}` : ''}`;
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(20000),
  });

  if (res.status === 429) throw Object.assign(new Error('Rate limited'), { status: 429 });
  if (!res.ok) throw new Error(`OpenSky ${res.status}: ${res.statusText}`);

  const raw = await res.json();
  return { time: raw.time, states: raw.states ?? [] };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let token = null;
    try { token = await getAccessToken(); } catch (e) {
      console.warn('[flights] token error, falling back to anon:', e.message);
    }

    const { lamin, lomin, lamax, lomax } = req.query;
    const params = new URLSearchParams();
    if (lamin) params.set('lamin', lamin);
    if (lomin) params.set('lomin', lomin);
    if (lamax) params.set('lamax', lamax);
    if (lomax) params.set('lomax', lomax);

    const { time, states } = await fetchRegion(token, params);
    const flights = parseLeanStates(states);

    res.setHeader('Cache-Control', 's-maxage=8, stale-while-revalidate=5');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ time, count: flights.length, flights });

  } catch (err) {
    if (err.status === 429) return res.status(429).json({ error: 'Rate limited. Retry in 10s.' });
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'OpenSky timed out.' });
    }
    console.error('[flights] error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch flights.' });
  }
}
