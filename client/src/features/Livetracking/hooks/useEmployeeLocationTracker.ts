// ============================================================
// useEmployeeLocationTracker — Silent Background GPS Tracker
// client/src/features/Livetracking/hooks/useEmployeeLocationTracker.ts
//
// PURPOSE: Runs headlessly after employee login.
//          NO map UI is shown to the employee.
//          Emits location pings to /live-tracking socket.
//          Detects GPS ON/OFF changes and notifies server instantly.
// ============================================================
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5000';
const MIN_DISTANCE_METERS = 20;
const FORCE_PING_INTERVAL_MS = 12_000; // 12 seconds

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

interface TrackerOptions {
  /** The JWT access token of the logged-in employee */
  token: string | null;
  /** Whether the user is an employee (tracking runs for all roles silently) */
  enabled: boolean;
}

export function useEmployeeLocationTracker({ token, enabled }: TrackerOptions): void {
  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const permissionListenerRef = useRef<AbortController | null>(null);

  const emitLocationStatus = useCallback(
    (status: 'ON' | 'OFF') => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('employee:location_status_change', { status });
      }
    },
    []
  );

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed, heading } = position.coords;
        const now = Date.now();
        const last = lastPositionRef.current;

        // Only emit if moved enough OR enough time has passed
        const shouldEmit =
          !last ||
          now - last.time >= FORCE_PING_INTERVAL_MS ||
          haversineDistance(last.lat, last.lng, latitude, longitude) >= MIN_DISTANCE_METERS;

        if (shouldEmit && socketRef.current?.connected) {
          socketRef.current.emit('employee:ping_location', {
            latitude,
            longitude,
            accuracy: accuracy ?? undefined,
            speed: speed ?? undefined,
            heading: heading ?? undefined,
          });
          lastPositionRef.current = { lat: latitude, lng: longitude, time: now };
        }
      },
      (error) => {
        // GeolocationPositionError — GPS was denied or turned off
        console.warn('[LocationTracker] GPS error:', error.code, error.message);
        if (error.code === 1 /* PERMISSION_DENIED */ || error.code === 2 /* POSITION_UNAVAILABLE */) {
          emitLocationStatus('OFF');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }, [emitLocationStatus]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Monitor browser permission state for real-time ON/OFF detection
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
        } else {
          emitLocationStatus('OFF');
          stopTracking();
        }
      };
      permStatus.addEventListener('change', onChange, { signal: controller.signal });
    });
  }, [emitLocationStatus, startTracking, stopTracking]);

  useEffect(() => {
    if (!enabled || !token) return;

    // Connect to /live-tracking socket namespace
    const socket = io(`${SOCKET_URL}/live-tracking`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (import.meta.env.DEV) {
        console.info('[LocationTracker] Socket connected, starting GPS tracking...');
      }
      startTracking();
      watchPermission();
    });

    socket.on('disconnect', () => {
      if (import.meta.env.DEV) {
        console.info('[LocationTracker] Socket disconnected');
      }
      stopTracking();
    });

    socket.on('connect_error', (err) => {
      if (import.meta.env.DEV) {
        console.warn('[LocationTracker] Socket connection error:', err.message);
      }
    });

    // Cleanup on logout or unmount
    return () => {
      stopTracking();
      permissionListenerRef.current?.abort();
      socket.disconnect();
      socketRef.current = null;
      lastPositionRef.current = null;
    };
  }, [enabled, token, startTracking, stopTracking, watchPermission]);
}
