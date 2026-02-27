import { useRef } from 'react';

export default function SearchFilter({
  query,
  onQueryChange,
  altitudeFilter,
  onAltitudeChange,
  countries,
  countryFilter,
  onCountryChange,
}) {
  const inputRef = useRef(null);

  const altBands = [
    { value: 'all', label: 'All altitudes' },
    { value: 'ground', label: '🛬 On ground' },
    { value: 'low', label: '🟢 Low (< 5km)' },
    { value: 'mid', label: '🟡 Mid (5–10km)' },
    { value: 'high', label: '🔴 High (10km+)' },
  ];

  return (
    <div className="slide-in-left fixed left-4 top-4 z-30 flex flex-col gap-2 w-72">
      {/* Search box */}
      <div className="glass-panel p-3 flex items-center gap-2">
        <span className="text-slate-400 text-sm shrink-0">🔍</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search callsign or country..."
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500
                     outline-none border-none focus:ring-0 min-w-0"
          aria-label="Search flights by callsign or country"
        />
        {query && (
          <button
            onClick={() => {
              onQueryChange('');
              inputRef.current?.focus();
            }}
            className="text-slate-500 hover:text-slate-300 transition-colors text-xs"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Altitude filter */}
      <div className="glass-panel p-3">
        <label className="text-xs text-slate-400 mb-2 block">Altitude Band</label>
        <div className="flex flex-wrap gap-1.5">
          {altBands.map((band) => (
            <button
              key={band.value}
              onClick={() => onAltitudeChange(band.value)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                altitudeFilter === band.value
                  ? 'bg-blue-500/30 border-blue-400/60 text-blue-300'
                  : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
              }`}
              aria-pressed={altitudeFilter === band.value}
            >
              {band.label}
            </button>
          ))}
        </div>
      </div>

      {/* Country filter */}
      {countries.length > 0 && (
        <div className="glass-panel p-3">
          <label className="text-xs text-slate-400 mb-2 block">
            Country
          </label>
          <select
            value={countryFilter}
            onChange={(e) => onCountryChange(e.target.value)}
            className="w-full bg-dark-700/60 text-sm text-slate-200 rounded-lg px-2.5 py-1.5
                       border border-white/10 outline-none focus:border-blue-400/50
                       cursor-pointer"
            aria-label="Filter by country"
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
