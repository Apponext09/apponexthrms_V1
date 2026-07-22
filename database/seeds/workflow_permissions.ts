import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // Delete existing workflow permissions to re-seed
  await knex('permissions')
    .where('code', 'like', 'workflow.%')
    .del();

  // Insert workflow permissions
  const permissions = [
    {
      code: 'workflow.create',
      module: 'workflow',
      resource: 'definition',
      action: 'create',
      description: 'Can create new workflow definitions',
      is_system: true,
    },
    {
      code: 'workflow.read',
      module: 'workflow',
      resource: 'definition',
      action: 'read',
      description: 'Can view workflow definitions and instances',
      is_system: true,
    },
    {
      code: 'workflow.update',
      module: 'workflow',
      resource: 'definition',
      action: 'update',
      description: 'Can update workflow definitions',
      is_system: true,
    },
    {
      code: 'workflow.delete',
      module: 'workflow',
      resource: 'definition',
      action: 'delete',
      description: 'Can archive workflow definitions',
      is_system: true,
    },
    {
      code: 'workflow.publish',
      module: 'workflow',
      resource: 'definition',
      action: 'publish',
      description: 'Can publish workflow definitions',
      is_system: true,
    },
    {
      code: 'workflow.execute',
      module: 'workflow',
      resource: 'instance',
      action: 'execute',
      description: 'Can start and manage workflow instances',
      is_system: true,
    },
    {
      code: 'workflow.approve',
      module: 'workflow',
      resource: 'instance',
      action: 'approve',
      description: 'Can approve or reject workflow steps',
      is_system: true,
    },
    {
      code: 'workflow.delegate',
      module: 'workflow',
      resource: 'instance',
      action: 'delegate',
      description: 'Can delegate approval responsibilities',
      is_system: true,
    },
    {
      code: 'workflow.escalate',
      module: 'workflow',
      resource: 'instance',
      action: 'escalate',
      description: 'Can escalate approval to higher level',
      is_system: true,
    },
    {
      code: 'workflow.manage_templates',
      module: 'workflow',
      resource: 'template',
      action: 'manage_templates',
      description: 'Can create and manage workflow templates',
      is_system: true,
    },
  ];

  await knex('permissions').insert(
    permissions.map((p) => ({
      code: p.code,
      module: 'workflow',
      resource: p.resource,
      action: p.action,
      description: p.description,
      is_system: true,
      created_at: new Date(),
      updated_at: new Date(),
    }))
  );
}
