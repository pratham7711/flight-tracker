/**
 * Vercel Edge Function — OpenSky Network proxy
 * Runs on Cloudflare/edge network (not blocked by OpenSky like AWS Lambda IPs)
 * OAuth2 client credentials | 4 parallel regions | lean payload
 */

export const config = { runtime: 'edge' };

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const OPENSKY_BASE = 'https://opensky-network.org/api/states/all';

// 4 non-overlapping bboxes covering the whole world
const REGIONS = [
  { lamin: -90, lomin: -180, lamax: 90, lomax:  -90 }, // Americas
  { lamin: -90, lomin:  -90, lamax: 90, lomax:    0 }, // Atlantic + W Africa
  { lamin: -90, lomin:    0, lamax: 90, lomax:   90 }, // Europe + Africa
  { lamin: -90, lomin:   90, lamax: 90, lomax:  180 }, // Asia + Pacific
];

async function getToken(clientId, clientSecret) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Token ${res.status}`);
  const d = await res.json();
  return d.access_token;
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
  const params = new URLSearchParams(Object.entries(region).map(([k, v]) => [k, String(v)]));
  const headers = { 'Accept': 'application/json', 'User-Agent': 'FlightTracker/1.0' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${OPENSKY_BASE}?${params}`, { headers });
  if (!res.ok) throw new Error(`OpenSky ${res.status}`);
  const raw = await res.json();
  return { time: raw.time ?? 0, states: raw.states ?? [] };
}

export default async function handler(req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const clientId = process.env.OPENSKY_CLIENT_ID;
    const clientSecret = process.env.OPENSKY_CLIENT_SECRET;

    // Get token (fall back to anon if creds missing)
    let token = null;
    if (clientId && clientSecret) {
      try { token = await getToken(clientId, clientSecret); } catch (e) {
        console.warn('Token error, using anon:', e.message);
      }
    }

    // Parse optional custom bbox from query
    const url = new URL(req.url);
    const lamin = url.searchParams.get('lamin');
    const lomin = url.searchParams.get('lomin');
    const lamax = url.searchParams.get('lamax');
    const lomax = url.searchParams.get('lomax');

    let results;
    if (lamin && lomin && lamax && lomax) {
      results = [await fetchRegion(token, { lamin, lomin, lamax, lomax })];
    } else {
      // Parallel fetch all 4 regions
      results = await Promise.all(REGIONS.map(r => fetchRegion(token, r)));
    }

    // Merge + deduplicate
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
    const body = JSON.stringify({ time: latestTime, count: flights.length, flights });

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=8, stale-while-revalidate=5',
      },
    });

  } catch (err) {
    console.error('[flights edge] error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
