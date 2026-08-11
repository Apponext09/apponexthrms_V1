const { getKnex } = require('./src/db/knex');

(async () => {
  const db = getKnex();
  
  // 1. Insert assessment & offer permissions if they don't exist
  const assessmentPerms = [
    { code: 'recruitment.assessment.read', module: 'recruitment', resource: 'assessment', action: 'read', description: 'Read Assessments', is_system: true },
    { code: 'recruitment.assessment.write', module: 'recruitment', resource: 'assessment', action: 'write', description: 'Manage Assessments', is_system: true },
    { code: 'recruitment.offer.read', module: 'recruitment', resource: 'offer', action: 'read', description: 'Read Offers', is_system: true },
    { code: 'recruitment.offer.write', module: 'recruitment', resource: 'offer', action: 'write', description: 'Manage Offers', is_system: true },
    { code: 'recruitment.read', module: 'recruitment', resource: 'recruitment', action: 'read', description: 'Read Recruitment Dashboard', is_system: true },
  ];

  for (const perm of assessmentPerms) {
    const existing = await db('permissions').where('code', perm.code).first();
    if (!existing) {
      await db('permissions').insert(perm);
      console.log('Inserted permission:', perm.code);
    } else {
      console.log('Already exists:', perm.code);
    }
  }

  // 2. Get all inserted permission IDs
  const permRows = await db('permissions').whereIn('code', assessmentPerms.map(p => p.code)).select('id', 'code');
  console.log('Permission IDs:', permRows);

  // 3. Get user 7 roles
  const userRoles = await db('user_roles').where('user_id', 7).select('role_id');
  console.log('User 7 roles:', userRoles);

  // 4. Get all target roles
  const targetRoles = ['super_admin', 'organization_admin', 'recruitment_manager', 'hr_admin', 'hr_manager', 'manager', 'department_head'];
  const allRoles = await db('roles').whereIn('code', targetRoles).select('id', 'code');
  console.log('Target roles:', allRoles);

  // 5. Assign permissions to all target roles
  let count = 0;
  for (const role of allRoles) {
    for (const perm of permRows) {
      const exists = await db('role_permissions').where({ role_id: role.id, permission_id: perm.id }).first();
      if (!exists) {
        await db('role_permissions').insert({ role_id: role.id, permission_id: perm.id });
        count++;
        console.log('Assigned', perm.code, 'to role', role.code);
      }
    }
  }

  console.log('Total new role_permissions inserted:', count);
  process.exit(0);
})();
