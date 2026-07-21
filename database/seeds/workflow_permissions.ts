import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing workflow permissions to re-seed
  await knex('permissions')
    .where('code', 'like', 'workflow:%')
    .del();

  // Insert workflow permissions
  const permissions = [
    {
      code: 'workflow:create',
      name: 'Create Workflow',
      description: 'Can create new workflow definitions',
      resource: 'workflow',
      action: 'create',
      is_platform_role: true,
    },
    {
      code: 'workflow:read',
      name: 'Read Workflow',
      description: 'Can view workflow definitions and instances',
      resource: 'workflow',
      action: 'read',
      is_platform_role: true,
    },
    {
      code: 'workflow:update',
      name: 'Update Workflow',
      description: 'Can update workflow definitions',
      resource: 'workflow',
      action: 'update',
      is_platform_role: true,
    },
    {
      code: 'workflow:delete',
      name: 'Delete Workflow',
      description: 'Can archive workflow definitions',
      resource: 'workflow',
      action: 'delete',
      is_platform_role: true,
    },
    {
      code: 'workflow:publish',
      name: 'Publish Workflow',
      description: 'Can publish workflow definitions',
      resource: 'workflow',
      action: 'publish',
      is_platform_role: true,
    },
    {
      code: 'workflow:execute',
      name: 'Execute Workflow',
      description: 'Can start and manage workflow instances',
      resource: 'workflow',
      action: 'execute',
      is_platform_role: true,
    },
    {
      code: 'workflow:approve',
      name: 'Approve Steps',
      description: 'Can approve or reject workflow steps',
      resource: 'workflow',
      action: 'approve',
      is_platform_role: true,
    },
    {
      code: 'workflow:delegate',
      name: 'Delegate Approvals',
      description: 'Can delegate approval responsibilities',
      resource: 'workflow',
      action: 'delegate',
      is_platform_role: true,
    },
    {
      code: 'workflow:escalate',
      name: 'Escalate Approvals',
      description: 'Can escalate approval to higher level',
      resource: 'workflow',
      action: 'escalate',
      is_platform_role: true,
    },
    {
      code: 'workflow:manage_templates',
      name: 'Manage Templates',
      description: 'Can create and manage workflow templates',
      resource: 'workflow',
      action: 'manage_templates',
      is_platform_role: true,
    },
  ];

  await knex('permissions').insert(
    permissions.map((p) => ({
      ...p,
      created_at: new Date(),
      updated_at: new Date(),
    }))
  );
}
