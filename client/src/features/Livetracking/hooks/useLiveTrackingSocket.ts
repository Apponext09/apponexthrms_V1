// ============================================================
// useLiveTrackingSocket — Real-time Socket Subscriber
// client/src/features/Livetracking/hooks/useLiveTrackingSocket.ts
//
// PURPOSE: Used by HR, Admin, and Manager dashboards.
//          Subscribes to /live-tracking Socket.IO namespace.
//          Applies live updates to the employee list state.
//
// FIX: Uses ref-based event callbacks to prevent socket teardown/reconnect loops.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  LiveEmployee,
  TrackingLocationUpdatedEvent,
  TrackingStatusChangedEvent,
} from '../types/livetracking.types';

import { detectBreakPoints } from '../utils/breakDetector';

const SOCKET_URL = (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5000';

interface UseLiveTrackingSocketOptions {
  token: string | null;
  employees: LiveEmployee[];
  setEmployees: React.Dispatch<React.SetStateAction<LiveEmployee[]>>;
  onLocationOff?: (employeeId: number, name: string) => void;
  onLocationOn?: (employeeId: number, name: string) => void;
  onOffline?: (employeeId: number, name: string) => void;
  onOnline?: (employeeId: number, name: string) => void;
}

interface UseLiveTrackingSocketReturn {
  isConnected: boolean;
  socketRef: React.MutableRefObject<Socket | null>;
}

export function useLiveTrackingSocket({
  token,
  employees,
  setEmployees,
  onLocationOff,
  onLocationOn,
  onOffline,
  onOnline,
}: UseLiveTrackingSocketOptions): UseLiveTrackingSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Keep state and callbacks in stable refs so socket effect NEVER tears down on re-render
  const employeesRef = useRef<LiveEmployee[]>(employees);
  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  const callbacksRef = useRef({
    setEmployees,
    onLocationOff,
    onLocationOn,
    onOffline,
    onOnline,
  });

  useEffect(() => {
    callbacksRef.current = {
      setEmployees,
      onLocationOff,
      onLocationOn,
      onOffline,
      onOnline,
    };
  });

  useEffect(() => {
    const activeToken = token || localStorage.getItem('accessToken') || 'active_session';

    const socket = io(`${SOCKET_URL}/live-tracking`, {
      auth: { token: activeToken },
      query: { token: activeToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (import.meta.env.DEV) {
        console.info('[LiveTrackingSocket] Connected to /live-tracking');
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      if (import.meta.env.DEV) {
        console.info('[LiveTrackingSocket] Disconnected from /live-tracking');
      }
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
      if (import.meta.env.DEV) {
        console.warn('[LiveTrackingSocket] Connection error:', err.message);
      }
    });

    // ── Location updated ──────────────────────────────────────────────────────
    socket.on('tracking:location_updated', (event: TrackingLocationUpdatedEvent) => {
      callbacksRef.current.setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.employee_id !== event.employee_id) return emp;

          const newPoint = {
            latitude: Number(event.latitude),
            longitude: Number(event.longitude),
            speed: event.speed ?? null,
            recorded_at: event.last_ping_at || new Date().toISOString(),
          };

          const existingTrail = emp.routeTrail || [];
          let seedTrail = [...existingTrail];
          if (seedTrail.length === 0 && emp.latitude != null && emp.longitude != null) {
            seedTrail.push({
              latitude: emp.latitude,
              longitude: emp.longitude,
              speed: null,
              recorded_at: emp.last_ping_at || new Date().toISOString(),
            });
          }

          const isDuplicate = seedTrail.some(
            (p) => p.latitude === newPoint.latitude && p.longitude === newPoint.longitude
          );

          const updatedTrail = isDuplicate ? seedTrail : [...seedTrail, newPoint];
          const updatedBreaks = detectBreakPoints(updatedTrail);

          return {
            ...emp,
            latitude: Number(event.latitude),
            longitude: Number(event.longitude),
            speed: event.speed ?? emp.speed,
            heading: event.heading ?? emp.heading,
            accuracy: event.accuracy ?? emp.accuracy,
            location_status: event.location_status ?? emp.location_status,
            connection_status: event.connection_status ?? emp.connection_status,
            last_ping_at: event.last_ping_at ?? emp.last_ping_at,
            routeTrail: updatedTrail,
            breakPoints: updatedBreaks,
          };
        })
      );
    });

    // ── Location status changed ───────────────────────────────────────────────
    socket.on('tracking:location_status_changed', (event: TrackingStatusChangedEvent) => {
      const emp = employeesRef.current.find((e) => e.employee_id === event.employee_id);

      callbacksRef.current.setEmployees((prev) =>
        prev.map((e) =>
          e.employee_id === event.employee_id
            ? {
                ...e,
                location_status: event.location_status ?? e.location_status,
                connection_status: event.connection_status ?? e.connection_status,
              }
            : e
        )
      );

      if (event.location_status === 'OFF' && callbacksRef.current.onLocationOff && emp) {
        callbacksRef.current.onLocationOff(event.employee_id, emp.name);
      }
      if (event.location_status === 'ON' && callbacksRef.current.onLocationOn && emp) {
        callbacksRef.current.onLocationOn(event.employee_id, emp.name);
      }
    });

    // ── Connection status changed ─────────────────────────────────────────────
    socket.on('tracking:status_changed', (event: TrackingStatusChangedEvent) => {
      const emp = employeesRef.current.find((e) => e.employee_id === event.employee_id);

      callbacksRef.current.setEmployees((prev) =>
        prev.map((e) =>
          e.employee_id === event.employee_id
            ? {
                ...e,
                connection_status: event.connection_status ?? e.connection_status,
              }
            : e
        )
      );

      if (event.connection_status === 'OFFLINE' && callbacksRef.current.onOffline && emp) {
        callbacksRef.current.onOffline(event.employee_id, emp.name);
      }
      if (event.connection_status === 'ONLINE' && callbacksRef.current.onOnline && emp) {
        callbacksRef.current.onOnline(event.employee_id, emp.name);
      }
    });

    // ── Snapshot ──────────────────────────────────────────────────────────────
    socket.on('tracking:snapshot', (data: LiveEmployee[]) => {
      callbacksRef.current.setEmployees(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token]);

  return {
    isConnected,
    socketRef,
  };
}
