import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // First, get all platform roles to attach permissions
  const roles = await knex('roles').where('is_platform_role', true).select('id', 'code');

  const adminRole = roles.find((r) => r.code === 'organization_admin');
  const hrRole = roles.find((r) => r.code === 'hr_manager');

  // Define all settings permissions (module + read/write)
  const permissions = [
    // Company Profile
    { code: 'settings.company_profile.read', module: 'settings', resource: 'company_profile', action: 'read' },
    { code: 'settings.company_profile.write', module: 'settings', resource: 'company_profile', action: 'write' },

    // Branches
    { code: 'settings.branches.read', module: 'settings', resource: 'branches', action: 'read' },
    { code: 'settings.branches.write', module: 'settings', resource: 'branches', action: 'write' },

    // Locations
    { code: 'settings.locations.read', module: 'settings', resource: 'locations', action: 'read' },
    { code: 'settings.locations.write', module: 'settings', resource: 'locations', action: 'write' },

    // Departments
    { code: 'settings.departments.read', module: 'settings', resource: 'departments', action: 'read' },
    { code: 'settings.departments.write', module: 'settings', resource: 'departments', action: 'write' },

    // Designations
    { code: 'settings.designations.read', module: 'settings', resource: 'designations', action: 'read' },
    { code: 'settings.designations.write', module: 'settings', resource: 'designations', action: 'write' },

    // Cost Centers
    { code: 'settings.cost_centers.read', module: 'settings', resource: 'cost_centers', action: 'read' },
    { code: 'settings.cost_centers.write', module: 'settings', resource: 'cost_centers', action: 'write' },

    // Holiday Calendars
    { code: 'settings.holiday_calendars.read', module: 'settings', resource: 'holiday_calendars', action: 'read' },
    { code: 'settings.holiday_calendars.write', module: 'settings', resource: 'holiday_calendars', action: 'write' },

    // Attendance Policies
    { code: 'settings.attendance_policies.read', module: 'settings', resource: 'attendance_policies', action: 'read' },
    { code: 'settings.attendance_policies.write', module: 'settings', resource: 'attendance_policies', action: 'write' },

    // Leave Policies
    { code: 'settings.leave_policies.read', module: 'settings', resource: 'leave_policies', action: 'read' },
    { code: 'settings.leave_policies.write', module: 'settings', resource: 'leave_policies', action: 'write' },

    // Payroll Policies
    { code: 'settings.payroll_policies.read', module: 'settings', resource: 'payroll_policies', action: 'read' },
    { code: 'settings.payroll_policies.write', module: 'settings', resource: 'payroll_policies', action: 'write' },

    // Work Policies
    { code: 'settings.work_policies.read', module: 'settings', resource: 'work_policies', action: 'read' },
    { code: 'settings.work_policies.write', module: 'settings', resource: 'work_policies', action: 'write' },

    // Branding Settings
    { code: 'settings.branding.read', module: 'settings', resource: 'branding', action: 'read' },
    { code: 'settings.branding.write', module: 'settings', resource: 'branding', action: 'write' },

    // Email Templates
    { code: 'settings.email_templates.read', module: 'settings', resource: 'email_templates', action: 'read' },
    { code: 'settings.email_templates.write', module: 'settings', resource: 'email_templates', action: 'write' },

    // Organization Settings
    { code: 'settings.organization_settings.read', module: 'settings', resource: 'organization_settings', action: 'read' },
    { code: 'settings.organization_settings.write', module: 'settings', resource: 'organization_settings', action: 'write' },

    // Settings History
    { code: 'settings.history.read', module: 'settings', resource: 'history', action: 'read' },
    { code: 'settings.history.write', module: 'settings', resource: 'history', action: 'write' },
  ];

  // Check for existing permissions and insert new ones
  for (const perm of permissions) {
    const exists = await knex('permissions').where('code', perm.code).first();
    if (!exists) {
      await knex('permissions').insert({
        code: perm.code,
        module: perm.module,
        resource: perm.resource,
        action: perm.action,
        description: `${perm.resource} ${perm.action}`,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  // Attach all settings permissions to admin role
  if (adminRole) {
    const allPerms = await knex('permissions').where('module', 'settings').select('id');
    for (const perm of allPerms) {
      const exists = await knex('role_permissions')
        .where('role_id', adminRole.id)
        .where('permission_id', perm.id)
        .first();
      if (!exists) {
        await knex('role_permissions').insert({
          role_id: adminRole.id,
          permission_id: perm.id,
          created_at: new Date(),
        });
      }
    }
  }

  // Attach read permissions to hr_manager role
  if (hrRole) {
    const readPerms = await knex('permissions')
      .where('module', 'settings')
      .where('action', 'read')
      .select('id');

    for (const perm of readPerms) {
      const exists = await knex('role_permissions')
        .where('role_id', hrRole.id)
        .where('permission_id', perm.id)
        .first();
      if (!exists) {
        await knex('role_permissions').insert({
          role_id: hrRole.id,
          permission_id: perm.id,
          created_at: new Date(),
        });
      }
    }

    // Add write permissions for specific modules that HR should manage
    const hrWritePerms = [
      'settings.branches.write',
      'settings.departments.write',
      'settings.designations.write',
      'settings.holiday_calendars.write',
      'settings.attendance_policies.write',
      'settings.leave_policies.write',
    ];

    for (const code of hrWritePerms) {
      const perm = await knex('permissions').where('code', code).first();
      if (perm) {
        const exists = await knex('role_permissions')
          .where('role_id', hrRole.id)
          .where('permission_id', perm.id)
          .first();
        if (!exists) {
          await knex('role_permissions').insert({
            role_id: hrRole.id,
            permission_id: perm.id,
            created_at: new Date(),
          });
        }
      }
    }
  }
}
