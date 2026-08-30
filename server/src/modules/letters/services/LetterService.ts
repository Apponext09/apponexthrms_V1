import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../db/knex';
import { logger } from '../../../common/lib/logger';
import { DEFAULT_MNC_LETTER_TEMPLATES } from '../constants/defaultTemplates';

// ────────────────────────────────────────────────────────────────
// MERGE CODES — categorized by letter stage + universal codes
// ────────────────────────────────────────────────────────────────
export const LETTER_MERGE_CODES: Record<string, { code: string; label: string; category: string }[]> = {
  // Universal codes available in ALL letter types
  universal: [
    { code: '{{company_name}}', label: 'Company Legal Name', category: 'Company' },
    { code: '{{company_address}}', label: 'Company Registered Address', category: 'Company' },
    { code: '{{company_phone}}', label: 'Company Contact Number', category: 'Company' },
    { code: '{{company_email}}', label: 'Company HR Email', category: 'Company' },
    { code: '{{company_website}}', label: 'Company Website URL', category: 'Company' },
    { code: '{{company_cin}}', label: 'Company CIN Number', category: 'Company' },
    { code: '{{company_logo_url}}', label: 'Company Logo Image URL', category: 'Company' },
    { code: '{{signatory_name}}', label: 'Authorized Signatory Name', category: 'Company' },
    { code: '{{signatory_designation}}', label: 'Authorized Signatory Title', category: 'Company' },
    { code: '{{current_date}}', label: "Today's Date (DD/MM/YYYY)", category: 'System' },
    { code: '{{current_date_long}}', label: "Today's Date (e.g. 26 August 2026)", category: 'System' },
    { code: '{{financial_year}}', label: 'Current Financial Year (e.g. 2026-2027)', category: 'System' },
    { code: '{{letter_code}}', label: 'Letter Unique Ref Number', category: 'System' },
  ],

  // Hiring stage — candidate-specific
  hiring: [
    { code: '{{candidate_name}}', label: 'Candidate Full Name', category: 'Candidate' },
    { code: '{{candidate_email}}', label: 'Candidate Email', category: 'Candidate' },
    { code: '{{candidate_phone}}', label: 'Candidate Phone', category: 'Candidate' },
    { code: '{{position_title}}', label: 'Job Position Title', category: 'Role' },
    { code: '{{department_name}}', label: 'Department Name', category: 'Role' },
    { code: '{{designation_name}}', label: 'Designation Name', category: 'Role' },
    { code: '{{grade_band}}', label: 'Corporate Grade / Level', category: 'Role' },
    { code: '{{work_model}}', label: 'Work Model (Onsite/Hybrid/Remote)', category: 'Role' },
    { code: '{{office_location}}', label: 'Office Base Location', category: 'Role' },
    { code: '{{reporting_manager}}', label: 'Reporting Manager Name & Title', category: 'Role' },
    { code: '{{cost_to_company}}', label: 'Annual Cost to Company (CTC)', category: 'Compensation' },
    { code: '{{base_salary}}', label: 'Annual Basic Salary', category: 'Compensation' },
    { code: '{{currency}}', label: 'Currency Code (INR / USD)', category: 'Compensation' },
    { code: '{{joining_bonus}}', label: 'Sign-on / Joining Bonus', category: 'Compensation' },
    { code: '{{offer_start_date}}', label: 'Target Joining Date', category: 'Dates' },
    { code: '{{offer_expiry_date}}', label: 'Offer Acceptance Deadline', category: 'Dates' },
    { code: '{{interview_date}}', label: 'Interview Scheduled Date', category: 'Interview' },
    { code: '{{interview_time}}', label: 'Interview Scheduled Time', category: 'Interview' },
    { code: '{{interview_venue}}', label: 'Interview Venue / Meeting Link', category: 'Interview' },
    { code: '{{interviewer_name}}', label: 'Interviewer / Panel Name', category: 'Interview' },
    { code: '{{probation_period}}', label: 'Probation Period Duration', category: 'Terms' },
    { code: '{{notice_period}}', label: 'Notice Period Duration', category: 'Terms' },
  ],

  // Onboarding + Employment + Exit — employee-specific
  employee: [
    { code: '{{employee_name}}', label: 'Employee Full Name', category: 'Employee' },
    { code: '{{employee_code}}', label: 'Official Employee ID / Code', category: 'Employee' },
    { code: '{{employee_email}}', label: 'Official Email Address', category: 'Employee' },
    { code: '{{employee_phone}}', label: 'Contact Phone Number', category: 'Employee' },
    { code: '{{employee_gender}}', label: 'Gender', category: 'Employee' },
    { code: '{{date_of_joining}}', label: 'Official Date of Joining', category: 'Employee' },
    { code: '{{department_name}}', label: 'Assigned Department', category: 'Employee' },
    { code: '{{designation_name}}', label: 'Current Designation Title', category: 'Employee' },
    { code: '{{grade_band}}', label: 'Designated Corporate Grade', category: 'Employee' },
    { code: '{{location_name}}', label: 'Base Location / Branch', category: 'Employee' },
    { code: '{{reporting_manager}}', label: 'Reporting Manager Name & Title', category: 'Employee' },
    { code: '{{employment_type}}', label: 'Employment Type (Full Time / Contract)', category: 'Employee' },
    { code: '{{current_ctc}}', label: 'Current Annualized CTC', category: 'Compensation' },
    { code: '{{revised_ctc}}', label: 'Revised Annualized CTC', category: 'Compensation' },
    { code: '{{increment_percentage}}', label: 'Increment Percentage (%)', category: 'Compensation' },
    { code: '{{increment_amount}}', label: 'Increment Absolute Amount', category: 'Compensation' },
    { code: '{{currency}}', label: 'Currency', category: 'Compensation' },
    { code: '{{new_designation}}', label: 'New Elevated Designation', category: 'Promotion' },
    { code: '{{old_designation}}', label: 'Previous Designation', category: 'Promotion' },
    { code: '{{effective_date}}', label: 'Effective Date of Revision / Promotion', category: 'Dates' },
    { code: '{{confirmation_date}}', label: 'Date of Service Confirmation', category: 'Dates' },
    { code: '{{probation_period}}', label: 'Probation Period Duration', category: 'Terms' },
    { code: '{{notice_period}}', label: 'Applicable Notice Period', category: 'Terms' },
    { code: '{{resignation_date}}', label: 'Resignation Submission Date', category: 'Exit' },
    { code: '{{last_working_day}}', label: 'Official Last Working Day (LWD)', category: 'Exit' },
    { code: '{{total_tenure}}', label: 'Total Service Duration / Tenure', category: 'Exit' },
    { code: '{{incident_date}}', label: 'Disciplinary Incident Date', category: 'Disciplinary' },
    { code: '{{violation_details}}', label: 'Violation / Performance Findings', category: 'Disciplinary' },
    { code: '{{corrective_action}}', label: 'Required Corrective Action Plan', category: 'Disciplinary' },
  ],
};

