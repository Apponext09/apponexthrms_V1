// ============================================================
// MapLibre web-worker wiring for Vite
// client/src/features/Livetracking/map/maplibreWorker.ts
//
// maplibre-gl 6's ESM build spawns its worker from a sibling file
// (maplibre-gl-worker.mjs) that Vite's dep optimizer does not copy, so the
// worker 404s and NO GeoJSON source renders (route lines, stop/start markers,
// employee points). Handing MapLibre a worker URL that Vite bundles itself
// fixes both dev and production builds. Import this module before creating a map.
// ============================================================
import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(workerUrl);
