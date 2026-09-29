// ============================================================
// LiveMapEngine — imperative MapLibre layer for live employee tracking
// client/src/features/Livetracking/map/liveMapEngine.ts
//
// React never re-renders for a GPS update. This engine subscribes to the live
// store and, per changed employee only:
//   • animates the marker from its on-screen position to the new fix
//     (requestAnimationFrame, duration from fix interval / distance / speed)
//   • rotates the heading arrow along the shortest arc
//   • grows the route line — the line follows the marker, never leads it
//
// Rendering for ~1,000 employees:
//   • everyone except the selected employee is a GPU-drawn point in ONE
//     clustered GeoJSON source, updated with updateData() diffs (only the
//     employees that moved are sent to the worker), frame-rate adaptive
//   • all routes live in ONE source keyed by employee id, updated per employee
//   • the selected employee gets a rich HTML avatar pin + heading cone and a
//     dedicated route source whose tail is redrawn every frame
// ============================================================
import * as maplibregl from 'maplibre-gl';
import type { MovementStatus } from '../types/livetracking.types';
import { liveTrackingStore, movementStatus, type LiveTrack } from '../store/liveTrackingStore';
import { haversineMeters, lerpAngle, toLineCoordinates } from '../utils/geo';
import { escapeHtml } from '../utils/html';

// ── Tunables ─────────────────────────────────────────────────────────────────
/** Longest a single marker animation may take (configurable via VITE_LIVE_TRACKING_MAX_ANIMATION_MS) */
const MAX_ANIMATION_MS = Number((import.meta as any).env?.VITE_LIVE_TRACKING_MAX_ANIMATION_MS) || 6000;
const MIN_ANIMATION_MS = 300;
/** Farther than this in one update → jump instead of sliding across the map */
const MAX_ANIMATED_DISTANCE_M = 3000;
const HEADING_TURN_MS = 600;
const ROUTES_FLUSH_MS = 1000;
/** The selected route's live tail (last point → moving marker) is redrawn at most this often */
const SELECTED_TAIL_FLUSH_MS = 100;
const STATUS_SWEEP_MS = 5000;
/** Live route tails (line from last route point to the moving marker) only from this zoom */
const TAILS_MIN_ZOOM = 12;
/** Tails are redrawn at most this often (a tail a few metres behind the marker is invisible) */
const TAILS_FLUSH_MS = 200;
/**
 * Zoomed in at street level (past the clustering zoom), on-screen employees are
 * HTML markers moved by CSS transform every frame — no GeoJSON worker round-trip
 * per frame. Zoomed out, everyone is on the clustered GPU layer.
 */
const CROWD_HTML_MIN_ZOOM = 15;
const CROWD_HTML_MAX = 200;
const CROWD_REFRESH_MS = 1000;

// Status colours — the dashboard's existing palette (roster tags / stat cards)
export const STATUS_COLORS: Record<MovementStatus, string> = {
  moving: '#18A37E',
  idle: '#F59E0B',
  offline: '#A8BBD4',
  gps_off: '#D64550',
};
const CLUSTER_COLOR = '#1B6BFF';
const ROUTE_COLOR = '#1B6BFF';

// ── Source / layer ids ───────────────────────────────────────────────────────
const SRC_EMPLOYEES = 'lt-employees';
const SRC_ROUTES = 'lt-routes';
const SRC_TAILS = 'lt-route-tails';
const SRC_SELECTED = 'lt-route-selected';
const SRC_SELECTED_TAIL = 'lt-route-selected-tail';
export const LAYER_EMPLOYEE_DOTS = 'lt-employee-dots';
export const LAYER_CLUSTERS = 'lt-clusters';
/** Detail sources/layers kept with their original ids (the map component fills them) */
export const DETAIL_SOURCES = { breaks: 'breaks', start: 'route-start', end: 'route-end' } as const;
export const DETAIL_LAYERS = { breaks: 'break-circles', start: 'route-start-circle', end: 'route-end-circle' } as const;

/**
 * How long the marker should take to reach a new fix. The fix interval is the
 * best predictor of when the next fix arrives, so animating over it keeps the
 * marker moving continuously instead of dashing and waiting. Without an
 * interval, distance / reported speed is used.
 */
export function animationDurationMs(
  distanceM: number,
  fixIntervalMs: number,
  speedMps: number | null,
  maxMs = MAX_ANIMATION_MS
): number {
  let ms: number;
  if (fixIntervalMs > 0) ms = fixIntervalMs;
  else if (speedMps != null && speedMps > 0.5) ms = (distanceM / speedMps) * 1000;
  else ms = (distanceM / 5) * 1000; // assume a brisk ~18 km/h
  return Math.min(Math.max(ms, MIN_ANIMATION_MS), maxMs);
}

interface Anim {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  start: number;
  duration: number;
}

interface Display {
  lat: number;
  lng: number;
  heading: number | null;
  headingFrom: number;
  headingTo: number | null;
  headingStart: number;
  status: MovementStatus;
  anim: Anim | null;
  /** Route points drawn so far — the point being animated towards is drawn on arrival */
  routeRendered: number;
  version: number;
}

export interface EmployeeMeta {
  name: string;
  avatarUrl: string | null;
  code?: string;
}

export interface LiveMapEngineOptions {
  onSelect: (employeeId: number) => void;
  onFollowChange: (follow: boolean) => void;
  getMeta: (employeeId: number) => EmployeeMeta | undefined;
  isDark: boolean;
}

