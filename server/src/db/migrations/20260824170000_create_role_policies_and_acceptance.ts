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
      title: 'ORGANIZATION ADMINISTRATOR GOVERNANCE & SYSTEM SECURITY POLICY',
      description: 'Formal administrative governance policy defining system control, user access management, multi-tenant isolation, data privacy, and audit responsibilities.',
      sections: JSON.stringify([
        {
          id: 'admin_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'ApponextHRMS grants Organization Administrators full administrative authority to govern tenant settings, manage user accounts, assign role permissions, and oversee enterprise system operations. Administrators must exercise this authority with the highest standards of professional ethics, confidentiality, and data stewardship.'
        },
        {
          id: 'admin_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy establishes strict administrative governance controls, operational protocols, and security expectations for Super Administrators, Organization Administrators, and System IT Leads operating within ApponextHRMS across all organizational units and branches.'
        },
        {
          id: 'admin_sec_3',
          title: '3. ROLE RESPONSIBILITIES & SYSTEM CONTROL',
          content: '• User Account Lifecycle Management: Provision, update, and revoke user accounts in strict accordance with authorized HR requests and employment lifecycle events.\n• Role & Permission Allocation: Assign system roles strictly based on the Principle of Least Privilege. Unauthorized elevation of user access rights is strictly prohibited.\n• Tenant Security & Configuration: Maintain multi-tenant data isolation, configure organization shift patterns, leave policies, and biometric integration settings.\n• System Audit & Activity Monitoring: System activity logs, audit trails, and administrative operations are monitored and subject to periodic compliance reviews.'
        },
        {
          id: 'admin_sec_4',
          title: '4. DATA PRIVACY & CONFIDENTIALITY',
          content: '• Confidential Data Custody: All employee personal records, payroll data, performance ratings, and system configurations are strictly confidential.\n• Unauthorized Inspection Prohibited: Administrators must refrain from accessing, inspecting, or extracting personal employee data unless explicitly authorized for official administrative investigations.\n• Credential Security: Multi-Factor Authentication (MFA) and strong password protocols are mandatory. Credential sharing is grounds for immediate privilege revocation.'
        },
        {
          id: 'admin_sec_5',
          title: '5. COMPLIANCE & GOVERNANCE ENFORCEMENT',
          content: 'Compliance with this Administrative Policy is a mandatory condition of holding system administrator privileges. Any unauthorized data access, privilege abuse, or security protocol violation will result in immediate termination of administrative access, employment review, and potential legal action.'
        }
      ])
    },
    {
      role_code: 'hr_manager',
      title: 'HUMAN RESOURCES GOVERNANCE, PRIVACY & EMPLOYEE RELATIONS POLICY',
      description: 'Comprehensive HR policy establishing ethical standards for employee records management, fair recruitment, leave administration, and workplace dispute redressal.',
      sections: JSON.stringify([
        {
          id: 'hr_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'The Human Resources Department holds a primary fiduciary duty to protect employee personal privacy, enforce objective workplace policies, ensure meritocratic recruitment, and maintain harmonious employee relations throughout the employment lifecycle.'
        },
        {
          id: 'hr_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy establishes operational standards, privacy frameworks, and professional expectations for HR Managers, HR Executives, and Personnel Administrators operating within ApponextHRMS.'
        },
        {
          id: 'hr_sec_3',
          title: '3. HR OPERATIONAL RESPONSIBILITIES',
          content: '• Employee Lifecycle Administration: Manage digital employee onboarding, profile verifications, document management, and offboarding workflows.\n• Leave & Attendance Oversight: Oversee organization leave policies, verify attendance regularization requests, and validate monthly payroll inputs accurately.\n• Objective Recruitment & Selection: Execute recruitment processes based strictly on qualifications, merit, and job requirements without bias or discrimination.\n• Grievance Redressal: Investigate employee complaints, workplace conflicts, and harassment reports impartially within established SLA timelines.'
        },
        {
          id: 'hr_sec_4',
          title: '4. EMPLOYEE DATA PRIVACY & CONFIDENTIALITY',
          content: '• Personal Identifiable Information (PII): Employee medical records, compensation details, background verification reports, and performance reviews must be stored securely.\n• Restricted Information Sharing: HR personnel shall not disclose confidential employee data to unauthorized internal staff or third parties.'
        },
        {
          id: 'hr_sec_5',
          title: '5. PROFESSIONAL CONDUCT & ENFORCEMENT',
          content: 'HR Professionals must uphold absolute impartiality, foster an inclusive environment, and serve as ethical custodians of company values. Non-compliance with privacy standards or biased HR practices will result in formal disciplinary action.'
        }
      ])
    },
    {
      role_code: 'department_head',
      title: 'DEPARTMENT MANAGER SUPERVISION, LEADERSHIP & APPROVAL POLICY',
      description: 'Operational governance policy for Department Managers covering supervisory responsibilities, objective performance appraisals, approval SLA adherence, and team leadership.',
      sections: JSON.stringify([
        {
          id: 'mgr_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'Department Managers and Functional Leaders are entrusted with guiding departmental operations, executing fair supervisory decisions, managing team capacity, and fostering high-performance work environments.'
        },
        {
          id: 'mgr_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy applies to all Department Heads, Functional Managers, and Supervisory Executives responsible for team management, performance review, and workflow approvals in ApponextHRMS.'
        },
        {
          id: 'mgr_sec_3',
          title: '3. SUPERVISORY RESPONSIBILITIES & APPROVAL SLA',
          content: '• Timely Workflow Approvals: Review and process team leave applications, attendance regularization requests, and expense claims within 24–48 hours.\n• Objective Performance Appraisals: Conduct transparent, unbiased performance evaluations based on documented metrics, deliverables, and agreed Key Performance Indicators (KPIs).\n• Workload Allocation & Capacity Planning: Distribute departmental projects equitably and maintain balanced team capacity.'
        },
        {
          id: 'mgr_sec_4',
          title: '4. LEADERSHIP ETHICS & TEAM ENVIRONMENT',
          content: '• Supportive Work Culture: Lead by example, respect employee work-life balance, and maintain a professional work environment free from favoritism.\n• Conflict Resolution: Address operational bottlenecks and team disputes constructively, escalating complex grievances to HR when appropriate.'
        },
        {
          id: 'mgr_sec_5',
          title: '5. CONFIDENTIALITY & GOVERNANCE',
          content: 'Department Managers must keep team compensation details, appraisal scores, and internal operational reports strictly confidential. Failure to adhere to approval SLAs or supervisory standards will trigger executive management review.'
        }
      ])
    },
    {
      role_code: 'team_lead',
      title: 'TEAM LEAD MENTORSHIP, TASK GUIDANCE & EXECUTION POLICY',
      description: 'Policy defining Team Lead expectations regarding daily task allocation, technical mentorship, project milestone tracking, and team communication.',
      sections: JSON.stringify([
        {
          id: 'tl_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'Team Leads serve as the essential link between department objectives and daily project execution, guiding team members toward milestones with technical support and constructive mentorship.'
        },
        {
          id: 'tl_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy outlines operational expectations for Team Leads, Module Leads, and Project Coordinators managing daily project deliverables in ApponextHRMS.'
        },
        {
          id: 'tl_sec_3',
          title: '3. OPERATIONAL RESPONSIBILITIES & MENTORSHIP',
          content: '• Equitable Task Distribution: Allocate daily tasks fairly based on individual skill sets, capacity, and project schedules.\n• Daily Technical Guidance: Conduct regular standups, assist team members with technical blockers, and mentor junior team members.\n• Progress Logging & Status Accuracy: Ensure team task status logs, shift check-ins, and milestone updates are accurately recorded in ApponextHRMS.'
        },
        {
          id: 'tl_sec_4',
          title: '4. PROFESSIONAL CONDUCT & COLLABORATION',
          content: '• Collaborative Work Environment: Cultivate mutual respect, encourage teamwork, and refrain from personal favoritism.\n• Transparent Escalation: Communicate operational risks and resource shortages promptly to Department Managers.'
        },
        {
          id: 'tl_sec_5',
          title: '5. CONFIDENTIALITY & DATA PROTECTION',
          content: 'Safeguard project source code, client specifications, and internal repository data against unauthorized external distribution. Non-compliance will lead to supervisory review.'
        }
      ])
    },
    {
      role_code: 'employee',
      title: 'EMPLOYEE CODE OF CONDUCT, WORKPLACE ETHICS & ATTENDANCE POLICY',
      description: 'Standard formal workplace policy for all organization employees governing professional ethics, attendance, IT asset security, and data responsibility.',
      sections: JSON.stringify([
        {
          id: 'emp_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'ApponextHRMS expects all employees to perform their assigned duties with dedication, integrity, and mutual respect, upholding organization values and contributing to a productive workplace.'
        },
        {
          id: 'emp_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy applies to all regular full-time, part-time, and contractual employees across all operational business units and branch locations.'
        },
        {
          id: 'emp_sec_3',
          title: '3. ATTENDANCE, PUNCTUALITY & LEAVE RULES',
          content: '• Shift Schedule Adherence: Employees must adhere to assigned shift schedules and record daily attendance accurately using designated biometric terminals.\n• Advance Leave Request: Submit leave applications via the HRMS portal in advance in accordance with organization leave entitlement guidelines.\n• Break Duration Management: Record meal and rest breaks accurately to maintain uninterrupted team workflow.'
        },
        {
          id: 'emp_sec_4',
          title: '4. WORKPLACE ETHICS & IT ASSET SECURITY',
          content: '• Professional Interaction: Maintain polite, professional communication with colleagues and clients. Discrimination or harassment will not be tolerated.\n• IT Asset Stewardship: Protect company laptops, software credentials, and digital infrastructure. System resources must be used strictly for official business.'
        },
        {
          id: 'emp_sec_5',
          title: '5. CONFIDENTIALITY & COMPLIANCE ENFORCEMENT',
          content: 'Safeguard proprietary company information, trade secrets, employee records, and client data. Failure to comply with this Code of Conduct may result in warning notices, suspension, or employment termination.'
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
          content: 'The Internship Program is structured to provide practical learning, industry exposure, and professional skill development under dedicated mentor supervision.'
        },
        {
          id: 'int_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy governs all project interns, trainees, and seasonal apprentices engaged with the organization.'
        },
        {
          id: 'int_sec_3',
          title: '3. LEARNING RESPONSIBILITIES & MENTORSHIP',
          content: '• Training Engagement: Actively participate in assigned learning modules and complete tasks under mentor guidance.\n• Accurate Time Tracking: Record daily working hours and attendance in ApponextHRMS accurately.\n• Feedback Integration: Proactively seek guidance and incorporate mentor feedback into project assignments.'
        },
        {
          id: 'int_sec_4',
          title: '4. PROFESSIONAL WORKPLACE CONDUCT',
          content: 'Demonstrate punctuality, professional curiosity, respectful communication, and adherence to company culture and policies.'
        },
        {
          id: 'int_sec_5',
          title: '5. STRICT CONFIDENTIALITY & NON-DISCLOSURE',
          content: 'All source code, project repositories, research documents, and internal tools accessed during the internship remain strictly confidential. Unauthorized sharing or unexcused absences will result in immediate termination of the internship agreement.'
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
