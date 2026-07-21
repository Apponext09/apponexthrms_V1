import type { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';

const randomUUID = () => uuidv4();

export async function seed(knex: Knex): Promise<void> {
  // Delete existing seed data
  await knex('user_roles').del();
  await knex('role_permissions').del();
  await knex('roles').del();

  // Get all permissions
  const allPermissions = await knex('permissions').select('id', 'code');
  const permissionMap = new Map(allPermissions.map(p => [p.code, p.id]));

  // Get all organizations
  const organizations = await knex('organizations').select('id');

  // Define system roles and their permission assignments
  const rolePermissionMap: Record<string, string[]> = {
    super_admin: [
      // All permissions granted
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
      'rbac.roles.read', 'rbac.roles.create', 'rbac.roles.update', 'rbac.roles.delete',
      'rbac.permissions.read', 'rbac.permissions.assign',
      'users.read', 'users.create', 'users.update', 'users.delete', 'users.roles.assign',
      'organizations.settings.read', 'organizations.settings.update',
      'audit.logs.read',
      'employee.profile.read', 'employee.profile.create', 'employee.profile.update', 'employee.profile.delete',
      'asset.view', 'asset.create', 'asset.edit', 'asset.delete', 'asset.export',
    ],
    organization_admin: [
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
      'rbac.roles.read', 'rbac.roles.create', 'rbac.roles.update', 'rbac.roles.delete',
      'rbac.permissions.read', 'rbac.permissions.assign',
      'users.read', 'users.create', 'users.update', 'users.delete', 'users.roles.assign',
      'organizations.settings.read', 'organizations.settings.update',
      'audit.logs.read',
      'employee.profile.read', 'employee.profile.create', 'employee.profile.update', 'employee.profile.delete',
      'asset.view', 'asset.create', 'asset.edit', 'asset.delete', 'asset.export',
    ],
    asset_admin: [
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
      'asset.view', 'asset.create', 'asset.edit', 'asset.delete', 'asset.export',
      'asset.category.view', 'asset.category.create', 'asset.category.edit', 'asset.category.delete',
      'asset.assign.view', 'asset.assign.create', 'asset.assign.approve',
      'asset.transfer.view', 'asset.transfer.request', 'asset.transfer.approve',
      'asset.return.view', 'asset.return.request', 'asset.return.process',
      'asset.maintenance.view', 'asset.maintenance.create', 'asset.maintenance.complete',
      'asset.license.view', 'asset.license.create', 'asset.license.edit',
      'asset.vendor.view', 'asset.vendor.create', 'asset.vendor.edit',
      'asset.report.view', 'asset.analytics.view', 'asset.admin',
    ],
    hr_admin: [
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
      'rbac.roles.read', 'rbac.permissions.read',
      'users.read', 'users.create', 'users.update',
      'audit.logs.read',
      'employee.profile.read', 'employee.profile.create', 'employee.profile.update',
      'recruitment.jobs.read', 'recruitment.jobs.create', 'recruitment.jobs.update',
      'recruitment.candidates.read', 'recruitment.candidates.update',
      'attendance.read', 'attendance.approve',
      'leave.read', 'leave.approve',
      'payroll.read',
    ],
    hr_manager: [
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
      'rbac.roles.read', 'rbac.permissions.read',
      'users.read',
      'audit.logs.read',
      'employee.profile.read', 'employee.profile.create', 'employee.profile.update',
      'recruitment.jobs.read', 'recruitment.jobs.create', 'recruitment.jobs.update', 'recruitment.candidates.read', 'recruitment.candidates.update',
      'attendance.read', 'attendance.approve',
      'leave.read', 'leave.approve',
      'payroll.read',
    ],
    recruitment_manager: [
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
      'recruitment.jobs.read', 'recruitment.jobs.create', 'recruitment.jobs.update',
      'recruitment.candidates.read', 'recruitment.candidates.update',
      'audit.logs.read',
    ],
    team_lead: [
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
      'rbac.roles.read', 'rbac.permissions.read',
      'employee.profile.read',
      'attendance.read', 'attendance.approve',
      'leave.read', 'leave.approve',
    ],
    reporting_manager: [
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
      'employee.profile.read',
      'attendance.read',
      'leave.read', 'leave.approve',
    ],
    employee: [
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
      'employee.profile.read',
      'attendance.checkin', 'attendance.read',
      'leave.apply', 'leave.read',
    ],
    consultant: [
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
    ],
    intern: [
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
      'employee.profile.read',
    ],
    client: [
      'auth.profile.read', 'auth.profile.update', 'auth.password.change',
    ],
    auditor: [
      'auth.profile.read', 'auth.devices.manage', 'auth.password.change',
      'rbac.roles.read', 'rbac.permissions.read',
      'users.read',
      'audit.logs.read',
    ],
    finance_manager: [
      'auth.profile.read', 'auth.profile.update', 'auth.devices.manage', 'auth.password.change',
      'payroll.read', 'payroll.process', 'payroll.approve',
      'audit.logs.read',
    ],
  };

  // Create roles for each organization
  for (const org of organizations) {
    for (const [roleCode, permissionCodes] of Object.entries(rolePermissionMap)) {
      const roleId = await knex('roles').insert({
        uuid: randomUUID(),
        organization_id: org.id,
        name: roleCode.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        code: roleCode,
        is_system: true,
        is_platform_role: false,
        is_default: roleCode === 'employee',
      }).then(result => (Array.isArray(result) ? result[0] : result));

      // Assign permissions to role
      const rolePermissions = permissionCodes
        .map(code => permissionMap.get(code))
        .filter((id): id is number => id !== undefined)
        .map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId,
        }));

      if (rolePermissions.length > 0) {
        await knex('role_permissions').insert(rolePermissions);
      }
    }
  }
}
