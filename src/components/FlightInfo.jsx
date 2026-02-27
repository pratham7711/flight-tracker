import { useEffect, useRef } from 'react';
import {
  formatAltitude,
  formatSpeed,
  formatHeading,
  getAltitudeBand,
  getAltitudeHex,
} from '../utils/flightColors';

function InfoRow({ label, value, valueClass = '' }) {
  return (
    <div className="flex items-start justify-between gap-2 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 min-w-[80px]">{label}</span>
      <span className={`text-xs font-medium text-right break-all ${valueClass}`}>{value}</span>
    </div>
  );
}

function AltitudeBadge({ altitude, onGround }) {
  const band = getAltitudeBand(altitude, onGround);
  const hex = getAltitudeHex(altitude, onGround);
  const label = band;
  const classes = {
    'On Ground': 'bg-slate-600/40 text-slate-300 border-slate-500/40',
    'Low': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    'Mid': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'High': 'bg-red-500/20 text-red-300 border-red-500/40',
    'Unknown': 'bg-slate-600/40 text-slate-300 border-slate-500/40',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${classes[label] || classes['Unknown']}`}
    >
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ backgroundColor: hex }}
      />
      {label}
    </span>
  );
}

export default function FlightInfo({ flight, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!flight) return null;

  const {
    callsign,
    icao24,
    country,
    altitude,
    onGround,
    velocity,
    heading,
    verticalRate,
    latitude,
    longitude,
  } = flight;

  const vertDir =
    verticalRate == null
      ? null
      : verticalRate > 0.5
      ? '↑ Climbing'
      : verticalRate < -0.5
      ? '↓ Descending'
      : '→ Level';

  return (
    <div
      ref={panelRef}
      className="slide-in-right fixed right-4 top-1/2 -translate-y-1/2 z-30
                 w-72 glass-panel shadow-glow overflow-hidden"
      role="dialog"
      aria-label={`Flight details for ${callsign}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-blue-900/30 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="text-2xl">✈️</div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              {callsign || icao24}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{icao24?.toUpperCase()}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors w-7 h-7
                     flex items-center justify-center rounded-lg hover:bg-white/10"
          aria-label="Close flight details"
        >
          ✕
        </button>
      </div>

      {/* Badge */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-2 flex-wrap">
        <AltitudeBadge altitude={altitude} onGround={onGround} />
        {onGround && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/40">
            🛬 Ground
          </span>
        )}
      </div>

      {/* Details */}
      <div className="px-4 pb-4 pt-2 info-panel-scroll scrollbar-thin">
        <InfoRow label="Country" value={country} valueClass="text-slate-200" />
        <InfoRow
          label="Altitude"
          value={formatAltitude(altitude, onGround)}
          valueClass="text-slate-200"
        />
        <InfoRow
          label="Speed"
          value={formatSpeed(velocity)}
          valueClass="text-slate-200"
        />
        <InfoRow
          label="Heading"
          value={formatHeading(heading)}
          valueClass="text-slate-200"
        />
        {vertDir && (
          <InfoRow
            label="Vertical"
            value={`${vertDir} (${Math.abs(Math.round((verticalRate ?? 0) * 196.85))} ft/min)`}
            valueClass={
              verticalRate > 0.5
                ? 'text-emerald-300'
                : verticalRate < -0.5
                ? 'text-red-300'
                : 'text-slate-200'
            }
          />
        )}
        <InfoRow
          label="Position"
          value={`${latitude?.toFixed(3)}°, ${longitude?.toFixed(3)}°`}
          valueClass="text-slate-300 font-mono text-xs"
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-white/3 border-t border-white/5">
        <p className="text-xs text-slate-500 text-center">
          Data via OpenSky Network
        </p>
      </div>
    </div>
  );
}
