import { useState, useEffect, useCallback, useRef } from 'react';

const POLL_INTERVAL_MS = 10_000; // 10s poll
const OPENSKY_URL = '/api/flights';  // Vercel serverless proxy (dev + prod)

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

      if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);

      const data = await res.json();

      // Serverless function returns { time, count, flights: [...] }
      // Each flight already has: icao24, callsign, country, longitude, latitude,
      // altitude, onGround, velocity, heading, verticalRate
      const parsed = data?.flights ?? [];

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
