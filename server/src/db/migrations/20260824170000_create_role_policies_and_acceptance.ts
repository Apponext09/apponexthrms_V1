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

  // 3. Seed formal, role-specific HR policy documents matching formal document layout
  const formalPolicies = [
    {
      role_code: 'organization_admin',
      title: 'ORGANIZATION ADMINISTRATOR GOVERNANCE POLICY',
      description: 'Formal administrative governance framework defining system access, data security, tenant isolation, and audit responsibilities for System Administrators.',
      sections: JSON.stringify([
        {
          id: 'admin_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'This Organization Administrator Policy defines the principles, authority boundaries, and system governance guidelines for System Administrators managing ApponextHRMS. Administrators must exercise their privilege with ethical integrity and accountability.'
        },
        {
          id: 'admin_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy establishes operational controls, security obligations, and access boundaries for Organization Administrators, Super Administrators, and IT System Administrators operating within ApponextHRMS.'
        },
        {
          id: 'admin_sec_3',
          title: '3. AUTHORIZED SYSTEM ACCESS & GOVERNANCE',
          content: '• Privilege Boundaries: Administrative access is granted solely to configure system settings, manage tenant security, and maintain enterprise workflows.\n• Credential Integrity: Multi-Factor Authentication (MFA) and strong password policies must be strictly enforced for all administrative credentials.\n• System Auditing: Every administrative action, user role assignment, and security change is logged and subject to periodic compliance audits.'
        },
        {
          id: 'admin_sec_4',
          title: '4. DATA RESPONSIBILITY & MULTI-TENANT ISOLATION',
          content: '• Tenant Data Protection: Ensure strict separation and data isolation across organization tenants at all times.\n• Data Confidentiality: All employee database records, financial summaries, and system logs remain strictly confidential and protected against unauthorized inspection.'
        },
        {
          id: 'admin_sec_5',
          title: '5. COMPLIANCE AND ENFORCEMENT',
          content: 'Adherence to this policy is mandatory. Misuse of administrative access, unauthorized data export, or credential sharing will result in immediate revocation of access and formal disciplinary proceedings.'
        }
      ])
    },
    {
      role_code: 'hr_manager',
      title: 'HUMAN RESOURCE GOVERNANCE & PRIVACY POLICY',
      description: 'Comprehensive HR policy establishing standards for employee data confidentiality, fair recruitment practices, leave management, and workplace dispute redressal.',
      sections: JSON.stringify([
        {
          id: 'hr_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'This Human Resource Policy outlines the principles and guidelines that govern employment practices, benefits, record management, and workplace conduct within the organization. HR Professionals must ensure fair treatment and employee privacy.'
        },
        {
          id: 'hr_sec_2',
          title: '2. EQUAL EMPLOYMENT OPPORTUNITY',
          content: 'The organization is committed to providing equal employment opportunities to all individuals without regard to race, color, religion, sex, national origin, age, disability, or any other protected status as defined by applicable laws. We strive to maintain a diverse and inclusive workplace.'
        },
        {
          id: 'hr_sec_3',
          title: '3. RECRUITMENT AND SELECTION',
          content: 'We recruit and select candidates based on their qualifications, skills, and abilities relevant to job requirements. Hiring decisions will be made without bias or discrimination in accordance with organizational hiring protocols.'
        },
        {
          id: 'hr_sec_4',
          title: '4. EMPLOYMENT RELATIONSHIP',
          content: '• Employment Categories: Employees will be classified as regular full-time, regular part-time, or contract based on their agreed work schedule and terms of employment.\n• Probationary Period: New hires may be subject to a probationary evaluation period to evaluate performance and suitability for the role.\n• Work Authorization: Employees must provide valid proof of eligibility to work in accordance with local regulations.'
        },
        {
          id: 'hr_sec_5',
          title: '5. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: '• Personnel Records: Personally Identifiable Information (PII), medical records, compensation structures, and background check reports must be stored securely and held in strict confidence.\n• Access Control: Access to employee records is restricted to authorized HR personnel only.'
        },
        {
          id: 'hr_sec_6',
          title: '6. COMPLIANCE AND ENFORCEMENT',
          content: 'Adherence to HR governance policies is strictly enforced. Violations of employee privacy, non-compliance with labor standards, or breach of trust will trigger formal disciplinary action.'
        }
      ])
    },
    {
      role_code: 'department_head',
      title: 'DEPARTMENT MANAGER SUPERVISION & LEADERSHIP POLICY',
      description: 'Operational guidelines for Department Managers covering supervisory responsibilities, objective evaluations, approval timelines, and team leadership.',
      sections: JSON.stringify([
        {
          id: 'mgr_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'This Policy defines expectations for Department Managers in leading departmental operations, executing fair supervisory decisions, and fostering team productivity.'
        },
        {
          id: 'mgr_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy applies to all Department Heads, Functional Managers, and Supervisory Executives responsible for team oversight, performance evaluation, and workflow approvals in ApponextHRMS.'
        },
        {
          id: 'mgr_sec_3',
          title: '3. SUPERVISORY RESPONSIBILITIES',
          content: '• Workflow Approvals: Review and process team leave applications, expense claims, and shift allocations within 24–48 hours.\n• Objective Appraisals: Conduct unbiased performance evaluations based on clear metrics and Key Performance Indicators (KPIs).\n• Workload Management: Distribute departmental tasks equitably and manage team resources efficiently.'
        },
        {
          id: 'mgr_sec_4',
          title: '4. PROFESSIONAL CONDUCT & LEADERSHIP',
          content: '• Fair Leadership: Lead by example, respect employee work-life balance, and maintain a supportive work culture.\n• Dispute Resolution: Address team conflicts constructively and escalate complex grievances to HR when appropriate.'
        },
        {
          id: 'mgr_sec_5',
          title: '5. CONFIDENTIALITY AND ENFORCEMENT',
          content: 'Keep team compensation details, appraisal scores, and internal operational reports strictly confidential within authorized management channels. Failure to comply with supervisory guidelines will lead to management review.'
        }
      ])
    },
    {
      role_code: 'team_lead',
      title: 'TEAM LEAD MENTORSHIP & PROJECT GUIDANCE POLICY',
      description: 'Policy defining Team Lead expectations regarding task delegation, daily mentorship, project tracking, and team communication.',
      sections: JSON.stringify([
        {
          id: 'tl_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'This Policy outlines the guidance and operational standards for Team Leads overseeing day-to-day task execution and team mentorship.'
        },
        {
          id: 'tl_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy outlines expectations for Team Leads, Module Leads, and Project Coordinators overseeing daily work allocation and team coordination.'
        },
        {
          id: 'tl_sec_3',
          title: '3. OPERATIONAL RESPONSIBILITIES',
          content: '• Task Distribution: Distribute tasks equitably based on individual skill sets and project timelines.\n• Technical Mentorship: Provide daily guidance and assist team members facing technical or process hurdles.\n• Progress Tracking: Ensure accurate task status logging, shift progress tracking, and milestone updates in ApponextHRMS.'
        },
        {
          id: 'tl_sec_4',
          title: '4. PROFESSIONAL CONDUCT',
          content: '• Teamwork & Respect: Cultivate a collaborative, respectful team environment free from favoritism.\n• Clear Communication: Maintain clear, open communication between team members and department managers.'
        },
        {
          id: 'tl_sec_5',
          title: '5. CONFIDENTIALITY AND ENFORCEMENT',
          content: 'Protect project source code, client specifications, and internal documentation against unauthorized distribution. Failure to uphold team responsibilities will lead to supervisory review.'
        }
      ])
    },
    {
      role_code: 'employee',
      title: 'EMPLOYEE CODE OF CONDUCT & WORKPLACE ETHICS POLICY',
      description: 'Standard formal workplace policy for all organization employees governing professional ethics, attendance, IT asset security, and data responsibility.',
      sections: JSON.stringify([
        {
          id: 'emp_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'This Policy sets forth expectations for professional conduct, workplace ethics, attendance, and corporate responsibility for all organization employees.'
        },
        {
          id: 'emp_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy applies to all regular full-time, part-time, and contractual employees across all business units and locations.'
        },
        {
          id: 'emp_sec_3',
          title: '3. ATTENDANCE AND PUNCTUALITY',
          content: '• Shift Schedule: Employees must adhere to assigned shift schedules and log attendance accurately using biometric check-in terminals.\n• Leave Requests: Submit leave applications in advance via the HRMS portal in accordance with organization leave rules.\n• Break Management: Record meal and rest breaks accurately to ensure smooth workflow continuity.'
        },
        {
          id: 'emp_sec_4',
          title: '4. WORKPLACE ETHICS AND ASSETS',
          content: '• Professional Conduct: Interact respectfully with colleagues, clients, and visitors. Discrimination or harassment is strictly prohibited.\n• IT Asset Security: Protect company laptops, credentials, and digital assets. Use resources strictly for business purposes.'
        },
        {
          id: 'emp_sec_5',
          title: '5. CONFIDENTIALITY AND COMPLIANCE',
          content: 'Safeguard company proprietary information, trade secrets, employee records, and client data. Non-compliance with the Code of Conduct may result in warning letters, suspension, or termination.'
        }
      ])
    },
    {
      role_code: 'intern',
      title: 'INTERNSHIP PROGRAM AGREEMENT & LEARNING POLICY',
      description: 'Formal agreement policy governing intern learning responsibilities, mentor guidance, attendance tracking, and strict non-disclosure.',
      sections: JSON.stringify([
        {
          id: 'int_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'This Policy establishes guidelines for the Internship Program, focusing on practical learning, mentor engagement, and professional skill development.'
        },
        {
          id: 'int_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy governs all project interns, trainees, and apprentices engaged with the organization.'
        },
        {
          id: 'int_sec_3',
          title: '3. INTERNSHIP RESPONSIBILITIES',
          content: '• Learning Commitment: Actively participate in assigned learning modules and complete project tasks under mentor guidance.\n• Attendance Logging: Record daily working hours and attendance in ApponextHRMS accurately.\n• Proactive Communication: Seek guidance when needed and incorporate mentor feedback into project assignments.'
        },
        {
          id: 'int_sec_4',
          title: '4. PROFESSIONAL CONDUCT',
          content: 'Demonstrate punctuality, curiosity, professional communication, and respect for organization guidelines and workplace culture.'
        },
        {
          id: 'int_sec_5',
          title: '5. CONFIDENTIALITY & NON-DISCLOSURE',
          content: 'All source code, internal research, project materials, and repository data accessed during the internship remain strictly confidential and non-transferable. Unexcused absences or confidentiality breaches will lead to immediate termination of the internship agreement.'
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
