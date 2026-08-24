import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Create role_policies table if it does not exist
  const hasRolePolicies = await knex.schema.hasTable('role_policies');
  if (!hasRolePolicies) {
    await knex.schema.createTable('role_policies', (table) => {
      table.increments('id').primary();
      table.string('role_code', 100).notNullable().unique();
      table.string('title', 255).notNullable();
      table.text('description').nullable();
      table.text('sections').notNullable(); // JSON stringified [{ id, title, content }]
      table.timestamps(true, true);
    });
  }

  // 2. Add policy_accepted and policy_accepted_at to users table if missing
  const hasPolicyAccepted = await knex.schema.hasColumn('users', 'policy_accepted');
  if (!hasPolicyAccepted) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('policy_accepted').defaultTo(false).notNullable();
      table.timestamp('policy_accepted_at').nullable();
    });
  }

  // 3. Seed default policies for existing project roles
  const defaultPolicies = [
    {
      role_code: 'organization_admin',
      title: 'Organization Administrator Governance & System Security Policy',
      description: 'Mandatory operational guidelines and security governance protocols for Organization Administrators.',
      sections: JSON.stringify([
        {
          id: 'admin_1',
          title: '1. Administrative Authority & User Provisioning',
          content: 'Administrators are granted elevated access solely for organization operations. User credentials, access roles, and permissions must be assigned strictly on a need-to-know basis following the Principle of Least Privilege.'
        },
        {
          id: 'admin_2',
          title: '2. Data Protection & Tenant Isolation',
          content: 'Organization Administrators must protect all corporate and employee PII data. Sharing access credentials, bypassing security controls, or exporting confidential database records without explicit authorization is strictly prohibited.'
        },
        {
          id: 'admin_3',
          title: '3. System Integrity & Security Audit Compliance',
          content: 'All administrative activities, role modifications, and system configuration updates are monitored. Administrators must maintain active multi-factor security and immediately report any suspected security anomalies.'
        }
      ])
    },
    {
      role_code: 'hr_manager',
      title: 'HR Governance, Privacy & Employee Relations Policy',
      description: 'Policy governing HR management, candidate privacy, employee data protection, and workplace compliance.',
      sections: JSON.stringify([
        {
          id: 'hr_1',
          title: '1. Employee Confidentiality & PII Protection',
          content: 'Human Resources personnel have access to sensitive employee records, compensation details, and background files. All personal data must be stored securely and handled with strict confidentiality.'
        },
        {
          id: 'hr_2',
          title: '2. Merit-Based Recruitment & Fair Practice',
          content: 'Recruitment, candidate evaluations, and internal mobility must adhere to meritocratic standards free from bias, favoritism, or discrimination based on gender, race, religion, or background.'
        },
        {
          id: 'hr_3',
          title: '3. Grievance Redressal & Anti-Harassment',
          content: 'HR Managers must promptly investigate employee grievances and maintain a zero-tolerance policy against workplace harassment, bullying, or unfair disciplinary practices.'
        }
      ])
    },
    {
      role_code: 'department_head',
      title: 'Department Manager Leadership & Operational Policy',
      description: 'Management policy outlining team supervision, objective evaluations, and approval responsibilities.',
      sections: JSON.stringify([
        {
          id: 'mgr_1',
          title: '1. Team Leadership & Objective Evaluation',
          content: 'Managers are responsible for fostering team growth, conducting transparent performance reviews, and providing constructive feedback without personal bias.'
        },
        {
          id: 'mgr_2',
          title: '2. Timely Approvals & Operational Integrity',
          content: 'Leave applications, attendance regularization requests, and expense claims must be reviewed and processed within established SLA deadlines to prevent employee hardship.'
        },
        {
          id: 'mgr_3',
          title: '3. Conflict Resolution & Resource Allocation',
          content: 'Department Heads must maintain fair resource allocation, resolve team conflicts impartially, and uphold organization data security protocols.'
        }
      ])
    },
    {
      role_code: 'team_lead',
      title: 'Team Lead Mentorship & Project Execution Policy',
      description: 'Operational guidelines for Team Leads covering task delegation, team mentorship, and activity tracking.',
      sections: JSON.stringify([
        {
          id: 'tl_1',
          title: '1. Mentorship & Collaborative Work Culture',
          content: 'Team Leads must actively support team members, provide daily task guidance, and foster an inclusive, respectful work environment.'
        },
        {
          id: 'tl_2',
          title: '2. Attendance & Operational Reporting',
          content: 'Ensure accurate shift tracking, daily task status updates, and timely escalation of technical or operational blockers to Department Management.'
        },
        {
          id: 'tl_3',
          title: '3. Confidentiality & Workplace Conduct',
          content: 'Uphold product confidentiality, protect project assets, and ensure all team activities align with organization ethics policies.'
        }
      ])
    },
    {
      role_code: 'employee',
      title: 'Employee Code of Conduct & General Workplace Policy',
      description: 'Standard workplace policy for all employees regarding ethics, attendance, asset care, and IT security.',
      sections: JSON.stringify([
        {
          id: 'emp_1',
          title: '1. Professional Ethics & Workplace Conduct',
          content: 'Employees must interact professionally and respectfully with colleagues, clients, and partners. Discrimination, harassment, or disruptive behavior will lead to disciplinary action.'
        },
        {
          id: 'emp_2',
          title: '2. Attendance, Punctuality & Time Tracking',
          content: 'Employees are required to check in and out accurately via the designated biometric/geofenced terminals and adhere to assigned shift timings and break policies.'
        },
        {
          id: 'emp_3',
          title: '3. IT Security & Office Asset Protection',
          content: 'Company-provided laptops, software credentials, and physical assets must be used exclusively for authorized work. Unauthorized software installation or sharing of internal credentials is strictly prohibited.'
        }
      ])
    },
    {
      role_code: 'intern',
      title: 'Internship Program Agreement & Confidentiality Policy',
      description: 'Policy terms for interns regarding learning objectives, confidentiality, equipment usage, and conduct.',
      sections: JSON.stringify([
        {
          id: 'int_1',
          title: '1. Learning Objectives & Task Commitment',
          content: 'Interns must actively engage in assigned learning projects, complete deliverables under mentor supervision, and maintain regular communication.'
        },
        {
          id: 'int_2',
          title: '2. Proprietary Data & Non-Disclosure',
          content: 'All source code, design mockups, business strategies, and client data accessed during internship remain exclusive intellectual property of the organization and must not be shared externally.'
        },
        {
          id: 'int_3',
          title: '3. Attendance & Equipment Usage',
          content: 'Interns must follow assigned working hours, log attendance accurately, and take proper care of all organization assets and access permissions.'
        }
      ])
    }
  ];

  for (const policy of defaultPolicies) {
    const existing = await knex('role_policies').where({ role_code: policy.role_code }).first();
    if (existing) {
      await knex('role_policies').where({ id: existing.id }).update({
        title: policy.title,
        description: policy.description,
        sections: policy.sections,
        updated_at: knex.fn.now(),
      });
    } else {
      await knex('role_policies').insert({
        ...policy,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('role_policies');
  const hasPolicyAccepted = await knex.schema.hasColumn('users', 'policy_accepted');
  if (hasPolicyAccepted) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('policy_accepted');
      table.dropColumn('policy_accepted_at');
    });
  }
}
