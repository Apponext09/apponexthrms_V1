import type { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // First, get all roles to attach permissions
  const roles = await knex('roles').select('id', 'code');

  const adminRole = roles.find((r) => r.code === 'organization_admin');
  const hrRole = roles.find((r) => r.code === 'hr_manager');
  const employeeRole = roles.find((r) => r.code === 'employee');
  const reportingManagerRole = roles.find((r) => r.code === 'reporting_manager');
  const teamLeadRole = roles.find((r) => r.code === 'team_lead');

  // Define all performance module permissions (32 permissions)
  const permissions = [
    // Goal Management (4 permissions)
    { code: 'performance.goal_read', module: 'performance', resource: 'goal', action: 'read', description: 'View goals' },
    { code: 'performance.goal_write', module: 'performance', resource: 'goal', action: 'write', description: 'Create and update goals' },
    { code: 'performance.goal_approve', module: 'performance', resource: 'goal', action: 'approve', description: 'Approve goals' },
    { code: 'performance.goal_delete', module: 'performance', resource: 'goal', action: 'delete', description: 'Delete goals' },

    // OKR Management (3 permissions)
    { code: 'performance.okr_read', module: 'performance', resource: 'okr', action: 'read', description: 'View OKRs' },
    { code: 'performance.okr_write', module: 'performance', resource: 'okr', action: 'write', description: 'Create and update OKRs' },
    { code: 'performance.okr_manage', module: 'performance', resource: 'okr', action: 'manage', description: 'Manage OKR cycles' },

    // Review Cycle Management (4 permissions)
    { code: 'performance.review_read', module: 'performance', resource: 'review', action: 'read', description: 'View reviews' },
    { code: 'performance.review_write', module: 'performance', resource: 'review', action: 'write', description: 'Write performance reviews' },
    { code: 'performance.review_submit', module: 'performance', resource: 'review', action: 'submit', description: 'Submit reviews' },
    { code: 'performance.review_approve', module: 'performance', resource: 'review', action: 'approve', description: 'Approve reviews' },
    { code: 'performance.review_cycle_write', module: 'performance', resource: 'review_cycle', action: 'write', description: 'Create review cycles' },
    { code: 'performance.review_cycle_manage', module: 'performance', resource: 'review_cycle', action: 'manage', description: 'Manage review cycles' },

    // Feedback Management (3 permissions)
    { code: 'performance.feedback_read', module: 'performance', resource: 'feedback', action: 'read', description: 'View feedback' },
    { code: 'performance.feedback_write', module: 'performance', resource: 'feedback', action: 'write', description: 'Provide feedback' },
    { code: 'performance.feedback_360', module: 'performance', resource: 'feedback', action: 'feedback_360', description: 'Access 360 degree feedback' },

    // Appraisal Management (3 permissions)
    { code: 'performance.appraisal_read', module: 'performance', resource: 'appraisal', action: 'read', description: 'View appraisals' },
    { code: 'performance.appraisal_write', module: 'performance', resource: 'appraisal', action: 'write', description: 'Create and update appraisals' },
    { code: 'performance.appraisal_approve', module: 'performance', resource: 'appraisal', action: 'approve', description: 'Approve appraisals' },

    // Competency Management (3 permissions)
    { code: 'performance.competency_read', module: 'performance', resource: 'competency', action: 'read', description: 'View competencies' },
    { code: 'performance.competency_write', module: 'performance', resource: 'competency', action: 'write', description: 'Create and update competencies' },
    { code: 'performance.competency_assess', module: 'performance', resource: 'competency', action: 'assess', description: 'Assess competencies' },

    // Performance Improvement Plan (PIP) (3 permissions)
    { code: 'performance.pip_read', module: 'performance', resource: 'pip', action: 'read', description: 'View PIPs' },
    { code: 'performance.pip_write', module: 'performance', resource: 'pip', action: 'write', description: 'Create and update PIPs' },
    { code: 'performance.pip_review', module: 'performance', resource: 'pip', action: 'review', description: 'Review PIP progress' },

    // Succession Planning (2 permissions)
    { code: 'performance.succession_read', module: 'performance', resource: 'succession', action: 'read', description: 'View succession plans' },
    { code: 'performance.succession_write', module: 'performance', resource: 'succession', action: 'write', description: 'Create and update succession plans' },

    // Recognition & Rewards (3 permissions)
    { code: 'performance.recognition_read', module: 'performance', resource: 'recognition', action: 'read', description: 'View recognitions' },
    { code: 'performance.recognition_write', module: 'performance', resource: 'recognition', action: 'write', description: 'Give recognitions' },
    { code: 'performance.reward_read', module: 'performance', resource: 'reward', action: 'read', description: 'View reward points' },
    { code: 'performance.reward_redeem', module: 'performance', resource: 'reward', action: 'redeem', description: 'Redeem reward points' },

    // Analytics (1 permission)
    { code: 'performance.analytics_read', module: 'performance', resource: 'analytics', action: 'read', description: 'View performance analytics' },
    { code: 'performance.talent_matrix_read', module: 'performance', resource: 'talent_matrix', action: 'read', description: 'View talent matrix' },
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
        description: perm.description,
        is_system: false,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }
  }

  // Get all performance permissions
  const allPerms = await knex('permissions').where('module', 'performance').select('id', 'code');
  const permMap = new Map(allPerms.map((p) => [p.code, p.id]));

  // Attach all performance permissions to admin role
  if (adminRole) {
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

  // Attach most performance permissions to hr_manager role
  if (hrRole) {
    const hrPermissions = [
      'performance.goal_read',
      'performance.goal_write',
      'performance.goal_approve',
      'performance.okr_read',
      'performance.okr_write',
      'performance.okr_manage',
      'performance.review_read',
      'performance.review_write',
      'performance.review_approve',
      'performance.review_cycle_write',
      'performance.review_cycle_manage',
      'performance.feedback_read',
      'performance.feedback_write',
      'performance.appraisal_read',
      'performance.appraisal_write',
      'performance.appraisal_approve',
      'performance.competency_read',
      'performance.competency_write',
      'performance.competency_assess',
      'performance.pip_read',
      'performance.pip_write',
      'performance.pip_review',
      'performance.succession_read',
      'performance.succession_write',
      'performance.recognition_read',
      'performance.recognition_write',
      'performance.reward_read',
      'performance.analytics_read',
      'performance.talent_matrix_read',
    ];

    for (const code of hrPermissions) {
      const permId = permMap.get(code);
      if (permId) {
        const exists = await knex('role_permissions')
          .where('role_id', hrRole.id)
          .where('permission_id', permId)
          .first();
        if (!exists) {
          await knex('role_permissions').insert({
            role_id: hrRole.id,
            permission_id: permId,
            created_at: new Date(),
          });
        }
      }
    }
  }

  // Attach limited performance permissions to reporting_manager role
  if (reportingManagerRole) {
    const reportingManagerPermissions = [
      'performance.goal_read',
      'performance.goal_write',
      'performance.okr_read',
      'performance.review_read',
      'performance.review_write',
      'performance.review_submit',
      'performance.review_approve',
      'performance.feedback_read',
      'performance.feedback_write',
      'performance.appraisal_read',
      'performance.competency_read',
      'performance.recognition_read',
      'performance.recognition_write',
      'performance.reward_read',
      'performance.analytics_read',
    ];

    for (const code of reportingManagerPermissions) {
      const permId = permMap.get(code);
      if (permId) {
        const exists = await knex('role_permissions')
          .where('role_id', reportingManagerRole.id)
          .where('permission_id', permId)
          .first();
        if (!exists) {
          await knex('role_permissions').insert({
            role_id: reportingManagerRole.id,
            permission_id: permId,
            created_at: new Date(),
          });
        }
      }
    }
  }

  // Attach limited performance permissions to team_lead role
  if (teamLeadRole) {
    const teamLeadPermissions = [
      'performance.goal_read',
      'performance.okr_read',
      'performance.review_read',
      'performance.feedback_read',
      'performance.feedback_write',
      'performance.appraisal_read',
      'performance.competency_read',
      'performance.recognition_read',
      'performance.recognition_write',
      'performance.reward_read',
    ];

    for (const code of teamLeadPermissions) {
      const permId = permMap.get(code);
      if (permId) {
        const exists = await knex('role_permissions')
          .where('role_id', teamLeadRole.id)
          .where('permission_id', permId)
          .first();
        if (!exists) {
          await knex('role_permissions').insert({
            role_id: teamLeadRole.id,
            permission_id: permId,
            created_at: new Date(),
          });
        }
      }
    }
  }

  // Attach limited performance permissions to employee role
  if (employeeRole) {
    const employeePermissions = [
      'performance.goal_read',
      'performance.goal_write',
      'performance.okr_read',
      'performance.review_read',
      'performance.review_submit',
      'performance.feedback_read',
      'performance.feedback_write',
      'performance.appraisal_read',
      'performance.competency_read',
      'performance.recognition_read',
      'performance.recognition_write',
      'performance.reward_read',
      'performance.reward_redeem',
    ];

    for (const code of employeePermissions) {
      const permId = permMap.get(code);
      if (permId) {
        const exists = await knex('role_permissions')
          .where('role_id', employeeRole.id)
          .where('permission_id', permId)
          .first();
        if (!exists) {
          await knex('role_permissions').insert({
            role_id: employeeRole.id,
            permission_id: permId,
            created_at: new Date(),
          });
        }
      }
    }
  }
}
