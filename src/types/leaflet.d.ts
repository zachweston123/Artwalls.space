/**
 * Minimal type declarations for Leaflet loaded from CDN.
 *
 * Leaflet is loaded dynamically at runtime via <script> tag from unpkg.
 * This file provides just enough types for the VenueMap component to
 * compile without installing @types/leaflet (which would break the lock file).
 *
 * If you later add leaflet to package.json + lock file, delete this file
 * and use @types/leaflet instead.
 */

declare namespace L {
  // ── Core ──────────────────────────────────────────────────────────────────

  interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    zoomControl?: boolean;
    attributionControl?: boolean;
    scrollWheelZoom?: boolean;
  }

  interface Map {
    setView(center: LatLngExpression, zoom?: number, options?: { animate?: boolean }): this;
    fitBounds(bounds: LatLngBounds, options?: { maxZoom?: number; padding?: [number, number] }): this;
    remove(): void;
  }

  type LatLngExpression = [number, number] | { lat: number; lng: number };

  interface LatLngBounds {
    pad(ratio: number): LatLngBounds;
  }

  // ── Markers ───────────────────────────────────────────────────────────────

  interface MarkerOptions {
    icon?: Icon | DivIcon;
  }

  interface Marker {
    addTo(map: Map): this;
    remove(): this;
    bindTooltip(content: string, options?: TooltipOptions): this;
    on(event: string, handler: () => void): this;
    setIcon(icon: Icon | DivIcon): this;
    setZIndexOffset(offset: number): this;
  }

  interface TooltipOptions {
    direction?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto';
    offset?: [number, number];
    className?: string;
  }

  // ── Icons ─────────────────────────────────────────────────────────────────

  interface DivIconOptions {
    className?: string;
    html?: string;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
    popupAnchor?: [number, number];
  }

  interface Icon {}
  interface DivIcon {}

  // ── Tile Layer ────────────────────────────────────────────────────────────

  interface TileLayerOptions {
    maxZoom?: number;
    attribution?: string;
  }

  interface TileLayer {
    addTo(map: Map): this;
  }

  // ── Feature Group ─────────────────────────────────────────────────────────

  interface FeatureGroup {
    getBounds(): LatLngBounds;
  }

  // ── Factory functions ─────────────────────────────────────────────────────

  function map(element: HTMLElement, options?: MapOptions): Map;
  function tileLayer(urlTemplate: string, options?: TileLayerOptions): TileLayer;
  function marker(latlng: LatLngExpression, options?: MarkerOptions): Marker;
  function divIcon(options?: DivIconOptions): DivIcon;
  function featureGroup(layers: Marker[]): FeatureGroup;
}

interface Window {
  L?: typeof L;
}
