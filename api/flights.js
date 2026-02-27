/**
 * Vercel serverless function — flight data proxy via adsb.lol
 * Free, no auth required, ~12k live flights globally, ~2s response
 * API: https://api.adsb.lol/v2/lat/{lat}/lon/{lon}/dist/{dist}
 */

export const maxDuration = 15;

const ADSB_URL = 'https://api.adsb.lol/v2/lat/0/lon/0/dist/9999';

function parseFlight(ac) {
  // Skip aircraft with no position
  if (ac.lat == null || ac.lon == null) return null;

  return {
    icao24:       ac.hex || '',
    callsign:     (ac.flight || ac.hex || '').trim(),
    country:      ac.r || '',           // registration (best proxy for country we have)
    longitude:    ac.lon,
    latitude:     ac.lat,
    altitude:     ac.alt_baro != null   // feet → metres
      ? (typeof ac.alt_baro === 'number' ? Math.round(ac.alt_baro * 0.3048) : null)
      : null,
    onGround:     ac.alt_baro === 'ground' || ac.gs < 30,
    velocity:     ac.gs != null ? Math.round(ac.gs * 0.514444) : null, // knots → m/s
    heading:      ac.track ?? ac.true_heading ?? null,
    verticalRate: ac.baro_rate != null
      ? Math.round(ac.baro_rate * 0.00508)   // ft/min → m/s
      : null,
    type:         ac.t || null,         // aircraft type e.g. B738
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const response = await fetch(ADSB_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FlightTracker/1.0',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `adsb.lol error: ${response.status}` });
    }

    const raw = await response.json();
    const flights = (raw.ac ?? []).map(parseFlight).filter(Boolean);

    res.setHeader('Cache-Control', 's-maxage=8, stale-while-revalidate=5');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      time: Math.floor((raw.now ?? Date.now()) / 1000),
      count: flights.length,
      flights,
    });

  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out.' });
    }
    console.error('[flights] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
