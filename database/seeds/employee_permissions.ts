import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing employee permissions
  await knex('permissions')
    .whereIn('code', [
      'employee.read',
      'employee.write',
      'employee.delete',
      'employee.document.read',
      'employee.document.write',
      'employee.document.verify',
      'employee.document.delete',
      'employee.asset.read',
      'employee.asset.write',
      'employee.asset.allocate',
      'employee.asset.return',
      'employee.lifecycle.read',
      'employee.lifecycle.transition',
      'employee.onboarding.read',
      'employee.onboarding.write',
      'employee.onboarding.task_assign',
      'employee.offboarding.read',
      'employee.offboarding.write',
      'employee.offboarding.task_assign',
      'employee.profile.self_update_request',
      'employee.document.self_upload',
      'employee.compensation.read',
      'employee.compensation.write',
    ])
    .del();

  // Insert employee permissions
  const permissions = [
    // Basic employee CRUD
    { code: 'employee.read', module: 'employee', resource: 'profile', action: 'read', description: 'View employees', is_system: true },
    { code: 'employee.write', module: 'employee', resource: 'profile', action: 'create', description: 'Create and update employees', is_system: true },
    { code: 'employee.delete', module: 'employee', resource: 'profile', action: 'delete', description: 'Delete employees', is_system: true },

    // Document management
    { code: 'employee.document.read', module: 'employee', resource: 'document', action: 'read', description: 'View employee documents', is_system: true },
    { code: 'employee.document.write', module: 'employee', resource: 'document', action: 'create', description: 'Upload employee documents', is_system: true },
    { code: 'employee.document.verify', module: 'employee', resource: 'document', action: 'update', description: 'Verify employee documents', is_system: true },
    { code: 'employee.document.delete', module: 'employee', resource: 'document', action: 'delete', description: 'Delete employee documents', is_system: true },

    // Asset management
    { code: 'employee.asset.read', module: 'employee', resource: 'asset', action: 'read', description: 'View employee assets', is_system: true },
    { code: 'employee.asset.write', module: 'employee', resource: 'asset', action: 'create', description: 'Create and update assets', is_system: true },
    { code: 'employee.asset.allocate', module: 'employee', resource: 'asset', action: 'update', description: 'Allocate assets to employees', is_system: true },
    { code: 'employee.asset.return', module: 'employee', resource: 'asset', action: 'delete', description: 'Record asset returns', is_system: true },

    // Lifecycle management
    { code: 'employee.lifecycle.read', module: 'employee', resource: 'lifecycle', action: 'read', description: 'View employee lifecycle history', is_system: true },
    { code: 'employee.lifecycle.transition', module: 'employee', resource: 'lifecycle', action: 'update', description: 'Transition employee status', is_system: true },

    // Onboarding
    { code: 'employee.onboarding.read', module: 'employee', resource: 'onboarding', action: 'read', description: 'View onboarding checklists', is_system: true },
    { code: 'employee.onboarding.write', module: 'employee', resource: 'onboarding', action: 'create', description: 'Create and update onboarding checklists', is_system: true },
    { code: 'employee.onboarding.task_assign', module: 'employee', resource: 'onboarding', action: 'update', description: 'Assign onboarding tasks', is_system: true },

    // Offboarding/Exit
    { code: 'employee.offboarding.read', module: 'employee', resource: 'offboarding', action: 'read', description: 'View exit requests and clearance', is_system: true },
    { code: 'employee.offboarding.write', module: 'employee', resource: 'offboarding', action: 'create', description: 'Create and update exit requests', is_system: true },
    { code: 'employee.offboarding.task_assign', module: 'employee', resource: 'offboarding', action: 'update', description: 'Assign exit clearance tasks', is_system: true },

    // Employee self-service
    { code: 'employee.profile.self_update_request', module: 'employee', resource: 'profile', action: 'update', description: 'Request own profile updates', is_system: true },
    { code: 'employee.document.self_upload', module: 'employee', resource: 'document', action: 'create', description: 'Upload own documents', is_system: true },

    // Compensation
    { code: 'employee.compensation.read', module: 'employee', resource: 'compensation', action: 'read', description: 'View employee compensation', is_system: true },
    { code: 'employee.compensation.write', module: 'employee', resource: 'compensation', action: 'update', description: 'Update employee compensation', is_system: true },
  ];

  await knex('permissions').insert(permissions);

  // Assign permissions to organization_admin role
  const adminRole = await knex('roles')
    .where('code', 'organization_admin')
    .where('is_platform_role', true)
    .first();

  if (adminRole) {
    const permissionIds = await knex('permissions')
      .whereIn('code', permissions.map((p) => p.code))
      .pluck('id');

    const existingRolePermissions = await knex('role_permissions')
      .where('role_id', adminRole.id)
      .pluck('permission_id');

    const newPermissions = permissionIds.filter((id) => !existingRolePermissions.includes(id));

    if (newPermissions.length > 0) {
      await knex('role_permissions').insert(
        newPermissions.map((permissionId) => ({
          role_id: adminRole.id,
          permission_id: permissionId,
          created_at: new Date(),
        }))
      );
    }
  }

  // Assign key permissions to hr_manager role if it exists
  const hrRole = await knex('roles')
    .where('code', 'hr_manager')
    .first();

  if (hrRole) {
    const hrPermissions = [
      'employee.read',
      'employee.write',
      'employee.document.read',
      'employee.document.write',
      'employee.document.verify',
      'employee.asset.read',
      'employee.asset.write',
      'employee.asset.allocate',
      'employee.lifecycle.read',
      'employee.lifecycle.transition',
      'employee.onboarding.read',
      'employee.onboarding.write',
      'employee.onboarding.task_assign',
      'employee.offboarding.read',
      'employee.offboarding.write',
      'employee.compensation.read',
      'employee.compensation.write',
    ];

    const permissionIds = await knex('permissions')
      .whereIn('code', hrPermissions)
      .pluck('id');

    const existingRolePermissions = await knex('role_permissions')
      .where('role_id', hrRole.id)
      .pluck('permission_id');

    const newPermissions = permissionIds.filter((id) => !existingRolePermissions.includes(id));

    if (newPermissions.length > 0) {
      await knex('role_permissions').insert(
        newPermissions.map((permissionId) => ({
          role_id: hrRole.id,
          permission_id: permissionId,
          created_at: new Date(),
        }))
      );
    }
  }

  // Assign self-service permissions to employee role if it exists
  const employeeRole = await knex('roles')
    .where('code', 'employee_self_service')
    .first();

  if (employeeRole) {
    const selfServicePermissions = [
      'employee.profile.self_update_request',
      'employee.document.self_upload',
      'employee.document.read',
    ];

    const permissionIds = await knex('permissions')
      .whereIn('code', selfServicePermissions)
      .pluck('id');

    const existingRolePermissions = await knex('role_permissions')
      .where('role_id', employeeRole.id)
      .pluck('permission_id');

    const newPermissions = permissionIds.filter((id) => !existingRolePermissions.includes(id));

    if (newPermissions.length > 0) {
      await knex('role_permissions').insert(
        newPermissions.map((permissionId) => ({
          role_id: employeeRole.id,
          permission_id: permissionId,
          created_at: new Date(),
        }))
      );
    }
  }
}
