import { useEffect, useState } from 'react';

const MESSAGES = [
  'Connecting to OpenSky Network…',
  'Fetching global flight states…',
  'Mapping aircraft positions…',
  'Initializing 3D globe…',
  'Almost there…',
];

export default function LoadingOverlay({ error }) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (error) return;
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length);
    }, 1200);
    return () => clearInterval(t);
  }, [error]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-dark-900">
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.1,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center space-y-6 max-w-sm px-6">
        {error ? (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-white font-bold text-xl">Connection Error</h1>
            <p className="text-slate-400 text-sm leading-relaxed">{error}</p>
            <p className="text-slate-500 text-xs">
              OpenSky Network may be rate-limiting anonymous requests.
              <br />
              The app will retry automatically.
            </p>
            <div className="mt-4 px-4 py-2 bg-red-900/30 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-xs font-mono break-all">{error}</p>
            </div>
          </>
        ) : (
          <>
            {/* Animated globe icon */}
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-blue-400/50 animate-ping [animation-delay:0.3s]" />
              <div className="absolute inset-0 flex items-center justify-center text-5xl">
                🌍
              </div>
            </div>

            <div>
              <h1 className="text-white font-bold text-2xl text-glow mb-2">
                FlightTracker
              </h1>
              <p className="text-slate-400 text-sm">
                Live global flight tracking
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>

            <p className="text-slate-500 text-xs transition-all duration-500 h-4">
              {MESSAGES[msgIdx]}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
