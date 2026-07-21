/**
 * Notification Module Permissions
 *
 * These permissions control access to notification features.
 * Define them here, then seed them into the database.
 */

export const NOTIFICATION_PERMISSIONS = {
  // Template Management
  'notification:template:create': {
    code: 'notification:template:create',
    name: 'Create Notification Template',
    description: 'Create new notification templates',
    category: 'notification',
  },
  'notification:template:read': {
    code: 'notification:template:read',
    name: 'Read Notification Templates',
    description: 'View notification templates',
    category: 'notification',
  },
  'notification:template:update': {
    code: 'notification:template:update',
    name: 'Update Notification Template',
    description: 'Edit notification templates',
    category: 'notification',
  },
  'notification:template:delete': {
    code: 'notification:template:delete',
    name: 'Delete Notification Template',
    description: 'Delete notification templates',
    category: 'notification',
  },
  'notification:template:publish': {
    code: 'notification:template:publish',
    name: 'Publish Notification Template',
    description: 'Publish templates for use',
    category: 'notification',
  },

  // Announcement Management
  'notification:announcement:create': {
    code: 'notification:announcement:create',
    name: 'Create Announcement',
    description: 'Create new announcements',
    category: 'notification',
  },
  'notification:announcement:read': {
    code: 'notification:announcement:read',
    name: 'Read Announcements',
    description: 'View announcements',
    category: 'notification',
  },
  'notification:announcement:update': {
    code: 'notification:announcement:update',
    name: 'Update Announcement',
    description: 'Edit announcements',
    category: 'notification',
  },
  'notification:announcement:delete': {
    code: 'notification:announcement:delete',
    name: 'Delete Announcement',
    description: 'Delete announcements',
    category: 'notification',
  },
  'notification:announcement:publish': {
    code: 'notification:announcement:publish',
    name: 'Publish Announcement',
    description: 'Publish announcements to users',
    category: 'notification',
  },

  // Preference Management
  'notification:preference:read': {
    code: 'notification:preference:read',
    name: 'Read Notification Preferences',
    description: 'View notification preferences',
    category: 'notification',
  },
  'notification:preference:update': {
    code: 'notification:preference:update',
    name: 'Update Notification Preferences',
    description: 'Modify notification preferences',
    category: 'notification',
  },

  // Queue Management
  'notification:queue:manage': {
    code: 'notification:queue:manage',
    name: 'Manage Notification Queue',
    description: 'Process and manage notification delivery queue',
    category: 'notification',
  },

  // Analytics
  'notification:analytics:read': {
    code: 'notification:analytics:read',
    name: 'Read Notification Analytics',
    description: 'View notification delivery analytics and reports',
    category: 'notification',
  },
};

/**
 * Default role permissions
 * Map which roles should have which permissions by default
 */
export const NOTIFICATION_ROLE_PERMISSIONS = {
  admin: [
    'notification:template:create',
    'notification:template:read',
    'notification:template:update',
    'notification:template:delete',
    'notification:template:publish',
    'notification:announcement:create',
    'notification:announcement:read',
    'notification:announcement:update',
    'notification:announcement:delete',
    'notification:announcement:publish',
    'notification:preference:read',
    'notification:preference:update',
    'notification:queue:manage',
    'notification:analytics:read',
  ],
  manager: [
    'notification:announcement:create',
    'notification:announcement:read',
    'notification:announcement:update',
    'notification:announcement:publish',
    'notification:preference:read',
    'notification:preference:update',
    'notification:analytics:read',
  ],
  employee: [
    'notification:preference:read',
    'notification:preference:update',
    'notification:announcement:read',
  ],
};
