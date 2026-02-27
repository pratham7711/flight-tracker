export default function Legend() {
  const items = [
    { color: '#34d399', label: 'Low  < 5km' },
    { color: '#fbbf24', label: 'Mid  5–10km' },
    { color: '#f87171', label: 'High 10km+' },
    { color: '#78788c', label: 'Ground' },
  ];

  return (
    <div className="fixed bottom-4 left-4 z-30">
      <div className="glass-panel-sm px-3 py-2.5">
        <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">
          Altitude
        </p>
        <div className="flex flex-col gap-1.5">
          {items.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
              />
              <span className="text-xs text-slate-400 font-mono">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
