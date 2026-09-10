export interface DefaultLetterTemplate {
  template_name: string;
  template_code: string;
  letter_category: 'hiring' | 'onboarding' | 'employment' | 'exit';
  letter_type: string;
  subject: string;
  body_content: string;
  terms_and_conditions?: string;
  custom_clause?: string;
  is_default: boolean;
  bgv_mandatory?: boolean;
  nda_mandatory?: boolean;
  non_compete?: boolean;
  relieving_letter_required?: boolean;
}

export const DEFAULT_MNC_LETTER_TEMPLATES: DefaultLetterTemplate[] = [
  // ──────────────────────────────────────────────────────────
  // STAGE 1: HIRING & SELECTION
  // ──────────────────────────────────────────────────────────
  {
    template_name: 'Official Interview Call Letter & Schedule',
    template_code: 'INT_CALL_STD',
    letter_category: 'hiring',
    letter_type: 'interview_call',
    subject: 'Interview Call Letter: {{position_title}} at {{company_name}}',
    body_content: `Dear {{candidate_name}},

Thank you for your interest in career opportunities with {{company_name}}.

Based on your profile and credentials, we are pleased to invite you for a formal interview round for the position of {{position_title}} in our {{department_name}} department.

Details of the interview are as follows:
• Position Applied: {{position_title}}
• Department: {{department_name}}
• Proposed Location: {{office_location}}
• Interview Date: {{interview_date}}
• Interview Time: {{interview_time}}
• Venue / Platform: {{interview_venue}}
• Interviewer / Panel: {{interviewer_name}}

Please confirm your availability by replying to this email at least 24 hours prior to the scheduled slot. Kindly carry copies of your updated resume, academic credentials, and previous employment proofs.

We look forward to meeting you and exploring how your capabilities align with our team objectives.`,
    terms_and_conditions: 'Please arrive 15 minutes prior to the scheduled time. For online sessions, ensure a stable high-speed internet connection and quiet environment.',
    is_default: true,
  },

  {
    template_name: 'Formal Intent to Offer Notice',
    template_code: 'INTENT_OFFER_STD',
    letter_category: 'hiring',
    letter_type: 'intent_to_offer',
    subject: 'Expression of Intent to Offer: {{position_title}} at {{company_name}}',
    body_content: `Dear {{candidate_name}},

Following our recent interview and selection rounds, the Management of {{company_name}} is delighted to inform you that you have been shortlisted for the position of {{position_title}}.

This letter serves as our formal Letter of Intent (LOI) to extend an offer of full-time employment to you on the following indicative terms:
• Proposed Position: {{position_title}}
• Department: {{department_name}}
• Designation: {{designation_name}}
• Indicative Annual CTC: {{currency}} {{cost_to_company}}
• Target Joining Date: {{offer_start_date}}
• Base Office Location: {{office_location}}

Please note that this document constitutes an Expression of Intent and does not serve as a binding employment contract. The detailed, legally binding Offer Letter containing comprehensive salary breakdown annexures and company policies will be released upon preliminary verification.

Please sign and return a duplicate copy of this letter indicating your acceptance of this Intent.`,
    terms_and_conditions: 'This Letter of Intent is subject to receipt of satisfactory background verification clearances, reference checks, and verification of original certificates.',
    is_default: true,
    bgv_mandatory: true,
  },

  {
    template_name: 'Comprehensive Corporate Offer Letter',
    template_code: 'OFFER_CORP_STD',
    letter_category: 'hiring',
    letter_type: 'offer_letter',
    subject: 'Formal Letter of Offer & Employment Agreement - {{company_name}}',
    body_content: `Dear {{candidate_name}},

On behalf of {{company_name}}, we are pleased to offer you employment for the position of {{position_title}} in our {{department_name}} department.

Your employment parameters are structured as outlined below:
• Position: {{position_title}}
• Designation: {{designation_name}}
• Corporate Grade: {{grade_band}}
• Base Location: {{office_location}}
• Work Model: {{work_model}}
• Reporting Authority: {{reporting_manager}}
• Target Commencement Date: {{offer_start_date}}
• Annual Cost to Company (CTC): {{currency}} {{cost_to_company}}
• Basic Salary: {{currency}} {{base_salary}}
• Probation Tenure: {{probation_period}}
• Applicable Notice Period: {{notice_period}}

Your compensation structure is detailed in Annexure A attached hereto. Your employment will be governed by the standard policies, service rules, and code of conduct of {{company_name}}.

We are confident that you will make substantial contributions to our organization's growth. Please signify your acceptance of this offer by digitally signing this document on or before {{offer_expiry_date}}.`,
    terms_and_conditions: 'This offer is contingent upon successful background verification, submission of relieving letter from previous employer, educational certificates, and medical fitness.',
    custom_clause: 'This offer expires automatically on {{offer_expiry_date}} if not accepted in writing/digitally prior to close of business hours.',
    is_default: true,
    bgv_mandatory: true,
    nda_mandatory: true,
    non_compete: true,
    relieving_letter_required: true,
  },

  // ──────────────────────────────────────────────────────────
  // STAGE 2: ONBOARDING (JOINING)
  // ──────────────────────────────────────────────────────────
  {
    template_name: 'Official Appointment Letter & Service Agreement',
    template_code: 'APPT_LETTER_STD',
    letter_category: 'onboarding',
    letter_type: 'appointment',
    subject: 'Official Letter of Appointment - {{company_name}} [Emp ID: {{employee_code}}]',
    body_content: `Dear {{employee_name}},

Sub: Letter of Appointment

With reference to your acceptance of our offer and subsequent joining on {{date_of_joining}}, we are pleased to formally appoint you as {{designation_name}} in the {{department_name}} department at {{company_name}}.

1. DATE OF JOINING & EMPLOYEE CODE:
Your appointment takes effect from {{date_of_joining}}. Your designated Employee ID is {{employee_code}}.

2. DESIGNATION & GRADE:
You will function in the capacity of {{designation_name}}, placed in corporate grade {{grade_band}}, reporting to {{reporting_manager}} or any other authority designated by the management.

3. COMPENSATION & EMOLUMENTS:
Your Annual Cost to Company (CTC) is {{currency}} {{current_ctc}}, payable monthly in arrears subject to applicable statutory deductions (PF, ESI, TDS, Professional Tax).

4. PROBATION & CONFIRMATION:
You will be on probation for a period of {{probation_period}} from the date of joining. Upon successful evaluation of your performance and conduct, your services will be confirmed in writing.

5. NOTICE PERIOD:
During probation, either party may terminate employment by giving 30 days notice. Post confirmation, the notice period shall be {{notice_period}} or salary in lieu thereof at company discretion.

Please return the duplicate copy of this Appointment Letter duly signed on all pages as token of your acceptance.`,
    terms_and_conditions: 'Governed by Company Service Rules 2026. Employee agrees to abide by all intellectual property, data security, and confidentiality stipulations.',
    is_default: true,
  },

  {
    template_name: 'Employee Non-Disclosure & Confidentiality Agreement',
    template_code: 'NDA_AGREEMENT_STD',
    letter_category: 'onboarding',
    letter_type: 'nda',
    subject: 'Non-Disclosure and Proprietary Information Agreement - {{company_name}}',
    body_content: `NON-DISCLOSURE & PROPRIETARY INFORMATION AGREEMENT

This Agreement is executed between {{company_name}} (the "Company") and {{employee_name}} (Employee Code: {{employee_code}}), designated as {{designation_name}} (the "Employee").

1. CONFIDENTIAL INFORMATION:
The Employee acknowledges that during employment, they will have access to confidential and proprietary information belonging to the Company and its clients, including but not limited to source code, algorithms, customer lists, financial figures, technical architectures, and strategic roadmaps.

2. DUTY OF CONFIDENTIALITY:
The Employee agrees to hold all such information in strict confidence and shall not disclose, duplicate, or transmit any Confidential Information to third parties without prior written authorization from the Company.

3. NON-COMPETE & NON-SOLICITATION:
During the term of employment and for a period of 12 months following termination, the Employee agrees not to solicit employees, clients, or vendors of the Company or engage with competing businesses in a similar capacity.

4. RETURN OF ASSETS & DATA:
Upon separation from the Company, the Employee shall immediately return all devices, storage media, tokens, and documents containing confidential information.

Signed and agreed to by:
Employee Name: {{employee_name}}
Employee Code: {{employee_code}}
Date: {{current_date}}`,
    terms_and_conditions: 'This agreement remains in full legal force during and following the termination of employment.',
    is_default: true,
  },

  {
    template_name: 'Corporate Code of Conduct & Workplace Ethics',
    template_code: 'CODE_CONDUCT_STD',
    letter_category: 'onboarding',
    letter_type: 'code_of_conduct',
    subject: 'Code of Conduct, Ethics & Workplace Compliance Undertaking',
    body_content: `CODE OF CONDUCT & WORKPLACE ETHICS UNDERTAKING

I, {{employee_name}}, Employee Code: {{employee_code}}, working as {{designation_name}} in the {{department_name}} department at {{company_name}}, do hereby acknowledge and undertake the following:

1. PROFESSIONAL INTEGRITY & ETHICS:
I shall conduct all business affairs with the utmost integrity, honesty, and transparency, ensuring full compliance with applicable laws, anti-corruption policies, and corporate governance norms.

2. EQUAL OPPORTUNITY & POSH COMPLIANCE:
I will respect diversity and maintain a harassment-free workplace in strict accordance with the Prevention of Sexual Harassment (POSH) Act and the Company's Zero Tolerance Policy.

3. CONFLICT OF INTEREST & DUAL EMPLOYMENT:
I will not engage in any dual employment, moonlighting, freelance contracts, or personal business that conflicts with my fiduciary duties to {{company_name}}.

4. IT ASSET USAGE & CYBERSECURITY:
I will strictly adhere to the Company Information Security Policy, using IT infrastructure solely for authorized business purposes and preventing unauthorized software installations.

I confirm that I have read, understood, and agree to abide by these provisions throughout my tenure at {{company_name}}.`,
    is_default: true,
  },

  // ──────────────────────────────────────────────────────────
  // STAGE 3: DURING EMPLOYMENT
  // ──────────────────────────────────────────────────────────
  {
    template_name: 'Service Confirmation Letter (Probation Clearance)',
    template_code: 'CONFIRM_LETTER_STD',
    letter_category: 'employment',
    letter_type: 'confirmation',
    subject: 'Confirmation of Employment - {{employee_name}} [{{employee_code}}]',
    body_content: `Dear {{employee_name}},

Sub: Confirmation of Service

We are pleased to inform you that you have successfully completed your probation period with {{company_name}}.

Following a comprehensive assessment of your performance, dedication, and conduct, the Management is pleased to confirm your appointment as a permanent employee in the role of {{designation_name}} in the {{department_name}} department, with effect from {{confirmation_date}}.

All other terms and conditions of your employment as set out in your Letter of Appointment dated {{date_of_joining}} shall continue to apply.

We take this opportunity to appreciate your contributions thus far and look forward to your continued dedication toward the success of {{company_name}}.

Please accept our warmest congratulations.`,
    is_default: true,
  },

  {
    template_name: 'Annual Compensation Increment & Revision Letter',
    template_code: 'INCR_LETTER_STD',
    letter_category: 'employment',
    letter_type: 'increment',
    subject: 'Annual Performance Appraisal & Compensation Revision - {{company_name}}',
    body_content: `Dear {{employee_name}},

Sub: Salary Revision & Annual Appraisal

In recognition of your performance, valuable contributions, and achievements during the financial year {{financial_year}}, the Management of {{company_name}} is pleased to revise your compensation structure.

The revision details are as follows:
• Current Annual CTC: {{currency}} {{current_ctc}}
• Revised Annual CTC: {{currency}} {{revised_ctc}}
• Increment Percentage: {{increment_percentage}}%
• Increment Quantum: {{currency}} {{increment_amount}}
• Effective Date: {{effective_date}}

Your revised monthly compensation will be credited from the payroll cycle of {{effective_date}}. Detailed annexures detailing your revised salary components will be available in your Employee Self-Service Portal.

We commend your dedication and look forward to your continued excellence and leadership in the coming year.`,
    is_default: true,
  },

  {
    template_name: 'Promotion & Role Elevation Letter',
    template_code: 'PROMO_LETTER_STD',
    letter_category: 'employment',
    letter_type: 'promotion',
    subject: 'Congratulations on Your Promotion to {{new_designation}}',
    body_content: `Dear {{employee_name}},

Sub: Promotion to {{new_designation}}

On behalf of the Leadership and Management of {{company_name}}, we are delighted to announce your promotion from {{old_designation}} to the elevated position of {{new_designation}} in the {{department_name}} department, effective {{effective_date}}.

This elevation is in recognition of your exceptional professional competence, exemplary leadership, and consistent track record of high-impact delivery.

Key details of your revised role:
• Revised Designation: {{new_designation}}
• Elevated Grade: {{grade_band}}
• Revised Annual CTC: {{currency}} {{revised_ctc}}
• Effective Date: {{effective_date}}
• Reporting Authority: {{reporting_manager}}

With this promotion comes greater responsibility and opportunity to shape our strategic objectives. We have full faith in your leadership capabilities and wish you resounding success in your new role.

Congratulations once again!`,
    is_default: true,
  },

  {
    template_name: 'Formal Disciplinary & Performance Warning Letter',
    template_code: 'WARN_LETTER_STD',
    letter_category: 'employment',
    letter_type: 'warning',
    subject: 'Formal Warning Letter - Performance / Disciplinary Notice',
    body_content: `PRIVATE & CONFIDENTIAL

To: {{employee_name}} (Employee Code: {{employee_code}})
Designation: {{designation_name}}, Department: {{department_name}}

Sub: Formal Disciplinary / Performance Warning Notice

This letter serves as a formal written warning regarding concerns related to your workplace performance / adherence to corporate policy that occurred on or around {{incident_date}}.

Specific Concerns Noted:
{{violation_details}}

Corrective Actions Required:
{{corrective_action}}

Please note that {{company_name}} places high value on adherence to quality standards and company guidelines. You are hereby placed on close observation for the next 30 days.

Failure to demonstrate significant and sustained improvement within this period may result in further disciplinary measures up to and including termination of employment in accordance with company policy.

You may submit your written explanation regarding the above matter within 48 hours of receipt of this notice.`,
    is_default: true,
  },

  // ──────────────────────────────────────────────────────────
  // STAGE 4: EXIT (SEPARATION)
  // ──────────────────────────────────────────────────────────
  {
    template_name: 'Resignation Acceptance & Exit Notice Period Letter',
    template_code: 'RESIGN_ACCEPT_STD',
    letter_category: 'exit',
    letter_type: 'resignation_acceptance',
    subject: 'Acceptance of Resignation - {{employee_name}} [{{employee_code}}]',
    body_content: `Dear {{employee_name}},

Sub: Acceptance of Resignation

We acknowledge receipt of your resignation email/letter dated {{resignation_date}} from the post of {{designation_name}} in the {{department_name}} department at {{company_name}}.

We hereby formally accept your resignation. In accordance with your employment terms, your separation will proceed as follows:
• Resignation Submission Date: {{resignation_date}}
• Applicable Notice Period: {{notice_period}}
• Official Last Working Day (LWD): {{last_working_day}}

You are requested to ensure a smooth, comprehensive handover of all project deliverables, knowledge transfer documents, and responsibilities to {{reporting_manager}}.

Kindly hand over all company assets (laptop, access cards, corporate tokens, etc.) to the IT and Admin departments before your Last Working Day. Your Full & Final Settlement (F&F), along with your Relieving and Experience certificates, will be processed in accordance with the standard exit cycle.

We thank you for your service to {{company_name}} and wish you the best in your future endeavors.`,
    is_default: true,
  },

  {
    template_name: 'Official Relieving Order & Clearance Letter',
    template_code: 'RELIEVING_ORDER_STD',
    letter_category: 'exit',
    letter_type: 'relieving',
    subject: 'Relieving Order & Clearance Certificate - {{employee_name}}',
    body_content: `TO WHOMSOEVER IT MAY CONCERN

Sub: Relieving Order

This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) was employed with {{company_name}} from {{date_of_joining}} to {{last_working_day}}.

At the time of separation, {{employee_name}} was working as {{designation_name}} in the {{department_name}} department.

Pursuant to the acceptance of resignation, {{employee_name}} has completed all departmental clearance formalities, handed over assigned responsibilities, and is hereby officially relieved from duties at {{company_name}} at the close of business hours on {{last_working_day}}.

We confirm that there are no pending company dues or asset clearances outstanding.

We wish {{employee_name}} every success in all future professional endeavors.`,
    is_default: true,
  },

  {
    template_name: 'Certificate of Service & Work Experience Letter',
    template_code: 'EXP_CERT_STD',
    letter_category: 'exit',
    letter_type: 'experience',
    subject: 'Experience & Service Certificate - {{employee_name}}',
    body_content: `TO WHOMSOEVER IT MAY CONCERN

EXPERIENCE & SERVICE CERTIFICATE

This is to certify that {{employee_name}} (Employee Code: {{employee_code}}) was a full-time employee of {{company_name}} from {{date_of_joining}} to {{last_working_day}}, completing a total tenure of {{total_tenure}}.

During the tenure with us, {{employee_name}} served with distinction in the following capacity:
• Primary Department: {{department_name}}
• Final Designation: {{designation_name}}
• Corporate Grade: {{grade_band}}
• Base Location: {{location_name}}

Throughout the association, {{employee_name}} was found to be hardworking, competent, and professional in demeanor. We have appreciated their contributions to our team and client engagements.

This certificate is issued at the request of the employee without any liability on the part of the Company.

We wish {{employee_name}} all the very best in future career aspirations.`,
    is_default: true,
  },

  {
    template_name: 'Custom Corporate Letter / General Memorandum',
    template_code: 'CUSTOM_LETTER_STD',
    letter_category: 'employment',
    letter_type: 'custom',
    subject: 'Official Communication - {{company_name}}',
    body_content: `Dear {{employee_name}},

Sub: Official Communication

This communication is issued by {{company_name}} regarding your employment and service records.

[Add your customized body paragraphs here using merge codes from the right sidebar]

Should you have any inquiries regarding this letter, please reach out to the Human Resources department at {{company_email}}.`,
    is_default: true,
  }
];
