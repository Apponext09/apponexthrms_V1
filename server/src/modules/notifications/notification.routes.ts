import { Router } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { validate } from '../../common/middleware/validate';
import { NotificationController } from './controllers/notification.controller';
import {
  createNotificationSchema,
  updatePreferencesSchema,
  createTemplateSchema,
  updateTemplateSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  previewTemplateSchema,
} from './notification.schemas';

const router = Router();
const controller = new NotificationController();

/**
 * All routes require authentication
 */
router.use(authenticate);
router.use(resolveTenant);

// ============= Notifications =============

router.get(
  '/',
  asyncHandler((req, res) => controller.getNotifications(req, res))
);

router.get(
  '/unread-count',
  asyncHandler((req, res) => controller.getUnreadCount(req, res))
);

router.get(
  '/:id',
  asyncHandler((req, res) => controller.getNotification(req, res))
);

router.patch(
  '/:id/read',
  asyncHandler((req, res) => controller.markAsRead(req, res))
);

router.post(
  '/mark-all-read',
  asyncHandler((req, res) => controller.markAllAsRead(req, res))
);

router.delete(
  '/:id',
  asyncHandler((req, res) => controller.deleteNotification(req, res))
);

// ============= Templates =============

router.post(
  '/templates',
  validate({ body: createTemplateSchema }),
  asyncHandler((req, res) => controller.createTemplate(req, res))
);

router.get(
  '/templates/:id',
  asyncHandler((req, res) => controller.getTemplate(req, res))
);

router.patch(
  '/templates/:id',
  validate({ body: updateTemplateSchema }),
  asyncHandler((req, res) => controller.updateTemplate(req, res))
);

router.post(
  '/templates/:id/publish',
  asyncHandler((req, res) => controller.publishTemplate(req, res))
);

router.post(
  '/templates/:id/archive',
  asyncHandler((req, res) => controller.archiveTemplate(req, res))
);

router.post(
  '/templates/:id/preview',
  validate({ body: previewTemplateSchema }),
  asyncHandler((req, res) => controller.previewTemplate(req, res))
);

// ============= Preferences =============

router.get(
  '/preferences',
  asyncHandler((req, res) => controller.getPreferences(req, res))
);

router.patch(
  '/preferences',
  validate({ body: updatePreferencesSchema }),
  asyncHandler((req, res) => controller.updatePreferences(req, res))
);

// ============= Announcements =============

router.post(
  '/announcements',
  validate({ body: createAnnouncementSchema }),
  asyncHandler((req, res) => controller.createAnnouncement(req, res))
);

router.get(
  '/announcements',
  asyncHandler((req, res) => controller.getAnnouncements(req, res))
);

router.get(
  '/announcements/:id',
  asyncHandler((req, res) => controller.getAnnouncement(req, res))
);

router.patch(
  '/announcements/:id',
  validate({ body: updateAnnouncementSchema }),
  asyncHandler((req, res) => controller.updateAnnouncement(req, res))
);

router.post(
  '/announcements/:id/publish',
  asyncHandler((req, res) => controller.publishAnnouncement(req, res))
);

router.post(
  '/announcements/:id/archive',
  asyncHandler((req, res) => controller.archiveAnnouncement(req, res))
);

router.patch(
  '/announcements/:id/read',
  asyncHandler((req, res) => controller.markAnnouncementAsRead(req, res))
);

router.delete(
  '/announcements/:id',
  asyncHandler((req, res) => controller.deleteAnnouncement(req, res))
);

// ============= Queue Management =============

router.post(
  '/queue/process',
  asyncHandler((req, res) => controller.processQueue(req, res))
);

export default router;
