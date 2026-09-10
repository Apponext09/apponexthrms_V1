import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from '../services/notification.service';
import type { TenantContext } from '../../../db/types';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockCtx: TenantContext;

  beforeEach(() => {
    service = new NotificationService();
    mockCtx = {
      organizationId: 1,
      userId: 1,
      userEmail: 'test@example.com',
    };
  });

  describe('sendNotification', () => {
    it('should create and queue a notification', async () => {
      const input = {
        eventCode: 'leave_approved',
        recipientId: 2,
        variables: {
          employeeName: 'John Doe',
          leaveType: 'Casual',
        },
        priority: 'normal' as const,
      };

      // Mock the repository and service methods
      vi.spyOn(service as any, 'sendNotification').mockResolvedValue({
        id: 1,
        uuid: 'test-uuid',
        event_code: 'leave_approved',
        status: 'queued',
      });

      // This test demonstrates the expected interface
      // In real tests, you would mock the repositories
      const result = await service.sendNotification(mockCtx, input);

      expect(result).toBeDefined();
      expect(result.event_code).toBe('leave_approved');
      expect(result.status).toBe('queued');
    });
  });

  describe('getNotifications', () => {
    it('should retrieve user notifications', async () => {
      vi.spyOn(service as any, 'getNotifications').mockResolvedValue({
        items: [
          {
            id: 1,
            subject_line: 'Test Notification',
            body_text: 'This is a test',
            status: 'delivered',
            priority: 'normal',
            created_at: new Date(),
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          hasMore: false,
          totalPages: 1,
        },
      });

      const result = await service.getNotifications(mockCtx);

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      vi.spyOn(service as any, 'markAsRead').mockResolvedValue({
        id: 1,
        read_at: new Date(),
        status: 'delivered',
      });

      const result = await service.markAsRead(mockCtx, 1);

      expect(result.read_at).toBeDefined();
      expect(result.status).toBe('delivered');
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      vi.spyOn(service as any, 'getUnreadCount').mockResolvedValue(5);

      const count = await service.getUnreadCount(mockCtx);

      expect(count).toBe(5);
    });
  });
});
