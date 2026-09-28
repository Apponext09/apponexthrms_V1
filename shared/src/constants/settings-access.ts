/** Existing configuration tabs shared by the catalog, migrations and frontend. */
export const SETTINGS_CONFIGURATION_TABS = [
  { id: 'attendance-adjustment', label: 'Attendance Adjustment', icon: 'Clock' },
  { id: 'credit-hour', label: 'Credit Hour Settings', icon: 'Award' },
  { id: 'roles-permissions', label: 'Roles & Permissions', icon: 'ShieldCheck' },
  { id: 'notification-setting', label: 'Notification Settings', icon: 'Bell' },
  { id: 'form-type', label: 'Form Types', icon: 'FileText' },
  { id: 'user-configuration', label: 'User Configuration', icon: 'Users' },
  { id: 'config-master', label: 'Configuration Master', icon: 'Database' },
  { id: 'general-setting', label: 'Organization Defaults', icon: 'Settings' },
  { id: 'restrict-ip', label: 'IP Restrictions', icon: 'Lock' },
  { id: 'overtime-access', label: 'Overtime Access Settings', icon: 'Zap' },
  { id: 'notice-period', label: 'Notice Period Settings', icon: 'Calendar' },
  { id: 'field-allowance', label: 'Field Allowance Settings', icon: 'IndianRupee' },
] as const;

export const SETTINGS_CONFIGURATION_ROUTES: Record<string, string[]> = {
  admin: ['/configuration', '/hr-operations/configuration', '/settings/configuration', '/admin/configuration'],
  hr: ['/hr/settings/admin-config', '/hr/settings/hr-config'],
};
