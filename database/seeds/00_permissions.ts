import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing seed data
  await knex('permissions').del();

  // Insert permissions catalog (extensible for Phases 2-18)
  const permissions = [
    // Auth module
    { code: 'auth.profile.read', module: 'auth', resource: 'profile', action: 'read', description: 'View own profile', is_system: true },
    { code: 'auth.profile.update', module: 'auth', resource: 'profile', action: 'update', description: 'Update own profile', is_system: true },
    { code: 'auth.devices.manage', module: 'auth', resource: 'devices', action: 'update', description: 'Manage own devices/sessions', is_system: true },
    { code: 'auth.password.change', module: 'auth', resource: 'profile', action: 'update', description: 'Change own password', is_system: true },

    // RBAC module
    { code: 'rbac.roles.read', module: 'rbac', resource: 'roles', action: 'read', description: 'View roles', is_system: true },
    { code: 'rbac.roles.create', module: 'rbac', resource: 'roles', action: 'create', description: 'Create roles', is_system: true },
    { code: 'rbac.roles.update', module: 'rbac', resource: 'roles', action: 'update', description: 'Update roles', is_system: true },
    { code: 'rbac.roles.delete', module: 'rbac', resource: 'roles', action: 'delete', description: 'Delete custom roles', is_system: true },
    { code: 'rbac.permissions.read', module: 'rbac', resource: 'permissions', action: 'read', description: 'View permissions', is_system: true },
    { code: 'rbac.permissions.assign', module: 'rbac', resource: 'permissions', action: 'update', description: 'Assign permissions to roles', is_system: true },

    // Users module
    { code: 'users.read', module: 'users', resource: 'profile', action: 'read', description: 'View users', is_system: true },
    { code: 'users.create', module: 'users', resource: 'profile', action: 'create', description: 'Create users', is_system: true },
    { code: 'users.update', module: 'users', resource: 'profile', action: 'update', description: 'Update users', is_system: true },
    { code: 'users.delete', module: 'users', resource: 'profile', action: 'delete', description: 'Delete users', is_system: true },
    { code: 'users.roles.assign', module: 'users', resource: 'roles', action: 'update', description: 'Assign roles to users', is_system: true },

    // Organizations module
    { code: 'organizations.settings.read', module: 'organizations', resource: 'settings', action: 'read', description: 'View org settings', is_system: true },
    { code: 'organizations.settings.update', module: 'organizations', resource: 'settings', action: 'update', description: 'Update org settings', is_system: true },

    // Audit module
    { code: 'audit.logs.read', module: 'audit', resource: 'history', action: 'read', description: 'View audit logs', is_system: true },

    // Employee module (Phase 2+)
    { code: 'employee.profile.read', module: 'employee', resource: 'profile', action: 'read', description: 'View employee profiles', is_system: true },
    { code: 'employee.profile.create', module: 'employee', resource: 'profile', action: 'create', description: 'Create employees', is_system: true },
    { code: 'employee.profile.update', module: 'employee', resource: 'profile', action: 'update', description: 'Update employee profiles', is_system: true },
    { code: 'employee.profile.delete', module: 'employee', resource: 'profile', action: 'delete', description: 'Delete employees', is_system: true },

    // Recruitment module (Phase 3+)
    { code: 'recruitment.jobs.read', module: 'recruitment', resource: 'profile', action: 'read', description: 'View job openings', is_system: true },
    { code: 'recruitment.jobs.create', module: 'recruitment', resource: 'profile', action: 'create', description: 'Create job openings', is_system: true },
    { code: 'recruitment.jobs.update', module: 'recruitment', resource: 'profile', action: 'update', description: 'Update job openings', is_system: true },
    { code: 'recruitment.candidates.read', module: 'recruitment', resource: 'profile', action: 'read', description: 'View candidates', is_system: true },
    { code: 'recruitment.candidates.update', module: 'recruitment', resource: 'profile', action: 'update', description: 'Update candidate status', is_system: true },

    // Attendance module (Phase 4+)
    { code: 'attendance.checkin', module: 'attendance', resource: 'profile', action: 'create', description: 'Mark attendance', is_system: true },
    { code: 'attendance.read', module: 'attendance', resource: 'profile', action: 'read', description: 'View attendance', is_system: true },
    { code: 'attendance.approve', module: 'attendance', resource: 'profile', action: 'approve', description: 'Approve attendance', is_system: true },

    // Leave module (Phase 5+)
    { code: 'leave.apply', module: 'leave', resource: 'profile', action: 'create', description: 'Apply for leave', is_system: true },
    { code: 'leave.read', module: 'leave', resource: 'profile', action: 'read', description: 'View leaves', is_system: true },
    { code: 'leave.approve', module: 'leave', resource: 'profile', action: 'approve', description: 'Approve/reject leaves', is_system: true },

    // Payroll module (Phase 6+)
    { code: 'payroll.read', module: 'payroll', resource: 'profile', action: 'read', description: 'View payroll', is_system: true },
    { code: 'payroll.process', module: 'payroll', resource: 'profile', action: 'create', description: 'Process payroll', is_system: true },
    { code: 'payroll.approve', module: 'payroll', resource: 'profile', action: 'approve', description: 'Approve payroll', is_system: true },

    // Asset module (Phase 12)
    { code: 'asset.view', module: 'asset', resource: 'inventory', action: 'read', description: 'View assets', is_system: true },
    { code: 'asset.create', module: 'asset', resource: 'inventory', action: 'create', description: 'Create assets', is_system: true },
    { code: 'asset.edit', module: 'asset', resource: 'inventory', action: 'update', description: 'Edit assets', is_system: true },
    { code: 'asset.delete', module: 'asset', resource: 'inventory', action: 'delete', description: 'Delete assets', is_system: true },
    { code: 'asset.export', module: 'asset', resource: 'inventory', action: 'read', description: 'Export assets', is_system: true },
    { code: 'asset.category.view', module: 'asset', resource: 'category', action: 'read', description: 'View asset categories', is_system: true },
    { code: 'asset.category.create', module: 'asset', resource: 'category', action: 'create', description: 'Create asset categories', is_system: true },
    { code: 'asset.category.edit', module: 'asset', resource: 'category', action: 'update', description: 'Edit asset categories', is_system: true },
    { code: 'asset.category.delete', module: 'asset', resource: 'category', action: 'delete', description: 'Delete asset categories', is_system: true },
    { code: 'asset.assign.view', module: 'asset', resource: 'assignment', action: 'read', description: 'View asset assignments', is_system: true },
    { code: 'asset.assign.create', module: 'asset', resource: 'assignment', action: 'create', description: 'Assign assets to employees', is_system: true },
    { code: 'asset.assign.approve', module: 'asset', resource: 'assignment', action: 'approve', description: 'Approve asset assignments', is_system: true },
    { code: 'asset.transfer.view', module: 'asset', resource: 'transfer', action: 'read', description: 'View asset transfers', is_system: true },
    { code: 'asset.transfer.request', module: 'asset', resource: 'transfer', action: 'create', description: 'Request asset transfer', is_system: true },
    { code: 'asset.transfer.approve', module: 'asset', resource: 'transfer', action: 'approve', description: 'Approve asset transfer', is_system: true },
    { code: 'asset.return.view', module: 'asset', resource: 'return', action: 'read', description: 'View asset returns', is_system: true },
    { code: 'asset.return.request', module: 'asset', resource: 'return', action: 'create', description: 'Request asset return', is_system: true },
    { code: 'asset.return.process', module: 'asset', resource: 'return', action: 'update', description: 'Process asset return', is_system: true },
    { code: 'asset.maintenance.view', module: 'asset', resource: 'maintenance', action: 'read', description: 'View asset maintenance', is_system: true },
    { code: 'asset.maintenance.create', module: 'asset', resource: 'maintenance', action: 'create', description: 'Create maintenance records', is_system: true },
    { code: 'asset.maintenance.complete', module: 'asset', resource: 'maintenance', action: 'update', description: 'Complete maintenance', is_system: true },
    { code: 'asset.license.view', module: 'asset', resource: 'license', action: 'read', description: 'View software licenses', is_system: true },
    { code: 'asset.license.create', module: 'asset', resource: 'license', action: 'create', description: 'Create software licenses', is_system: true },
    { code: 'asset.license.edit', module: 'asset', resource: 'license', action: 'update', description: 'Edit software licenses', is_system: true },
    { code: 'asset.vendor.view', module: 'asset', resource: 'vendor', action: 'read', description: 'View vendors', is_system: true },
    { code: 'asset.vendor.create', module: 'asset', resource: 'vendor', action: 'create', description: 'Create vendors', is_system: true },
    { code: 'asset.vendor.edit', module: 'asset', resource: 'vendor', action: 'update', description: 'Edit vendors', is_system: true },
    { code: 'asset.request.view', module: 'asset', resource: 'request', action: 'read', description: 'View asset requests', is_system: true },
    { code: 'asset.request.create', module: 'asset', resource: 'request', action: 'create', description: 'Create asset request', is_system: true },
    { code: 'asset.request.approve', module: 'asset', resource: 'request', action: 'approve', description: 'Approve asset request', is_system: true },
    { code: 'asset.report.view', module: 'asset', resource: 'report', action: 'read', description: 'View asset reports', is_system: true },
    { code: 'asset.analytics.view', module: 'asset', resource: 'analytics', action: 'read', description: 'View asset analytics', is_system: true },
    { code: 'asset.admin', module: 'asset', resource: 'admin', action: 'manage', description: 'Full asset administration', is_system: true },
  ];

  await knex('permissions').insert(permissions);
}
