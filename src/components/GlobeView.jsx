import { useEffect, useRef, useCallback } from 'react';
import Globe from 'globe.gl';
import * as THREE from 'three';
import { getAltitudeColor } from '../utils/flightColors';

const EARTH_TEXTURE = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const BUMP_MAP = 'https://unpkg.com/three-globe/example/img/earth-topology.png';

const ZOOM_THRESHOLD = 1.8;
const SPRITE_LIMIT = 500;

// ─── Canvas-based airplane sprite factory ────────────────────────────────────
function makeAirplaneObject(flight) {
  const color = getAltitudeColor(flight.altitude, flight.onGround);

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;

  // Body
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.lineTo(38, 36);
  ctx.lineTo(32, 32);
  ctx.lineTo(26, 36);
  ctx.closePath();
  ctx.fill();

  // Left wing
  ctx.beginPath();
  ctx.moveTo(30, 22);
  ctx.lineTo(4, 40);
  ctx.lineTo(28, 34);
  ctx.closePath();
  ctx.fill();

  // Right wing
  ctx.beginPath();
  ctx.moveTo(34, 22);
  ctx.lineTo(60, 40);
  ctx.lineTo(36, 34);
  ctx.closePath();
  ctx.fill();

  // Left tail fin
  ctx.beginPath();
  ctx.moveTo(29, 34);
  ctx.lineTo(22, 52);
  ctx.lineTo(31, 46);
  ctx.closePath();
  ctx.fill();

  // Right tail fin
  ctx.beginPath();
  ctx.moveTo(35, 34);
  ctx.lineTo(42, 52);
  ctx.lineTo(33, 46);
  ctx.closePath();
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });

  // Rotate sprite to match flight heading (clockwise from north)
  if (flight.heading != null) {
    material.rotation = -(flight.heading * Math.PI / 180);
  }

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.2, 1.2, 1.2);
  return sprite;
}

// ─── Return only the N closest flights to camera POV ─────────────────────────
function getNearbyFlights(flights, pov, limit = SPRITE_LIMIT) {
  const { lat, lng } = pov;
  return flights
    .filter((f) => f.latitude != null && f.longitude != null)
    .sort((a, b) => {
      const dA = Math.abs(a.latitude - lat) + Math.abs(a.longitude - lng);
      const dB = Math.abs(b.latitude - lat) + Math.abs(b.longitude - lng);
      return dA - dB;
    })
    .slice(0, limit);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function GlobeView({ flights, onFlightClick, selectedFlight }) {
  const containerRef = useRef(null);
  const globeRef = useRef(null);
  const initialized = useRef(false);
  const prevFlightCount = useRef(0);

  // Mutable refs so zoom-toggle closure always sees the latest values
  const flightsRef = useRef([]);
  const useSpritesRef = useRef(false);

  const initGlobe = useCallback(() => {
    if (!containerRef.current || initialized.current) return;
    initialized.current = true;

    const globe = Globe({
      animateIn: true,
      rendererConfig: { antialias: true, powerPreference: 'high-performance' },
    })(containerRef.current);

    globe
      .globeImageUrl(EARTH_TEXTURE)
      .bumpImageUrl(BUMP_MAP)
      .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
      .showAtmosphere(true)
      .atmosphereColor('#1a6eb5')
      .atmosphereAltitude(0.18)
      .width(containerRef.current.clientWidth)
      .height(containerRef.current.clientHeight);

    // ── Points layer (zoomed-out, fast for ~10k markers) ──
    globe
      .pointsData([])
      .pointLat((d) => d.latitude)
      .pointLng((d) => d.longitude)
      .pointAltitude((d) => {
        if (d.onGround || !d.altitude) return 0.001;
        return Math.min(d.altitude / 1_000_000, 0.05);
      })
      .pointColor((d) => getAltitudeColor(d.altitude, d.onGround))
      .pointRadius((d) =>
        selectedFlight && d.icao24 === selectedFlight.icao24 ? 0.55 : 0.28
      )
      .pointResolution(4)
      .pointsMerge(false)
      .onPointClick((point) => {
        if (onFlightClick) onFlightClick(point);
      })
      .onPointHover((point) => {
        if (containerRef.current) {
          containerRef.current.style.cursor = point ? 'pointer' : 'default';
        }
      });

    // ── Objects layer (zoomed-in airplane sprites) ──
    globe
      .objectsData([])
      .objectLat((d) => d.latitude)
      .objectLng((d) => d.longitude)
      .objectAltitude((d) =>
        d.onGround ? 0.001 : Math.min((d.altitude || 0) / 1_000_000, 0.05)
      )
      .objectThreeObject((d) => makeAirplaneObject(d))
      .onObjectClick((point) => {
        if (onFlightClick) onFlightClick(point);
      })
      .onObjectHover((obj) => {
        if (containerRef.current) {
          containerRef.current.style.cursor = obj ? 'pointer' : 'default';
        }
      });

    // ── Camera controls ──
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 150;
    controls.maxDistance = 600;

    // Pause auto-rotation when the user grabs the globe
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
    });

    // ── Zoom-aware mode switching ──
    controls.addEventListener('change', () => {
      const pov = globe.pointOfView();
      const shouldUseSprites = pov.altitude < ZOOM_THRESHOLD;

      if (shouldUseSprites !== useSpritesRef.current) {
        useSpritesRef.current = shouldUseSprites;

        if (shouldUseSprites) {
          // Switch to sprite mode
          globe.pointsData([]);
          const nearby = getNearbyFlights(flightsRef.current, pov);
          globe.objectsData(nearby);
        } else {
          // Switch back to dot mode
          globe.objectsData([]);
          globe.pointsData(flightsRef.current);
        }
      } else if (shouldUseSprites) {
        // Already in sprite mode — refresh nearby when camera moves
        const nearby = getNearbyFlights(flightsRef.current, pov);
        globe.objectsData(nearby);
      }
    });

    globeRef.current = globe;

    // Handle window resize
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        globe
          .width(containerRef.current.clientWidth)
          .height(containerRef.current.clientHeight);
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initGlobe();
  }, [initGlobe]);

  // Push updated flight data to the globe (respects current display mode)
  useEffect(() => {
    if (!globeRef.current) return;

    // Always keep the ref up-to-date so zoom toggle has latest data
    flightsRef.current = flights;

    const delta = Math.abs(flights.length - prevFlightCount.current);
    const smallSet = flights.length < 200;

    if (smallSet || delta > 5 || flights.length === 0) {
      if (useSpritesRef.current) {
        // In sprite mode — update nearby sprites
        const pov = globeRef.current.pointOfView();
        const nearby = getNearbyFlights(flights, pov);
        globeRef.current.objectsData(nearby);
      } else {
        // In dot mode — update points
        globeRef.current.pointsData(flights);
      }
      prevFlightCount.current = flights.length;
    }
  }, [flights]);

  // Re-apply radius when selected flight changes + camera fly-to
  useEffect(() => {
    if (!globeRef.current) return;

    globeRef.current.pointRadius((d) =>
      selectedFlight && d.icao24 === selectedFlight.icao24 ? 0.55 : 0.28
    );

    if (selectedFlight?.latitude != null && selectedFlight?.longitude != null) {
      globeRef.current.pointOfView(
        { lat: selectedFlight.latitude, lng: selectedFlight.longitude, altitude: 1.5 },
        800
      );
    }
  }, [selectedFlight]);

  return (
    <div
      ref={containerRef}
      className="globe-container"
      aria-label="Interactive 3D globe showing live flight positions"
    />
  );
}
