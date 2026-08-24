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

  // 3. Seed formal, role-specific HR policy documents matching practical ApponextHRMS modules
  const formalPolicies = [
    {
      role_code: 'organization_admin',
      title: 'ORGANIZATION ADMINISTRATOR GOVERNANCE & SYSTEM CONTROL POLICY',
      description: 'Operational policy establishing governance rules for system administration, RBAC privilege allocation, tenant security, biometric hardware settings, and audit log protection in ApponextHRMS.',
      sections: JSON.stringify([
        {
          id: 'admin_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'This Policy defines authorized boundaries, governance controls, and security duties for System Administrators managing ApponextHRMS. Administrators must manage tenant settings, user accounts, and security configurations with absolute integrity and technical responsibility.'
        },
        {
          id: 'admin_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'Applies to Super Administrators, Organization Administrators, and System IT Leads managing platform configuration, RBAC permissions, and system workflows across all tenant units.'
        },
        {
          id: 'admin_sec_3',
          title: '3. ROLE RESPONSIBILITIES & SYSTEM PERMISSIONS',
          content: '• RBAC & Least Privilege Management: Provision and assign system roles strictly based on verified HR authorization and the Principle of Least Privilege. Unauthorized elevation of user access rights is strictly prohibited.\n• User Account Lifecycle Control: Deactivate terminated or suspended user credentials immediately upon HR notification to prevent unauthorized system access.\n• System Configuration & Tenant Security: Maintain multi-tenant data isolation, configure organization shift patterns, leave rule engines, and biometric hardware IP settings accurately.\n• Audit Trail & System Logging: Ensure system audit logs, security events, and administrative transaction histories remain enabled and protected against deletion or modification.'
        },
        {
          id: 'admin_sec_4',
          title: '4. AUTHORIZED USE & SYSTEM RESTRICTIONS',
          content: '• Unauthorized Data Extraction Prohibited: Administrators must not inspect, export, or share confidential employee databases, compensation tables, or personal files unless explicitly authorized for official system maintenance or security audits.\n• Administrative Credential Security: Multi-Factor Authentication (MFA) and strong credentials are mandatory. Sharing administrative passwords or API access tokens is strictly forbidden.'
        },
        {
          id: 'admin_sec_5',
          title: '5. DATA RESPONSIBILITY & COMPLIANCE',
          content: 'All system logs, user tables, and database schemas remain strictly confidential. Misuse of administrative access, unapproved data deletion, or security rule tampering will result in immediate privilege revocation and formal disciplinary proceedings.'
        }
      ])
    },
    {
      role_code: 'hr_manager',
      title: 'HUMAN RESOURCES GOVERNANCE, PRIVACY & EMPLOYEE RELATIONS POLICY',
      description: 'Operational HR policy governing employee data management, compensation confidentiality, leave quota allocation, payroll validation, recruitment, and dispute resolution.',
      sections: JSON.stringify([
        {
          id: 'hr_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'The Human Resources Department holds a primary fiduciary responsibility to safeguard employee personal data, maintain transparent HR workflows, manage payroll and leave entitlements accurately, and conduct fair recruitment and grievance redressal.'
        },
        {
          id: 'hr_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'Applies to HR Managers, HR Executives, and Personnel Administrators managing employee lifecycle workflows, recruitment, leave quotas, and performance reviews in ApponextHRMS.'
        },
        {
          id: 'hr_sec_3',
          title: '3. HR OPERATIONAL RESPONSIBILITIES',
          content: '• Employee Profile & Document Management: Accurately create and maintain digital employee profiles, document verifications, designation assignments, and department mappings.\n• Attendance & Leave Quota Administration: Review attendance regularization requests, manage annual leave quotas, and validate monthly payroll inputs with exact attendance records.\n• Recruitment & Offer Processing: Issue MRFs, candidate assessments, and job offer letters based strictly on qualifications and approved compensation bands without bias.\n• Grievance & Disciplinary Redressal: Investigate employee complaints, workplace conflicts, and harassment reports impartially within established SLA timelines.'
        },
        {
          id: 'hr_sec_4',
          title: '4. DATA PRIVACY & COMPENSATION CONFIDENTIALITY',
          content: '• Salary & PII Security: Employee compensation structures, bank account details, medical records, and performance ratings must be kept strictly confidential.\n• Unauthorized Alterations Prohibited: HR personnel must not modify employee salary data, designation tiers, or leave balances without formal approval from executive management.'
        },
        {
          id: 'hr_sec_5',
          title: '5. COMPLIANCE & ETHICAL RESPONSIBILITY',
          content: 'HR professionals must act as ethical custodians of company values. Violations of data privacy regulations, unauthorized compensation edits, or biased HR decisions will result in immediate employment review.'
        }
      ])
    },
    {
      role_code: 'department_head',
      title: 'DEPARTMENT MANAGER SUPERVISION, LEADERSHIP & APPROVAL POLICY',
      description: 'Operational governance policy for Department Managers covering L1/L2 approval SLA adherence, objective performance appraisals, capacity planning, and shift scheduling.',
      sections: JSON.stringify([
        {
          id: 'mgr_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'Department Managers and Functional Leaders are entrusted with guiding departmental goals, executing supervisory approvals, conducting objective evaluations, and managing team capacity effectively.'
        },
        {
          id: 'mgr_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'Applies to all Department Heads, Functional Managers, and Supervisory Executives responsible for team management, performance review, and workflow approvals in ApponextHRMS.'
        },
        {
          id: 'mgr_sec_3',
          title: '3. SUPERVISORY RESPONSIBILITIES & APPROVAL SLA',
          content: '• Timely Workflow Approvals: Review and process team leave applications, attendance regularization requests, shift swaps, and expense reimbursements within 24–48 hours.\n• Objective Performance Appraisals: Conduct transparent, unbiased performance evaluations based on documented deliverables, project KPIs, and measurable outcomes.\n• Shift Roster & Capacity Planning: Approve shift schedules and ensure balanced departmental headcount to prevent operational bottlenecks.'
        },
        {
          id: 'mgr_sec_4',
          title: '4. AUTHORIZED USE & RESTRICTIONS',
          content: '• Confidentiality of Ratings & Salaries: Keep team appraisal ratings, promotion recommendations, and compensation details strictly confidential.\n• Non-Interference with HR Policies: Managers must not grant informal leave or override attendance policies outside the ApponextHRMS approval engine.'
        },
        {
          id: 'mgr_sec_5',
          title: '5. COMPLIANCE & MANAGEMENT SLA',
          content: 'Failure to process approval workflows within SLA timelines, chronic approval delays, or biased supervisory practices will be subject to executive management review.'
        }
      ])
    },
    {
      role_code: 'team_lead',
      title: 'TEAM LEAD MENTORSHIP, TASK GUIDANCE & EXECUTION POLICY',
      description: 'Policy defining Team Lead expectations regarding daily task allocation, technical mentorship, project milestone tracking, and attendance anomaly reporting.',
      sections: JSON.stringify([
        {
          id: 'tl_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'Team Leads serve as the essential operational link between department goals and daily project execution, providing technical mentorship, monitoring task deliverables, and maintaining team alignment.'
        },
        {
          id: 'tl_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'Outlines expectations for Team Leads, Module Leads, and Project Coordinators managing daily project deliverables and team coordination in ApponextHRMS.'
        },
        {
          id: 'tl_sec_3',
          title: '3. OPERATIONAL RESPONSIBILITIES & TASK GUIDANCE',
          content: '• Equitable Task Distribution: Allocate daily tasks fairly based on individual skill sets, capacity, and project milestone commitments.\n• Daily Technical Guidance: Conduct regular standups, assist team members with technical blockers, and guide junior staff.\n• Progress Logging & Status Accuracy: Ensure task status updates, shift check-in logs, and project milestone completion dates are accurately maintained in ApponextHRMS.\n• Attendance Anomaly Reporting: Identify and report unexcused absences, shift mismatches, or project delays to the Department Manager.'
        },
        {
          id: 'tl_sec_4',
          title: '4. DATA PROTECTION & REPOSITORY SECURITY',
          content: '• Source Code & IP Security: Protect project repositories, client specifications, and technical architecture documents against unauthorized external sharing.\n• Credential Integrity: Never share developer access keys or system credentials.'
        },
        {
          id: 'tl_sec_5',
          title: '5. COMPLIANCE & EXECUTION REVIEW',
          content: 'Adherence to project guidelines and confidentiality is strictly enforced. Unverified task reporting or data leakage will result in supervisory review.'
        }
      ])
    },
    {
      role_code: 'employee',
      title: 'EMPLOYEE CODE OF CONDUCT, WORKPLACE ETHICS & ATTENDANCE POLICY',
      description: 'Standard formal workplace policy for all organization employees governing biometric attendance, leave booking, IT asset security, and self-service features.',
      sections: JSON.stringify([
        {
          id: 'emp_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'ApponextHRMS expects all employees to perform their assigned duties with dedication, integrity, and mutual respect, utilizing employee self-service features responsibly.'
        },
        {
          id: 'emp_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'Applies to all regular full-time, part-time, and contractual employees across all operational business units and branch locations.'
        },
        {
          id: 'emp_sec_3',
          title: '3. ATTENDANCE & SELF-SERVICE RESPONSIBILITIES',
          content: '• Biometric & GPS Attendance Punch: Employees must record check-in/check-out accurately using designated biometric terminals or approved GPS location bounds.\n• Proxy Attendance Strictly Prohibited: Attempting to punch attendance for another employee or utilizing location-spoofing software is grounds for immediate termination.\n• Advance Leave Applications: Submit leave requests in advance via the HRMS portal. Unexcused absences without approval will be marked as Loss of Pay (LOP).\n• Accurate Reimbursements & Claims: Expense reimbursements and claim receipts submitted via HRMS must be genuine and accurate.'
        },
        {
          id: 'emp_sec_4',
          title: '4. WORKPLACE ETHICS & IT ASSETS',
          content: '• Professional Interaction: Maintain courteous, respectful communication with colleagues. Harassment or discrimination is strictly prohibited.\n• IT Asset Protection: Safeguard company laptops, software credentials, and digital tools. Company resources must be used strictly for authorized business.'
        },
        {
          id: 'emp_sec_5',
          title: '5. CONFIDENTIALITY & ENFORCEMENT',
          content: 'Safeguard company proprietary data, trade secrets, employee details, and client information. Failure to comply with this Code of Conduct will result in formal disciplinary action.'
        }
      ])
    },
    {
      role_code: 'intern',
      title: 'INTERNSHIP PROGRAM AGREEMENT, LEARNING & CONFIDENTIALITY POLICY',
      description: 'Formal agreement policy governing intern learning responsibilities, mentor guidance, attendance tracking, and strict non-disclosure.',
      sections: JSON.stringify([
        {
          id: 'int_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'The Internship Program is structured to provide practical learning, technical mentorship, and industry skill development under dedicated mentor supervision.'
        },
        {
          id: 'int_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'Applies to all project interns, trainees, and seasonal apprentices engaged with the organization.'
        },
        {
          id: 'int_sec_3',
          title: '3. LEARNING RESPONSIBILITIES & TIME TRACKING',
          content: '• Training Engagement: Actively participate in assigned learning modules and complete tasks under mentor direction.\n• Daily Work Log & Time Tracking: Record daily working hours, task completion status, and attendance in ApponextHRMS accurately.\n• Proactive Communication: Seek guidance when encountering technical blockers and incorporate mentor feedback.'
        },
        {
          id: 'int_sec_4',
          title: '4. SYSTEM RESTRICTIONS & STRICT CONFIDENTIALITY',
          content: '• Authorized System Use: Access company repositories, software tools, and project documents strictly for authorized learning tasks.\n• Proprietary Data Non-Disclosure: All source code, technical documentation, research materials, and internal data remain strictly confidential.\n• Unauthorized System Changes Prohibited: Interns must not modify system settings or delete project files.'
        },
        {
          id: 'int_sec_5',
          title: '5. COMPLIANCE & AGREEMENT TERMINATION',
          content: 'Demonstrate punctuality, professional conduct, and respect for company policies. Unexcused absences or confidentiality breaches will result in immediate termination of the internship agreement.'
        }
      ])
    }
  ];

  for (const policy of formalPolicies) {
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
