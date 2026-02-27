/**
 * Vercel serverless function — OpenSky Network proxy
 * Fetches 4 global regions in PARALLEL to beat the 10s timeout.
 * Each bbox request is ~300KB vs 1.6MB for global — 4 parallel = ~3s total.
 */

export const maxDuration = 25;

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const OPENSKY_BASE = 'https://opensky-network.org/api/states/all';

// 4 non-overlapping bboxes that cover the whole world
const REGIONS = [
  { lamin: -90, lomin: -180, lamax:  90, lomax:  -90 }, // Americas
  { lamin: -90, lomin:  -90, lamax:  90, lomax:    0 }, // Atlantic + W Africa
  { lamin: -90, lomin:    0, lamax:  90, lomax:   90 }, // Europe + Africa + Middle East
  { lamin: -90, lomin:   90, lamax:  90, lomax:  180 }, // Asia + Pacific
];

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

  if (!res.ok) throw new Error(`Token ${res.status}`);
  const d = await res.json();
  cachedToken = d.access_token;
  tokenExpiresAt = Date.now() + (d.expires_in ?? 1800) * 1000;
  return cachedToken;
}

function parseLean(states) {
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

async function fetchRegion(token, region) {
  const params = new URLSearchParams({
    lamin: region.lamin,
    lomin: region.lomin,
    lamax: region.lamax,
    lomax: region.lomax,
  });
  const url = `${OPENSKY_BASE}?${params}`;
  const headers = { 'Accept': 'application/json', 'User-Agent': 'FlightTracker/1.0' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { headers, signal: AbortSignal.timeout(18000) });
  if (!res.ok) throw new Error(`OpenSky ${res.status} for region ${JSON.stringify(region)}`);
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
    // Get token (falls back to anonymous)
    let token = null;
    try { token = await getAccessToken(); } catch (e) {
      console.warn('[flights] token err, using anon:', e.message);
    }

    const { lamin, lomin, lamax, lomax } = req.query;
    let results;

    if (lamin && lomin && lamax && lomax) {
      // Single custom bbox
      const params = new URLSearchParams({ lamin, lomin, lamax, lomax });
      const headers = { 'Accept': 'application/json', 'User-Agent': 'FlightTracker/1.0' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const r = await fetch(`${OPENSKY_BASE}?${params}`, { headers, signal: AbortSignal.timeout(18000) });
      if (!r.ok) throw new Error(`OpenSky ${r.status}`);
      const raw = await r.json();
      results = [{ time: raw.time, states: raw.states ?? [] }];
    } else {
      // Fetch all 4 regions in parallel
      results = await Promise.all(REGIONS.map(region => fetchRegion(token, region)));
    }

    // Merge + deduplicate by icao24
    const seen = new Set();
    const allStates = [];
    let latestTime = 0;

    for (const { time, states } of results) {
      if (time > latestTime) latestTime = time;
      for (const sv of states) {
        if (!seen.has(sv[0])) {
          seen.add(sv[0]);
          allStates.push(sv);
        }
      }
    }

    const flights = parseLean(allStates);

    res.setHeader('Cache-Control', 's-maxage=8, stale-while-revalidate=5');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ time: latestTime, count: flights.length, flights });

  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'OpenSky timed out.' });
    }
    console.error('[flights] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
