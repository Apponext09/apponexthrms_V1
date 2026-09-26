// ============================================================
// useEmployeeLocationTracker — Background GPS & Laptop/Desktop Realtime Tracker
// client/src/features/Livetracking/hooks/useEmployeeLocationTracker.ts
//
// FEATURES:
//  - Dedicated 2.5-second background interval engine calling getCurrentPosition
//  - High accuracy GPS on mobile + Wi-Fi/IP instant location on laptop browsers (Firefox, Brave, Chrome)
//  - Automatic fallback to cached fix if fresh query times out
//  - 1D Kalman filter for smooth coordinate transitions
//  - Screen Wake Lock to keep background tracking alive when tab is minimized
// ============================================================
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { pingLocationBatchHttp } from '../api/livetrackingApi';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api(?:\/v1)?\/?$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');
const MIN_DISTANCE_METERS = 0; // 0 meters — emit on every 2.5s tick for continuous live streaming
const FORCE_PING_INTERVAL_MS = 2_500; // 2.5 seconds automatic high-frequency emission
// Reject fixes worse than this radius — 10km previously let wildly inaccurate
// cell-tower/IP-only fixes through as if they were the employee's real position.
// 500m still comfortably covers laptop Wi-Fi/IP geolocation (usually well under 300m).
const MAX_ACCEPTABLE_ACCURACY_METERS = 500;
const WAKE_LOCK_HEARTBEAT_MS = 30_000; // Re-acquire Wake Lock every 30s

// ── Offline buffer ────────────────────────────────────────────────────────────
// Fixes that can't be delivered (socket down AND HTTP failing) are kept here,
// persisted so a tab reload doesn't lose them, and replayed in order on
// reconnect. While anything is buffered, new fixes queue BEHIND it — the
// server drops fixes older than the last one it accepted, so sending a live
// fix first would make the whole buffer look out-of-order.
const BUFFER_KEY = 'livetracking:pending-fixes';
const BUFFER_MAX = 2000; // ~80 min at 2.5s — oldest dropped beyond this
const REPLAY_CHUNK = 100; // server accepts ≤200 per batch
const REPLAY_ACK_TIMEOUT_MS = 10_000;
const REPLAY_RETRY_MS = 15_000;

interface BufferedFix {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

function loadBuffer(): BufferedFix[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(BUFFER_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBuffer(buffer: BufferedFix[]): void {
  try {
    if (buffer.length) localStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));
    else localStorage.removeItem(BUFFER_KEY);
  } catch {
    // Storage full / blocked — the in-memory buffer still works for this tab
  }
}

// ── Haversine distance ────────────────────────────────────────────────────────
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Kalman Filter (position, variance in metres²) ─────────────────────────────
// Both the process noise and the measurement noise are in metres², so the gain
// is dimensionless. The previous version mixed degrees² (Q) with metres (R):
// its gain collapsed to <1% within a minute and a moving employee's marker
// trailed kilometres behind their real position.
interface KalmanState {
  lat: number;
  lng: number;
  /** Estimate variance in metres² */
  variance: number;
  timestampMs: number;
}

/** Minimum assumed movement uncertainty (m/s) — covers walking / GPS drift */
const KALMAN_MIN_PROCESS_SPEED_MPS = 3;

function kalmanUpdate(
  state: KalmanState | null,
  lat: number,
  lng: number,
  accuracyM: number | null | undefined,
  speedMps: number | null | undefined,
  timestampMs: number
): KalmanState {
  const accuracy = Math.max(1, accuracyM ?? 15);
  if (!state) return { lat, lng, variance: accuracy * accuracy, timestampMs };

  const dtSec = Math.max(0, (timestampMs - state.timestampMs) / 1000);
  // Faster movement → trust new fixes more, so a vehicle isn't smoothed into lag
  const q = Math.max(KALMAN_MIN_PROCESS_SPEED_MPS, speedMps ?? 0);
  const predictedVariance = state.variance + dtSec * q * q;
  const K = predictedVariance / (predictedVariance + accuracy * accuracy);

  return {
    lat: state.lat + K * (lat - state.lat),
    lng: state.lng + K * (lng - state.lng),
    variance: (1 - K) * predictedVariance,
    timestampMs,
  };
}

// ── Screen Wake Lock manager ──────────────────────────────────────────────────
class WakeLockManager {
  private sentinel: WakeLockSentinel | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  async acquire(): Promise<void> {
    if (!('wakeLock' in navigator)) return;
    try {
      this.sentinel = await (navigator as any).wakeLock.request('screen');
      if (import.meta.env.DEV) {
        console.info('[LocationTracker] Screen Wake Lock acquired');
      }
    } catch {
      // Wake Lock denied — non-fatal
    }
  }

  startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(async () => {
      if (!this.sentinel || this.sentinel.released) {
        await this.acquire();
      }
    }, WAKE_LOCK_HEARTBEAT_MS);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async release(): Promise<void> {
    this.stopHeartbeat();
    if (this.sentinel && !this.sentinel.released) {
      try {
        await this.sentinel.release();
      } catch {
        // Ignore
      }
    }
    this.sentinel = null;
  }
}

interface TrackerOptions {
  token: string | null;
  enabled: boolean;
}

export function useEmployeeLocationTracker({ token, enabled }: TrackerOptions): void {
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const permissionListenerRef = useRef<AbortController | null>(null);
  const wakeLockRef = useRef<WakeLockManager>(new WakeLockManager());

  const kalmanRef = useRef<KalmanState | null>(null);
  /** Last status actually sent on the current socket — only transitions are emitted */
  const sentStatusRef = useRef<'ON' | 'OFF' | null>(null);

  const bufferRef = useRef<BufferedFix[]>(loadBuffer());
  const flushingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Replay buffered fixes oldest-first: socket batch (acked) if connected, else HTTP batch */
  const flushBuffer = useCallback(async () => {
    if (flushingRef.current || bufferRef.current.length === 0) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    flushingRef.current = true;
    try {
      while (bufferRef.current.length > 0) {
        const chunk = bufferRef.current.slice(0, REPLAY_CHUNK);
        const socket = socketRef.current;
        if (socket?.connected) {
          const res: any = await socket
            .timeout(REPLAY_ACK_TIMEOUT_MS)
            .emitWithAck('employee:location_batch', { points: chunk });
          if (!res?.ok) throw new Error('batch rejected');
        } else {
          await pingLocationBatchHttp(chunk);
        }
        // Server has processed this chunk (duplicates/stale points are dropped there)
        bufferRef.current = bufferRef.current.slice(chunk.length);
        saveBuffer(bufferRef.current);
      }
    } catch {
      if (!retryTimerRef.current) {
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          flushBuffer();
        }, REPLAY_RETRY_MS);
      }
    } finally {
      flushingRef.current = false;
    }
  }, []);

  const bufferFix = useCallback(
    (fix: BufferedFix) => {
      const buffer = bufferRef.current;
      buffer.push(fix);
      if (buffer.length > BUFFER_MAX) buffer.splice(0, buffer.length - BUFFER_MAX);
      saveBuffer(buffer);
      flushBuffer();
    },
    [flushBuffer]
  );

  const emitLocationStatus = useCallback((status: 'ON' | 'OFF') => {
    if (!socketRef.current?.connected || sentStatusRef.current === status) return;
    socketRef.current.emit('employee:location_status_change', { status });
    sentStatusRef.current = status;
  }, []);

  // Process and emit geolocation fix
  const processFix = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, speed, heading } = position.coords;
    const now = Date.now();
    const last = lastPositionRef.current;

    // Skip coarse fixes (cell-tower / IP-only)
    if (accuracy != null && accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) return;

    // The heartbeat reads cached positions — only a NEWER fix updates the filter
    // (re-feeding an old one would drag the estimate backwards), but the current
    // estimate is still re-sent below as a keep-alive for a stationary employee.
    if (!kalmanRef.current || position.timestamp > kalmanRef.current.timestampMs) {
      kalmanRef.current = kalmanUpdate(kalmanRef.current, latitude, longitude, accuracy, speed, position.timestamp);
    }
    const smoothLat = kalmanRef.current.lat;
    const smoothLng = kalmanRef.current.lng;

    const shouldEmit =
      !last ||
      now - last.time >= FORCE_PING_INTERVAL_MS ||
      haversineDistance(last.lat, last.lng, smoothLat, smoothLng) >= MIN_DISTANCE_METERS;

    if (!shouldEmit) return;

    const payload: BufferedFix = {
      latitude: smoothLat,
      longitude: smoothLng,
      accuracy: accuracy ?? undefined,
      speed: speed ?? undefined,
      heading: heading != null && !Number.isNaN(heading) ? heading : undefined,
      // When the fix was taken — lets the server order/dedupe it and place
      // buffered fixes at the right time on replay.
      timestamp: new Date(kalmanRef.current.timestampMs).toISOString(),
    };

    if (socketRef.current?.connected && bufferRef.current.length === 0) {
      socketRef.current.emit('employee:ping_location', payload);
    } else {
      // Socket down (reconnecting, network drop, …) or older fixes still queued:
      // buffer and replay in order (socket batch, or HTTP batch while the socket is down).
      bufferFix(payload);
    }

    lastPositionRef.current = { lat: smoothLat, lng: smoothLng, time: now };
  }, [bufferFix]);

  // Primary watchPosition setup
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        emitLocationStatus('ON');
        processFix(position);
      },
      (error) => {
        if (import.meta.env.DEV) {
          console.warn('[LocationTracker] Geolocation error:', error.code, error.message);
        }
        if (error.code === 1 /* PERMISSION_DENIED */) {
          emitLocationStatus('OFF');
        }
      },
      {
        // High accuracy requests the real GPS chip on mobile instead of coarse
        // Wi-Fi/cell-tower positioning — devices without GPS (laptops) just fall
        // back to their best available source anyway, so this is safe everywhere.
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      }
    );
  }, [emitLocationStatus, processFix]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const watchPermission = useCallback(() => {
    if (!navigator.permissions) return;
    permissionListenerRef.current?.abort();
    const controller = new AbortController();
    permissionListenerRef.current = controller;

    navigator.permissions.query({ name: 'geolocation' }).then((permStatus) => {
      const onChange = () => {
        if (permStatus.state === 'granted') {
          emitLocationStatus('ON');
          startTracking();
        } else if (permStatus.state === 'denied') {
          emitLocationStatus('OFF');
          stopTracking();
        }
      };
      permStatus.addEventListener('change', onChange, { signal: controller.signal });
    });
  }, [emitLocationStatus, startTracking, stopTracking]);

  const handleVisibilityChange = useCallback(async () => {
    if (document.visibilityState === 'visible') {
      await wakeLockRef.current.acquire();
      if (socketRef.current?.connected) {
        startTracking();
        emitLocationStatus('ON');
      }
    }
  }, [startTracking, emitLocationStatus]);

  // Socket connection & tracking lifecycle
  useEffect(() => {
    const activeToken = token || localStorage.getItem('accessToken');
    if (!enabled || !activeToken) return;

    const socket = io(`${SOCKET_URL}/live-tracking`, {
      auth: { token: activeToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', async () => {
      // New socket (first connect or reconnect) — the server hasn't heard our status yet
      sentStatusRef.current = null;
      // Replay anything buffered while offline before new live fixes go out
      flushBuffer();
      await wakeLockRef.current.acquire();
      wakeLockRef.current.startHeartbeat();
      startTracking();
      watchPermission();
      emitLocationStatus('ON');
    });

    socket.on('disconnect', () => {
      stopTracking();
    });

    socket.on('connect_error', () => {});

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', flushBuffer);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', flushBuffer);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      stopTracking();
      permissionListenerRef.current?.abort();
      wakeLockRef.current.release();
      socket.disconnect();
      socketRef.current = null;
      lastPositionRef.current = null;
      kalmanRef.current = null;
      sentStatusRef.current = null;
    };
  }, [enabled, token, startTracking, stopTracking, watchPermission, handleVisibilityChange, emitLocationStatus, flushBuffer]);

  // ── 2.5-SECOND KEEP-ALIVE HEARTBEAT ─────────────────────────────────────────
  // watchPosition (above) is the sole source of fresh, high-accuracy GPS fixes —
  // it fires on its own whenever the OS reports movement. This heartbeat exists
  // only so a STATIONARY employee still pings roughly every 2.5s (so "last seen"
  // stays fresh and the socket/DB path stays exercised even without movement).
  // It deliberately asks for a CACHED position (maximumAge: 10s, no high-accuracy)
  // instead of forcing a second independent fresh GPS acquisition — running two
  // concurrent high-accuracy GPS requests every 2.5s doubled battery drain and
  // had them competing for the same GPS hardware for no benefit.
  useEffect(() => {
    const activeToken = token || localStorage.getItem('accessToken');
    if (!enabled || !activeToken) return;

    const heartbeat = setInterval(() => {
      if (!navigator.geolocation) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          emitLocationStatus('ON');
          processFix(pos);
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 10000, timeout: 5000 }
      );
      // Note: no socket-connected gate here — processFix() falls back to the
      // HTTP ping endpoint on its own when the socket is down, so the heartbeat
      // should keep running through outages too, not go silent.
    }, FORCE_PING_INTERVAL_MS);

    return () => clearInterval(heartbeat);
  }, [enabled, token, emitLocationStatus, processFix]);
}