// ── Canvas-drawn icons (the raster base style has no glyphs, so no text layers) ─
function arrowImage(): ImageData {
  const size = 80;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.moveTo(40, 3);
  ctx.lineTo(53, 25);
  ctx.lineTo(40, 19);
  ctx.lineTo(27, 25);
  ctx.closePath();
  ctx.fill();
  return ctx.getImageData(0, 0, size, size);
}

/**
 * Cluster counts are bucketed so at most ~110 distinct icons ever exist —
 * otherwise every new count ("37", "38", …) produced by re-clustering drew and
 * read back a fresh canvas.
 */
function clusterLabel(count: number): string {
  if (count < 100) return String(count);
  if (count < 200) return '100+';
  if (count < 500) return '200+';
  if (count < 1000) return '500+';
  return '1k+';
}

function clusterCanvas(label: string, count: number): HTMLCanvasElement {
  const css = count >= 200 ? 52 : count >= 50 ? 44 : 36;
  const px = css * 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(27,107,255,0.22)';
  ctx.beginPath();
  ctx.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = CLUSTER_COLOR;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(px / 2, px / 2, px / 2 - 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 ${Math.round(px * 0.3)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, px / 2, px / 2 + 1);
  return canvas;
}

function formatAvatarUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string' || url.trim() === '') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const apiBase = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000';
  const cleanBase = apiBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  return `${cleanBase}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

/** The existing teardrop avatar pin, built once per selection (not per GPS update) */
function buildPinHtml(meta: EmployeeMeta | undefined, status: MovementStatus): string {
  const name = meta?.name || 'Employee';
  const safeName = escapeHtml(name);
  const safeInitial = escapeHtml(name.charAt(0).toUpperCase());
  const avatar = formatAvatarUrl(meta?.avatarUrl);
  const safeAvatar = avatar ? escapeHtml(avatar) : null;
  const statusColor = STATUS_COLORS[status];
  return `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;" title="${safeName}">
      <div style="position:absolute;top:14px;width:40px;height:40px;border-radius:50%;background:rgba(245,158,11,0.6);animation:pulse 2s infinite;pointer-events:none;"></div>
      <div style="position:relative;width:44px;height:54px;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45));">
        <svg width="44" height="54" viewBox="0 0 52 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M26 0C11.6406 0 0 11.6406 0 26C0 40.625 26 64 26 64C26 64 52 40.625 52 26C52 11.6406 40.3594 0 26 0Z" fill="#0f172a" stroke="#f59e0b" stroke-width="2.5" />
          <circle cx="26" cy="24" r="16" fill="#FFFFFF" />
        </svg>
        <div style="position:absolute;top:7px;left:8px;width:28px;height:28px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#1e293b;border:1.5px solid #ffffff;">
          ${
            safeAvatar
              ? `<img src="${safeAvatar}" alt="${safeName}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" /><span style="display:none;color:#ffffff;font-weight:900;font-size:12px;font-family:sans-serif;">${safeInitial}</span>`
              : `<span style="color:#ffffff;font-weight:900;font-size:12px;font-family:sans-serif;">${safeInitial}</span>`
          }
        </div>
        <div data-lt-status-dot style="position:absolute;bottom:12px;right:3px;width:10px;height:10px;border-radius:50%;background:${statusColor};border:1.5px solid #ffffff;"></div>
      </div>
      <div style="margin-top:1px;background:rgba(15,23,42,0.92);color:#ffffff;font-size:9.5px;font-weight:800;padding:1.5px 6px;border-radius:6px;border:1px solid rgba(255,255,255,0.2);white-space:nowrap;font-family:sans-serif;">
        ${safeName}
      </div>
    </div>`;
}

export class LiveMapEngine {
  private map: maplibregl.Map;
  private opts: LiveMapEngineOptions;
  private displays = new Map<number, Display>();
  private pointFeatures = new Map<number, GeoJSON.Feature<GeoJSON.Point>>();
  private routeFeatureIds = new Set<number>();
  private dirtyPoints = new Set<number>();
  /** Off-screen markers whose position changed — pushed at ROUTES_FLUSH_MS cadence */
  private offscreenDirty = new Set<number>();
  private addedPoints = new Set<number>();
  private removedPoints = new Set<number>();
  private dirtyRoutes = new Set<number>();
  private tailsDirty = false;
  /** Selected tail needs redrawing (marker moved) */
  private selectedRouteDirty = false;
  /** Selected full route needs re-sending (grew, reseeded, or selection changed) */
  private selectedFullDirty = false;
  private selectedId: number | null = null;
  private follow = false;
  private selectedMarker: maplibregl.Marker | null = null;
  private coneMarker: maplibregl.Marker | null = null;
  private hoverPopup: maplibregl.Popup | null = null;
  /** Zoomed-in, on-screen, non-selected employees rendered as light HTML markers */
  private crowdMarkers = new Map<number, maplibregl.Marker>();
  private lastTailsFlush = 0;
  private lastCrowdRefresh = 0;
  private rafId: number | null = null;
  private lastPointsFlush = 0;
  private lastRoutesFlush = 0;
  private lastSelectedFlush = 0;
  private unsubscribe: (() => void) | null = null;
  private sweepTimer: ReturnType<typeof setInterval> | null = null;
  private diffSupported = true;
  private destroyed = false;
  private fittedOnce = false;

  constructor(map: maplibregl.Map, opts: LiveMapEngineOptions) {
    this.map = map;
    this.opts = opts;
    this.addSourcesAndLayers();
    this.bindInteractions();
    this.unsubscribe = liveTrackingStore.subscribe((ids) => this.onStoreChange(ids));
    this.sweepTimer = setInterval(() => this.sweepStatuses(), STATUS_SWEEP_MS);
    this.onStoreChange(new Set(liveTrackingStore.ids()));
  }

  destroy(): void {
    this.destroyed = true;
    this.unsubscribe?.();
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.selectedMarker?.remove();
    this.coneMarker?.remove();
    this.hoverPopup?.remove();
    this.crowdMarkers.forEach((m) => m.remove());
    this.crowdMarkers.clear();
  }

  // ── Setup ──────────────────────────────────────────────────────────────────
  private addSourcesAndLayers(): void {
    const map = this.map;
    const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

    if (!map.hasImage('lt-arrow')) map.addImage('lt-arrow', arrowImage(), { sdf: true, pixelRatio: 2 });
    // Cluster count icons are drawn on demand (MapLibre 6 resolver — the old
    // `styleimagemissing` event now fires only after resolution has failed).
    // An ImageBitmap avoids reading canvas pixels back on the main thread.
    map.setMissingStyleImageResolver(async (id) => {
      const m = /^lt-cluster-(\d+)$/.exec(id);
      if (!m || map.hasImage(id)) return;
      const count = Number(m[1]);
      const bitmap = await createImageBitmap(clusterCanvas(clusterLabel(count), count));
      if (!this.destroyed && !map.hasImage(id)) map.addImage(id, bitmap, { pixelRatio: 2 });
    });

    map.addSource(SRC_ROUTES, { type: 'geojson', data: empty });
    map.addSource(SRC_TAILS, { type: 'geojson', data: empty });
    map.addSource(SRC_SELECTED, { type: 'geojson', data: empty });
    map.addSource(SRC_SELECTED_TAIL, { type: 'geojson', data: empty });
    map.addSource(DETAIL_SOURCES.breaks, { type: 'geojson', data: empty });
    map.addSource(DETAIL_SOURCES.start, { type: 'geojson', data: empty });
    map.addSource(DETAIL_SOURCES.end, { type: 'geojson', data: empty });
    map.addSource(SRC_EMPLOYEES, {
      type: 'geojson',
      data: empty,
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: 15,
    });

    const noSelection = ['!=', ['get', 'employee_id'], -1] as any;

    // Everyone's route: thin and translucent so the overview stays readable
    map.addLayer({
      id: 'lt-routes-line',
      type: 'line',
      source: SRC_ROUTES,
      minzoom: 10,
      filter: noSelection,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ROUTE_COLOR, 'line-width': 3, 'line-opacity': 0.55 },
    });
    map.addLayer({
      id: 'lt-tails-line',
      type: 'line',
      source: SRC_TAILS,
      minzoom: 10,
      filter: noSelection,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ROUTE_COLOR, 'line-width': 3, 'line-opacity': 0.55 },
    });

    // Selected employee's route — the existing prominent black/white line with glow
    // The long route and the short moving tail are separate sources, so the
    // tail can follow the marker without re-sending the whole day's route.
    for (const [suffix, source] of [['', SRC_SELECTED], ['-tail', SRC_SELECTED_TAIL]] as const) {
      map.addLayer({
        id: `route-glow${suffix}`,
        type: 'line',
        source,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': this.routeGlowColor(), 'line-width': 14, 'line-opacity': 0.85 },
      });
      map.addLayer({
        id: `route-line${suffix}`,
        type: 'line',
        source,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': this.routeLineColor(), 'line-width': 6.5, 'line-opacity': 1 },
      });
    }

    // Start / stop / end detail markers (unchanged look)
    const detailCircle = (color: string, radius: number) => ({
      'circle-radius': radius,
      'circle-color': color,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
      'circle-opacity': 0.95,
    });
    map.addLayer({ id: DETAIL_LAYERS.breaks, type: 'circle', source: DETAIL_SOURCES.breaks, paint: detailCircle('#f97316', 12) });
    map.addLayer({ id: DETAIL_LAYERS.start, type: 'circle', source: DETAIL_SOURCES.start, paint: detailCircle('#22c55e', 10) });
    map.addLayer({ id: DETAIL_LAYERS.end, type: 'circle', source: DETAIL_SOURCES.end, paint: detailCircle('#ef4444', 10) });

    // Clusters
    map.addLayer({
      id: LAYER_CLUSTERS,
      type: 'symbol',
      source: SRC_EMPLOYEES,
      filter: ['has', 'point_count'],
      layout: {
        // Bucketed like clusterLabel(): exact below 100, then 100 / 200 / 500 / 1000
        'icon-image': [
          'concat',
          'lt-cluster-',
          [
            'to-string',
            [
              'step',
              ['get', 'point_count'],
              ['get', 'point_count'],
              100, 100,
              200, 200,
              500, 500,
              1000, 1000,
            ],
          ],
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
    });

    // Individual employees: status dot + heading arrow
    const statusColor = [
      'match',
      ['get', 'status'],
      'moving', STATUS_COLORS.moving,
      'idle', STATUS_COLORS.idle,
      'gps_off', STATUS_COLORS.gps_off,
      STATUS_COLORS.offline,
    ] as any;
    map.addLayer({
      id: 'lt-employee-arrows',
      type: 'symbol',
      source: SRC_EMPLOYEES,
      filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'hasHeading'], true]],
      layout: {
        'icon-image': 'lt-arrow',
        'icon-rotate': ['get', 'heading'],
        'icon-rotation-alignment': 'map',
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
      },
      paint: { 'icon-color': statusColor },
    });
    map.addLayer({
      id: LAYER_EMPLOYEE_DOTS,
      type: 'circle',
      source: SRC_EMPLOYEES,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 7,
        'circle-color': statusColor,
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#ffffff',
      },
    });
  }

  private bindInteractions(): void {
    const map = this.map;

    map.on('click', LAYER_EMPLOYEE_DOTS, (e) => {
      const id = Number(e.features?.[0]?.properties?.employee_id);
      if (id) this.opts.onSelect(id);
    });

    map.on('click', LAYER_CLUSTERS, async (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const source = map.getSource(SRC_EMPLOYEES) as maplibregl.GeoJSONSource;
      try {
        const zoom = await source.getClusterExpansionZoom(feature.properties?.cluster_id);
        map.easeTo({ center: (feature.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
      } catch {
        /* cluster vanished mid-animation */
      }
    });

    map.on('mouseenter', LAYER_EMPLOYEE_DOTS, (e) => {
      map.getCanvas().style.cursor = 'pointer';
      const f = e.features?.[0];
      const id = Number(f?.properties?.employee_id);
      const meta = this.opts.getMeta(id);
      if (!f || !meta) return;
      this.hoverPopup?.remove();
      this.hoverPopup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 })
        .setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
        .setHTML(
          `<div style="font:700 12px 'Plus Jakarta Sans',sans-serif;color:#0B2545;">${escapeHtml(meta.name)}</div>`
        )
        .addTo(map);
    });
    map.on('mouseleave', LAYER_EMPLOYEE_DOTS, () => {
      map.getCanvas().style.cursor = '';
      this.hoverPopup?.remove();
      this.hoverPopup = null;
    });
    map.on('mouseenter', LAYER_CLUSTERS, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', LAYER_CLUSTERS, () => (map.getCanvas().style.cursor = ''));

    // Markers that moved off-screen were only repositioned once a second — catch them up now
    map.on('moveend', () => {
      this.refreshCrowdMarkers();
      if (this.offscreenDirty.size === 0) return;
      this.offscreenDirty.forEach((id) => this.dirtyPoints.add(id));
      this.offscreenDirty.clear();
      this.tailsDirty = true;
      this.kick();
    });

    // A user pan ends Follow mode; programmatic moves (jumpTo while following) don't
    map.on('dragstart', (e: any) => {
      if (this.follow && e?.originalEvent) {
        this.follow = false;
        this.opts.onFollowChange(false);
      }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  setTheme(isDark: boolean): void {
    this.opts.isDark = isDark;
    for (const suffix of ['', '-tail']) {
      if (this.map.getLayer(`route-line${suffix}`)) this.map.setPaintProperty(`route-line${suffix}`, 'line-color', this.routeLineColor());
      if (this.map.getLayer(`route-glow${suffix}`)) this.map.setPaintProperty(`route-glow${suffix}`, 'line-color', this.routeGlowColor());
    }
  }

  setSelected(id: number | null): void {
    if (id === this.selectedId) return;
    const previous = this.selectedId;
    this.selectedId = id;
    this.follow = false;

    this.selectedMarker?.remove();
    this.coneMarker?.remove();
    this.selectedMarker = this.coneMarker = null;

    // The selected employee is drawn as an HTML pin, so it leaves the clustered source
    if (previous != null && this.displays.has(previous)) this.addPoint(previous);
    if (id != null) {
      this.removePoint(id);
      this.offscreenDirty.delete(id);
      this.crowdMarkers.get(id)?.remove();
      this.crowdMarkers.delete(id);
    }
    this.refreshCrowdMarkers();

    const filter = ['!=', ['get', 'employee_id'], id ?? -1] as any;
    this.map.setFilter('lt-routes-line', filter);
    this.map.setFilter('lt-tails-line', filter);

    if (id != null) {
      const disp = this.displays.get(id);
      if (disp) {
        this.createSelectedMarkers(id, disp);
        this.map.flyTo({
          center: [disp.lng, disp.lat],
          zoom: Math.max(this.map.getZoom(), 15),
          duration: 1000,
          essential: true,
        });
      }
    }
    this.selectedRouteDirty = true;
    this.selectedFullDirty = true;
    this.tailsDirty = true;
    this.kick();
  }

  setFollow(follow: boolean): void {
    this.follow = follow && this.selectedId != null;
    const disp = this.selectedId != null ? this.displays.get(this.selectedId) : undefined;
    if (this.follow && disp) this.map.easeTo({ center: [disp.lng, disp.lat], duration: 500 });
  }

  zoomTo(id: number): void {
    const disp = this.displays.get(id);
    if (disp) this.map.flyTo({ center: [disp.lng, disp.lat], zoom: 17, duration: 800, essential: true });
  }

  /** Fit the camera to everyone — once when data first arrives, or on demand */
  fitAll(force = false): void {
    if (this.fittedOnce && !force) return;
    const bounds = new maplibregl.LngLatBounds();
    this.displays.forEach((d) => bounds.extend([d.lng, d.lat]));
    if (bounds.isEmpty()) return;
    this.fittedOnce = true;
    this.map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 800 });
  }

  /** Refresh the selected pin (e.g. after roster metadata such as the avatar loaded) */
  refreshSelectedPin(): void {
    if (this.selectedId == null) return;
    const disp = this.displays.get(this.selectedId);
    if (disp && this.selectedMarker) {
      this.selectedMarker.getElement().innerHTML = buildPinHtml(this.opts.getMeta(this.selectedId), disp.status);
    }
  }

  // ── Store → display state ──────────────────────────────────────────────────
  private onStoreChange(ids: Set<number>): void {
    if (this.destroyed) return;
    const now = performance.now();
    for (const id of ids) {
      const track = liveTrackingStore.get(id);
      if (!track || track.lat == null || track.lng == null) {
        this.dropEmployee(id);
        continue;
      }
      const disp = this.displays.get(id);
      if (!disp) {
        this.createDisplay(track);
        continue;
      }
      if (disp.version === track.version) continue;
      disp.version = track.version;
      this.applyTrack(id, track, disp, now);
    }
    if (!this.fittedOnce && this.displays.size > 0 && this.selectedId == null) this.fitAll();
    this.kick();
  }

  private createDisplay(track: LiveTrack): void {
    const heading = track.heading;
    const disp: Display = {
      lat: track.lat!,
      lng: track.lng!,
      heading,
      headingFrom: heading ?? 0,
      headingTo: null,
      headingStart: 0,
      status: movementStatus(track),
      anim: null,
      routeRendered: track.route.length,
      version: track.version,
    };
    this.displays.set(track.id, disp);
    if (track.id === this.selectedId) {
      this.createSelectedMarkers(track.id, disp);
      this.selectedRouteDirty = true;
      this.selectedFullDirty = true;
    } else {
      this.addPoint(track.id);
    }
    this.dirtyRoutes.add(track.id);
  }

  private applyTrack(id: number, track: LiveTrack, disp: Display, now: number): void {
    const targetLat = track.lat!;
    const targetLng = track.lng!;
    const change = track.lastChange;
    const distance = haversineMeters(disp.lat, disp.lng, targetLat, targetLng);

    const status = movementStatus(track);
    if (status !== disp.status) {
      disp.status = status;
      this.onStatusChanged(id, disp);
    }

    if (change?.jump || distance > MAX_ANIMATED_DISTANCE_M) {
      // Replayed / relocated / reseeded — place directly and draw the whole route
      disp.anim = null;
      disp.lat = targetLat;
      disp.lng = targetLng;
      disp.routeRendered = track.route.length;
      this.setHeadingTarget(disp, track.heading, now);
    } else if (distance > 0.3) {
      const fixInterval = track.prevTs > 0 ? track.ts - track.prevTs : 0;
      disp.anim = {
        fromLat: disp.lat,
        fromLng: disp.lng,
        toLat: targetLat,
        toLng: targetLng,
        start: now,
        duration: animationDurationMs(distance, fixInterval, track.speed),
      };
      // Draw every route point already reached; the new one appears when the marker gets there
      disp.routeRendered = Math.max(0, track.route.length - (change?.routeAppended ? 1 : 0));
      this.setHeadingTarget(disp, track.heading, now);
    } else {
      disp.routeRendered = track.route.length;
    }

    this.markMoved(id);
    this.dirtyRoutes.add(id);
    if (id === this.selectedId) this.selectedFullDirty = true;
  }

  private setHeadingTarget(disp: Display, heading: number | null, now: number): void {
    // No heading (stationary / unknown) → keep the current one; never spin in place
    if (heading == null) return;
    if (disp.heading == null) {
      disp.heading = heading;
      disp.headingTo = null;
      return;
    }
    if (Math.abs(((heading - disp.heading + 540) % 360) - 180) < 1) return;
    disp.headingFrom = disp.heading;
    disp.headingTo = heading;
    disp.headingStart = now;
  }

  private dropEmployee(id: number): void {
    if (!this.displays.has(id)) return;
    this.displays.delete(id);
    this.removePoint(id);
    this.crowdMarkers.get(id)?.remove();
    this.crowdMarkers.delete(id);
    this.dirtyRoutes.add(id);
    this.tailsDirty = true;
    if (id === this.selectedId) {
      this.selectedMarker?.remove();
      this.coneMarker?.remove();
      this.selectedMarker = this.coneMarker = null;
      this.selectedRouteDirty = true;
      this.selectedFullDirty = true;
    }
  }

  private sweepStatuses(): void {
    // Moving → idle and online → signal-lost happen with no new delta, so re-derive periodically
    const now = Date.now();
    for (const [id, disp] of this.displays) {
      const status = movementStatus(liveTrackingStore.get(id), now);
      if (status !== disp.status) {
        disp.status = status;
        this.onStatusChanged(id, disp);
      }
    }
    this.kick();
  }

  private onStatusChanged(id: number, disp: Display): void {
    if (id === this.selectedId) {
      const dot = this.selectedMarker?.getElement().querySelector<HTMLElement>('[data-lt-status-dot]');
      if (dot) dot.style.background = STATUS_COLORS[disp.status];
    } else if (this.crowdMarkers.has(id)) {
      this.styleCrowdMarker(this.crowdMarkers.get(id)!, disp);
    } else {
      this.dirtyPoints.add(id);
    }
  }

  // ── Selected employee markers ─────────────────────────────────────────────
  private createSelectedMarkers(id: number, disp: Display): void {
    const pinEl = document.createElement('div');
    pinEl.style.cssText = 'cursor:pointer;user-select:none;';
    pinEl.innerHTML = buildPinHtml(this.opts.getMeta(id), disp.status);
    pinEl.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.opts.onSelect(id);
    });

    const coneEl = document.createElement('div');
    coneEl.style.cssText = 'width:64px;height:64px;pointer-events:none;';
    coneEl.innerHTML =
      '<svg width="64" height="64" viewBox="0 0 64 64"><path d="M32 2 L44 24 L32 18 L20 24 Z" fill="#1B6BFF" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/></svg>';

    this.coneMarker = new maplibregl.Marker({ element: coneEl, rotationAlignment: 'map', pitchAlignment: 'map' })
      .setLngLat([disp.lng, disp.lat])
      .setRotation(disp.heading ?? 0)
      .addTo(this.map);
    coneEl.style.visibility = disp.heading == null ? 'hidden' : 'visible';

    this.selectedMarker = new maplibregl.Marker({ element: pinEl, anchor: 'bottom' })
      .setLngLat([disp.lng, disp.lat])
      .addTo(this.map);
  }

  // ── Point source bookkeeping ───────────────────────────────────────────────
  private pointFeature(id: number, disp: Display): GeoJSON.Feature<GeoJSON.Point> {
    return {
      type: 'Feature',
      id,
      geometry: { type: 'Point', coordinates: [disp.lng, disp.lat] },
      properties: {
        employee_id: id,
        status: disp.status,
        heading: disp.heading ?? 0,
        hasHeading: disp.heading != null,
      },
    };
  }

  private addPoint(id: number): void {
    const disp = this.displays.get(id);
    if (!disp || id === this.selectedId || this.crowdMarkers.has(id)) return;
    this.pointFeatures.set(id, this.pointFeature(id, disp));
    this.removedPoints.delete(id);
    this.addedPoints.add(id);
  }

  private removePoint(id: number): void {
    if (!this.pointFeatures.has(id)) return;
    this.pointFeatures.delete(id);
    this.addedPoints.delete(id);
    this.dirtyPoints.delete(id);
    this.removedPoints.add(id);
  }

  private markMoved(id: number): void {
    if (id === this.selectedId) this.selectedRouteDirty = true;
    else this.dirtyPoints.add(id);
    this.tailsDirty = true;
  }

  // ── Zoomed-in crowd markers (HTML, transform-animated) ─────────────────────
  private refreshCrowdMarkers(now = performance.now()): void {
    this.lastCrowdRefresh = now;
    const want = new Set<number>();
    if (this.map.getZoom() >= CROWD_HTML_MIN_ZOOM) {
      const vb = this.paddedBounds();
      for (const [id, d] of this.displays) {
        if (id === this.selectedId) continue;
        if (d.lng < vb.w || d.lng > vb.e || d.lat < vb.s || d.lat > vb.n) continue;
        want.add(id);
        if (want.size > CROWD_HTML_MAX) {
          want.clear(); // too dense even at street level — stay on the GPU layer
          break;
        }
      }
    }
    for (const [id, marker] of this.crowdMarkers) {
      if (want.has(id)) continue;
      marker.remove();
      this.crowdMarkers.delete(id);
      this.addPoint(id);
    }
    for (const id of want) {
      if (this.crowdMarkers.has(id)) continue;
      const disp = this.displays.get(id)!;
      this.removePoint(id);
      this.offscreenDirty.delete(id);
      this.crowdMarkers.set(id, this.createCrowdMarker(id, disp));
    }
    if (want.size || this.addedPoints.size) this.kick();
  }

  private createCrowdMarker(id: number, disp: Display): maplibregl.Marker {
    const el = document.createElement('div');
    el.style.cssText = 'width:40px;height:40px;cursor:pointer;';
    el.title = this.opts.getMeta(id)?.name ?? '';
    el.innerHTML =
      '<svg width="40" height="40" viewBox="0 0 40 40" style="display:block;overflow:visible">' +
      '<path data-lt-arrow d="M20 1.5 L26.5 12.5 L20 9.5 L13.5 12.5 Z" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<circle data-lt-dot cx="20" cy="20" r="7" stroke="#ffffff" stroke-width="2.5"/></svg>';
    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.opts.onSelect(id);
    });
    const marker = new maplibregl.Marker({ element: el, rotationAlignment: 'map', pitchAlignment: 'map' })
      .setLngLat([disp.lng, disp.lat])
      .setRotation(disp.heading ?? 0)
      .addTo(this.map);
    this.styleCrowdMarker(marker, disp);
    return marker;
  }

  private styleCrowdMarker(marker: maplibregl.Marker, disp: Display): void {
    const el = marker.getElement();
    const color = STATUS_COLORS[disp.status];
    el.querySelector('[data-lt-dot]')?.setAttribute('fill', color);
    const arrow = el.querySelector<SVGPathElement>('[data-lt-arrow]');
    if (arrow) {
      arrow.setAttribute('fill', color);
      arrow.style.visibility = disp.heading == null ? 'hidden' : 'visible';
    }
    el.dataset.hasHeading = disp.heading == null ? '0' : '1';
  }

  // ── Frame loop ─────────────────────────────────────────────────────────────
  private kick(): void {
    if (this.rafId == null && !this.destroyed) this.rafId = requestAnimationFrame((t) => this.frame(t));
  }

  private frame(now: number): void {
    this.rafId = null;
    if (this.destroyed) return;
    let animating = 0;

    for (const [id, disp] of this.displays) {
      let moved = false;
      if (disp.anim) {
        const a = disp.anim;
        const t = Math.min(1, (now - a.start) / a.duration);
        disp.lat = a.fromLat + (a.toLat - a.fromLat) * t;
        disp.lng = a.fromLng + (a.toLng - a.fromLng) * t;
        moved = true;
        if (t >= 1) {
          disp.anim = null;
          const track = liveTrackingStore.get(id);
          if (track && disp.routeRendered !== track.route.length) {
            disp.routeRendered = track.route.length;
            this.dirtyRoutes.add(id);
            if (id === this.selectedId) this.selectedFullDirty = true;
          }
        } else {
          animating++;
        }
      }
      if (disp.headingTo != null) {
        const t = Math.min(1, (now - disp.headingStart) / HEADING_TURN_MS);
        disp.heading = lerpAngle(disp.headingFrom, disp.headingTo, t);
        if (t >= 1) disp.headingTo = null;
        else animating++;
        moved = true;
      }
      if (moved) {
        const crowd = this.crowdMarkers.get(id);
        if (crowd) {
          crowd.setLngLat([disp.lng, disp.lat]);
          if (disp.heading != null) {
            crowd.setRotation(disp.heading);
            if (crowd.getElement().dataset.hasHeading !== '1') this.styleCrowdMarker(crowd, disp);
          }
          this.tailsDirty = true;
        } else {
          this.markMoved(id);
        }
      }
    }

    this.renderSelected(now);
    this.flush(now, animating);

    const pending =
      animating > 0 ||
      this.dirtyPoints.size > 0 ||
      this.offscreenDirty.size > 0 ||
      this.addedPoints.size > 0 ||
      this.removedPoints.size > 0 ||
      this.dirtyRoutes.size > 0 ||
      this.tailsDirty ||
      this.selectedRouteDirty ||
      this.selectedFullDirty;
    if (pending) this.kick();
  }

  private renderSelected(now: number): void {
    if (this.selectedId == null) return;
    const disp = this.displays.get(this.selectedId);
    if (!disp) return;
    if (this.selectedMarker) {
      this.selectedMarker.setLngLat([disp.lng, disp.lat]);
      this.coneMarker?.setLngLat([disp.lng, disp.lat]);
      if (disp.heading != null && this.coneMarker) {
        this.coneMarker.setRotation(disp.heading);
        this.coneMarker.getElement().style.visibility = 'visible';
      }
    }
    if (this.follow && (disp.anim || disp.headingTo != null)) {
      this.map.jumpTo({ center: [disp.lng, disp.lat] });
    }
    if (this.selectedFullDirty) {
      this.selectedFullDirty = false;
      this.selectedRouteDirty = true;
      (this.map.getSource(SRC_SELECTED) as maplibregl.GeoJSONSource)?.setData(this.selectedRouteData(disp));
    }
    if (this.selectedRouteDirty && now - this.lastSelectedFlush >= SELECTED_TAIL_FLUSH_MS) {
      this.lastSelectedFlush = now;
      this.selectedRouteDirty = false;
      (this.map.getSource(SRC_SELECTED_TAIL) as maplibregl.GeoJSONSource)?.setData(this.selectedTailData(disp));
    }
  }

  /** Selected route: the points the marker has already reached */
  private selectedRouteData(disp: Display): GeoJSON.FeatureCollection {
    const track = liveTrackingStore.get(this.selectedId!);
    if (!track) return { type: 'FeatureCollection', features: [] };
    const lines = toLineCoordinates(track.route, disp.routeRendered);
    return {
      type: 'FeatureCollection',
      features: lines.length
        ? [{ type: 'Feature', geometry: { type: 'MultiLineString', coordinates: lines }, properties: { employee_id: this.selectedId } }]
        : [],
    };
  }

  /** Live tail: last reached route point → the marker's current on-screen position */
  private selectedTailData(disp: Display): GeoJSON.FeatureCollection {
    const track = this.selectedId != null ? liveTrackingStore.get(this.selectedId) : undefined;
    const lastDrawn = track?.route[disp.routeRendered - 1];
    const next = track?.route[disp.routeRendered];
    if (!lastDrawn || (next && next.brk)) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: [[lastDrawn.lng, lastDrawn.lat], [disp.lng, disp.lat]] },
          properties: { employee_id: this.selectedId },
        },
      ],
    };
  }

  /** Viewport padded by 25% — markers outside it don't need per-frame positions */
  private paddedBounds(): { w: number; s: number; e: number; n: number } {
    const b = this.map.getBounds();
    const padLng = (b.getEast() - b.getWest()) * 0.25;
    const padLat = (b.getNorth() - b.getSouth()) * 0.25;
    return { w: b.getWest() - padLng, e: b.getEast() + padLng, s: b.getSouth() - padLat, n: b.getNorth() + padLat };
  }

  private flush(now: number, animating: number): void {
    // Employees walk into / out of the viewport without the map moving
    if (now - this.lastCrowdRefresh >= CROWD_REFRESH_MS) this.refreshCrowdMarkers(now);

    // Only on-screen markers are animated per frame; off-screen ones are
    // repositioned once a second (nobody can see them move). Fewer frames per
    // second when many visible markers move at once, so the worker keeps up.
    if (this.dirtyPoints.size) {
      const vb = this.paddedBounds();
      for (const id of this.dirtyPoints) {
        const d = this.displays.get(id);
        if (d && (d.lng < vb.w || d.lng > vb.e || d.lat < vb.s || d.lat > vb.n)) {
          this.dirtyPoints.delete(id);
          this.offscreenDirty.add(id);
        }
      }
    }
    const visibleAnimating = Math.min(animating, this.dirtyPoints.size);
    const pointsInterval = visibleAnimating > 300 ? 150 : visibleAnimating > 100 ? 66 : 33;
    if (now - this.lastPointsFlush >= pointsInterval) {
      if (this.dirtyPoints.size || this.addedPoints.size || this.removedPoints.size) {
        this.lastPointsFlush = now;
        this.flushPoints(this.dirtyPoints);
      }
      if (this.tailsDirty && now - this.lastTailsFlush >= TAILS_FLUSH_MS) {
        this.lastTailsFlush = now;
        this.tailsDirty = false;
        (this.map.getSource(SRC_TAILS) as maplibregl.GeoJSONSource)?.setData(this.tailsData());
      }
    }
    if (now - this.lastRoutesFlush >= ROUTES_FLUSH_MS && (this.dirtyRoutes.size || this.offscreenDirty.size)) {
      this.lastRoutesFlush = now;
      if (this.offscreenDirty.size) this.flushPoints(this.offscreenDirty);
      if (this.dirtyRoutes.size) this.flushRoutes();
    }
  }

  private flushPoints(dirty: Set<number>): void {
    const source = this.map.getSource(SRC_EMPLOYEES) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const update: any[] = [];
    for (const id of dirty) {
      const disp = this.displays.get(id);
      const feature = this.pointFeatures.get(id);
      if (!disp || !feature) continue;
      feature.geometry.coordinates = [disp.lng, disp.lat];
      feature.properties = { employee_id: id, status: disp.status, heading: disp.heading ?? 0, hasHeading: disp.heading != null };
      if (!this.addedPoints.has(id)) {
        update.push({
          id,
          newGeometry: feature.geometry,
          addOrUpdateProperties: [
            { key: 'status', value: disp.status },
            { key: 'heading', value: disp.heading ?? 0 },
            { key: 'hasHeading', value: disp.heading != null },
          ],
        });
      }
    }
    const add = [...this.addedPoints].map((id) => this.pointFeatures.get(id)).filter(Boolean);
    const remove = [...this.removedPoints];
    dirty.clear();
    this.addedPoints.clear();
    this.removedPoints.clear();

    if (this.diffSupported) {
      try {
        source.updateData({ add: add as any, update, remove });
        return;
      } catch {
        // Source was created without diff support — fall back to full replaces from now on
        this.diffSupported = false;
      }
    }
    source.setData({ type: 'FeatureCollection', features: [...this.pointFeatures.values()] });
  }

  private tailsData(): GeoJSON.FeatureCollection {
    const features: GeoJSON.Feature[] = [];
    // Tails are sub-pixel below street level zoom, and pointless off-screen
    if (this.map.getZoom() < TAILS_MIN_ZOOM) return { type: 'FeatureCollection', features };
    const vb = this.paddedBounds();
    for (const [id, disp] of this.displays) {
      if (!disp.anim || id === this.selectedId) continue;
      if (disp.lng < vb.w || disp.lng > vb.e || disp.lat < vb.s || disp.lat > vb.n) continue;
      const track = liveTrackingStore.get(id);
      if (!track) continue;
      const lastDrawn = track.route[disp.routeRendered - 1];
      const next = track.route[disp.routeRendered];
      if (!lastDrawn || (next && next.brk)) continue;
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[lastDrawn.lng, lastDrawn.lat], [disp.lng, disp.lat]] },
        properties: { employee_id: id },
      });
    }
    return { type: 'FeatureCollection', features };
  }

  private flushRoutes(): void {
    const source = this.map.getSource(SRC_ROUTES) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;
    const add: GeoJSON.Feature[] = [];
    const update: any[] = [];
    const remove: number[] = [];

    for (const id of this.dirtyRoutes) {
      const disp = this.displays.get(id);
      const track = liveTrackingStore.get(id);
      const lines = disp && track ? toLineCoordinates(track.route, disp.routeRendered) : [];
      const geometry: GeoJSON.MultiLineString = { type: 'MultiLineString', coordinates: lines };
      if (!lines.length) {
        if (this.routeFeatureIds.delete(id)) remove.push(id);
      } else if (this.routeFeatureIds.has(id)) {
        update.push({ id, newGeometry: geometry });
      } else {
        this.routeFeatureIds.add(id);
        add.push({ type: 'Feature', id, geometry, properties: { employee_id: id } });
      }
      if (id === this.selectedId) this.selectedFullDirty = true;
    }
    this.dirtyRoutes.clear();

    if (this.diffSupported) {
      try {
        source.updateData({ add, update, remove });
        return;
      } catch {
        this.diffSupported = false;
      }
    }
    // Fallback: rebuild all routes (only happens without diff support)
    const features: GeoJSON.Feature[] = [];
    for (const id of this.routeFeatureIds) {
      const disp = this.displays.get(id);
      const track = liveTrackingStore.get(id);
      if (!disp || !track) continue;
      features.push({
        type: 'Feature',
        id,
        geometry: { type: 'MultiLineString', coordinates: toLineCoordinates(track.route, disp.routeRendered) },
        properties: { employee_id: id },
      });
    }
    source.setData({ type: 'FeatureCollection', features });
  }

  private routeLineColor(): string {
    return this.opts.isDark ? '#ffffff' : '#000000';
  }

  private routeGlowColor(): string {
    return this.opts.isDark ? 'rgba(56, 189, 248, 0.4)' : 'rgba(0, 0, 0, 0.25)';
  }
}
