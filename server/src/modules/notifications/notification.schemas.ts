import { z } from 'zod';

// ============= Notification Schemas =============

export const createNotificationSchema = z.object({
  eventCode: z.string().min(1),
  recipientId: z.number().positive(),
  variables: z.record(z.any()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  channels: z.array(z.string()).optional(),
  scheduledAt: z.date().optional(),
});

export const markAsReadSchema = z.object({
  notificationId: z.number().positive(),
});

// ============= Template Schemas =============

export const createTemplateSchema = z.object({
  template_code: z.string().min(1).max(100),
  template_name: z.string().min(1).max(255),
  template_description: z.string().optional(),
  category: z.enum([
    'leave_approval',
    'attendance',
    'asset',
    'workflow',
    'payroll',
    'announcement',
    'system',
  ]),
  channels: z.array(z.enum(['email', 'sms', 'whatsapp', 'push', 'inapp', 'webhook'])).optional(),
  subject_line: z.string().optional(),
  body_text: z.string().min(1),
  body_html: z.string().optional(),
  sms_text: z.string().max(160).optional(),
  whatsapp_template_name: z.string().optional(),
});

export const updateTemplateSchema = z.object({
  template_name: z.string().min(1).max(255).optional(),
  template_description: z.string().optional(),
  category: z.enum([
    'leave_approval',
    'attendance',
    'asset',
    'workflow',
    'payroll',
    'announcement',
    'system',
  ]).optional(),
  channels: z.array(z.enum(['email', 'sms', 'whatsapp', 'push', 'inapp', 'webhook'])).optional(),
  subject_line: z.string().optional(),
  body_text: z.string().min(1).optional(),
  body_html: z.string().optional(),
  sms_text: z.string().max(160).optional(),
  whatsapp_template_name: z.string().optional(),
});

export const previewTemplateSchema = z.object({
  variables: z.record(z.any()).optional(),
});

// ============= Preference Schemas =============

export const updatePreferencesSchema = z.object({
  email_enabled: z.boolean().optional(),
  sms_enabled: z.boolean().optional(),
  whatsapp_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  inapp_enabled: z.boolean().optional(),
  webhook_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().optional(), // HH:mm format
  quiet_hours_end: z.string().optional(), // HH:mm format
  quiet_hours_enabled: z.boolean().optional(),
  unsubscribe_all: z.boolean().optional(),
  preferences_json: z.record(z.any()).optional(),
});

// ============= Announcement Schemas =============

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  featured_image_url: z.string().optional(),
  visibility_level: z.enum(['all_employees', 'department', 'role_specific']).optional(),
  visible_to_departments: z.array(z.number()).optional(),
  visible_to_roles: z.array(z.number()).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  allow_comments: z.boolean().optional(),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  featured_image_url: z.string().optional(),
  visibility_level: z.enum(['all_employees', 'department', 'role_specific']).optional(),
  visible_to_departments: z.array(z.number()).optional(),
  visible_to_roles: z.array(z.number()).optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  allow_comments: z.boolean().optional(),
  expires_at: z.date().optional(),
});

// ============= Event Schemas =============

export const createEventSchema = z.object({
  event_code: z.string().min(1).max(100),
  event_name: z.string().min(1).max(255),
  event_description: z.string().optional(),
  default_template_id: z.number().optional(),
  is_enabled: z.boolean().optional(),
  retry_count: z.number().optional(),
  retry_interval_minutes: z.number().optional(),
  max_queue_delay_hours: z.number().optional(),
});

export const updateEventSchema = z.object({
  event_name: z.string().min(1).max(255).optional(),
  event_description: z.string().optional(),
  default_template_id: z.number().optional(),
  is_enabled: z.boolean().optional(),
  retry_count: z.number().optional(),
  retry_interval_minutes: z.number().optional(),
  max_queue_delay_hours: z.number().optional(),
});
