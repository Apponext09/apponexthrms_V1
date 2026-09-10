import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText, Plus, Search, Check, Trash2, Edit2, Eye,
  Building2, Copy, Sparkles, RefreshCw, CheckCircle2,
  Calendar, Briefcase, Award, AlertTriangle, ShieldCheck,
  ChevronRight, ArrowRight, Printer, Layers, HelpCircle,
  Upload, Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiClient } from '@/config/api';
import { useCompanyStore } from '@/features/settings/store/companyStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export type LetterCategory = 'hiring' | 'onboarding' | 'employment' | 'exit';

export interface LetterTemplateRecord {
  id: string | number;
  organization_id?: number;
  company_id?: number;
  template_name: string;
  template_code: string;
  letter_category: LetterCategory;
  letter_type: string;
  subject: string;
  company_name_override?: string;
  company_address_override?: string;
  logo_url?: string;
  signatory_name?: string;
  signatory_designation?: string;
  header_html?: string;
  footer_html?: string;
  body_content: string;
  terms_and_conditions?: string;
  custom_clause?: string;
  merge_codes_used?: string[];
  is_default: boolean;
  is_active: boolean | 'Yes' | 'No';
  bgv_mandatory?: boolean;
  nda_mandatory?: boolean;
  non_compete?: boolean;
  relieving_letter_required?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type OfferTemplateRecord = LetterTemplateRecord;

export const DEFAULT_FRONTEND_TEMPLATES: LetterTemplateRecord[] = [
  // Stage 1: Hiring
  {
    id: 1,
    template_name: 'Official Interview Call Letter & Schedule',
    template_code: 'INT_CALL_STD',
    letter_category: 'hiring',
    letter_type: 'interview_call',
    subject: 'Interview Call Letter: {{position_title}} at {{company_name}}',
    body_content: `Dear {{candidate_name}},\n\nThank you for your interest in career opportunities with {{company_name}}.\n\nBased on your profile and credentials, we are pleased to invite you for a formal interview round for the position of {{position_title}} in our {{department_name}} department.\n\nDetails of the interview are as follows:\n• Position Applied: {{position_title}}\n• Department: {{department_name}}\n• Proposed Location: {{office_location}}\n• Interview Date: {{interview_date}}\n• Interview Time: {{interview_time}}\n• Venue / Platform: {{interview_venue}}\n• Interviewer / Panel: {{interviewer_name}}\n\nPlease confirm your availability by replying to this email at least 24 hours prior to the scheduled slot. Kindly carry copies of your updated resume, academic credentials, and previous employment proofs.\n\nWe look forward to meeting you and exploring how your capabilities align with our team objectives.`,
    terms_and_conditions: 'Please arrive 15 minutes prior to the scheduled time. For online sessions, ensure a stable high-speed internet connection and quiet environment.',
    is_default: true,
    is_active: true,
  },
  {
    id: 2,
    template_name: 'Formal Intent to Offer Notice',
    template_code: 'INTENT_OFFER_STD',
    letter_category: 'hiring',
    letter_type: 'intent_to_offer',
    subject: 'Expression of Intent to Offer: {{position_title}} at {{company_name}}',
    body_content: `Dear {{candidate_name}},\n\nFollowing our recent interview and selection rounds, the Management of {{company_name}} is delighted to inform you that you have been shortlisted for the position of {{position_title}}.\n\nThis letter serves as our formal Letter of Intent (LOI) to extend an offer of full-time employment to you on the following indicative terms:\n• Proposed Position: {{position_title}}\n• Department: {{department_name}}\n• Designation: {{designation_name}}\n• Indicative Annual CTC: {{currency}} {{cost_to_company}}\n• Target Joining Date: {{offer_start_date}}\n• Base Office Location: {{office_location}}\n\nPlease note that this document constitutes an Expression of Intent and does not serve as a binding employment contract. The detailed, legally binding Offer Letter containing comprehensive salary breakdown annexures and company policies will be released upon preliminary verification.\n\nPlease sign and return a duplicate copy of this letter indicating your acceptance of this Intent.`,
    terms_and_conditions: 'This Letter of Intent is subject to receipt of satisfactory background verification clearances, reference checks, and verification of original certificates.',
    is_default: true,
    is_active: true,
    bgv_mandatory: true,
  },
  {
    id: 3,
    template_name: 'Comprehensive Corporate Offer Letter',
    template_code: 'OFFER_CORP_STD',
    letter_category: 'hiring',
    letter_type: 'offer_letter',
    subject: 'Formal Letter of Offer & Employment Agreement - {{company_name}}',
    body_content: `Dear {{candidate_name}},\n\nOn behalf of {{company_name}}, we are pleased to offer you employment for the position of {{position_title}} in our {{department_name}} department.\n\nYour employment parameters are structured as outlined below:\n• Position: {{position_title}}\n• Designation: {{designation_name}}\n• Corporate Grade: {{grade_band}}\n• Base Location: {{office_location}}\n• Work Model: {{work_model}}\n• Reporting Authority: {{reporting_manager}}\n• Target Commencement Date: {{offer_start_date}}\n• Annual Cost to Company (CTC): {{currency}} {{cost_to_company}}\n• Basic Salary: {{currency}} {{base_salary}}\n• Probation Tenure: {{probation_period}}\n• Applicable Notice Period: {{notice_period}}\n\nYour compensation structure is detailed in Annexure A attached hereto. Your employment will be governed by the standard policies, service rules, and code of conduct of {{company_name}}.\n\nWe are confident that you will make substantial contributions to our organization's growth. Please signify your acceptance of this offer by digitally signing this document on or before {{offer_expiry_date}}.`,
    terms_and_conditions: 'This offer is contingent upon successful background verification, submission of relieving letter from previous employer, educational certificates, and medical fitness.',
    custom_clause: 'This offer expires automatically on {{offer_expiry_date}} if not accepted in writing/digitally prior to close of business hours.',
    is_default: true,
    is_active: true,
    bgv_mandatory: true,
    nda_mandatory: true,
    non_compete: true,
    relieving_letter_required: true,
  },

  // Stage 2: Onboarding
  {
    id: 4,
    template_name: 'Official Appointment Letter & Service Agreement',
    template_code: 'APPT_LETTER_STD',
    letter_category: 'onboarding',
    letter_type: 'appointment',
    subject: 'Official Letter of Appointment - {{company_name}} [Emp ID: {{employee_code}}]',
    body_content: `Dear {{employee_name}},\n\nSub: Letter of Appointment\n\nWith reference to your acceptance of our offer and subsequent joining on {{date_of_joining}}, we are pleased to formally appoint you as {{designation_name}} in the {{department_name}} department at {{company_name}}.\n\n1. DATE OF JOINING & EMPLOYEE CODE:\nYour appointment takes effect from {{date_of_joining}}. Your designated Employee ID is {{employee_code}}.\n\n2. DESIGNATION & GRADE:\nYou will function in the capacity of {{designation_name}}, placed in corporate grade {{grade_band}}, reporting to {{reporting_manager}} or any other authority designated by the management.\n\n3. COMPENSATION & EMOLUMENTS:\nYour Annual Cost to Company (CTC) is {{currency}} {{current_ctc}}, payable monthly in arrears subject to applicable statutory deductions (PF, ESI, TDS, Professional Tax).\n\n4. PROBATION & CONFIRMATION:\nYou will be on probation for a period of {{probation_period}} from the date of joining. Upon successful evaluation of your performance and conduct, your services will be confirmed in writing.\n\n5. NOTICE PERIOD:\nDuring probation, either party may terminate employment by giving 30 days notice. Post confirmation, the notice period shall be {{notice_period}} or salary in lieu thereof at company discretion.\n\nPlease return the duplicate copy of this Appointment Letter duly signed on all pages as token of your acceptance.`,
    terms_and_conditions: 'Governed by Company Service Rules 2026. Employee agrees to abide by all intellectual property, data security, and confidentiality stipulations.',
    is_default: true,
    is_active: true,
  },
  {
    id: 5,
    template_name: 'Employee Non-Disclosure & Confidentiality Agreement',
    template_code: 'NDA_AGREEMENT_STD',
    letter_category: 'onboarding',
    letter_type: 'nda',
    subject: 'Non-Disclosure and Proprietary Information Agreement - {{company_name}}',
    body_content: `NON-DISCLOSURE & PROPRIETARY INFORMATION AGREEMENT\n\nThis Agreement is executed between {{company_name}} (the "Company") and {{employee_name}} (Employee Code: {{employee_code}}), designated as {{designation_name}} (the "Employee").\n\n1. CONFIDENTIAL INFORMATION:\nThe Employee acknowledges that during employment, they will have access to confidential and proprietary information belonging to the Company and its clients, including but not limited to source code, algorithms, customer lists, financial figures, technical architectures, and strategic roadmaps.\n\n2. DUTY OF CONFIDENTIALITY:\nThe Employee agrees to hold all such information in strict confidence and shall not disclose, duplicate, or transmit any Confidential Information to third parties without prior written authorization from the Company.\n\n3. NON-COMPETE & NON-SOLICITATION:\nDuring the term of employment and for a period of 12 months following termination, the Employee agrees not to solicit employees, clients, or vendors of the Company or engage with competing businesses in a similar capacity.\n\n4. RETURN OF ASSETS & DATA:\nUpon separation from the Company, the Employee shall immediately return all devices, storage media, tokens, and documents containing confidential information.\n\nSigned and agreed to by:\nEmployee Name: {{employee_name}}\nEmployee Code: {{employee_code}}\nDate: {{current_date}}`,
    terms_and_conditions: 'This agreement remains in full legal force during and following the termination of employment.',
    is_default: true,
    is_active: true,
  },
  {
    id: 6,
    template_name: 'Corporate Code of Conduct & Workplace Ethics',
    template_code: 'CODE_CONDUCT_STD',
    letter_category: 'onboarding',
    letter_type: 'code_of_conduct',
    subject: 'Code of Conduct, Ethics & Workplace Compliance Undertaking',
    body_content: `CODE OF CONDUCT & WORKPLACE ETHICS UNDERTAKING\n\nI, {{employee_name}}, Employee Code: {{employee_code}}, working as {{designation_name}} in the {{department_name}} department at {{company_name}}, do hereby acknowledge and undertake the following:\n\n1. PROFESSIONAL INTEGRITY & ETHICS:\nI shall conduct all business affairs with the utmost integrity, honesty, and transparency, ensuring full compliance with applicable laws, anti-corruption policies, and corporate governance norms.\n\n2. EQUAL OPPORTUNITY & POSH COMPLIANCE:\nI will respect diversity and maintain a harassment-free workplace in strict accordance with the Prevention of Sexual Harassment (POSH) Act and the Company's Zero Tolerance Policy.\n\n3. CONFLICT OF INTEREST & DUAL EMPLOYMENT:\nI will not engage in any dual employment, moonlighting, freelance contracts, or personal business that conflicts with my fiduciary duties to {{company_name}}.\n\n4. IT ASSET USAGE & CYBERSECURITY:\nI will strictly adhere to the Company Information Security Policy, using IT infrastructure solely for authorized business purposes and preventing unauthorized software installations.\n\nI confirm that I have read, understood, and agree to abide by these provisions throughout my tenure at {{company_name}}.`,
    is_default: true,
    is_active: true,
  },

  // Stage 3: During Employment
  {
    id: 7,
    template_name: 'Service Confirmation Letter (Probation Clearance)',
    template_code: 'CONFIRM_LETTER_STD',
    letter_category: 'employment',
    letter_type: 'confirmation',
    subject: 'Confirmation of Employment - {{employee_name}} [{{employee_code}}]',
    body_content: `Dear {{employee_name}},\n\nSub: Confirmation of Service\n\nWe are pleased to inform you that you have successfully completed your probation period with {{company_name}}.\n\nFollowing a comprehensive assessment of your performance, dedication, and conduct, the Management is pleased to confirm your appointment as a permanent employee in the role of {{designation_name}} in the {{department_name}} department, with effect from {{confirmation_date}}.\n\nAll other terms and conditions of your employment as set out in your Letter of Appointment dated {{date_of_joining}} shall continue to apply.\n\nWe take this opportunity to appreciate your contributions thus far and look forward to your continued dedication toward the success of {{company_name}}.\n\nPlease accept our warmest congratulations.`,
    is_default: true,
    is_active: true,
  },
  {
    id: 8,
    template_name: 'Annual Compensation Increment & Revision Letter',
    template_code: 'INCR_LETTER_STD',
    letter_category: 'employment',
    letter_type: 'increment',
    subject: 'Annual Performance Appraisal & Compensation Revision - {{company_name}}',
    body_content: `Dear {{employee_name}},\n\nSub: Salary Revision & Annual Appraisal\n\nIn recognition of your performance, valuable contributions, and achievements during the financial year {{financial_year}}, the Management of {{company_name}} is pleased to revise your compensation structure.\n\nThe revision details are as follows:\n• Current Annual CTC: {{currency}} {{current_ctc}}\n• Revised Annual CTC: {{currency}} {{revised_ctc}}\n• Increment Percentage: {{increment_percentage}}%\n• Increment Quantum: {{currency}} {{increment_amount}}\n• Effective Date: {{effective_date}}\n\nYour revised monthly compensation will be credited from the payroll cycle of {{effective_date}}. Detailed annexures detailing your revised salary components will be available in your Employee Self-Service Portal.\n\nWe commend your dedication and look forward to your continued excellence and leadership in the coming year.`,
    is_default: true,
    is_active: true,
  },
  {
    id: 9,
    template_name: 'Promotion & Role Elevation Letter',
    template_code: 'PROMO_LETTER_STD',
    letter_category: 'employment',
    letter_type: 'promotion',
    subject: 'Congratulations on Your Promotion to {{new_designation}}',
    body_content: `Dear {{employee_name}},\n\nSub: Promotion to {{new_designation}}\n\nOn behalf of the Leadership and Management of {{company_name}}, we are delighted to announce your promotion from {{old_designation}} to the elevated position of {{new_designation}} in the {{department_name}} department, effective {{effective_date}}.\n\nThis elevation is in recognition of your exceptional professional competence, exemplary leadership, and consistent track record of high-impact delivery.\n\nKey details of your revised role:\n• Revised Designation: {{new_designation}}\n• Elevated Grade: {{grade_band}}\n• Revised Annual CTC: {{currency}} {{revised_ctc}}\n• Effective Date: {{effective_date}}\n• Reporting Authority: {{reporting_manager}}\n\nWith this promotion comes greater responsibility and opportunity to shape our strategic objectives. We have full faith in your leadership capabilities and wish you resounding success in your new role.\n\nCongratulations once again!`,
    is_default: true,
    is_active: true,
  },
  {
    id: 10,
    template_name: 'Formal Disciplinary & Performance Warning Letter',
    template_code: 'WARN_LETTER_STD',
    letter_category: 'employment',
    letter_type: 'warning',
    subject: 'Formal Warning Letter - Performance / Disciplinary Notice',
    body_content: `PRIVATE & CONFIDENTIAL\n\nTo: {{employee_name}} (Employee Code: {{employee_code}})\nDesignation: {{designation_name}}, Department: {{department_name}}\n\nSub: Formal Disciplinary / Performance Warning Notice\n\nThis letter serves as a formal written warning regarding concerns related to your workplace performance / adherence to corporate policy that occurred on or around {{incident_date}}.\n\nSpecific Concerns Noted:\n{{violation_details}}\n\nCorrective Actions Required:\n{{corrective_action}}\n\nPlease note that {{company_name}} places high value on adherence to quality standards and company guidelines. You are hereby placed on close observation for the next 30 days.\n\nFailure to demonstrate significant and sustained improvement within this period may result in further disciplinary measures up to and including termination of employment in accordance with company policy.\n\nYou may submit your written explanation regarding the above matter within 48 hours of receipt of this notice.`,
    is_default: true,
    is_active: true,
  },
  {
    id: 11,
    template_name: 'Custom Corporate Letter / General Memorandum',
    template_code: 'CUSTOM_LETTER_STD',
    letter_category: 'employment',
    letter_type: 'custom',
    subject: 'Official Communication - {{company_name}}',
    body_content: `Dear {{employee_name}},\n\nSub: Official Communication\n\nThis communication is issued by {{company_name}} regarding your employment and service records.\n\n[Add your customized body paragraphs here using merge codes from the right sidebar]\n\nShould you have any inquiries regarding this letter, please reach out to the Human Resources department at {{company_email}}.`,
    is_default: true,
    is_active: true,
  },

  // Stage 4: Exit
  {
    id: 12,
    template_name: 'Resignation Acceptance & Exit Notice Period Letter',
    template_code: 'RESIGN_ACCEPT_STD',
    letter_category: 'exit',
    letter_type: 'resignation_acceptance',
    subject: 'Acceptance of Resignation - {{employee_name}} [{{employee_code}}]',
    body_content: `Dear {{employee_name}},\n\nSub: Acceptance of Resignation\n\nWe acknowledge receipt of your resignation email/letter dated {{resignation_date}} from the post of {{designation_name}} in the {{department_name}} department at {{company_name}}.\n\nWe hereby formally accept your resignation. In accordance with your employment terms, your separation will proceed as follows:\n• Resignation Submission Date: {{resignation_date}}\n• Applicable Notice Period: {{notice_period}}\n• Official Last Working Day (LWD): {{last_working_day}}\n\nYou are requested to ensure a smooth, comprehensive handover of all project deliverables, knowledge transfer documents, and responsibilities to {{reporting_manager}}.\n\nKindly hand over all company assets (laptop, access cards, corporate tokens, etc.) to the IT and Admin departments before your Last Working Day. Your Full & Final Settlement (F&F), along with your Relieving and Experience certificates, will be processed in accordance with the standard exit cycle.\n\nWe thank you for your service to {{company_name}} and wish you the best in your future endeavors.`,
    is_default: true,
    is_active: true,
  },
  {
    id: 13,
    template_name: 'Official Relieving Order & Clearance Letter',
    template_code: 'RELIEVING_ORDER_STD',
    letter_category: 'exit',
    letter_type: 'relieving',
    subject: 'Relieving Order & Clearance Certificate - {{employee_name}}',
    body_content: `TO WHOMSOEVER IT MAY CONCERN\n\nSub: Relieving Order\n\nThis is to certify that {{employee_name}} (Employee Code: {{employee_code}}) was employed with {{company_name}} from {{date_of_joining}} to {{last_working_day}}.\n\nAt the time of separation, {{employee_name}} was working as {{designation_name}} in the {{department_name}} department.\n\nPursuant to the acceptance of resignation, {{employee_name}} has completed all departmental clearance formalities, handed over assigned responsibilities, and is hereby officially relieved from duties at {{company_name}} at the close of business hours on {{last_working_day}}.\n\nWe confirm that there are no pending company dues or asset clearances outstanding.\n\nWe wish {{employee_name}} every success in all future professional endeavors.`,
    is_default: true,
    is_active: true,
  },
  {
    id: 14,
    template_name: 'Certificate of Service & Work Experience Letter',
    template_code: 'EXP_CERT_STD',
    letter_category: 'exit',
    letter_type: 'experience',
    subject: 'Experience & Service Certificate - {{employee_name}}',
    body_content: `TO WHOMSOEVER IT MAY CONCERN\n\nEXPERIENCE & SERVICE CERTIFICATE\n\nThis is to certify that {{employee_name}} (Employee Code: {{employee_code}}) was a full-time employee of {{company_name}} from {{date_of_joining}} to {{last_working_day}}, completing a total tenure of {{total_tenure}}.\n\nDuring the tenure with us, {{employee_name}} served with distinction in the following capacity:\n• Primary Department: {{department_name}}\n• Final Designation: {{designation_name}}\n• Corporate Grade: {{grade_band}}\n• Base Location: {{location_name}}\n\nThroughout the association, {{employee_name}} was found to be hardworking, competent, and professional in demeanor. We have appreciated their contributions to our team and client engagements.\n\nThis certificate is issued at the request of the employee without any liability on the part of the Company.\n\nWe wish {{employee_name}} all the very best in future career aspirations.`,
    is_default: true,
    is_active: true,
  },
];

export const PRESEEDED_OFFER_TEMPLATES = DEFAULT_FRONTEND_TEMPLATES;

export const LETTER_STAGE_CONFIG: Record<LetterCategory, {
  label: string;
  desc: string;
  icon: any;
  color: string;
  types: { id: string; name: string; desc: string }[];
}> = {
  hiring: {
    label: '1. Hiring & Selection',
    desc: 'Pre-onboarding candidate communications, interview schedules & offer agreements',
    icon: Sparkles,
    color: 'indigo',
    types: [
      { id: 'interview_call', name: 'Interview Call Letter', desc: 'Formal interview invitation with venue, panel & instructions' },
      { id: 'intent_to_offer', name: 'Intent to Offer (LOI)', desc: 'Short notice expressing intent to extend formal employment offer' },
      { id: 'offer_letter', name: 'Corporate Offer Letter', desc: 'Legally binding offer with structured CTC, role details & validity' },
    ],
  },
  onboarding: {
    label: '2. Onboarding Stage',
    desc: 'Official contracts, non-disclosure agreements & corporate ethics compliance',
    icon: ShieldCheck,
    color: 'emerald',
    types: [
      { id: 'appointment', name: 'Appointment Letter', desc: 'Comprehensive employment contract detailing duties, probation & CTC' },
      { id: 'nda', name: 'Non-Disclosure (NDA)', desc: 'Strict trade secret, client data & proprietary information covenants' },
      { id: 'code_of_conduct', name: 'Code of Conduct', desc: 'Workplace ethics, POSH compliance & corporate standards undertaking' },
    ],
  },
  employment: {
    label: '3. During Employment',
    desc: 'Probation clearances, annual appraisals, promotions & disciplinary records',
    icon: Briefcase,
    color: 'blue',
    types: [
      { id: 'confirmation', name: 'Confirmation Letter', desc: 'Permanent employment confirmation upon probation completion' },
      { id: 'increment', name: 'Appraisal / Increment Letter', desc: 'Salary revision, performance rating & revised compensation' },
      { id: 'promotion', name: 'Promotion Letter', desc: 'Role elevation, designation change, new grade band & revised CTC' },
      { id: 'warning', name: 'Warning / Disciplinary Notice', desc: 'Formal warning for policy non-compliance or performance issues' },
      { id: 'custom', name: 'General Memorandum', desc: 'Custom organizational announcements and service letters' },
    ],
  },
  exit: {
    label: '4. Exit & Separation',
    desc: 'Resignation acceptance, formal clearance orders & experience certifications',
    icon: Calendar,
    color: 'rose',
    types: [
      { id: 'resignation_acceptance', name: 'Resignation Acceptance', desc: 'Formal acceptance with last working day (LWD) schedule' },
      { id: 'relieving', name: 'Relieving Letter', desc: 'Confirmation of clearance, asset return & formal release from duties' },
      { id: 'experience', name: 'Experience Certificate', desc: 'Service proof showing total tenure, roles held & conduct record' },
    ],
  },
};

// All available merge tags grouped by domain
export const ALL_MERGE_CODES = [
  { code: '{{candidate_name}}', label: 'Candidate Full Name', category: 'Candidate', stages: ['hiring'] },
  { code: '{{candidate_email}}', label: 'Candidate Email Address', category: 'Candidate', stages: ['hiring'] },
  { code: '{{candidate_phone}}', label: 'Candidate Contact Number', category: 'Candidate', stages: ['hiring'] },
  { code: '{{interview_date}}', label: 'Interview Scheduled Date', category: 'Interview', stages: ['hiring'] },
  { code: '{{interview_time}}', label: 'Interview Scheduled Time', category: 'Interview', stages: ['hiring'] },
  { code: '{{interview_venue}}', label: 'Interview Venue / Link', category: 'Interview', stages: ['hiring'] },
  { code: '{{interviewer_name}}', label: 'Interviewer / Panel Name', category: 'Interview', stages: ['hiring'] },
  { code: '{{position_title}}', label: 'Position / Job Title', category: 'Role', stages: ['hiring', 'onboarding'] },
  { code: '{{department_name}}', label: 'Department Name', category: 'Role', stages: ['hiring', 'onboarding', 'employment', 'exit'] },
  { code: '{{designation_name}}', label: 'Current Designation', category: 'Role', stages: ['hiring', 'onboarding', 'employment', 'exit'] },
  { code: '{{grade_band}}', label: 'Corporate Grade / Level', category: 'Role', stages: ['hiring', 'onboarding', 'employment', 'exit'] },
  { code: '{{work_model}}', label: 'Work Model (Onsite/Hybrid)', category: 'Role', stages: ['hiring', 'onboarding'] },
  { code: '{{office_location}}', label: 'Base Office Location', category: 'Role', stages: ['hiring', 'onboarding', 'employment'] },
  { code: '{{reporting_manager}}', label: 'Reporting Manager Name', category: 'Role', stages: ['hiring', 'onboarding', 'employment'] },
  
  { code: '{{cost_to_company}}', label: 'Annual Cost to Company (CTC)', category: 'Compensation', stages: ['hiring', 'onboarding'] },
  { code: '{{base_salary}}', label: 'Annual Basic Salary', category: 'Compensation', stages: ['hiring', 'onboarding'] },
  { code: '{{currency}}', label: 'Currency (INR / USD / EUR)', category: 'Compensation', stages: ['hiring', 'onboarding', 'employment'] },
  { code: '{{offer_start_date}}', label: 'Target Joining Date', category: 'Dates', stages: ['hiring'] },
  { code: '{{offer_expiry_date}}', label: 'Offer Acceptance Deadline', category: 'Dates', stages: ['hiring'] },
  
  { code: '{{employee_name}}', label: 'Employee Full Name', category: 'Employee', stages: ['onboarding', 'employment', 'exit'] },
  { code: '{{employee_code}}', label: 'Official Employee ID', category: 'Employee', stages: ['onboarding', 'employment', 'exit'] },
  { code: '{{employee_email}}', label: 'Employee Work Email', category: 'Employee', stages: ['onboarding', 'employment', 'exit'] },
  { code: '{{date_of_joining}}', label: 'Official Date of Joining', category: 'Employee', stages: ['onboarding', 'employment', 'exit'] },
  { code: '{{probation_period}}', label: 'Probation Period Tenure', category: 'Terms', stages: ['hiring', 'onboarding', 'employment'] },
  { code: '{{notice_period}}', label: 'Notice Period Duration', category: 'Terms', stages: ['hiring', 'onboarding', 'employment', 'exit'] },
  
  { code: '{{confirmation_date}}', label: 'Confirmation Date', category: 'Employment', stages: ['employment'] },
  { code: '{{current_ctc}}', label: 'Current Annual CTC', category: 'Employment', stages: ['employment'] },
  { code: '{{revised_ctc}}', label: 'Revised Annual CTC', category: 'Employment', stages: ['employment'] },
  { code: '{{increment_percentage}}', label: 'Increment Percentage (%)', category: 'Employment', stages: ['employment'] },
  { code: '{{increment_amount}}', label: 'Increment Amount', category: 'Employment', stages: ['employment'] },
  { code: '{{effective_date}}', label: 'Effective Date', category: 'Employment', stages: ['employment'] },
  { code: '{{new_designation}}', label: 'New Designation (Promotion)', category: 'Employment', stages: ['employment'] },
  { code: '{{old_designation}}', label: 'Old Designation', category: 'Employment', stages: ['employment'] },
  { code: '{{incident_date}}', label: 'Incident Date (Warning)', category: 'Employment', stages: ['employment'] },
  { code: '{{violation_details}}', label: 'Violation Details', category: 'Employment', stages: ['employment'] },
  { code: '{{corrective_action}}', label: 'Required Corrective Action', category: 'Employment', stages: ['employment'] },

  { code: '{{resignation_date}}', label: 'Resignation Submission Date', category: 'Exit', stages: ['exit'] },
  { code: '{{last_working_day}}', label: 'Official Last Working Day (LWD)', category: 'Exit', stages: ['exit'] },
  { code: '{{total_tenure}}', label: 'Total Service Tenure', category: 'Exit', stages: ['exit'] },

  { code: '{{company_name}}', label: 'Company Legal Entity Name', category: 'Company', stages: ['hiring', 'onboarding', 'employment', 'exit'] },
  { code: '{{company_address}}', label: 'Company Registered Address', category: 'Company', stages: ['hiring', 'onboarding', 'employment', 'exit'] },
  { code: '{{signatory_name}}', label: 'Authorized Signatory Name', category: 'Company', stages: ['hiring', 'onboarding', 'employment', 'exit'] },
  { code: '{{signatory_designation}}', label: 'Signatory Title', category: 'Company', stages: ['hiring', 'onboarding', 'employment', 'exit'] },
  { code: '{{current_date}}', label: "Today's Date (Formatted)", category: 'System', stages: ['hiring', 'onboarding', 'employment', 'exit'] },
  { code: '{{letter_code}}', label: 'Letter Unique Ref Number', category: 'System', stages: ['hiring', 'onboarding', 'employment', 'exit'] },
];

interface OfferTemplateMasterFormProps {
  onCancel?: () => void;
}

export const OfferTemplateMasterForm: React.FC<OfferTemplateMasterFormProps> = ({ onCancel }) => {
  const { selectedCompanyId } = useCompanyStore();
  
  // Navigation & Category Filter
  const [activeStage, setActiveStage] = useState<LetterCategory>('hiring');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  
  // Templates state initialized with rich defaults
  const [templates, setTemplates] = useState<LetterTemplateRecord[]>(DEFAULT_FRONTEND_TEMPLATES);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Selected template editor state
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplateRecord | null>(DEFAULT_FRONTEND_TEMPLATES[0]);
  const [isNewMode, setIsNewMode] = useState<boolean>(false);

  // Form Fields State
  const [templateName, setTemplateName] = useState(DEFAULT_FRONTEND_TEMPLATES[0].template_name);
  const [templateCode, setTemplateCode] = useState(DEFAULT_FRONTEND_TEMPLATES[0].template_code);
  const [letterCategory, setLetterCategory] = useState<LetterCategory>('hiring');
  const [letterType, setLetterType] = useState('interview_call');
  const [subject, setSubject] = useState(DEFAULT_FRONTEND_TEMPLATES[0].subject);
  const [companyNameOverride, setCompanyNameOverride] = useState('');
  const [companyAddressOverride, setCompanyAddressOverride] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [signatoryName, setSignatoryName] = useState('Priya Sharma');
  const [signatoryDesignation, setSignatoryDesignation] = useState('Director - Human Resources');
  const [bodyContent, setBodyContent] = useState(DEFAULT_FRONTEND_TEMPLATES[0].body_content);
  const [termsAndConditions, setTermsAndConditions] = useState(DEFAULT_FRONTEND_TEMPLATES[0].terms_and_conditions || '');
  const [customClause, setCustomClause] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [isActive, setIsActive] = useState<'Yes' | 'No'>('Yes');
  const [bgvMandatory, setBgvMandatory] = useState(false);
  const [ndaMandatory, setNdaMandatory] = useState(false);
  const [nonCompete, setNonCompete] = useState(false);
  const [relievingLetter, setRelievingLetter] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Preview Dialog State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showLogoUrlInput, setShowLogoUrlInput] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoUrl(base64);
      toast.success('Company logo uploaded successfully!');
    };
    reader.onerror = () => {
      toast.error('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  // Normalize camelCase and snake_case properties from backend
  const normalizeTemplate = (t: any): LetterTemplateRecord => ({
    id: t.id,
    organization_id: t.organization_id || t.organizationId,
    company_id: t.company_id || t.companyId,
    template_name: t.template_name || t.templateName || '',
    template_code: t.template_code || t.templateCode || '',
    letter_category: (t.letter_category || t.letterCategory || 'hiring') as LetterCategory,
    letter_type: t.letter_type || t.letterType || 'offer_letter',
    subject: t.subject || '',
    company_name_override: t.company_name_override || t.companyNameOverride || '',
    company_address_override: t.company_address_override || t.companyAddressOverride || '',
    logo_url: t.logo_url || t.logoUrl || '',
    signatory_name: t.signatory_name || t.signatoryName || 'Priya Sharma',
    signatory_designation: t.signatory_designation || t.signatoryDesignation || 'Director - Human Resources',
    header_html: t.header_html || t.headerHtml || '',
    footer_html: t.footer_html || t.footerHtml || '',
    body_content: t.body_content || t.bodyContent || '',
    terms_and_conditions: t.terms_and_conditions || t.termsAndConditions || '',
    custom_clause: t.custom_clause || t.customClause || '',
    is_default: !!(t.is_default ?? t.isDefault),
    is_active: t.is_active === 1 || t.is_active === true || t.isActive === true || t.is_active === 'Yes' ? 'Yes' : 'No',
    bgv_mandatory: !!(t.bgv_mandatory ?? t.bgvMandatory),
    nda_mandatory: !!(t.nda_mandatory ?? t.ndaMandatory),
    non_compete: !!(t.non_compete ?? t.nonCompete),
    relieving_letter_required: !!(t.relieving_letter_required ?? t.relievingLetterRequired),
  });

  // Fetch templates from API
  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/letters/templates');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        const normalized = res.data.data.map(normalizeTemplate);
        setTemplates(normalized);
        const firstInStage = normalized.find((t: any) => t.letter_category === activeStage) || normalized[0];
        if (firstInStage) {
          handleSelectRecord(firstInStage);
        }
      } else {
        setTemplates(DEFAULT_FRONTEND_TEMPLATES);
        const firstInStage = DEFAULT_FRONTEND_TEMPLATES.find((t: any) => t.letter_category === activeStage) || DEFAULT_FRONTEND_TEMPLATES[0];
        if (firstInStage) {
          handleSelectRecord(firstInStage);
        }
      }
    } catch (err: any) {
      console.warn('Using client-side master templates default', err);
      setTemplates(DEFAULT_FRONTEND_TEMPLATES);
      const firstInStage = DEFAULT_FRONTEND_TEMPLATES.find((t: any) => t.letter_category === activeStage) || DEFAULT_FRONTEND_TEMPLATES[0];
      if (firstInStage) {
        handleSelectRecord(firstInStage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedCompanyId]);

  // When active stage changes, select first matching template
  const handleStageChange = (stage: LetterCategory) => {
    setActiveStage(stage);
    setSelectedTypeFilter('all');
    const matched = templates.find(t => (t.letter_category || (t as any).letterCategory) === stage);
    if (matched) {
      handleSelectRecord(matched);
    } else {
      handleAddNew(stage);
    }
  };

  const handleSelectRecord = (item: LetterTemplateRecord) => {
    setSelectedTemplate(item);
    setIsNewMode(false);
    setTemplateName(item.template_name || (item as any).templateName || '');
    setTemplateCode(item.template_code || (item as any).templateCode || '');
    setLetterCategory((item.letter_category || (item as any).letterCategory || 'hiring') as LetterCategory);
    setLetterType(item.letter_type || (item as any).letterType || 'offer_letter');
    setSubject(item.subject || '');
    setCompanyNameOverride(item.company_name_override || (item as any).companyNameOverride || '');
    setCompanyAddressOverride(item.company_address_override || (item as any).companyAddressOverride || '');
    setLogoUrl(item.logo_url || (item as any).logoUrl || '');
    setSignatoryName(item.signatory_name || (item as any).signatoryName || 'Priya Sharma');
    setSignatoryDesignation(item.signatory_designation || (item as any).signatoryDesignation || 'Director - Human Resources');
    setBodyContent(item.body_content || (item as any).bodyContent || '');
    setTermsAndConditions(item.terms_and_conditions || (item as any).termsAndConditions || '');
    setCustomClause(item.custom_clause || (item as any).customClause || '');
    setIsDefault(!!(item.is_default ?? (item as any).isDefault));
    setIsActive(item.is_active === true || (item as any).isActive === true || item.is_active === 'Yes' ? 'Yes' : 'No');
    setBgvMandatory(!!(item.bgv_mandatory ?? (item as any).bgvMandatory));
    setNdaMandatory(!!(item.nda_mandatory ?? (item as any).ndaMandatory));
    setNonCompete(!!(item.non_compete ?? (item as any).nonCompete));
    setRelievingLetter(!!(item.relieving_letter_required ?? (item as any).relievingLetterRequired));
  };

  const handleAddNew = (stageToUse?: LetterCategory) => {
    const stage = stageToUse || activeStage;
    setIsNewMode(true);
    setSelectedTemplate(null);
    const stageTypes = LETTER_STAGE_CONFIG[stage].types;
    const defaultType = stageTypes[0]?.id || 'custom';
    
    setTemplateName(`New ${stageTypes[0]?.name || 'Letter'} Template`);
    setTemplateCode(`${stage.toUpperCase()}_TPL_${Math.floor(100 + Math.random() * 900)}`);
    setLetterCategory(stage);
    setLetterType(defaultType);
    setSubject(`Subject: ${stageTypes[0]?.name || 'Official Communication'} - {{company_name}}`);
    setCompanyNameOverride('');
    setCompanyAddressOverride('');
    setLogoUrl('');
    setSignatoryName('Priya Sharma');
    setSignatoryDesignation('Director - Human Resources');
    setBodyContent(`Dear {{employee_name}},\n\nWe are pleased to communicate the following regarding your engagement with {{company_name}}.\n\n[Write your customized formal letter content here]`);
    setTermsAndConditions('Governed by standard Corporate Service Regulations.');
    setCustomClause('');
    setIsDefault(false);
    setIsActive('Yes');
    setBgvMandatory(stage === 'hiring');
    setNdaMandatory(stage === 'onboarding');
    setNonCompete(false);
    setRelievingLetter(stage === 'hiring');
  };

  const handleInsertMergeCode = (code: string) => {
    if (!bodyRef.current) {
      setBodyContent(prev => prev + ' ' + code);
      toast.success(`Inserted ${code}`);
      return;
    }
    const start = bodyRef.current.selectionStart;
    const end = bodyRef.current.selectionEnd;
    const text = bodyContent;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    setBodyContent(before + code + after);
    toast.success(`Inserted ${code}`);
    setTimeout(() => {
      if (bodyRef.current) {
        bodyRef.current.focus();
        bodyRef.current.setSelectionRange(start + code.length, start + code.length);
      }
    }, 50);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toast.error('Template Name is required');
      return;
    }
    if (!templateCode.trim()) {
      toast.error('Template Code is required');
      return;
    }
    if (!bodyContent.trim()) {
      toast.error('Body content cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        template_name: templateName.trim(),
        template_code: templateCode.trim().toUpperCase(),
        letter_category: letterCategory,
        letter_type: letterType,
        subject: subject.trim(),
        company_name_override: companyNameOverride.trim() || null,
        company_address_override: companyAddressOverride.trim() || null,
        logo_url: logoUrl.trim() || null,
        signatory_name: signatoryName.trim() || null,
        signatory_designation: signatoryDesignation.trim() || null,
        body_content: bodyContent,
        terms_and_conditions: termsAndConditions.trim() || null,
        custom_clause: customClause.trim() || null,
        is_default: isDefault,
        is_active: isActive === 'Yes',
        bgv_mandatory: bgvMandatory,
        nda_mandatory: ndaMandatory,
        non_compete: nonCompete,
        relieving_letter_required: relievingLetter,
      };

      if (isNewMode || !selectedTemplate?.id) {
        const res = await apiClient.post('/letters/templates', payload);
        toast.success('New letter master template created successfully!');
        if (res.data?.data) {
          await fetchTemplates();
          handleSelectRecord(res.data.data);
        }
      } else {
        const res = await apiClient.put(`/letters/templates/${selectedTemplate.id}`, payload);
        toast.success('Letter template updated successfully!');
        if (res.data?.data) {
          await fetchTemplates();
          handleSelectRecord(res.data.data);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate?.id) return;
    if (!window.confirm(`Are you sure you want to delete template "${selectedTemplate.template_name}"?`)) return;

    try {
      await apiClient.delete(`/letters/templates/${selectedTemplate.id}`);
      toast.success('Template removed successfully');
      setSelectedTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete template');
    }
  };

  // Generate Sample HTML Preview
  const handleOpenPreview = () => {
    const sampleData: Record<string, string> = {
      '{{candidate_name}}': 'Rahul V. Sharma',
      '{{candidate_email}}': 'rahul.sharma@example.com',
      '{{candidate_phone}}': '+91 98765 43210',
      '{{employee_name}}': 'Rahul V. Sharma',
      '{{employee_code}}': 'EMP-2026-0842',
      '{{employee_email}}': 'rahul.sharma@apponext.com',
      '{{date_of_joining}}': '15 March 2026',
      '{{position_title}}': 'Senior Full Stack Lead',
      '{{department_name}}': 'Technology & Enterprise Cloud',
      '{{designation_name}}': 'Lead Software Architect',
      '{{grade_band}}': 'Grade L4 (Principal)',
      '{{work_model}}': 'Hybrid (3 days onsite, 2 days remote)',
      '{{office_location}}': 'Bengaluru Technology Campus',
      '{{reporting_manager}}': 'Ananya Roy (VP of Engineering)',
      '{{cost_to_company}}': '24,50,000',
      '{{base_salary}}': '12,25,000',
      '{{currency}}': 'INR',
      '{{probation_period}}': '3 months',
      '{{notice_period}}': '60 days',
      '{{offer_start_date}}': '01 April 2026',
      '{{offer_expiry_date}}': '15 March 2026',
      '{{interview_date}}': '10 March 2026',
      '{{interview_time}}': '02:30 PM IST',
      '{{interview_venue}}': 'Conference Room 4A / MS Teams',
      '{{interviewer_name}}': 'Technical Evaluation Committee',
      '{{confirmation_date}}': '15 June 2026',
      '{{current_ctc}}': '24,50,000',
      '{{revised_ctc}}': '28,20,000',
      '{{increment_percentage}}': '15.1',
      '{{increment_amount}}': '3,70,000',
      '{{effective_date}}': '01 April 2026',
      '{{new_designation}}': 'Principal Software Architect',
      '{{old_designation}}': 'Lead Software Architect',
      '{{resignation_date}}': '10 August 2026',
      '{{last_working_day}}': '10 October 2026',
      '{{total_tenure}}': '2 Years, 7 Months',
      '{{incident_date}}': '12 August 2026',
      '{{violation_details}}': 'Unscheduled absenteeism and non-adherence to project delivery milestones.',
      '{{corrective_action}}': 'Submit daily project standup logs and adhere to scheduled work hours.',
      '{{company_name}}': companyNameOverride || 'Apponext Technologies Pvt. Ltd.',
      '{{company_address}}': companyAddressOverride || 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, Karnataka 560103',
      '{{signatory_name}}': signatoryName || 'Priya Sharma',
      '{{signatory_designation}}': signatoryDesignation || 'Director - Human Resources',
      '{{current_date}}': new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      '{{letter_code}}': `LTR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    let renderedBody = bodyContent;
    let renderedSubject = subject;
    let renderedTerms = termsAndConditions;
    let renderedCustom = customClause;

    for (const [code, val] of Object.entries(sampleData)) {
      const reg = new RegExp(code.replace(/[{}]/g, '\\$&'), 'g');
      renderedBody = renderedBody.replace(reg, val);
      renderedSubject = renderedSubject.replace(reg, val);
      renderedTerms = renderedTerms.replace(reg, val);
      renderedCustom = renderedCustom.replace(reg, val);
    }

    const fullHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; background: #f8fafc; padding: 24px; color: #1e293b; font-size: 13.5px; line-height: 1.7; }
  .sheet { max-width: 800px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); }
  .top-accent { height: 6px; background: linear-gradient(90deg, #4f46e5, #7c3aed, #2563eb); }
  .sheet-inner { padding: 40px 50px; }
  .header { display: flex; justify-content: space-between; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 25px; }
  .company-title { font-size: 20px; font-weight: 800; color: #0f172a; }
  .company-sub { font-size: 11.5px; color: #64748b; margin-top: 4px; max-width: 340px; }
  .doc-tag { background: #eef2ff; color: #4338ca; font-weight: 700; font-size: 10.5px; padding: 4px 10px; border-radius: 6px; border: 1px solid #c7d2fe; text-transform: uppercase; }
  .subject-line { font-weight: 700; color: #0f172a; margin-bottom: 20px; font-size: 14px; }
  .body-text { white-space: pre-wrap; line-height: 1.85; color: #334155; }
  .box { background: #f8fafc; border-left: 4px solid #4f46e5; padding: 14px 18px; border-radius: 0 6px 6px 0; margin: 20px 0; font-size: 12px; color: #475569; }
  .box-title { font-weight: 700; color: #1e293b; margin-bottom: 4px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
  .signs { margin-top: 40px; display: flex; justify-content: space-between; padding-top: 20px; }
  .sign-box { min-width: 200px; }
  .sign-line { border-top: 1.5px dashed #94a3b8; margin-top: 45px; padding-top: 8px; }
  .footer { border-top: 1px solid #f1f5f9; margin-top: 35px; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<div class="sheet">
  <div class="top-accent"></div>
  <div class="sheet-inner">
    <div class="header">
      <div>
        ${logoUrl ? `<img src="${logoUrl}" style="max-height:48px; margin-bottom:6px;" alt="Logo" />` : ''}
        <div class="company-title">${companyNameOverride || 'Apponext Technologies Pvt. Ltd.'}</div>
        <div class="company-sub">${companyAddressOverride || 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103'}</div>
      </div>
      <div style="text-align: right;">
        <div class="doc-tag">OFFICIAL COMMUNICATION</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 8px;">Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>

    ${renderedSubject ? `<div class="subject-line">${renderedSubject}</div>` : ''}
    <div class="body-text">${renderedBody}</div>

    ${renderedTerms ? `
    <div class="box">
      <div class="box-title">Key Terms & Compliance Stipulations</div>
      <div>${renderedTerms}</div>
    </div>` : ''}

    ${renderedCustom ? `
    <div class="box" style="border-left-color: #0ea5e9;">
      <div class="box-title">Additional Clauses & Validity</div>
      <div>${renderedCustom}</div>
    </div>` : ''}

    <div class="signs">
      <div class="sign-box">
        <div class="sign-line">
          <div style="font-weight: 700; color: #0f172a;">${signatoryName || 'Authorized Signatory'}</div>
          <div style="font-size: 12px; color: #64748b;">${signatoryDesignation || 'Director - Human Resources'}</div>
          <div style="font-size: 11px; color: #94a3b8;">${companyNameOverride || 'Apponext Technologies'}</div>
        </div>
      </div>
      <div class="sign-box" style="text-align: right;">
        <div class="sign-line">
          <div style="font-weight: 700; color: #0f172a;">Recipient Acceptance / Signature</div>
          <div style="font-size: 12px; color: #64748b;">Digitally Acknowledged & Accepted</div>
          <div style="font-size: 11px; color: #94a3b8;">Date: __________________</div>
        </div>
      </div>
    </div>

    <div class="footer">
      This is a confidential corporate document generated by ${companyNameOverride || 'Apponext Technologies'} HRMS.<br/>
      Strictly Private & Confidential • Authorized Personnel Only
    </div>
  </div>
</div>
</body>
</html>`;

    setPreviewHtml(fullHtml);
    setIsPreviewOpen(true);
  };

  // Filter templates list
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchStage = (t.letter_category || (t as any).letterCategory) === activeStage;
      const matchType = selectedTypeFilter === 'all' || (t.letter_type || (t as any).letterType) === selectedTypeFilter;
      const name = t.template_name || (t as any).templateName || '';
      const code = t.template_code || (t as any).templateCode || '';
      const subj = t.subject || '';
      const matchSearch = !searchQuery.trim() || 
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        subj.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStage && matchType && matchSearch;
    });
  }, [templates, activeStage, selectedTypeFilter, searchQuery]);

  // Applicable merge codes for current stage
  const availableMergeCodes = useMemo(() => {
    return ALL_MERGE_CODES.filter(c => c.stages.includes(activeStage) || c.stages.includes('all' as any));
  }, [activeStage]);

  return (
    <div className="w-full space-y-6">
      {/* Header & Stage Tabs */}
      <div className="bg-background dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-foreground dark:text-white tracking-tight">
                  MNC Letter & Document Template Master
                </h1>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground/70 mt-0.5">
                  Configure corporate formats, company branding letterheads, dynamic merge tags & legal covenants across all 4 lifecycle stages.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchTemplates}
              disabled={isLoading}
              className="rounded-xl h-9 text-xs font-semibold"
            >
              <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isLoading && "animate-spin")} />
              Sync Master
            </Button>

            <Button
              type="button"
              onClick={() => handleAddNew(activeStage)}
              className="rounded-xl h-9 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New Template
            </Button>
          </div>
        </div>

        {/* 4 Lifecycle Stage Selector Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
          {(Object.keys(LETTER_STAGE_CONFIG) as LetterCategory[]).map((stageKey) => {
            const stage = LETTER_STAGE_CONFIG[stageKey];
            const Icon = stage.icon;
            const isSelected = activeStage === stageKey;
            const count = templates.filter(t => (t.letter_category || (t as any).letterCategory) === stageKey).length;

            return (
              <button
                key={stageKey}
                type="button"
                onClick={() => handleStageChange(stageKey)}
                className={cn(
                  "p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between",
                  isSelected
                    ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-500/20"
                    : "bg-muted/30/60 dark:bg-slate-800/40 border-border/60/80 dark:border-slate-800 hover:bg-background dark:hover:bg-slate-800 hover:border-border"
                )}
              >
                <div className="flex items-center justify-between w-full mb-2">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-muted dark:bg-slate-700 text-foreground dark:text-slate-300"
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={cn(
                    "text-[11px] font-black px-2 py-0.5 rounded-full",
                    isSelected
                      ? "bg-indigo-600 text-white"
                      : "bg-muted dark:bg-slate-700 text-muted-foreground dark:text-slate-300"
                  )}>
                    {count}
                  </span>
                </div>
                <div>
                  <div className={cn("text-xs font-extrabold", isSelected ? "text-indigo-950 dark:text-indigo-200" : "text-foreground dark:text-white")}>
                    {stage.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground dark:text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
                    {stage.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Template Selector & Sub-Filters (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-background dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-muted-foreground/70" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl border-border/60 dark:border-slate-800"
              />
            </div>

            {/* Letter Type Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setSelectedTypeFilter('all')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors border",
                  selectedTypeFilter === 'all'
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-muted/30 dark:bg-slate-800 text-muted-foreground dark:text-slate-300 border-border/60 dark:border-slate-700 hover:bg-muted/50"
                )}
              >
                All ({filteredTemplates.length})
              </button>
              {LETTER_STAGE_CONFIG[activeStage].types.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTypeFilter(t.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors border",
                    selectedTypeFilter === t.id
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-muted/30 dark:bg-slate-800 text-muted-foreground dark:text-slate-300 border-border/60 dark:border-slate-700 hover:bg-muted/50"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>

            {/* Template Cards List */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1 pt-2">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/70 text-xs">
                  No templates found in this category.
                  <div className="mt-2">
                    <Button size="sm" variant="outline" onClick={() => handleAddNew(activeStage)} className="text-xs rounded-xl">
                      Create First Template
                    </Button>
                  </div>
                </div>
              ) : (
                filteredTemplates.map((item) => {
                  const isSelected = selectedTemplate?.id === item.id && !isNewMode;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectRecord(item)}
                      className={cn(
                        "p-3.5 rounded-xl border transition-all duration-150 cursor-pointer relative group",
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-300 dark:border-indigo-800 shadow-xs ring-1 ring-indigo-500/20"
                          : "bg-background dark:bg-slate-900 border-border/60/80 dark:border-slate-800 hover:border-indigo-200 hover:bg-muted/30/60 dark:hover:bg-slate-800/40"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9.5px] font-extrabold px-1.5 py-0.5 rounded bg-muted/50 dark:bg-slate-800 text-muted-foreground dark:text-slate-300 border border-border/60 dark:border-slate-700">
                              {item.template_code}
                            </span>
                            {item.is_default && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                Default
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold text-foreground dark:text-white mt-1 truncate">
                            {item.template_name}
                          </h4>
                          <p className="text-[11px] text-muted-foreground dark:text-muted-foreground/70 mt-0.5 truncate">
                            {item.subject || 'No subject line specified'}
                          </p>
                        </div>
                        <ChevronRight className={cn("w-4 h-4 shrink-0 transition-transform", isSelected ? "text-indigo-600 translate-x-0.5" : "text-slate-300 opacity-0 group-hover:opacity-100")} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Merge Code Toolbar Quick Reference Card */}
          <div className="bg-background dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-foreground dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Dynamic Merge Tags</span>
              </span>
              <span className="text-[10.5px] text-muted-foreground/70">Click to insert in editor</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {availableMergeCodes.map((code) => (
                <button
                  key={code.code}
                  type="button"
                  onClick={() => handleInsertMergeCode(code.code)}
                  title={`${code.label} (${code.category})`}
                  className="px-2 py-1 bg-muted/30 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300 text-foreground dark:text-slate-300 rounded-lg text-[10.5px] font-mono border border-border/60 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{code.code}</span>
                  <Plus className="w-2.5 h-2.5 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Full Template Designer Form (8 cols) */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSave} className="bg-background dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            
            {/* Form Header Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 uppercase tracking-wide">
                    {isNewMode ? 'Creating New Template' : 'Editing Master Template'}
                  </span>
                  <span className="text-xs text-muted-foreground/70 font-mono">
                    Category: {activeStage.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-foreground dark:text-white mt-1">
                  {templateName || 'Untitled Template'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPreview}
                  className="h-8 text-xs font-bold rounded-xl flex items-center gap-1.5 border-border/60 dark:border-slate-700"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Letterhead Preview</span>
                </Button>

                {!isNewMode && selectedTemplate && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    className="h-8 text-xs font-bold rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    <span>Delete</span>
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={isSaving}
                  className="h-8 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  <span>{isSaving ? 'Saving...' : 'Save Template'}</span>
                </Button>
              </div>
            </div>

            {/* Template Core Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground dark:text-slate-300">
                  Template Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Standard Corporate Offer Letter"
                  className="h-9 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground dark:text-slate-300">
                  Template Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={templateCode}
                  onChange={(e) => setTemplateCode(e.target.value.toUpperCase())}
                  placeholder="e.g. OFFER_STD_CORP"
                  className="h-9 text-xs font-mono font-bold rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground dark:text-slate-300">
                  Document Type
                </Label>
                <select
                  value={letterType}
                  onChange={(e) => setLetterType(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl border border-border/60 dark:border-slate-800 bg-background dark:bg-slate-900 font-semibold"
                >
                  {LETTER_STAGE_CONFIG[activeStage].types.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  <option value="custom">Custom Template</option>
                </select>
              </div>
            </div>

            {/* Subject Line */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground dark:text-slate-300 flex items-center justify-between">
                <span>Subject Line</span>
                <span className="text-[11px] font-normal text-muted-foreground/70">Supports merge codes</span>
              </Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Formal Letter of Offer - {{company_name}} [{{position_title}}]"
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* Company Branding & Letterhead Customization */}
            <div className="p-4 bg-muted/30/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-foreground dark:text-white flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Company Branding & Letterhead Authority</span>
                </span>
                <span className="text-[10.5px] text-muted-foreground/70">Overrides global defaults if specified</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground dark:text-muted-foreground/70">Company Legal Name</Label>
                  <Input
                    value={companyNameOverride}
                    onChange={(e) => setCompanyNameOverride(e.target.value)}
                    placeholder="Apponext Technologies Pvt. Ltd."
                    className="h-8 text-xs rounded-lg bg-background dark:bg-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground dark:text-muted-foreground/70">
                      Company Logo (Letterhead)
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowLogoUrlInput(!showLogoUrlInput)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                    >
                      {showLogoUrlInput ? 'Upload Image File' : 'Enter URL instead'}
                    </button>
                  </div>

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />

                  {showLogoUrlInput ? (
                    <Input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://.../logo.png"
                      className="h-8 text-xs rounded-lg bg-background dark:bg-slate-900"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-1.5 bg-background dark:bg-slate-900 border border-border/60 dark:border-slate-800 rounded-lg min-h-[34px]">
                      {logoUrl ? (
                        <div className="flex items-center justify-between w-full gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded border border-border/60 bg-muted/30 flex items-center justify-center p-0.5 overflow-hidden shrink-0">
                              <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                            </div>
                            <div className="truncate text-[11px]">
                              <span className="font-bold text-foreground dark:text-white">Logo Attached</span>
                              <span className="text-emerald-600 text-[10px] ml-1.5 font-semibold">Active</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => logoInputRef.current?.click()}
                              className="h-6 px-2 text-[10px] font-bold rounded"
                            >
                              Change
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setLogoUrl('')}
                              className="h-6 px-1.5 text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          onClick={() => logoInputRef.current?.click()}
                          className="w-full flex items-center justify-center gap-1.5 py-1 px-2 border border-dashed border-border dark:border-slate-700 rounded cursor-pointer hover:bg-muted/30 dark:hover:bg-slate-800/60 transition-colors text-muted-foreground dark:text-slate-300"
                        >
                          <Upload className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-[11px] font-semibold">
                            Upload Logo (PNG / JPG / SVG)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground dark:text-muted-foreground/70">Signatory Full Name</Label>
                  <Input
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="h-8 text-xs rounded-lg bg-background dark:bg-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground dark:text-muted-foreground/70">Signatory Title / Designation</Label>
                  <Input
                    value={signatoryDesignation}
                    onChange={(e) => setSignatoryDesignation(e.target.value)}
                    placeholder="e.g. Director - Human Resources"
                    className="h-8 text-xs rounded-lg bg-background dark:bg-slate-900"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground dark:text-muted-foreground/70">Registered Office Address</Label>
                  <Input
                    value={companyAddressOverride}
                    onChange={(e) => setCompanyAddressOverride(e.target.value)}
                    placeholder="Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, Karnataka 560103"
                    className="h-8 text-xs rounded-lg bg-background dark:bg-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Letter Body Content */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground dark:text-slate-300">
                  Body Content & Letter Clauses <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground/70">
                  Line breaks and formatted paragraphs are preserved
                </span>
              </div>
              <textarea
                ref={bodyRef}
                value={bodyContent}
                onChange={(e) => setBodyContent(e.target.value)}
                rows={12}
                placeholder="Write the full letter body here using dynamic merge codes..."
                className="w-full p-4 text-xs font-sans rounded-xl border border-border/60 dark:border-slate-800 bg-background dark:bg-slate-900 text-foreground dark:text-white leading-relaxed focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                required
              />
            </div>

            {/* Key Terms & Conditions Annexure */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground dark:text-slate-300">
                Key Terms & Compliance Stipulations (Annexure Box)
              </Label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                rows={3}
                placeholder="Special terms, probation conditions, notice period stipulations, or non-compete clauses..."
                className="w-full p-3 text-xs rounded-xl border border-border/60 dark:border-slate-800 bg-background dark:bg-slate-900 leading-relaxed"
              />
            </div>

            {/* Legal Covenants & Compliance Checkboxes */}
            <div className="p-4 bg-muted/30/60 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
              <span className="text-xs font-extrabold text-foreground dark:text-white block">
                Required Pre-requisites & Legal Covenants
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bgvMandatory}
                    onChange={(e) => setBgvMandatory(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>BGV Mandatory</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ndaMandatory}
                    onChange={(e) => setNdaMandatory(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>NDA Required</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nonCompete}
                    onChange={(e) => setNonCompete(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Non-Compete</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={relievingLetter}
                    onChange={(e) => setRelievingLetter(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Relieving Letter Req.</span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-border/60/60 dark:border-slate-700/60">
                <label className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Set as Default Master Template for this Letter Type</span>
                </label>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground dark:text-muted-foreground/70">Status:</span>
                  <button
                    type="button"
                    onClick={() => setIsActive(isActive === 'Yes' ? 'No' : 'Yes')}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer border",
                      isActive === 'Yes'
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-muted/50 text-muted-foreground border-border/60"
                    )}
                  >
                    {isActive === 'Yes' ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>
            </div>

            {/* Form Actions Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="h-9 px-4 text-xs font-semibold rounded-xl">
                  Close
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleOpenPreview}
                className="h-9 px-4 text-xs font-bold rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                Preview MNC Format
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                <Check className="w-3.5 h-3.5 mr-1.5" />
                {isSaving ? 'Saving Master...' : 'Save & Publish Template'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Live Letterhead Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <DialogTitle className="text-base font-extrabold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Live Letterhead Preview with Merged Data</span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rendered with simulated candidate / employee profile parameters and company letterhead branding.
              </p>
            </div>
          </DialogHeader>

          <div className="py-2">
            <iframe
              srcDoc={previewHtml}
              title="Letterhead Preview"
              className="w-full h-[600px] border border-border/60 rounded-xl shadow-inner bg-background"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground/70">
              Format: High-standard MNC Corporate Letterhead layout
            </span>
            <Button
              type="button"
              onClick={() => setIsPreviewOpen(false)}
              className="h-8 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