const LETTER_TYPE_MERGE_MAP: Record<string, string[]> = {
  interview_call: ['universal', 'hiring'],
  intent_to_offer: ['universal', 'hiring'],
  offer_letter: ['universal', 'hiring'],
  appointment: ['universal', 'employee'],
  nda: ['universal', 'employee'],
  code_of_conduct: ['universal', 'employee'],
  confirmation: ['universal', 'employee'],
  increment: ['universal', 'employee'],
  promotion: ['universal', 'employee'],
  warning: ['universal', 'employee'],
  resignation_acceptance: ['universal', 'employee'],
  relieving: ['universal', 'employee'],
  experience: ['universal', 'employee'],
  custom: ['universal', 'hiring', 'employee'],
};

export class LetterService {

  // ──────────────────────────────────────────────────────────
  // AUTO-SEEDING FOR ORGANIZATION
  // ──────────────────────────────────────────────────────────
  private async ensureDefaultTemplates(orgId: number) {
    const existingCount = await db('letter_templates')
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .count('* as total')
      .first();

    if (Number(existingCount?.total || 0) === 0) {
      logger.info(`Seeding ${DEFAULT_MNC_LETTER_TEMPLATES.length} default MNC letter templates for orgId ${orgId}`);
      for (const tpl of DEFAULT_MNC_LETTER_TEMPLATES) {
        await db('letter_templates').insert({
          organization_id: orgId,
          template_name: tpl.template_name,
          template_code: tpl.template_code,
          letter_category: tpl.letter_category,
          letter_type: tpl.letter_type,
          subject: tpl.subject,
          body_content: tpl.body_content,
          terms_and_conditions: tpl.terms_and_conditions || null,
          custom_clause: tpl.custom_clause || null,
          is_default: tpl.is_default,
          is_active: true,
          bgv_mandatory: tpl.bgv_mandatory || false,
          nda_mandatory: tpl.nda_mandatory || false,
          non_compete: tpl.non_compete || false,
          relieving_letter_required: tpl.relieving_letter_required || false,
        }).catch(() => { /* skip duplicates if any */ });
      }
    }
  }

