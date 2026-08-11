import { initializeKnex, getKnex } from '../db/knex.js';

async function main() {
  try {
    initializeKnex();
    const db = getKnex();
    console.log('✅ Database connected');

    // 1. Get all roles
    const roles = await db('roles').select('id', 'name', 'code', 'organization_id');
    console.log('\n--- ROLES ---');
    console.table(roles);

    // 2. Get all permissions
    const permissions = await db('permissions').select('id', 'code', 'module', 'resource', 'action');
    console.log('\n--- PERMISSIONS ---');
    console.table(permissions);

    // 3. User 14 details
    const user = await db('users').where('id', 14).first();
    if (user) {
      console.log('\n--- USER 14 ---');
      console.log(`ID: ${user.id}, Email: ${user.email}, Name: ${user.first_name} ${user.last_name}, Org ID: ${user.organization_id}`);

      // User 14 roles
      const userRoles = await db('user_roles')
        .join('roles', 'user_roles.role_id', 'roles.id')
        .where('user_roles.user_id', 14)
        .select('roles.id', 'roles.name', 'roles.code');
      console.log('\n--- USER 14 ROLES ---');
      console.table(userRoles);

      // User 14 effective permissions
      const roleIds = userRoles.map((r: any) => r.id);
      if (roleIds.length > 0) {
        const userPermissions = await db('permissions')
          .join('role_permissions', 'permissions.id', 'role_permissions.permission_id')
          .whereIn('role_permissions.role_id', roleIds)
          .select('permissions.id', 'permissions.code');
        console.log('\n--- USER 14 PERMISSIONS ---');
        console.table(userPermissions);
      } else {
        console.log('\nUser has no roles assigned.');
      }
    } else {
      console.log('\nUser 14 not found.');
    }

    process.exit(0);
  } catch (err: any) {
    console.error('Error debugging permissions:', err.message);
    process.exit(1);
  }
}

main();
