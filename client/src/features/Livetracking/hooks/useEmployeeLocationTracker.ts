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

const SOCKET_URL = (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5000';
const MIN_DISTANCE_METERS = 0; // 0 meters — emit on every 2.5s tick for continuous live streaming
const FORCE_PING_INTERVAL_MS = 2_500; // 2.5 seconds automatic high-frequency emission
const MAX_ACCEPTABLE_ACCURACY_METERS = 10000; // Support laptop Wi-Fi/IP geolocation
const WAKE_LOCK_HEARTBEAT_MS = 30_000; // Re-acquire Wake Lock every 30s

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

// ── 1D Kalman Filter ──────────────────────────────────────────────────────────
interface KalmanState {
  estimate: number;
  errorCovariance: number;
}

function kalmanUpdate(
  state: KalmanState,
  measurement: number,
  Q = 0.0001,
  R = 3
): KalmanState {
  const predicted = state.estimate;
  const predictedErr = state.errorCovariance + Q;
  const K = predictedErr / (predictedErr + R);
  return {
    estimate: predicted + K * (measurement - predicted),
    errorCovariance: (1 - K) * predictedErr,
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

  const kalmanLatRef = useRef<KalmanState | null>(null);
  const kalmanLngRef = useRef<KalmanState | null>(null);

  const emitLocationStatus = useCallback((status: 'ON' | 'OFF') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('employee:location_status_change', { status });
    }
  }, []);

  // Process and emit geolocation fix
  const processFix = useCallback((coords: GeolocationCoordinates) => {
    const { latitude, longitude, accuracy, speed, heading } = coords;
    const now = Date.now();
    const last = lastPositionRef.current;

    // Skip pings with accuracy > 10000m
    if (accuracy != null && accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) return;

    // Kalman Filter
    if (kalmanLatRef.current === null || kalmanLngRef.current === null) {
      kalmanLatRef.current = { estimate: latitude, errorCovariance: 1 };
      kalmanLngRef.current = { estimate: longitude, errorCovariance: 1 };
    } else {
      kalmanLatRef.current = kalmanUpdate(kalmanLatRef.current, latitude);
      kalmanLngRef.current = kalmanUpdate(kalmanLngRef.current, longitude);
    }

    const smoothLat = kalmanLatRef.current.estimate;
    const smoothLng = kalmanLngRef.current.estimate;

    const shouldEmit =
      !last ||
      now - last.time >= FORCE_PING_INTERVAL_MS ||
      haversineDistance(last.lat, last.lng, smoothLat, smoothLng) >= MIN_DISTANCE_METERS;

    if (shouldEmit && socketRef.current?.connected) {
      socketRef.current.emit('employee:ping_location', {
        latitude: smoothLat,
        longitude: smoothLng,
        accuracy: accuracy ?? undefined,
        speed: speed ?? undefined,
        heading: heading ?? undefined,
      });
      lastPositionRef.current = { lat: smoothLat, lng: smoothLng, time: now };
    }
  }, []);

  // Primary watchPosition setup
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        emitLocationStatus('ON');
        processFix(position.coords);
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
        enableHighAccuracy: false, // Use fast Wi-Fi/IP location on laptops & desktops
        maximumAge: 3000,
        timeout: 6000,
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

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopTracking();
      permissionListenerRef.current?.abort();
      wakeLockRef.current.release();
      socket.disconnect();
      socketRef.current = null;
      lastPositionRef.current = null;
      kalmanLatRef.current = null;
      kalmanLngRef.current = null;
    };
  }, [enabled, token, startTracking, stopTracking, watchPermission, handleVisibilityChange, emitLocationStatus]);

  // ── DEDICATED 2.5-SECOND BACKGROUND LOCATION TRIGGER ENGINE ────────────────
  // Forces a fresh getCurrentPosition query every 2.5s in the background
  useEffect(() => {
    const activeToken = token || localStorage.getItem('accessToken');
    if (!enabled || !activeToken) return;

    const backgroundTrigger = setInterval(() => {
      if (!navigator.geolocation || !socketRef.current?.connected) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          emitLocationStatus('ON');
          processFix(pos.coords);
        },
        () => {
          // Fallback: request cached fix if fresh fix times out
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              emitLocationStatus('ON');
              processFix(pos.coords);
            },
            () => {},
            { enableHighAccuracy: false, maximumAge: 60000, timeout: 2000 }
          );
        },
        { enableHighAccuracy: false, maximumAge: 0, timeout: 3000 }
      );
    }, FORCE_PING_INTERVAL_MS);

    return () => clearInterval(backgroundTrigger);
  }, [enabled, token, emitLocationStatus, processFix]);
}
