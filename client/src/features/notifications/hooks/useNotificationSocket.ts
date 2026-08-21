import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import io, { Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export const useNotificationSocket = () => {
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    if (socketInstance && socketInstance.connected) {
      return socketInstance;
    }

    const socketUrl = (import.meta as any).env.VITE_SOCKET_URL || 'http://localhost:5000';
    socketInstance = io(`${socketUrl}/notifications`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 3,
    });

    socketInstance.on('connect_error', () => {
      // Gracefully silence socket connection errors when socket server is unattached
    });

    // Listen for new notifications
    socketInstance.on('notification:received', (data) => {
      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    });

    // Listen for announcement updates
    socketInstance.on('announcement:published', (data) => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    });

    // Listen for read receipts
    socketInstance.on('notification:read', (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return socketInstance;
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (socketInstance && socketInstance.connected) {
      socketInstance.emit(event, data);
    }
  }, []);

  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!socketInstance) {
      connect();
    }

    socketInstance?.on(event, callback);
  }, [connect]);

  useEffect(() => {
    const socket = connect();

    return () => {
      // Don't disconnect on unmount to keep real-time connection alive
      // disconnect();
    };
  }, [connect]);

  return {
    socket: socketInstance,
    connected: socketInstance?.connected || false,
    connect,
    disconnect,
    emit,
    on,
  };
};
