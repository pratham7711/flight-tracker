# ✈️ FlightTracker — Live 3D Globe

A real-time flight tracking web app powered by the **OpenSky Network** API, rendered on an interactive **3D Earth globe** using `globe.gl` + Three.js, built with **React + Vite** and styled with **Tailwind CSS**.

---

## Features

| Feature | Details |
|---|---|
| 🌍 3D Earth Globe | NASA Blue Marble texture with atmosphere glow |
| ✈️ Live Flights | ~10,000 real-time aircraft positions |
| 🔄 Auto-refresh | Every 10 seconds (OpenSky anonymous limit) |
| 🎨 Altitude colors | 🟢 Low < 5km · 🟡 Mid 5–10km · 🔴 High 10km+ |
| 🔍 Search & Filter | By callsign, ICAO24, or country |
| 🖱️ Click to inspect | Callsign · altitude · speed · heading · country |
| 📊 Flight counter | Live count with filter feedback |
| ⚡ Performance | Points layer with merge support for ~10k markers |

---

## Quick Start

```bash
# 1. Install dependencies
cd flight-tracker
npm install

# 2. Start development server
npm run dev

# 3. Open in browser
# http://localhost:3000
```

---

## Build for Production

```bash
npm run build
# Output in ./dist/

npm run preview   # Preview the production build locally
```

---

## Tech Stack

- **React 18** + **Vite 6** — blazing-fast dev server + HMR
- **globe.gl** — WebGL globe with Three.js under the hood
- **Tailwind CSS v3** — utility-first dark UI
- **OpenSky Network API** — free, no auth needed for anonymous access

---

## API Details

- **Endpoint:** `https://opensky-network.org/api/states/all`
- **Rate limit:** Anonymous: 1 request per 10 seconds
- **Proxy:** Vite dev server proxies `/api/opensky/*` → `https://opensky-network.org/api/*` to avoid CORS
- **Fields returned:** `icao24, callsign, origin_country, latitude, longitude, baro_altitude, on_ground, velocity, true_track, vertical_rate`

---

## Project Structure

```
flight-tracker/
├── index.html
├── vite.config.js          # Dev proxy config
├── tailwind.config.js
├── postcss.config.js
├── package.json
├── README.md
└── src/
    ├── main.jsx            # Entry point
    ├── App.jsx             # Root component + state
    ├── index.css           # Global styles + Tailwind
    ├── components/
    │   ├── GlobeView.jsx   # 3D globe (globe.gl)
    │   ├── FlightInfo.jsx  # Selected flight panel
    │   ├── FlightCount.jsx # Live count header
    │   ├── SearchFilter.jsx # Search + altitude filter
    │   ├── LoadingOverlay.jsx # Boot/loading screen
    │   └── Legend.jsx      # Altitude color legend
    ├── hooks/
    │   └── useFlightData.js  # Polling hook with abort
    └── utils/
        └── flightColors.js   # Color + formatting helpers
```

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| Poll interval | 10,000 ms | Edit `POLL_INTERVAL_MS` in `useFlightData.js` |
| Globe texture | NASA Blue Marble | Edit `EARTH_TEXTURE` in `GlobeView.jsx` |
| Alt low band | < 5,000 m | Edit `getAltitudeColor()` in `flightColors.js` |
| Alt mid band | 5,000–10,000 m | Same as above |

---

## Known Limitations

- OpenSky anonymous access: ~1 req/10s, may be unavailable during high load
- Some flights have null positions and are filtered out
- globe.gl uses WebGL — requires a modern browser with GPU acceleration

---

## Credits

- [OpenSky Network](https://opensky-network.org/) — free flight state data
- [globe.gl](https://globe.gl/) — WebGL globe library
- [NASA Blue Marble](https://visibleearth.nasa.gov/collection/1484/blue-marble) — Earth imagery via unpkg CDN