  // ──────────────────────────────────────────────────────────
  // TEMPLATE CRUD
  // ──────────────────────────────────────────────────────────

  async listTemplates(orgId: number, filters?: { letter_type?: string; letter_category?: string; is_active?: boolean }) {
    await this.ensureDefaultTemplates(orgId);

    let query = db('letter_templates')
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .orderBy('letter_category', 'asc')
      .orderBy('letter_type', 'asc')
      .orderBy('template_name', 'asc');

    if (filters?.letter_type) query = query.where('letter_type', filters.letter_type);
    if (filters?.letter_category) query = query.where('letter_category', filters.letter_category);
    if (filters?.is_active !== undefined) query = query.where('is_active', filters.is_active);

    return query;
  }

  async getTemplate(orgId: number, templateId: number) {
    return db('letter_templates')
      .where('organization_id', orgId)
      .where('id', templateId)
      .whereNull('deleted_at')
      .first();
  }

  async createTemplate(orgId: number, data: any, userId?: number) {
    // Check for duplicate template_code
    const existing = await db('letter_templates')
      .where('organization_id', orgId)
      .where('template_code', data.template_code)
      .whereNull('deleted_at')
      .first();

    if (existing) {
      throw new Error(`Template code "${data.template_code}" already exists in this organization.`);
    }

    // If marking as default, unset other defaults for same letter_type
    if (data.is_default) {
      await db('letter_templates')
        .where('organization_id', orgId)
        .where('letter_type', data.letter_type)
        .whereNull('deleted_at')
        .update({ is_default: false });
    }

    const [id] = await db('letter_templates').insert({
      organization_id: orgId,
      company_id: data.company_id || null,
      template_name: data.template_name,
      template_code: data.template_code,
      letter_category: data.letter_category,
      letter_type: data.letter_type,
      subject: data.subject || null,
      header_html: data.header_html || null,
      footer_html: data.footer_html || null,
      logo_url: data.logo_url || null,
      company_name_override: data.company_name_override || null,
      company_address_override: data.company_address_override || null,
      signatory_name: data.signatory_name || null,
      signatory_designation: data.signatory_designation || null,
      body_content: data.body_content,
      terms_and_conditions: data.terms_and_conditions || null,
      custom_clause: data.custom_clause || null,
      merge_codes_used: JSON.stringify(data.merge_codes_used || []),
      is_default: data.is_default || false,
      is_active: data.is_active !== false,
      bgv_mandatory: data.bgv_mandatory || false,
      nda_mandatory: data.nda_mandatory || false,
      non_compete: data.non_compete || false,
      relieving_letter_required: data.relieving_letter_required || false,
      created_by: userId || null,
    });

    return this.getTemplate(orgId, id);
  }

