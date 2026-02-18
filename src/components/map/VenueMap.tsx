/**
 * VenueMap — Leaflet map displaying venue pins for a city.
 *
 * Loads Leaflet JS + CSS from CDN on first mount (no npm dependency).
 * OpenStreetMap tiles — free, no API key needed.
 */

import { useEffect, useRef, useState } from 'react';
import type { MapVenue } from '../../lib/venueMap';
import './venue-map.css';

// ── CDN loader (idempotent) ─────────────────────────────────────────────────

const LEAFLET_VERSION = '1.9.4';
const CDN_BASE = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist`;

let loadPromise: Promise<typeof L> | null = null;

function loadLeaflet(): Promise<typeof L> {
  if (window.L) return Promise.resolve(window.L);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<typeof L>((resolve, reject) => {
    // CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = `${CDN_BASE}/leaflet.css`;
      link.crossOrigin = '';
      document.head.appendChild(link);
    }

    // JS
    const script = document.createElement('script');
    script.src = `${CDN_BASE}/leaflet.js`;
    script.crossOrigin = '';
    script.onload = () => {
      if (window.L) resolve(window.L);
      else reject(new Error('Leaflet loaded but window.L is undefined'));
    };
    script.onerror = () => reject(new Error('Failed to load Leaflet from CDN'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

// ── Custom marker icon ──────────────────────────────────────────────────────

function createVenueIcon(leaflet: typeof L, isSelected: boolean) {
  const color = isSelected ? '#3B82F6' : '#6366F1'; // blue-500 / indigo-500
  const size = isSelected ? 36 : 28;
  return leaflet.divIcon({
    className: 'aw-venue-pin',
    html: `
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${color}" stroke="white" stroke-width="1.5"/>
        <circle cx="12" cy="9" r="3" fill="white"/>
      </svg>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// ── Props ───────────────────────────────────────────────────────────────────

interface VenueMapProps {
  venues: MapVenue[];
  centerLat: number;
  centerLng: number;
  zoom?: number;
  /** Currently selected venue id (highlighted pin) */
  selectedVenueId?: string | null;
  /** Called when user clicks a venue pin */
  onVenueClick?: (venue: MapVenue) => void;
  className?: string;
}

// ── Component ───────────────────────────────────────────────────────────────

export function VenueMap({
  venues,
  centerLat,
  centerLng,
  zoom = 12,
  selectedVenueId,
  onVenueClick,
  className = '',
}: VenueMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const leafletRef = useRef<typeof L | null>(null);
  const [ready, setReady] = useState(false);

  // Stable callback ref
  const onVenueClickRef = useRef(onVenueClick);
  onVenueClickRef.current = onVenueClick;

  // Load Leaflet from CDN + initialize map
  useEffect(() => {
    let cancelled = false;

    loadLeaflet().then((leaflet) => {
      if (cancelled || !containerRef.current || mapRef.current) return;

      leafletRef.current = leaflet;

      const map = leaflet.map(containerRef.current, {
        center: [centerLat, centerLng],
        zoom,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
      });

      leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      mapRef.current = map;
      setReady(true);
    }).catch((err) => {
      console.warn('[VenueMap] Failed to load Leaflet:', err);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.clear();
      leafletRef.current = null;
      setReady(false);
    };
  }, []); // Only once

  // Pan to new center when it changes
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([centerLat, centerLng], zoom, { animate: true });
    }
  }, [centerLat, centerLng, zoom]);

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !ready) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    // Add new markers
    venues.forEach((v) => {
      const isSelected = v.id === selectedVenueId;
      const icon = createVenueIcon(leaflet, isSelected);
      const marker = leaflet.marker([v.lat, v.lng], { icon }).addTo(map);

      // Tooltip
      marker.bindTooltip(v.name, {
        direction: 'top',
        offset: [0, -20],
        className: 'aw-map-tooltip',
      });

      marker.on('click', () => {
        onVenueClickRef.current?.(v);
      });

      markersRef.current.set(v.id, marker);
    });

    // Fit bounds if we have venues
    if (venues.length > 1) {
      const group = leaflet.featureGroup(Array.from(markersRef.current.values()));
      map.fitBounds(group.getBounds().pad(0.15), { maxZoom: 14 });
    }
  }, [venues, selectedVenueId, ready]);

  // Highlight selected marker
  useEffect(() => {
    const leaflet = leafletRef.current;
    if (!leaflet) return;

    markersRef.current.forEach((marker, id) => {
      const isSelected = id === selectedVenueId;
      marker.setIcon(createVenueIcon(leaflet, isSelected));
      if (isSelected) marker.setZIndexOffset(1000);
      else marker.setZIndexOffset(0);
    });
  }, [selectedVenueId]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-xl overflow-hidden ${className}`}
      style={{
        height: '100%',
        minHeight: 300,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
      }}
    />
  );
}
