// ============================================================
// useLiveTrackingSocket — Real-time Socket Subscriber
// client/src/features/Livetracking/hooks/useLiveTrackingSocket.ts
//
// PURPOSE: Used by HR, Admin, and Manager dashboards.
//          Subscribes to /live-tracking Socket.IO namespace.
//          Applies live updates to the employee list state.
// ============================================================
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  LiveEmployee,
  TrackingLocationUpdatedEvent,
  TrackingStatusChangedEvent,
} from '../types/livetracking.types';

import { detectBreakPoints } from '../utils/breakDetector';

const SOCKET_URL = (import.meta as any).env.VITE_SOCKET_URL || 'http://127.0.0.1:5000';

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
  const isConnectedRef = useRef(false);
  const employeesRef = useRef<LiveEmployee[]>(employees);

  // Keep employees ref in sync
  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  const findEmployee = useCallback(
    (employeeId: number) => employeesRef.current.find((e) => e.employee_id === employeeId),
    []
  );

  const handleLocationUpdated = useCallback(
    (event: TrackingLocationUpdatedEvent) => {
      setEmployees((prev) =>
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

          // Avoid adding duplicate location at exact same coordinates
          const isDuplicate = seedTrail.some(
            (p) => p.latitude === newPoint.latitude && p.longitude === newPoint.longitude
          );

          const updatedTrail = isDuplicate ? seedTrail : [...seedTrail, newPoint];
          const updatedBreaks = detectBreakPoints(updatedTrail);

          return {
            ...emp,
            latitude: Number(event.latitude),
            longitude: Number(event.longitude),
            location_status: event.location_status ?? emp.location_status,
            connection_status: event.connection_status ?? emp.connection_status,
            last_ping_at: event.last_ping_at ?? emp.last_ping_at,
            routeTrail: updatedTrail,
            breakPoints: updatedBreaks,
          };
        })
      );
    },
    [setEmployees]
  );

  const handleLocationStatusChanged = useCallback(
    (event: TrackingStatusChangedEvent) => {
      const emp = findEmployee(event.employee_id);

      setEmployees((prev) =>
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

      if (event.location_status === 'OFF' && onLocationOff && emp) {
        onLocationOff(event.employee_id, emp.name);
      }
      if (event.location_status === 'ON' && onLocationOn && emp) {
        onLocationOn(event.employee_id, emp.name);
      }
    },
    [setEmployees, findEmployee, onLocationOff, onLocationOn]
  );

  const handleStatusChanged = useCallback(
    (event: TrackingStatusChangedEvent) => {
      const emp = findEmployee(event.employee_id);

      setEmployees((prev) =>
        prev.map((e) =>
          e.employee_id === event.employee_id
            ? {
                ...e,
                connection_status: event.connection_status ?? e.connection_status,
              }
            : e
        )
      );

      if (event.connection_status === 'OFFLINE' && onOffline && emp) {
        onOffline(event.employee_id, emp.name);
      }
      if (event.connection_status === 'ONLINE' && onOnline && emp) {
        onOnline(event.employee_id, emp.name);
      }
    },
    [setEmployees, findEmployee, onOffline, onOnline]
  );

  const handleSnapshot = useCallback(
    (data: LiveEmployee[]) => {
      setEmployees(data);
    },
    [setEmployees]
  );

  useEffect(() => {
    if (!token) return;

    const socket = io(`${SOCKET_URL}/live-tracking`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      isConnectedRef.current = true;
      console.info('[LiveTrackingSocket] Connected to /live-tracking');
    });

    socket.on('disconnect', () => {
      isConnectedRef.current = false;
      console.info('[LiveTrackingSocket] Disconnected from /live-tracking');
    });

    socket.on('tracking:location_updated', handleLocationUpdated);
    socket.on('tracking:location_status_changed', handleLocationStatusChanged);
    socket.on('tracking:status_changed', handleStatusChanged);
    socket.on('tracking:snapshot', handleSnapshot);

    return () => {
      socket.off('tracking:location_updated', handleLocationUpdated);
      socket.off('tracking:location_status_changed', handleLocationStatusChanged);
      socket.off('tracking:status_changed', handleStatusChanged);
      socket.off('tracking:snapshot', handleSnapshot);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, handleLocationUpdated, handleLocationStatusChanged, handleStatusChanged, handleSnapshot]);

  return {
    isConnected: isConnectedRef.current,
    socketRef,
  };
}
