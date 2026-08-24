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

  // 3. Seed formal, comprehensive role-wise HR policy documents
  const formalPolicies = [
    {
      role_code: 'organization_admin',
      title: 'Organization Administrator Governance & System Control Policy',
      description: 'Formal administrative governance framework defining system access, data security, tenant isolation, and audit responsibilities for Organization Administrators.',
      sections: JSON.stringify([
        {
          id: 'admin_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'ApponextHRMS grants System Administrators administrative authority to govern tenant data, manage user credentials, and configure enterprise workflows. Administrators must exercise this authority with the highest standard of ethical conduct, accountability, and organizational integrity.'
        },
        {
          id: 'admin_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy defines the governance boundaries, operational rules, and security obligations for Organization Administrators. It applies to all super administrators, organization administrators, and IT system administrators operating within ApponextHRMS.'
        },
        {
          id: 'admin_sec_3',
          title: '3. ROLE RESPONSIBILITIES',
          content: 'Administrators are responsible for overseeing tenant security configurations, managing system role assignments, monitoring user access privileges, maintaining data integrity, and ensuring compliance with multi-tenant data isolation standards.'
        },
        {
          id: 'admin_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'a. Access Privilege Management: Assign roles strictly according to the Principle of Least Privilege.\nb. Security Credentials: Multi-factor authentication and strong password rules are mandatory.\nc. Audit Compliance: All administrative actions, user creation, and role updates are monitored and logged.'
        },
        {
          id: 'admin_sec_5',
          title: '5. PROFESSIONAL CONDUCT',
          content: 'Administrators must maintain strict neutrality, refrain from unauthorized inspection of private employee records, and never utilize administrative access for personal interest or unapproved monitoring.'
        },
        {
          id: 'admin_sec_6',
          title: '6. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'All corporate database records, employee personal data, compensation files, and proprietary configurations are strictly confidential. Unauthorized data export, external disclosure, or credential sharing is strictly prohibited.'
        },
        {
          id: 'admin_sec_7',
          title: '7. COMPLIANCE AND ENFORCEMENT',
          content: 'Compliance with this policy is mandatory. Any breach of administrative privileges, unauthorized data modification, or security protocol violation will result in immediate privilege revocation, disciplinary action, and potential legal proceedings.'
        }
      ])
    },
    {
      role_code: 'hr_manager',
      title: 'Human Resources Governance, Privacy & Employee Relations Policy',
      description: 'Comprehensive HR policy establishing standards for employee data confidentiality, fair recruitment practices, leave management, and workplace dispute redressal.',
      sections: JSON.stringify([
        {
          id: 'hr_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'The Human Resources department holds a primary duty to safeguard employee personal privacy, enforce transparent workplace policies, and ensure objective recruitment and personnel lifecycle management.'
        },
        {
          id: 'hr_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy establishes the operational standards, privacy frameworks, and ethical expectations for HR Managers, HR Executives, and Personnel Administrators operating within ApponextHRMS.'
        },
        {
          id: 'hr_sec_3',
          title: '3. ROLE RESPONSIBILITIES',
          content: 'HR Managers are responsible for overseeing onboarding workflows, maintaining digital employee files, facilitating meritocratic performance reviews, managing leave and shift policies, and resolving workplace grievances.'
        },
        {
          id: 'hr_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'a. Fair Practice: Candidate selection and employee promotions must be strictly merit-based without bias.\nb. Record Maintenance: Ensure prompt updating of employee lifecycle events, attendance corrections, and payroll inputs.\nc. Dispute Resolution: Investigate employee complaints impartially within established SLA timelines.'
        },
        {
          id: 'hr_sec_5',
          title: '5. PROFESSIONAL CONDUCT',
          content: 'HR professionals must uphold absolute impartiality, foster an inclusive environment free from discrimination or harassment, and act as ethical custodians of organization values.'
        },
        {
          id: 'hr_sec_6',
          title: '6. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'Personally Identifiable Information (PII), medical records, compensation structures, performance ratings, and background check reports must be stored securely and held in strict confidence.'
        },
        {
          id: 'hr_sec_7',
          title: '7. COMPLIANCE AND ENFORCEMENT',
          content: 'Adherence to HR governance policies is strictly enforced. Violations of employee data privacy, non-compliance with labor guidelines, or breach of trust will trigger formal disciplinary proceedings.'
        }
      ])
    },
    {
      role_code: 'department_head',
      title: 'Department Manager Leadership, Supervision & Approval Policy',
      description: 'Operational guidelines for Department Managers covering supervisory responsibilities, objective evaluations, approval timelines, and team leadership.',
      sections: JSON.stringify([
        {
          id: 'mgr_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'Department Managers and Functional Leaders are entrusted with leading teams, driving operational excellence, and executing fair, transparent supervisory decisions.'
        },
        {
          id: 'mgr_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy applies to all Department Heads, Functional Managers, and Supervisory Executives responsible for team management, performance review, and workflow approvals in ApponextHRMS.'
        },
        {
          id: 'mgr_sec_3',
          title: '3. ROLE RESPONSIBILITIES',
          content: 'Managers are responsible for approving employee leave and attendance regularization requests, allocating departmental tasks, evaluating team performance, and mentoring team members.'
        },
        {
          id: 'mgr_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'a. Approval SLA Adherence: Review and process team leave, expense, and shift requests within 24–48 hours.\nb. Objective Appraisals: Evaluate team members objectively based on documented performance metrics and deliverables.\nc. Operational Communication: Maintain open dialogue and address workflow bottlenecks constructively.'
        },
        {
          id: 'mgr_sec_5',
          title: '5. PROFESSIONAL CONDUCT',
          content: 'Managers must lead by example, demonstrate integrity, respect employee work-life balance, and foster a supportive team atmosphere free from favoritism.'
        },
        {
          id: 'mgr_sec_6',
          title: '6. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'Keep departmental compensation data, performance ratings, and internal operational reports strictly confidential within authorized management channels.'
        },
        {
          id: 'mgr_sec_7',
          title: '7. COMPLIANCE AND ENFORCEMENT',
          content: 'Non-compliance with managerial guidelines, chronic approval delays, or biased supervisory practices will be subject to executive management review and corrective action.'
        }
      ])
    },
    {
      role_code: 'team_lead',
      title: 'Team Lead Mentorship, Task Guidance & Operational Policy',
      description: 'Policy defining Team Lead expectations regarding task delegation, daily mentorship, project tracking, and team communication.',
      sections: JSON.stringify([
        {
          id: 'tl_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'Team Leads act as the vital link between departmental objectives and daily task execution, guiding team members toward project milestones with clarity and constructive support.'
        },
        {
          id: 'tl_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy outlines expectations for Team Leads, Module Leads, and Project Coordinators overseeing daily work allocation and team coordination.'
        },
        {
          id: 'tl_sec_3',
          title: '3. ROLE RESPONSIBILITIES',
          content: 'Team Leads are responsible for daily task assignment, monitoring project progress, providing technical mentorship, ensuring shift adherence, and escalating operational risks.'
        },
        {
          id: 'tl_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'a. Equitable Task Distribution: Assign work fairly based on skill sets and workload capacity.\nb. Daily Standups & Guidance: Assist team members facing technical or process hurdles promptly.\nc. Accurate Progress Reporting: Maintain accurate task status logs and shift progress reports.'
        },
        {
          id: 'tl_sec_5',
          title: '5. PROFESSIONAL CONDUCT',
          content: 'Team Leads must cultivate mutual respect, encourage team collaboration, refrain from personal bias, and maintain professional workplace communication.'
        },
        {
          id: 'tl_sec_6',
          title: '6. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'Protect project source code, client specifications, and internal operational data against unauthorized disclosure or external distribution.'
        },
        {
          id: 'tl_sec_7',
          title: '7. COMPLIANCE AND ENFORCEMENT',
          content: 'Adherence to team guidance standards and confidentiality is required. Failure to uphold team responsibilities will lead to supervisory review.'
        }
      ])
    },
    {
      role_code: 'employee',
      title: 'Employee Code of Conduct, Workplace Ethics & General Policy',
      description: 'Standard formal workplace policy for all organization employees governing professional ethics, attendance, IT asset security, and data responsibility.',
      sections: JSON.stringify([
        {
          id: 'emp_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'ApponextHRMS expects all employees to perform their duties with dedication, integrity, and respect, upholding organization values and contributing to a positive, productive work environment.'
        },
        {
          id: 'emp_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy applies to all full-time, part-time, and contractual employees across all business units, branches, and operational locations.'
        },
        {
          id: 'emp_sec_3',
          title: '3. ROLE RESPONSIBILITIES',
          content: 'Employees are responsible for completing assigned work, logging daily attendance via designated biometric terminals, managing leave requests responsibly, and protecting organization assets.'
        },
        {
          id: 'emp_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'a. Attendance & Punctuality: Adhere to assigned shift schedules, log check-in/check-out accurately, and log break durations.\nb. Asset Protection: Use company laptops, credentials, and network resources strictly for authorized business purposes.\nc. Policy Compliance: Follow safety protocols, expense rules, and organizational workflows.'
        },
        {
          id: 'emp_sec_5',
          title: '5. PROFESSIONAL CONDUCT',
          content: 'Maintain courteous, professional interactions with colleagues and clients. Discrimination, harassment, substance abuse, or disruptive behavior will not be tolerated.'
        },
        {
          id: 'emp_sec_6',
          title: '6. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'Safeguard company proprietary data, trade secrets, employee records, and client information. Never share access credentials or internal documents externally.'
        },
        {
          id: 'emp_sec_7',
          title: '7. COMPLIANCE AND ENFORCEMENT',
          content: 'Compliance with this Code of Conduct is a mandatory condition of employment. Infractions may result in warning letters, suspension, or termination.'
        }
      ])
    },
    {
      role_code: 'intern',
      title: 'Internship Program Terms, Learning & Confidentiality Policy',
      description: 'Formal agreement policy governing intern learning responsibilities, mentor guidance, attendance tracking, and strict non-disclosure.',
      sections: JSON.stringify([
        {
          id: 'int_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'The Internship Program is designed to foster professional growth, practical skill development, and industry exposure under structured mentor supervision.'
        },
        {
          id: 'int_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'This policy governs all interns, project trainees, and seasonal apprentices engaged with the organization.'
        },
        {
          id: 'int_sec_3',
          title: '3. ROLE RESPONSIBILITIES',
          content: 'Interns are responsible for actively participating in assigned learning modules, completing daily tasks under mentor guidance, maintaining attendance logs, and submitting progress reports.'
        },
        {
          id: 'int_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'a. Mentorship Engagement: Seek guidance proactively and incorporate mentor feedback into assignments.\nb. Time Tracking: Record daily working hours and attendance in ApponextHRMS accurately.\nc. Asset Responsibility: Maintain all assigned learning materials, software accounts, and hardware carefully.'
        },
        {
          id: 'int_sec_5',
          title: '5. PROFESSIONAL CONDUCT',
          content: 'Demonstrate professional curiosity, punctuality, respectful communication, and adherence to company culture.'
        },
        {
          id: 'int_sec_6',
          title: '6. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'All source code, project repositories, research materials, and internal documentation accessed during internship remain strictly confidential and non-transferable.'
        },
        {
          id: 'int_sec_7',
          title: '7. COMPLIANCE AND ENFORCEMENT',
          content: 'Failure to comply with internship policy, unexcused absences, or confidentiality breaches will lead to immediate termination of the internship agreement.'
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
