// ============================================================
// useLiveTrackingSocket — Real-time Socket Subscriber
// client/src/features/Livetracking/hooks/useLiveTrackingSocket.ts
//
// PURPOSE: Used by HR, Admin, and Manager dashboards.
//          Subscribes to /live-tracking Socket.IO namespace.
//
// Location deltas (`tracking:locations`, batched by the server) go straight
// into the live store — they do NOT touch React state, so a GPS update never
// re-renders the dashboard. Only status transitions reach React (toasts).
//
// FIX: Uses ref-based event callbacks to prevent socket teardown/reconnect loops.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { LocationDelta, TrackingStatusChangedEvent } from '../types/livetracking.types';
import { liveTrackingStore } from '../store/liveTrackingStore';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api(?:\/v1)?\/?$/, '') ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000');

interface UseLiveTrackingSocketOptions {
  token: string | null;
  /** Deltas arrived for employees not on the roster yet (e.g. checked in after page load) */
  onUnknownEmployees?: (employeeIds: number[]) => void;
  /** Called after reconnecting — deltas sent while disconnected were missed */
  onReconnect?: () => void;
  onLocationOff?: (employeeId: number) => void;
  onLocationOn?: (employeeId: number) => void;
  onOffline?: (employeeId: number) => void;
  onOnline?: (employeeId: number) => void;
}

interface UseLiveTrackingSocketReturn {
  isConnected: boolean;
  socketRef: React.MutableRefObject<Socket | null>;
}

export function useLiveTrackingSocket({
  token,
  onUnknownEmployees,
  onReconnect,
  onLocationOff,
  onLocationOn,
  onOffline,
  onOnline,
}: UseLiveTrackingSocketOptions): UseLiveTrackingSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Keep callbacks in stable refs so the socket effect NEVER tears down on re-render
  const callbacksRef = useRef({ onUnknownEmployees, onReconnect, onLocationOff, onLocationOn, onOffline, onOnline });
  useEffect(() => {
    callbacksRef.current = { onUnknownEmployees, onReconnect, onLocationOff, onLocationOn, onOffline, onOnline };
  });

  useEffect(() => {
    const activeToken = token || localStorage.getItem('accessToken');
    if (!activeToken) return;

    const socket = io(`${SOCKET_URL}/live-tracking`, {
      auth: { token: activeToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;
    let connectedBefore = false;

    socket.on('connect', () => {
      setIsConnected(true);
      if (connectedBefore) callbacksRef.current.onReconnect?.();
      connectedBefore = true;
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

    // ── Location deltas (batched) → live store only ──────────────────────────
    socket.on('tracking:locations', (deltas: LocationDelta[]) => {
      if (!Array.isArray(deltas) || deltas.length === 0) return;
      const unknown = liveTrackingStore.applyDeltas(deltas);
      if (unknown.length) callbacksRef.current.onUnknownEmployees?.([...new Set(unknown)]);
    });

    // ── Location status changed ───────────────────────────────────────────────
    socket.on('tracking:location_status_changed', (event: TrackingStatusChangedEvent) => {
      const known = Boolean(liveTrackingStore.get(event.employee_id));
      liveTrackingStore.setStatus(event.employee_id, {
        location_status: event.location_status,
        connection_status: event.connection_status,
      });
      if (!known) return;
      if (event.location_status === 'OFF') callbacksRef.current.onLocationOff?.(event.employee_id);
      if (event.location_status === 'ON') callbacksRef.current.onLocationOn?.(event.employee_id);
    });

    // ── Connection status changed ─────────────────────────────────────────────
    socket.on('tracking:status_changed', (event: TrackingStatusChangedEvent) => {
      const known = Boolean(liveTrackingStore.get(event.employee_id));
      liveTrackingStore.setStatus(event.employee_id, { connection_status: event.connection_status });
      if (!known) return;
      if (event.connection_status === 'OFFLINE') callbacksRef.current.onOffline?.(event.employee_id);
      if (event.connection_status === 'ONLINE') callbacksRef.current.onOnline?.(event.employee_id);
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
