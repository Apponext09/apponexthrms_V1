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

    socketInstance = io(`${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/notifications`, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
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
