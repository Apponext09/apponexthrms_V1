import type { Server, Socket } from 'socket.io';
import { logger } from '@/common/lib/logger';
import type { TenantContext } from '../db/types';

export class NotificationSocket {
  private io: Server;
  private userSockets: Map<number, string[]> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupNamespace();
  }

  /**
   * Setup Socket.IO namespace for notifications
   */
  private setupNamespace() {
    const nsp = this.io.of('/notifications');

    nsp.on('connection', (socket: Socket) => {
      logger.info(`Notification socket connected: ${socket.id}`);

      // Store user socket mapping
      const userId = socket.handshake.auth?.userId;
      if (userId) {
        const sockets = this.userSockets.get(userId) || [];
        sockets.push(socket.id);
        this.userSockets.set(userId, sockets);
        socket.join(`user:${userId}`);
      }

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.info(`Notification socket disconnected: ${socket.id}`);
        if (userId) {
          const sockets = this.userSockets.get(userId) || [];
          const index = sockets.indexOf(socket.id);
          if (index > -1) {
            sockets.splice(index, 1);
          }
          if (sockets.length === 0) {
            this.userSockets.delete(userId);
          }
        }
      });

      // Handle read receipt
      socket.on('notification:read', (data: { notificationId: number }) => {
        nsp.to(`user:${userId}`).emit('notification:read', data);
      });

      // Handle announcement read
      socket.on('announcement:read', (data: { announcementId: number }) => {
        nsp.to(`user:${userId}`).emit('announcement:read', data);
      });
    });
  }

  /**
   * Broadcast notification to specific user
   */
  broadcastToUser(userId: number, event: string, data: any) {
    this.io.of('/notifications').to(`user:${userId}`).emit(event, data);
    logger.info(`Notification broadcast to user ${userId}: ${event}`);
  }

  /**
   * Broadcast to multiple users
   */
  broadcastToUsers(userIds: number[], event: string, data: any) {
    userIds.forEach((userId) => {
      this.broadcastToUser(userId, event, data);
    });
  }

  /**
   * Broadcast notification received event
   */
  notificationReceived(userId: number, notification: any) {
    this.broadcastToUser(userId, 'notification:received', {
      id: notification.id,
      subject_line: notification.subject_line,
      body_text: notification.body_text,
      priority: notification.priority,
      created_at: notification.created_at,
    });
  }

  /**
   * Broadcast announcement published event
   */
  announcementPublished(announcement: any) {
    this.io.of('/notifications').emit('announcement:published', {
      id: announcement.id,
      title: announcement.title,
      published_at: announcement.published_at,
    });
  }

  /**
   * Broadcast unread count update
   */
  unreadCountUpdated(userId: number, count: number) {
    this.broadcastToUser(userId, 'unread-count:updated', { count });
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: number): boolean {
    return (this.userSockets.get(userId)?.length || 0) > 0;
  }

  /**
   * Get user's socket IDs
   */
  getUserSockets(userId: number): string[] {
    return this.userSockets.get(userId) || [];
  }
}

/**
 * Initialize Socket.IO for notifications
 * Call this when setting up your Express/HTTP server
 */
export function initializeNotificationSocket(io: Server): NotificationSocket {
  return new NotificationSocket(io);
}