  async updateTemplate(orgId: number, templateId: number, data: any, userId?: number) {
    const existing = await this.getTemplate(orgId, templateId);
    if (!existing) throw new Error('Template not found');

    if (data.template_code && data.template_code !== existing.template_code) {
      const dup = await db('letter_templates')
        .where('organization_id', orgId)
        .where('template_code', data.template_code)
        .whereNot('id', templateId)
        .whereNull('deleted_at')
        .first();
      if (dup) throw new Error(`Template code "${data.template_code}" already exists.`);
    }

    if (data.is_default) {
      await db('letter_templates')
        .where('organization_id', orgId)
        .where('letter_type', data.letter_type || existing.letter_type)
        .whereNot('id', templateId)
        .whereNull('deleted_at')
        .update({ is_default: false });
    }

    const updatePayload: Record<string, any> = {
      updated_by: userId || null,
      updated_at: db.fn.now(),
    };

    const allowedFields = [
      'template_name', 'template_code', 'letter_category', 'letter_type',
      'subject', 'header_html', 'footer_html', 'logo_url',
      'company_name_override', 'company_address_override',
      'signatory_name', 'signatory_designation',
      'body_content', 'terms_and_conditions', 'custom_clause',
      'is_default', 'is_active', 'bgv_mandatory', 'nda_mandatory',
      'non_compete', 'relieving_letter_required', 'company_id'
    ];

    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        updatePayload[key] = data[key];
      }
    }

    if (data.merge_codes_used !== undefined) {
      updatePayload.merge_codes_used = typeof data.merge_codes_used === 'string'
        ? data.merge_codes_used
        : JSON.stringify(data.merge_codes_used || []);
    }

    await db('letter_templates')
      .where('id', templateId)
      .where('organization_id', orgId)
      .update(updatePayload);

    return this.getTemplate(orgId, templateId);
  }

  async deleteTemplate(orgId: number, templateId: number, userId?: number) {
    const existing = await this.getTemplate(orgId, templateId);
    if (!existing) throw new Error('Template not found');

    await db('letter_templates')
      .where('id', templateId)
      .where('organization_id', orgId)
      .update({ deleted_at: db.fn.now(), updated_by: userId || null });

    return { success: true };
  }

  // ──────────────────────────────────────────────────────────
  // MERGE CODE REFERENCE
  // ──────────────────────────────────────────────────────────

  getMergeCodesForLetterType(letterType: string) {
    const categories = LETTER_TYPE_MERGE_MAP[letterType] || ['universal'];
    const codes: { code: string; label: string; category: string }[] = [];
    for (const cat of categories) {
      if (LETTER_MERGE_CODES[cat]) {
        codes.push(...LETTER_MERGE_CODES[cat]);
      }
    }
    return codes;
  }

  // ──────────────────────────────────────────────────────────
  // LETTER GENERATION ENGINE
  // ──────────────────────────────────────────────────────────

  async generateLetter(
    orgId: number,
    templateId: number,
    recipientData: {
      employee_id?: number;
      candidate_id?: number;
      overrides?: Record<string, string>;
    },
    userId?: number
  ) {
    const template = await this.getTemplate(orgId, templateId);
    if (!template) throw new Error('Template not found');

    const mergeData = await this.resolveMergeData(
      orgId,
      template.letter_type,
      recipientData.employee_id,
      recipientData.candidate_id,
      recipientData.overrides
    );

    const renderedSubject = this.renderMergeCodes(template.subject || '', mergeData);
    const renderedHeader = this.renderMergeCodes(template.header_html || '', mergeData);
    const renderedBody = this.renderMergeCodes(template.body_content || '', mergeData);
    const renderedFooter = this.renderMergeCodes(template.footer_html || '', mergeData);
    const renderedTerms = this.renderMergeCodes(template.terms_and_conditions || '', mergeData);
    const renderedCustom = this.renderMergeCodes(template.custom_clause || '', mergeData);

    const fullHtml = this.buildLetterHtml({
      header: renderedHeader,
      body: renderedBody,
      footer: renderedFooter,
      terms: renderedTerms,
      customClause: renderedCustom,
      companyName: template.company_name_override || mergeData['{{company_name}}'] || 'Apponext Technologies',
      companyAddress: template.company_address_override || mergeData['{{company_address}}'] || '',
      logoUrl: template.logo_url || mergeData['{{company_logo_url}}'] || '',
      signatoryName: template.signatory_name || mergeData['{{signatory_name}}'] || 'Authorized Signatory',
      signatoryDesignation: template.signatory_designation || mergeData['{{signatory_designation}}'] || 'Head of Human Resources',
    });

    const letterCode = await this.generateLetterCode(orgId);

    const [id] = await db('generated_letters').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      company_id: template.company_id || null,
      letter_template_id: templateId,
      letter_code: letterCode,
      letter_type: template.letter_type,
      letter_category: template.letter_category,
      employee_id: recipientData.employee_id || null,
      candidate_id: recipientData.candidate_id || null,
      recipient_name: mergeData['{{employee_name}}'] || mergeData['{{candidate_name}}'] || 'Recipient',
      recipient_email: mergeData['{{employee_email}}'] || mergeData['{{candidate_email}}'] || null,
      subject: renderedSubject,
      rendered_html: fullHtml,
      merge_data: JSON.stringify(mergeData),
      status: 'draft',
      created_by: userId || null,
    });

    return this.getGeneratedLetter(orgId, id);
  }

  // ──────────────────────────────────────────────────────────
  // GENERATED LETTERS CRUD
  // ──────────────────────────────────────────────────────────

  async listGeneratedLetters(orgId: number, filters?: {
    employee_id?: number;
    candidate_id?: number;
    letter_type?: string;
    letter_category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 25;
    const offset = (page - 1) * limit;

    let query = db('generated_letters')
      .where('generated_letters.organization_id', orgId)
      .whereNull('generated_letters.deleted_at');

    if (filters?.employee_id) query = query.where('generated_letters.employee_id', filters.employee_id);
    if (filters?.candidate_id) query = query.where('generated_letters.candidate_id', filters.candidate_id);
    if (filters?.letter_type) query = query.where('generated_letters.letter_type', filters.letter_type);
    if (filters?.letter_category) query = query.where('generated_letters.letter_category', filters.letter_category);
    if (filters?.status) query = query.where('generated_letters.status', filters.status);

    const countResult = await query.clone().count('* as total').first();
    const total = Number(countResult?.total || 0);

    const items = await query
      .leftJoin('letter_templates', 'generated_letters.letter_template_id', 'letter_templates.id')
      .select(
        'generated_letters.*',
        'letter_templates.template_name',
        'letter_templates.template_code'
      )
      .orderBy('generated_letters.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getGeneratedLetter(orgId: number, letterId: number) {
    return db('generated_letters')
      .where('organization_id', orgId)
      .where('id', letterId)
      .whereNull('deleted_at')
      .first();
  }

  async getMyLetters(orgId: number, employeeId: number) {
    return db('generated_letters')
      .where('organization_id', orgId)
      .where('employee_id', employeeId)
      .whereIn('status', ['sent', 'acknowledged', 'signed'])
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc');
  }

  async sendLetter(orgId: number, letterId: number, userId?: number) {
    const letter = await this.getGeneratedLetter(orgId, letterId);
    if (!letter) throw new Error('Letter not found');

    await db('generated_letters')
      .where('id', letterId)
      .update({ status: 'sent', sent_at: db.fn.now(), updated_by: userId || null });

    return this.getGeneratedLetter(orgId, letterId);
  }

  async acknowledgeLetter(orgId: number, letterId: number, note?: string) {
    const letter = await this.getGeneratedLetter(orgId, letterId);
    if (!letter) throw new Error('Letter not found');

    await db('generated_letters')
      .where('id', letterId)
      .update({
        status: 'acknowledged',
        acknowledged_at: db.fn.now(),
        acknowledgment_note: note || null,
      });

    return this.getGeneratedLetter(orgId, letterId);
  }

  async revokeLetter(orgId: number, letterId: number, userId?: number) {
    const letter = await this.getGeneratedLetter(orgId, letterId);
    if (!letter) throw new Error('Letter not found');

    await db('generated_letters')
      .where('id', letterId)
      .update({ status: 'revoked', revoked_at: db.fn.now(), updated_by: userId || null });

    return this.getGeneratedLetter(orgId, letterId);
  }

  // ──────────────────────────────────────────────────────────
  // INTERNAL: Merge code resolution
  // ──────────────────────────────────────────────────────────

  private async resolveMergeData(
    orgId: number,
    letterType: string,
    employeeId?: number,
    candidateId?: number,
    overrides?: Record<string, string>
  ): Promise<Record<string, string>> {
    const data: Record<string, string> = {};

    // System codes
    const now = new Date();
    data['{{current_date}}'] = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    data['{{current_date_long}}'] = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    data['{{financial_year}}'] = `${fyStart}-${fyStart + 1}`;

    // Defaults for role/compensation/terms
    data['{{company_name}}'] = 'Apponext Technologies Pvt. Ltd.';
    data['{{company_address}}'] = 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103';
    data['{{company_phone}}'] = '+91 (080) 4567-8900';
    data['{{company_email}}'] = 'hr@apponext.com';
    data['{{company_website}}'] = 'www.apponext.com';
    data['{{signatory_name}}'] = 'Priya Sharma';
    data['{{signatory_designation}}'] = 'Director - Human Resources & Talent';
    data['{{currency}}'] = 'INR';
    data['{{probation_period}}'] = '3 months';
    data['{{notice_period}}'] = '60 days';
    data['{{work_model}}'] = 'Hybrid (3 days onsite, 2 days remote)';
    data['{{office_location}}'] = 'Bengaluru HQ';

    // Company/org data from database
    try {
      const org = await db('organizations').where('id', orgId).first();
      if (org) {
        data['{{company_name}}'] = org.company_name || org.name || data['{{company_name}}'];
        data['{{company_address}}'] = org.address || data['{{company_address}}'];
        data['{{company_phone}}'] = org.phone || data['{{company_phone}}'];
        data['{{company_email}}'] = org.email || org.hr_email || data['{{company_email}}'];
        data['{{company_website}}'] = org.website || data['{{company_website}}'];
        data['{{company_cin}}'] = org.cin || org.registration_number || '';
        data['{{company_logo_url}}'] = org.logo_url || org.logo || '';
      }
    } catch (e) { /* ignore */ }

    // Employee data
    if (employeeId) {
      try {
        const emp = await db('employees')
          .where('id', employeeId)
          .where('organization_id', orgId)
          .first();

        if (emp) {
          data['{{employee_name}}'] = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
          data['{{employee_code}}'] = emp.employee_code || `EMP${employeeId}`;
          data['{{employee_email}}'] = emp.email || emp.personal_email || '';
          data['{{employee_phone}}'] = emp.phone || emp.mobile || '';
          data['{{employee_gender}}'] = emp.gender || '';
          data['{{date_of_joining}}'] = emp.date_of_joining
            ? new Date(emp.date_of_joining).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
            : data['{{current_date_long}}'];
          data['{{employment_type}}'] = emp.employment_type || 'Full-Time Permanent';

          // Department
          if (emp.current_department_id || emp.department_id) {
            const dept = await db('departments').where('id', emp.current_department_id || emp.department_id).first();
            data['{{department_name}}'] = dept?.name || dept?.department_name || 'Engineering';
          }

          // Designation
          if (emp.current_designation_id || emp.designation_id) {
            const desig = await db('designations').where('id', emp.current_designation_id || emp.designation_id).first();
            data['{{designation_name}}'] = desig?.name || desig?.designation_name || 'Software Engineer';
            data['{{old_designation}}'] = data['{{designation_name}}'];
            data['{{new_designation}}'] = `Senior ${data['{{designation_name}}']}`;
          }

          // Location
          if (emp.current_location_id || emp.location_id || emp.branch_id) {
            const loc = await db('branches').where('id', emp.current_location_id || emp.location_id || emp.branch_id).first();
            data['{{location_name}}'] = loc?.name || loc?.branch_name || 'Headquarters';
            data['{{office_location}}'] = data['{{location_name}}'];
          }

          // Grade
          data['{{grade_band}}'] = emp.grade || emp.grade_band || 'L3';

          // Reporting manager
          if (emp.reporting_manager_id) {
            const mgr = await db('employees').where('id', emp.reporting_manager_id).first();
            data['{{reporting_manager}}'] = mgr ? `${mgr.first_name || ''} ${mgr.last_name || ''}`.trim() : 'Department Lead';
          }

          // Default salary figures if salary_structures exists
          try {
            const salary = await db('salary_structures')
              .where('employee_id', employeeId)
              .where('organization_id', orgId)
              .orderBy('effective_from', 'desc')
              .first();
            if (salary) {
              const ctcNum = Number(salary.annual_ctc || 1200000);
              data['{{current_ctc}}'] = ctcNum.toLocaleString('en-IN');
              data['{{revised_ctc}}'] = (Math.round(ctcNum * 1.15)).toLocaleString('en-IN');
              data['{{increment_percentage}}'] = '15';
              data['{{increment_amount}}'] = (Math.round(ctcNum * 0.15)).toLocaleString('en-IN');
              data['{{currency}}'] = salary.currency || 'INR';
            }
          } catch (e) { /* ignore */ }
        }
      } catch (e) {
        logger.error('Failed to resolve employee merge data', e);
      }
    }

    // Candidate data (for hiring letters)
    if (candidateId) {
      try {
        const cand = await db('candidates')
          .where('id', candidateId)
          .where('organization_id', orgId)
          .first();

        if (cand) {
          data['{{candidate_name}}'] = `${cand.first_name || ''} ${cand.last_name || ''}`.trim() || cand.name || 'Candidate';
          data['{{candidate_email}}'] = cand.email || '';
          data['{{candidate_phone}}'] = cand.phone || cand.mobile || '';
          data['{{position_title}}'] = cand.position_title || 'Software Development Engineer';
          data['{{department_name}}'] = 'Technology & Product';
          data['{{designation_name}}'] = cand.position_title || 'Software Engineer';
          data['{{grade_band}}'] = 'L2';
          data['{{cost_to_company}}'] = '14,50,000';
          data['{{base_salary}}'] = '7,25,000';
          data['{{offer_start_date}}'] = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
          data['{{offer_expiry_date}}'] = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
          data['{{interview_date}}'] = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
          data['{{interview_time}}'] = '11:00 AM IST';
          data['{{interview_venue}}'] = 'Microsoft Teams / Room 4B, 4th Floor';
          data['{{interviewer_name}}'] = 'Technical Hiring Panel';
        }
      } catch (e) {
        logger.error('Failed to resolve candidate merge data', e);
      }
    }

    // Apply overrides
    if (overrides) {
      for (const [key, value] of Object.entries(overrides)) {
        const mergeKey = key.startsWith('{{') ? key : `{{${key}}}`;
        data[mergeKey] = String(value);
      }
    }

    return data;
  }

  private renderMergeCodes(template: string, mergeData: Record<string, string>): string {
    if (!template) return '';
    let rendered = template;
    for (const [code, value] of Object.entries(mergeData)) {
      rendered = rendered.replace(new RegExp(code.replace(/[{}]/g, '\\$&'), 'g'), value || '');
    }
    return rendered;
  }

  private buildLetterHtml(params: {
    header: string;
    body: string;
    footer: string;
    terms: string;
    customClause: string;
    companyName: string;
    companyAddress: string;
    logoUrl: string;
    signatoryName: string;
    signatoryDesignation: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
    background-color: #f8fafc;
    line-height: 1.7;
    font-size: 13.5px;
    padding: 30px 15px;
  }
  .page-container {
    max-width: 850px;
    margin: 0 auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
    border-radius: 8px;
    overflow: hidden;
    position: relative;
  }
  .top-accent-bar {
    height: 6px;
    background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%);
    width: 100%;
  }
  .letter-inner {
    padding: 45px 55px;
  }
  .letter-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1.5px solid #e2e8f0;
    padding-bottom: 24px;
    margin-bottom: 30px;
    gap: 20px;
  }
  .company-brand {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .company-logo {
    max-height: 52px;
    max-width: 220px;
    object-fit: contain;
    margin-bottom: 4px;
  }
  .company-name-text {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.02em;
  }
  .company-meta {
    font-size: 11.5px;
    color: #64748b;
    line-height: 1.45;
    max-width: 320px;
  }
  .header-right {
    text-align: right;
  }
  .doc-badge {
    display: inline-block;
    padding: 4px 12px;
    background: #eef2ff;
    color: #4338ca;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    border-radius: 6px;
    border: 1px solid #c7d2fe;
    margin-bottom: 8px;
  }
  .doc-date {
    font-size: 12px;
    font-weight: 600;
    color: #475569;
  }
  .letter-body {
    white-space: pre-wrap;
    line-height: 1.85;
    color: #334155;
    font-size: 13.5px;
  }
  .highlight-box {
    background: #f8fafc;
    border-left: 4px solid #4f46e5;
    padding: 16px 20px;
    border-radius: 0 8px 8px 0;
    margin: 24px 0;
    font-size: 12.5px;
    color: #475569;
    border-top: 1px solid #f1f5f9;
    border-right: 1px solid #f1f5f9;
    border-bottom: 1px solid #f1f5f9;
  }
  .highlight-box-title {
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 6px;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .signature-section {
    margin-top: 45px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    page-break-inside: avoid;
    padding-top: 20px;
  }
  .sign-col {
    min-width: 240px;
  }
  .sign-line {
    border-top: 1.5px dashed #94a3b8;
    margin-top: 50px;
    padding-top: 10px;
  }
  .sign-name {
    font-size: 13.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .sign-title {
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
  }
  .sign-company {
    font-size: 11.5px;
    color: #94a3b8;
  }
  .letter-footer {
    border-top: 1px solid #f1f5f9;
    margin-top: 40px;
    padding-top: 16px;
    text-align: center;
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.5;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .page-container { border: none; box-shadow: none; max-width: 100%; border-radius: 0; }
    .letter-inner { padding: 30px 40px; }
  }
</style>
</head>
<body>
<div class="page-container">
  <div class="top-accent-bar"></div>
  <div class="letter-inner">
    ${params.header ? `<div class="letter-header">${params.header}</div>` : `
    <div class="letter-header">
      <div class="company-brand">
        ${params.logoUrl ? `<img src="${params.logoUrl}" class="company-logo" alt="Logo" />` : ''}
        <div class="company-name-text">${params.companyName}</div>
        ${params.companyAddress ? `<div class="company-meta">${params.companyAddress}</div>` : ''}
      </div>
      <div class="header-right">
        <div class="doc-badge">OFFICIAL COMMUNICATION</div>
        <div class="doc-date">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
    </div>`}

    <div class="letter-body">${params.body}</div>

    ${params.terms ? `
    <div class="highlight-box">
      <div class="highlight-box-title">Key Terms & Compliance Stipulations</div>
      <div>${params.terms}</div>
    </div>` : ''}

    ${params.customClause ? `
    <div class="highlight-box" style="border-left-color: #0ea5e9;">
      <div class="highlight-box-title">Additional Clauses & Validity</div>
      <div>${params.customClause}</div>
    </div>` : ''}

    <div class="signature-section">
      <div class="sign-col">
        <div class="sign-line">
          <div class="sign-name">${params.signatoryName || 'Authorized Signatory'}</div>
          <div class="sign-title">${params.signatoryDesignation || 'Human Resources'}</div>
          <div class="sign-company">${params.companyName}</div>
        </div>
      </div>
      <div class="sign-col" style="text-align: right;">
        <div class="sign-line">
          <div class="sign-name">Recipient Acceptance / Signature</div>
          <div class="sign-title">Acknowledged & Accepted</div>
          <div class="sign-company">Date: __________________</div>
        </div>
      </div>
    </div>

    ${params.footer ? `<div class="letter-footer">${params.footer}</div>` : `
    <div class="letter-footer">
      This is a confidential corporate document generated by ${params.companyName} HRMS.<br/>
      Registered Address: ${params.companyAddress || 'Bengaluru, India'} • Confidential & Proprietary
    </div>`}
  </div>
</div>
</body>
</html>`;
  }

  private async generateLetterCode(orgId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `LTR-${year}`;

    const lastLetter = await db('generated_letters')
      .where('organization_id', orgId)
      .where('letter_code', 'like', `${prefix}-%`)
      .orderBy('id', 'desc')
      .first();

    let seq = 1;
    if (lastLetter?.letter_code) {
      const parts = lastLetter.letter_code.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}-${String(seq).padStart(4, '0')}`;
  }
}
