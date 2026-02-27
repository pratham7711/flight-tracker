/**
 * Color-code flights by altitude:
 *  green  → 0–5,000 m  (low)
 *  yellow → 5,000–10,000 m  (mid)
 *  red    → 10,000+ m  (high / cruising)
 *  grey   → on ground
 */

export function getAltitudeColor(altitude, onGround) {
  if (onGround || altitude === null || altitude === undefined) {
    return 'rgba(120, 120, 140, 0.85)'; // ground: grey
  }

  if (altitude < 5000) {
    // Low altitude: bright green with slight glow
    return 'rgba(52, 211, 153, 0.9)';   // emerald-400
  } else if (altitude < 10000) {
    // Mid altitude: amber/yellow
    return 'rgba(251, 191, 36, 0.9)';   // amber-400
  } else {
    // High altitude (cruising): coral/red
    return 'rgba(248, 113, 113, 0.9)';  // red-400
  }
}

/**
 * Returns a CSS hex string for use in Three.js material colors
 */
export function getAltitudeHex(altitude, onGround) {
  if (onGround || altitude === null || altitude === undefined) return '#78788c';
  if (altitude < 5000) return '#34d399';
  if (altitude < 10000) return '#fbbf24';
  return '#f87171';
}

/**
 * Human-readable altitude band label
 */
export function getAltitudeBand(altitude, onGround) {
  if (onGround) return 'On Ground';
  if (altitude === null || altitude === undefined) return 'Unknown';
  if (altitude < 5000) return 'Low';
  if (altitude < 10000) return 'Mid';
  return 'High';
}

/**
 * Format altitude for display
 */
export function formatAltitude(altitude, onGround) {
  if (onGround) return 'On ground';
  if (altitude === null || altitude === undefined) return 'N/A';
  const ft = Math.round(altitude * 3.28084);
  return `${ft.toLocaleString()} ft (${Math.round(altitude).toLocaleString()} m)`;
}

/**
 * Format speed for display
 */
export function formatSpeed(velocity) {
  if (velocity === null || velocity === undefined) return 'N/A';
  const kts = Math.round(velocity * 1.94384);
  return `${kts} kts (${Math.round(velocity * 3.6)} km/h)`;
}

/**
 * Format heading to compass direction
 */
export function formatHeading(heading) {
  if (heading === null || heading === undefined) return 'N/A';
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const idx = Math.round(heading / 22.5) % 16;
  return `${Math.round(heading)}° ${dirs[idx]}`;
}
