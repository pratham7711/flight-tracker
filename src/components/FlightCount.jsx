export default function FlightCount({
  total,
  filtered,
  lastUpdated,
  refreshing,
  onRefresh,
}) {
  const timeStr = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  const isFiltered = filtered !== total;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-30">
      <div className="glass-panel px-5 py-3 flex items-center gap-4 shadow-glow-sm">
        {/* Title */}
        <div className="flex items-center gap-2">
          <span className="text-lg">✈️</span>
          <span className="text-white font-bold text-sm tracking-wider uppercase">
            FlightTracker
          </span>
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Count */}
        <div className="text-center">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-blue-400 text-glow tabular-nums">
              {isFiltered ? filtered.toLocaleString() : total.toLocaleString()}
            </span>
            {isFiltered && (
              <span className="text-xs text-slate-500">
                / {total.toLocaleString()}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-none mt-0.5">
            {isFiltered ? 'filtered flights' : 'live flights'}
          </p>
        </div>

        <div className="w-px h-6 bg-white/10" />

        {/* Time + refresh */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-slate-400">Last updated</p>
            <p className="text-xs text-slate-200 font-mono">{timeStr}</p>
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={`w-7 h-7 flex items-center justify-center rounded-lg
                        border border-white/10 text-slate-400 hover:text-white
                        hover:border-white/20 transition-all disabled:opacity-50
                        hover:bg-white/5`}
            title="Refresh now"
            aria-label="Refresh flight data"
          >
            <span className={refreshing ? 'spin-slow inline-block' : ''}>↻</span>
          </button>
        </div>
      </div>
    </div>
  );
}
