import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL_MS = 10_000; // 10s — OpenSky anonymous rate limit
const OPENSKY_URL = '/api/opensky/states/all';

/**
 * OpenSky state vector field indices:
 * 0  icao24
 * 1  callsign
 * 2  origin_country
 * 3  time_position
 * 4  last_contact
 * 5  longitude
 * 6  latitude
 * 7  baro_altitude
 * 8  on_ground
 * 9  velocity
 * 10 true_track (heading)
 * 11 vertical_rate
 * 12 sensors
 * 13 geo_altitude
 * 14 squawk
 * 15 spi
 * 16 position_source
 */
function parseState(sv) {
  return {
    icao24: sv[0],
    callsign: sv[1]?.trim() || sv[0],
    country: sv[2] || 'Unknown',
    longitude: sv[5],
    latitude: sv[6],
    altitude: sv[7],     // baro altitude in metres
    onGround: sv[8],
    velocity: sv[9],     // m/s
    heading: sv[10],
    verticalRate: sv[11],
  };
}

export function useFlightData() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const timerRef = useRef(null);
  const abortRef = useRef(null);

  const fetchFlights = useCallback(async (isInitial = false) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    if (!isInitial) setRefreshing(true);

    try {
      const res = await fetch(OPENSKY_URL, {
        signal: abortRef.current.signal,
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) throw new Error(`OpenSky API error: ${res.status} ${res.statusText}`);

      const data = await res.json();
      const states = data?.states ?? [];

      // Filter out entries with no position and parse
      const parsed = states
        .filter(sv => sv[5] !== null && sv[6] !== null)
        .map(parseState);

      setFlights(parsed);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[FlightTracker] Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFlights(true);

    timerRef.current = setInterval(() => fetchFlights(false), POLL_INTERVAL_MS);

    return () => {
      clearInterval(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchFlights]);

  const manualRefresh = useCallback(() => {
    clearInterval(timerRef.current);
    fetchFlights(false);
    timerRef.current = setInterval(() => fetchFlights(false), POLL_INTERVAL_MS);
  }, [fetchFlights]);

  return { flights, loading, error, lastUpdated, refreshing, manualRefresh };
}
