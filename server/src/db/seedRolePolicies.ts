import { getKnex } from './knex';

export async function seedAllRolePolicies() {
  const knex = getKnex();

  const formalPolicies = [
    {
      role_code: 'super_admin',
      document_ref: 'POL-000',
      status: 'published',
      title: 'SUPER ADMINISTRATOR PLATFORM GOVERNANCE & MULTI-TENANT SECURITY POLICY',
      description: 'System-level policy governing platform-wide administration, tenant onboarding, system-level credentials, infrastructure security, and data protection in ApponextHRMS.',
      sections: JSON.stringify([
        {
          id: 'sa_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'Super Administrators hold ultimate system authority for the ApponextHRMS multi-tenant environment and must execute platform management, tenant provisioning, system security, and infrastructure configuration with maximum responsibility and diligence.'
        },
        {
          id: 'sa_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'Applies exclusively to platform Super Administrators, Global Technical Leads, and authorized Infrastructure System Engineers managing ApponextHRMS.'
        },
        {
          id: 'sa_sec_3',
          title: '3. ROLE RESPONSIBILITIES & PLATFORM GOVERNANCE',
          content: '• Multi-Tenant Isolation Security: Enforce strict database and logical boundary separation between tenant organizations.\n• Credential & Access Key Safeguards: Protect root database credentials, encryption keys, and third-party API integration keys.\n• Infrastructure Monitoring & Uptime: Maintain platform health, audit trail persistence, and emergency disaster recovery readiness.'
        },
        {
          id: 'sa_sec_4',
          title: '4. CONFIDENTIALITY & DATA PROTECTION',
          content: 'Super Administrators must never inspect, manipulate, or disclose tenant data, employee profiles, or business records without explicit written authorization or legal compliance mandates.'
        },
        {
          id: 'sa_sec_5',
          title: '5. COMPLIANCE',
          content: 'Unapproved system configuration changes, tenant data leakage, or credential mismanagement will lead to immediate privilege revocation and legal enforcement.'
        }
      ])
    },
    {
      role_code: 'organization_admin',
      document_ref: 'POL-001',
      status: 'published',
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
          title: '4. RULES AND GUIDELINES',
          content: '• Unauthorized Data Extraction Prohibited: Administrators must not inspect, export, or share confidential employee databases, compensation tables, or personal files unless explicitly authorized for official system maintenance or security audits.\n• Administrative Credential Security: Multi-Factor Authentication (MFA) and strong credentials are mandatory. Sharing administrative passwords or API access tokens is strictly forbidden.'
        },
        {
          id: 'admin_sec_5',
          title: '5. CONFIDENTIALITY & DATA RESPONSIBILITY',
          content: 'All system logs, user tables, and database schemas remain strictly confidential. Misuse of administrative access, unapproved data deletion, or security rule tampering will result in immediate privilege revocation and formal disciplinary proceedings.'
        },
        {
          id: 'admin_sec_6',
          title: '6. COMPLIANCE',
          content: 'Full compliance with administrative security policies is mandatory. Non-compliance will be subject to executive review.'
        }
      ])
    },
    {
      role_code: 'hr_manager',
      document_ref: 'POL-002',
      status: 'published',
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
          title: '3. ROLE RESPONSIBILITIES',
          content: '• Employee Profile & Document Management: Accurately create and maintain digital employee profiles, document verifications, designation assignments, and department mappings.\n• Attendance & Leave Quota Administration: Review attendance regularization requests, manage annual leave quotas, and validate monthly payroll inputs with exact attendance records.\n• Recruitment & Offer Processing: Issue MRFs, candidate assessments, and job offer letters based strictly on qualifications and approved compensation bands without bias.\n• Grievance & Disciplinary Redressal: Investigate employee complaints, workplace conflicts, and harassment reports impartially within established SLA timelines.'
        },
        {
          id: 'hr_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'HR staff must maintain complete impartiality during recruitment, appraisals, and employee grievance investigations.'
        },
        {
          id: 'hr_sec_5',
          title: '5. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: '• Salary & PII Security: Employee compensation structures, bank account details, medical records, and performance ratings must be kept strictly confidential.\n• Unauthorized Alterations Prohibited: HR personnel must not modify employee salary data, designation tiers, or leave balances without formal approval from executive management.'
        },
        {
          id: 'hr_sec_6',
          title: '6. COMPLIANCE',
          content: 'HR professionals must act as ethical custodians of company values. Violations of data privacy regulations, unauthorized compensation edits, or biased HR decisions will result in immediate employment review.'
        }
      ])
    },
    {
      role_code: 'department_head',
      document_ref: 'POL-003',
      status: 'published',
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
          title: '3. ROLE RESPONSIBILITIES',
          content: '• Timely Workflow Approvals: Review and process team leave applications, attendance regularization requests, shift swaps, and expense reimbursements within 24–48 hours.\n• Objective Performance Appraisals: Conduct transparent, unbiased performance evaluations based on documented deliverables, project KPIs, and measurable outcomes.\n• Shift Roster & Capacity Planning: Approve shift schedules and ensure balanced departmental headcount to prevent operational bottlenecks.'
        },
        {
          id: 'mgr_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'Managers must not override attendance rules outside the system engine.'
        },
        {
          id: 'mgr_sec_5',
          title: '5. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'Keep team appraisal ratings, promotion recommendations, and compensation details strictly confidential.'
        },
        {
          id: 'mgr_sec_6',
          title: '6. COMPLIANCE',
          content: 'Failure to process approval workflows within SLA timelines, chronic approval delays, or biased supervisory practices will be subject to executive management review.'
        }
      ])
    },
    {
      role_code: 'team_lead',
      document_ref: 'POL-004',
      status: 'published',
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
          title: '3. ROLE RESPONSIBILITIES',
          content: '• Equitable Task Distribution: Allocate daily tasks fairly based on individual skill sets, capacity, and project milestone commitments.\n• Daily Technical Guidance: Conduct regular standups, assist team members with technical blockers, and guide junior staff.\n• Progress Logging & Status Accuracy: Ensure task status updates, shift check-in logs, and project milestone completion dates are accurately maintained in ApponextHRMS.\n• Attendance Anomaly Reporting: Identify and report unexcused absences, shift mismatches, or project delays to the Department Manager.'
        },
        {
          id: 'tl_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'Support team members effectively and report project blockers early.'
        },
        {
          id: 'tl_sec_5',
          title: '5. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'Protect project repositories, client specifications, and technical architecture documents against unauthorized external sharing.'
        },
        {
          id: 'tl_sec_6',
          title: '6. COMPLIANCE',
          content: 'Adherence to project guidelines and confidentiality is strictly enforced. Unverified task reporting or data leakage will result in supervisory review.'
        }
      ])
    },
    {
      role_code: 'employee',
      document_ref: 'POL-005',
      status: 'published',
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
          title: '3. ROLE RESPONSIBILITIES',
          content: '• Biometric & GPS Attendance Punch: Employees must record check-in/check-out accurately using designated biometric terminals or approved GPS location bounds.\n• Proxy Attendance Strictly Prohibited: Attempting to punch attendance for another employee or utilizing location-spoofing software is grounds for immediate termination.\n• Advance Leave Applications: Submit leave requests in advance via the HRMS portal. Unexcused absences without approval will be marked as Loss of Pay (LOP).\n• Accurate Reimbursements & Claims: Expense reimbursements and claim receipts submitted via HRMS must be genuine and accurate.'
        },
        {
          id: 'emp_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: '• Professional Interaction: Maintain courteous, respectful communication with colleagues. Harassment or discrimination is strictly prohibited.\n• IT Asset Protection: Safeguard company laptops, software credentials, and digital tools. Company resources must be used strictly for authorized business.'
        },
        {
          id: 'emp_sec_5',
          title: '5. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'Safeguard company proprietary data, trade secrets, employee details, and client information.'
        },
        {
          id: 'emp_sec_6',
          title: '6. COMPLIANCE',
          content: 'Failure to comply with this Code of Conduct will result in formal disciplinary action.'
        }
      ])
    },
    {
      role_code: 'intern',
      document_ref: 'POL-006',
      status: 'published',
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
          title: '3. ROLE RESPONSIBILITIES',
          content: '• Training Engagement: Actively participate in assigned learning modules and complete tasks under mentor direction.\n• Daily Work Log & Time Tracking: Record daily working hours, task completion status, and attendance in ApponextHRMS accurately.\n• Proactive Communication: Seek guidance when encountering technical blockers and incorporate mentor feedback.'
        },
        {
          id: 'int_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'Demonstrate punctuality, professional curiosity, and respectful collaboration with mentors.'
        },
        {
          id: 'int_sec_5',
          title: '5. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: '• Authorized System Use: Access company repositories, software tools, and project documents strictly for authorized learning tasks.\n• Proprietary Data Non-Disclosure: All source code, technical documentation, research materials, and internal data remain strictly confidential.'
        },
        {
          id: 'int_sec_6',
          title: '6. COMPLIANCE',
          content: 'Unexcused absences or confidentiality breaches will result in immediate termination of the internship agreement.'
        }
      ])
    },
    {
      role_code: 'finance_manager',
      document_ref: 'POL-007',
      status: 'published',
      title: 'FINANCIAL CONTROLS, PAYROLL GOVERNANCE & FISCAL PRIVACY POLICY',
      description: 'Operational policy for Finance and Payroll Managers covering compensation calculations, tax deductions, disbursal accuracy, and bank account confidentiality.',
      sections: JSON.stringify([
        {
          id: 'fin_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'The Finance & Payroll Department is mandated to execute accurate, timely salary disbursements, tax withholdings, statutory filings, and financial reconciliations with absolute integrity.'
        },
        {
          id: 'fin_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'Applies to Finance Managers, Payroll Accountants, and Compensation Specialists in ApponextHRMS.'
        },
        {
          id: 'fin_sec_3',
          title: '3. ROLE RESPONSIBILITIES',
          content: '• Exact Calculation & Verification: Process monthly payroll runs based on verified attendance, leave ledger calculations, and authorized salary structures.\n• Statutory Deductions & Filings: Calculate tax deductions, PF/ESI contributions, and loan repayments accurately according to statutory regulations.\n• Confidential Disbursal & Bank Data Security: Maintain strict confidentiality of employee bank accounts, payslips, and salary structures.'
        },
        {
          id: 'fin_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'Verify all payroll inputs against verified HR attendance data before executing disbursement.'
        },
        {
          id: 'fin_sec_5',
          title: '5. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'Keep all salary registers, bank account details, and tax declarations completely confidential.'
        },
        {
          id: 'fin_sec_6',
          title: '6. COMPLIANCE',
          content: 'Unauthorized salary adjustments, unapproved manual payouts, or disclosure of compensation tables will result in immediate termination of access and disciplinary action.'
        }
      ])
    },
    {
      role_code: 'recruitment_manager',
      document_ref: 'POL-008',
      status: 'published',
      title: 'RECRUITMENT ETHICS, APPLICANT PRIVACY & HIRING COMPLIANCE POLICY',
      description: 'Policy governing recruitment managers, applicant tracking, interview management, offer processing, and resume bank privacy.',
      sections: JSON.stringify([
        {
          id: 'rec_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'Recruitment teams must conduct talent acquisition with transparency, non-discrimination, and strict privacy protection for applicant resumes and assessment data.'
        },
        {
          id: 'rec_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'Applies to Recruitment Managers, Talent Acquisition Specialists, and Technical Interviewers.'
        },
        {
          id: 'rec_sec_3',
          title: '3. ROLE RESPONSIBILITIES',
          content: '• Fair & Unbiased Screening: Evaluate candidates strictly based on merit, skills, and approved MRF job specifications.\n• Applicant Data Protection: Safeguard resume screening data, candidate contact details, and assessment scorecards against external sharing.\n• Offer Integrity: Issue formal offer letters strictly in alignment with approved compensation grids and HR guidelines.'
        },
        {
          id: 'rec_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'Maintain objective candidate evaluations and structured interview records.'
        },
        {
          id: 'rec_sec_5',
          title: '5. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'Applicant PII, salary expectations, and interview notes remain strictly confidential.'
        },
        {
          id: 'rec_sec_6',
          title: '6. COMPLIANCE',
          content: 'Misuse of candidate data, unauthorized offer issuance, or biased hiring decisions will result in formal recruitment privilege review.'
        }
      ])
    },
    {
      role_code: 'consultant',
      document_ref: 'POL-009',
      status: 'published',
      title: 'EXTERNAL CONSULTANT CONTRACTUAL RESPONSIBILITY & IP DATA POLICY',
      description: 'Operational policy for external consultants and advisory professionals defining deliverables, project boundaries, and intellectual property protection.',
      sections: JSON.stringify([
        {
          id: 'con_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'External consultants and contract specialists must fulfill contractually agreed project milestones while adhering to company IP protection and confidentiality rules.'
        },
        {
          id: 'con_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'Applies to all independent consultants, contract advisors, and third-party specialists integrated into ApponextHRMS.'
        },
        {
          id: 'con_sec_3',
          title: '3. ROLE RESPONSIBILITIES',
          content: '• Contractual Deliverable Execution: Complete project scope deliverables within agreed timelines and submit accurate work status logs.\n• Intellectual Property Ownership: All work product, technical architecture, and project output created during the engagement belong exclusively to the organization.\n• Non-Disclosure Obligations: Never share internal company data or source code with external third parties.'
        },
        {
          id: 'con_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'Adhere to contractual SLAs and client confidentiality standards.'
        },
        {
          id: 'con_sec_5',
          title: '5. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'All source code, project specifications, and internal data remain strictly confidential.'
        },
        {
          id: 'con_sec_6',
          title: '6. COMPLIANCE',
          content: 'Breaches of non-disclosure agreements or IP infringement will result in contract termination and legal claim.'
        }
      ])
    },
    {
      role_code: 'auditor',
      document_ref: 'POL-010',
      status: 'published',
      title: 'SYSTEM AUDIT & REGULATORY COMPLIANCE MONITORING POLICY',
      description: 'Governance policy for internal and external auditors outlining read-only inspection boundaries, audit trail verification, and data protection.',
      sections: JSON.stringify([
        {
          id: 'aud_sec_1',
          title: '1. POLICY STATEMENT',
          content: 'Auditors are authorized to inspect compliance logs, financial transaction records, and system workflows to verify organizational compliance and regulatory alignment.'
        },
        {
          id: 'aud_sec_2',
          title: '2. PURPOSE AND SCOPE',
          content: 'Applies to Compliance Auditors, Quality Managers, and External Audit Specialists.'
        },
        {
          id: 'aud_sec_3',
          title: '3. ROLE RESPONSIBILITIES',
          content: '• Independent Inspection: Review compliance logs, statutory filings, and attendance records impartially.\n• Audit Report Integrity: Document findings accurately based on empirical log evidence.\n• Strict Confidentiality: Maintain complete confidentiality regarding audit observations and organizational data.'
        },
        {
          id: 'aud_sec_4',
          title: '4. RULES AND GUIDELINES',
          content: 'Execute read-only verification without modifying live operational data.'
        },
        {
          id: 'aud_sec_5',
          title: '5. CONFIDENTIALITY AND DATA RESPONSIBILITY',
          content: 'Audit findings and system reports remain strictly confidential.'
        },
        {
          id: 'aud_sec_6',
          title: '6. COMPLIANCE',
          content: 'Unapproved data extraction or misuse of audit access privileges is strictly prohibited.'
        }
      ])
    }
  ];

  for (const policy of formalPolicies) {
    let policyId: number;
    const existing = await knex('role_policies').where({ role_code: policy.role_code }).first();
    if (existing) {
      policyId = existing.id;
      await knex('role_policies').where({ id: existing.id }).update({
        document_ref: policy.document_ref,
        status: policy.status,
        title: policy.title,
        description: policy.description,
        sections: policy.sections,
        updated_at: knex.fn.now(),
      });
    } else {
      const [insertedId] = await knex('role_policies').insert({
        ...policy,
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      });
      policyId = insertedId;
    }

    const hasAssignments = await knex.schema.hasTable('policy_assignments');
    if (hasAssignments && policyId) {
      const assignExists = await knex('policy_assignments').where({ policy_id: policyId, role_code: policy.role_code }).first();
      if (!assignExists) {
        await knex('policy_assignments').insert({
          policy_id: policyId,
          role_code: policy.role_code,
          organization_id: null,
          created_at: knex.fn.now(),
          updated_at: knex.fn.now(),
        });
      }
    }
  }

  console.log('✅ Seeded role policies for all system roles successfully.');
}

if (process.argv[1] && process.argv[1].includes('seedRolePolicies')) {
  seedAllRolePolicies().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
