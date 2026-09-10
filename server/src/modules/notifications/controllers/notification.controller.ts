import type { Request, Response } from 'express';
import type { ApiResponse } from '@apponexthrms/shared';
import { NotificationService } from '../services/notification.service';
import { TemplateService } from '../services/template.service';
import { NotificationPreferenceService } from '../services/notification-preference.service';
import { AnnouncementService } from '../services/announcement.service';
import { DeliveryService } from '../services/delivery.service';

export class NotificationController {
  private notificationService: NotificationService;
  private templateService: TemplateService;
  private preferenceService: NotificationPreferenceService;
  private announcementService: AnnouncementService;
  private deliveryService: DeliveryService;

  constructor() {
    this.notificationService = new NotificationService();
    this.templateService = new TemplateService();
    this.preferenceService = new NotificationPreferenceService();
    this.announcementService = new AnnouncementService();
    this.deliveryService = new DeliveryService();
  }

  // ============= Notifications =============

  async getNotifications(req: Request, res: Response): Promise<void> {
    const { page = 1, pageSize = 20, status } = req.query;

    const result = await this.notificationService.getNotifications(req.ctx!, {
      page: Number(page),
      pageSize: Number(pageSize),
      filters: status ? { status } : {},
    });

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  }

  async getNotification(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const notification = await this.notificationService.getNotification(req.ctx!, Number(id));

    const response: ApiResponse = {
      success: true,
      data: notification,
    };

    res.status(200).json(response);
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    const count = await this.notificationService.getUnreadCount(req.ctx!);

    const response: ApiResponse = {
      success: true,
      data: { count },
    };

    res.status(200).json(response);
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    await this.notificationService.markAsRead(req.ctx!, Number(id));

    const response: ApiResponse = {
      success: true,
      data: { message: 'Marked as read' },
    };

    res.status(200).json(response);
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    await this.notificationService.markAllAsRead(req.ctx!);

    const response: ApiResponse = {
      success: true,
      data: { message: 'All marked as read' },
    };

    res.status(200).json(response);
  }

  async deleteNotification(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    await this.notificationService.deleteNotification(req.ctx!, Number(id));

    const response: ApiResponse = {
      success: true,
      data: { message: 'Notification deleted' },
    };

    res.status(200).json(response);
  }

  // ============= Templates =============

  async createTemplate(req: Request, res: Response): Promise<void> {
    const template = await this.templateService.createTemplate(req.ctx!, req.body);

    const response: ApiResponse = {
      success: true,
      data: template,
    };

    res.status(201).json(response);
  }

  async updateTemplate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const template = await this.templateService.updateTemplate(req.ctx!, Number(id), req.body);

    const response: ApiResponse = {
      success: true,
      data: template,
    };

    res.status(200).json(response);
  }

  async publishTemplate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const template = await this.templateService.publishTemplate(req.ctx!, Number(id));

    const response: ApiResponse = {
      success: true,
      data: template,
    };

    res.status(200).json(response);
  }

  async archiveTemplate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const template = await this.templateService.archiveTemplate(req.ctx!, Number(id));

    const response: ApiResponse = {
      success: true,
      data: template,
    };

    res.status(200).json(response);
  }

  async getTemplate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const template = await this.templateService.getWithVersions(req.ctx!, Number(id));

    const response: ApiResponse = {
      success: true,
      data: template,
    };

    res.status(200).json(response);
  }

  async previewTemplate(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const rendered = await this.templateService.previewTemplate(req.ctx!, Number(id), req.body.variables || {});

    const response: ApiResponse = {
      success: true,
      data: rendered,
    };

    res.status(200).json(response);
  }

  // ============= Preferences =============

  async getPreferences(req: Request, res: Response): Promise<void> {
    const prefs = await this.preferenceService.getPreferences(req.ctx!);

    const response: ApiResponse = {
      success: true,
      data: prefs,
    };

    res.status(200).json(response);
  }

  async updatePreferences(req: Request, res: Response): Promise<void> {
    const prefs = await this.preferenceService.updatePreferences(req.ctx!, req.body);

    const response: ApiResponse = {
      success: true,
      data: prefs,
    };

    res.status(200).json(response);
  }

  // ============= Announcements =============

  async createAnnouncement(req: Request, res: Response): Promise<void> {
    const announcement = await this.announcementService.createAnnouncement(req.ctx!, req.body);

    const response: ApiResponse = {
      success: true,
      data: announcement,
    };

    res.status(201).json(response);
  }

  async updateAnnouncement(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const announcement = await this.announcementService.updateAnnouncement(req.ctx!, Number(id), req.body);

    const response: ApiResponse = {
      success: true,
      data: announcement,
    };

    res.status(200).json(response);
  }

  async publishAnnouncement(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const announcement = await this.announcementService.publishAnnouncement(req.ctx!, Number(id));

    const response: ApiResponse = {
      success: true,
      data: announcement,
    };

    res.status(200).json(response);
  }

  async archiveAnnouncement(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const announcement = await this.announcementService.archiveAnnouncement(req.ctx!, Number(id));

    const response: ApiResponse = {
      success: true,
      data: announcement,
    };

    res.status(200).json(response);
  }

  async getAnnouncements(req: Request, res: Response): Promise<void> {
    const { page = 1, pageSize = 20 } = req.query;

    // TODO: Get user roles and departments from auth context
    const result = await this.announcementService.getAnnouncementsForUser(
      req.ctx!,
      req.ctx!.userId,
      [],
      [],
      {
        page: Number(page),
        pageSize: Number(pageSize),
      }
    );

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  }

  async getAnnouncement(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const announcement = await this.announcementService.getAnnouncementDetail(req.ctx!, Number(id));

    const response: ApiResponse = {
      success: true,
      data: announcement,
    };

    res.status(200).json(response);
  }

  async markAnnouncementAsRead(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    await this.announcementService.markAnnouncementAsRead(req.ctx!, Number(id));

    const response: ApiResponse = {
      success: true,
      data: { message: 'Marked as read' },
    };

    res.status(200).json(response);
  }

  async deleteAnnouncement(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    await this.announcementService.deleteAnnouncement(req.ctx!, Number(id));

    const response: ApiResponse = {
      success: true,
      data: { message: 'Announcement deleted' },
    };

    res.status(200).json(response);
  }

  // ============= Queue Management =============

  async processQueue(req: Request, res: Response): Promise<void> {
    const result = await this.deliveryService.processQueue(req.ctx!);

    const response: ApiResponse = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  }
}
