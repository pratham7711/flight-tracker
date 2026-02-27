import { useState, useMemo, useCallback } from 'react';
import GlobeView from './components/GlobeView';
import FlightInfo from './components/FlightInfo';
import FlightCount from './components/FlightCount';
import SearchFilter from './components/SearchFilter';
import LoadingOverlay from './components/LoadingOverlay';
import Legend from './components/Legend';
import { useFlightData } from './hooks/useFlightData';

export default function App() {
  const { flights, loading, error, lastUpdated, refreshing, manualRefresh } =
    useFlightData();

  const [selectedFlight, setSelectedFlight] = useState(null);
  const [query, setQuery] = useState('');
  const [altitudeFilter, setAltitudeFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('');

  // Sorted unique country list for the country dropdown
  const countries = useMemo(() => {
    const set = new Set(flights.map((f) => f.country).filter(Boolean));
    return Array.from(set).sort();
  }, [flights]);

  // Apply all active filters
  const filteredFlights = useMemo(() => {
    const q = query.toLowerCase().trim();

    return flights.filter((f) => {
      // Text search: callsign or country
      if (q && !f.callsign?.toLowerCase().includes(q) && !f.country?.toLowerCase().includes(q)) {
        return false;
      }

      // Altitude band filter
      if (altitudeFilter !== 'all') {
        if (altitudeFilter === 'ground' && !f.onGround) return false;
        if (altitudeFilter === 'low' && (f.onGround || f.altitude == null || f.altitude >= 5000)) return false;
        if (altitudeFilter === 'mid' && (f.onGround || f.altitude == null || f.altitude < 5000 || f.altitude >= 10000)) return false;
        if (altitudeFilter === 'high' && (f.onGround || f.altitude == null || f.altitude < 10000)) return false;
      }

      // Country filter
      if (countryFilter && f.country !== countryFilter) return false;

      return true;
    });
  }, [flights, query, altitudeFilter, countryFilter]);

  const handleFlightClick = useCallback((flight) => {
    setSelectedFlight((prev) =>
      prev?.icao24 === flight.icao24 ? null : flight
    );
  }, []);

  const handleClose = useCallback(() => {
    setSelectedFlight(null);
  }, []);

  // Show loading/error overlay until we have initial data
  const showOverlay = loading || (error && flights.length === 0);

  return (
    <div
      style={{ background: '#050810' }}
      className="relative w-full h-full overflow-hidden"
    >
      {/* ── Globe (full-screen background) ── */}
      <GlobeView
        flights={filteredFlights}
        onFlightClick={handleFlightClick}
        selectedFlight={selectedFlight}
      />

      {/* ── Top bar: search (left) + title/count/time (center) ── */}
      {!showOverlay && (
        <>
          <SearchFilter
            query={query}
            onQueryChange={setQuery}
            altitudeFilter={altitudeFilter}
            onAltitudeChange={setAltitudeFilter}
            countries={countries}
            countryFilter={countryFilter}
            onCountryChange={setCountryFilter}
          />

          <FlightCount
            total={flights.length}
            filtered={filteredFlights.length}
            lastUpdated={lastUpdated}
            refreshing={refreshing}
            onRefresh={manualRefresh}
          />

          <Legend />
        </>
      )}

      {/* ── Flight detail side panel ── */}
      {selectedFlight && !showOverlay && (
        <FlightInfo flight={selectedFlight} onClose={handleClose} />
      )}

      {/* ── Loading / Error overlay ── */}
      {showOverlay && <LoadingOverlay error={error} />}

      {/* ── Soft error banner (non-fatal — data already loaded) ── */}
      {error && flights.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <div className="glass-panel px-4 py-2 flex items-center gap-3
                          border-red-500/30 bg-red-900/20">
            <span className="text-red-400 text-sm">⚠ Refresh failed</span>
            <button
              onClick={manualRefresh}
              className="text-xs text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
