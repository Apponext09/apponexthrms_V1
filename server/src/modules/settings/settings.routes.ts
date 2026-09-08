import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import type { Request, Response } from 'express';
import type { ApiResponse } from '@apponexthrms/shared';
import { getKnex } from '../../db/knex';
import { v4 as uuidv4 } from 'uuid';
import { LRUCache } from '../../common/lib/cache';
import { getOrgLeaveSettings, getDefaultWeeklyWorkPattern } from '../leaves/utils/settingsResolver';

// Cache for upcoming holidays (1 hour TTL)
import { BranchController } from './controllers/BranchController';
import { LocationController } from './controllers/LocationController';
import { GradeController } from './controllers/GradeController';
import { BreakController } from './controllers/BreakController';
import { RolesResponsibilityController } from './controllers/RolesResponsibilityController';
import { KraController } from './controllers/KraController';
import { MergeCodeController } from './controllers/MergeCodeController';
import { NotificationTemplateSettingsController } from './controllers/NotificationTemplateSettingsController';
import { EmployeeTypeController } from './controllers/EmployeeTypeController';
import { DesignationService } from './services';
import { EventController } from './controllers/EventController';
import { IdCardTemplateController } from './controllers/IdCardTemplateController';
const holidayCache = new LRUCache<string, any[]>(500, 3600000);
const designationService = new DesignationService();

const router = Router();

router.use(authenticate, resolveTenant);

// ─── Location Master Routes ───────────────────────────────────────────────────
const locationCtrl = new LocationController();
router.get('/locations', asyncHandler((req, res) => locationCtrl.list(req, res)));
router.get('/locations/:id', asyncHandler((req, res) => locationCtrl.get(req, res)));
router.post('/locations', asyncHandler((req, res) => locationCtrl.create(req, res)));
router.patch('/locations/:id', asyncHandler((req, res) => locationCtrl.update(req, res)));
router.delete('/locations/:id', asyncHandler((req, res) => locationCtrl.delete(req, res)));
router.post('/locations/:id/restore', asyncHandler((req, res) => locationCtrl.restore(req, res)));

// ─── Employment Type Master Routes ────────────────────────────────────────────
const employeeTypeCtrl = new EmployeeTypeController();
router.get('/employment-types', asyncHandler((req, res) => employeeTypeCtrl.list(req, res)));
router.get('/employment-types/:id', asyncHandler((req, res) => employeeTypeCtrl.getById(req, res)));
router.post('/employment-types', asyncHandler((req, res) => employeeTypeCtrl.create(req, res)));
router.patch('/employment-types/:id', asyncHandler((req, res) => employeeTypeCtrl.update(req, res)));
router.delete('/employment-types/:id', asyncHandler((req, res) => employeeTypeCtrl.delete(req, res)));

// ─── Employee Status Master Routes ────────────────────────────────────────────
import { EmployeeStatusController } from './controllers/EmployeeStatusController';
const employeeStatusCtrl = new EmployeeStatusController();
router.get('/employee-statuses', asyncHandler((req, res) => employeeStatusCtrl.list(req, res)));
router.get('/employee-statuses/:id', asyncHandler((req, res) => employeeStatusCtrl.getById(req, res)));
router.post('/employee-statuses', asyncHandler((req, res) => employeeStatusCtrl.create(req, res)));
router.put('/employee-statuses/:id', asyncHandler((req, res) => employeeStatusCtrl.update(req, res)));
router.patch('/employee-statuses/:id', asyncHandler((req, res) => employeeStatusCtrl.update(req, res)));
router.delete('/employee-statuses/:id', asyncHandler((req, res) => employeeStatusCtrl.delete(req, res)));

// ─── Scope Masters for Leave Year & Policy Filters ──────────────────────────
router.get('/scope-masters', asyncHandler(async (req: Request, res: Response) => {
  const db = getKnex();

  const formatLabel = (str: any) => {
    if (!str) return '';
    return String(str)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase())
      .trim();
  };

  const safeQueryTable = async (table: string) => {
    try {
      const hasTable = await db.schema.hasTable(table);
      if (!hasTable) return [];

      const hasDeletedAt = await db.schema.hasColumn(table, 'deleted_at');
      let builder = db(table);
      if (hasDeletedAt) {
        builder = builder.whereNull('deleted_at');
      }

      if (req.ctx?.organizationId && (await db.schema.hasColumn(table, 'organization_id'))) {
        builder = builder.where(function () {
          this.where('organization_id', req.ctx?.organizationId).orWhereNull('organization_id');
        });
      }

      // Dynamically detect existing ID column
      const hasCompanyId = await db.schema.hasColumn(table, 'company_id');
      const hasBranchId = await db.schema.hasColumn(table, 'branch_id');
      const hasId = await db.schema.hasColumn(table, 'id');
      const idCol = hasCompanyId ? 'company_id' : (hasBranchId ? 'branch_id' : (hasId ? 'id' : '1'));

      // Dynamically detect existing Name column
      const hasCompanyName = await db.schema.hasColumn(table, 'company_name');
      const hasLocationName = await db.schema.hasColumn(table, 'location_name');
      const hasBranchName = await db.schema.hasColumn(table, 'branch_name');
      const hasDeptName = await db.schema.hasColumn(table, 'department_name');
      const hasDesigName = await db.schema.hasColumn(table, 'designation_name');
      const hasGradeName = await db.schema.hasColumn(table, 'grade_name');
      const hasTypeName = await db.schema.hasColumn(table, 'type_name');
      const hasStatusName = await db.schema.hasColumn(table, 'status_name');
      const hasName = await db.schema.hasColumn(table, 'name');
      const hasLegalName = await db.schema.hasColumn(table, 'legal_name');

      let nameCol = 'name';
      if (hasCompanyName) nameCol = 'company_name';
      else if (hasName) nameCol = 'name';
      else if (hasLocationName) nameCol = 'location_name';
      else if (hasBranchName) nameCol = 'branch_name';
      else if (hasDeptName) nameCol = 'department_name';
      else if (hasDesigName) nameCol = 'designation_name';
      else if (hasGradeName) nameCol = 'grade_name';
      else if (hasTypeName) nameCol = 'type_name';
      else if (hasStatusName) nameCol = 'status_name';
      else if (hasLegalName) nameCol = 'legal_name';

      const rows = await builder.select(`${idCol} as rawId`, `${nameCol} as rawName`);
      const seen = new Set<string>();
      const uniqueList: any[] = [];
      for (const r of rows) {
        const cleanName = String(r.rawName || '').trim();
        if (cleanName && cleanName !== 'null' && cleanName !== 'undefined' && !seen.has(cleanName.toLowerCase())) {
          seen.add(cleanName.toLowerCase());
          uniqueList.push({ id: r.rawId, name: cleanName });
        }
      }
      return uniqueList;
    } catch (e) {
      console.error(`Error querying master table ${table}:`, e);
      return [];
    }
  };

  const safeQuery = async (table: string, _colExpr?: string) => {
    return safeQueryTable(table);
  };

  // 1. Companies (Robust query across company, companies, and organizations tables)
  let companies: any[] = [];
  try {
    const hasCompany = await db.schema.hasTable('company');
    const hasCompanies = await db.schema.hasTable('companies');
    const hasOrgs = await db.schema.hasTable('organizations');

    if (hasCompany) {
      let q = db('company');
      if (await db.schema.hasColumn('company', 'deleted_at')) {
        q = q.whereNull('deleted_at');
      }
      if (req.ctx?.organizationId && (await db.schema.hasColumn('company', 'organization_id'))) {
        q = q.where(function () {
          this.where('organization_id', req.ctx?.organizationId).orWhereNull('organization_id');
        });
      }
      const rows = await q.select('*');
      companies = rows
        .map((r: any) => ({
          id: Number(r.companyId ?? r.company_id ?? r.id),
          name: String(r.name || r.companyName || r.company_name || r.employerName || r.employer_name || r.legalName || r.legal_name || `Company #${r.companyId || r.company_id || r.id}`).trim(),
          code: r.code || r.companyCode || r.company_code || '',
        }))
        .filter((r: any) => r.name && r.name !== 'null' && r.name !== 'undefined');
    }

    if (companies.length === 0 && hasCompanies) {
      let q = db('companies');
      if (await db.schema.hasColumn('companies', 'deleted_at')) {
        q = q.whereNull('deleted_at');
      }
      const rows = await q.select('*');
      companies = rows
        .map((r: any) => ({
          id: Number(r.companyId ?? r.company_id ?? r.id),
          name: String(r.name || r.companyName || r.company_name || r.employerName || r.employer_name || `Company #${r.companyId || r.id}`).trim(),
          code: r.code || r.companyCode || '',
        }))
        .filter((r: any) => r.name && r.name !== 'null' && r.name !== 'undefined');
    }

    // Fallback to organizations if company table is empty
    if (companies.length === 0 && hasOrgs) {
      let q = db('organizations');
      if (await db.schema.hasColumn('organizations', 'deleted_at')) {
        q = q.whereNull('deleted_at');
      }
      if (req.ctx?.organizationId) {
        q = q.where('id', req.ctx.organizationId);
      }
      const rows = await q.select('*');
      companies = rows
        .map((r: any) => ({
          id: Number(r.id),
          name: String(r.name || r.companyName || r.legalName || 'Apponext HRMS').trim(),
          code: r.code || 'COMP-001',
        }))
        .filter((r: any) => r.name && r.name !== 'null' && r.name !== 'undefined');
    }
  } catch (e) {
    console.error('Error fetching companies in scope-masters:', e);
  }

  // 2. Locations (Queries `locations` table)
  let locations = await safeQueryTable('locations');

  // 3. Departments
  let departments = await safeQueryTable('departments');

  // 4. Sub Departments
  let subDepartments = await safeQuery('sub_departments', 'name');
  if (subDepartments.length === 0) {
    try {
      const hasParentDept = await db.schema.hasColumn('departments', 'parent_department_id');
      if (hasParentDept) {
        const rows = await db('departments')
          .whereNotNull('parent_department_id')
          .whereNull('deleted_at')
          .select('id', db.raw('COALESCE(department_name, name) as rawName'));
        subDepartments = rows.map((r: any) => ({ id: r.id, name: formatLabel(r.rawName) }));
      }
    } catch (e) { }
  }

  // 5. Designations
  let designations = await safeQuery('designations', 'COALESCE(designation_name, name)');

  // 6. Grades
  let grades = await safeQuery('grades', 'COALESCE(grade_name, name, grade_code)');
  if (grades.length === 0) {
    grades = await safeQuery('pay_grades', 'COALESCE(grade_name, name)');
  }
  if (grades.length === 0) {
    try {
      const empGrades = await db('employees')
        .whereNotNull('grade')
        .distinct('grade as name');
      grades = empGrades.map((g: any, idx: number) => ({ id: g.name || idx + 1, name: formatLabel(g.name) }));
    } catch (e) { }
  }
  if (grades.length === 0) {
    grades = [
      { id: 'Grade 1', name: 'Grade 1' },
      { id: 'Grade 2', name: 'Grade 2' },
      { id: 'Grade 3', name: 'Grade 3' },
      { id: 'Grade 4', name: 'Grade 4' },
      { id: 'Grade 5', name: 'Grade 5' },
    ];
  }

  // 7. Employment Types
  let employmentTypes = await safeQuery('employee_types', 'COALESCE(type_name, name)');
  if (employmentTypes.length === 0) {
    employmentTypes = await safeQuery('employment_types', 'COALESCE(type_name, name)');
  }
  if (employmentTypes.length === 0) {
    try {
      const empTypes = await db('employees')
        .whereNotNull('employment_type')
        .distinct('employment_type as name');
      employmentTypes = empTypes.map((et: any, idx: number) => ({ id: et.name || idx + 1, name: formatLabel(et.name) }));
    } catch (e) { }
  }
  if (employmentTypes.length === 0) {
    employmentTypes = [
      { id: 'full_time', name: 'Full Time' },
      { id: 'part_time', name: 'Part Time' },
      { id: 'contract', name: 'Contract' },
      { id: 'internship', name: 'Internship' },
      { id: 'probation', name: 'Probation' },
    ];
  }

  // 8. Employment Statuses
  let employmentStatuses = await safeQuery('employee_statuses', 'COALESCE(status_name, name)');
  if (employmentStatuses.length === 0) {
    employmentStatuses = await safeQuery('employment_statuses', 'COALESCE(status_name, name)');
  }
  if (employmentStatuses.length === 0) {
    try {
      const empStatuses = await db('employees')
        .whereNotNull('status')
        .distinct('status as name');
      employmentStatuses = empStatuses.map((es: any, idx: number) => ({ id: es.name || idx + 1, name: formatLabel(es.name) }));
    } catch (e) { }
  }
  if (employmentStatuses.length === 0) {
    employmentStatuses = [
      { id: 'active', name: 'Active' },
      { id: 'probation', name: 'Probation' },
      { id: 'notice', name: 'Notice' },
      { id: 'onboarding', name: 'Onboarding' },
      { id: 'candidate', name: 'Candidate' },
    ];
  }

  // Count employees safely for each master
  const hasEmployeesTable = await db.schema.hasTable('employees');

  if (hasEmployeesTable) {
    // Companies count
    for (const c of companies) {
      try {
        const row = await db('employees').where('organization_id', c.id).whereNull('deleted_at').count('id as total').first();
        c.count = row ? Number(row.total) : 0;
      } catch (e) { c.count = 0; }
    }
    // Locations count
    for (const l of locations) {
      try {
        const row = await db('employees').where(function () {
          this.where('current_location_id', l.id).orWhere('current_branch_id', l.id);
        }).whereNull('deleted_at').count('id as total').first();
        l.count = row ? Number(row.total) : 0;
      } catch (e) { l.count = 0; }
    }
    // Departments count
    for (const d of departments) {
      try {
        const row = await db('employees').where('current_department_id', d.id).whereNull('deleted_at').count('id as total').first();
        d.count = row ? Number(row.total) : 0;
      } catch (e) { d.count = 0; }
    }
    // Sub Departments count
    for (const sd of subDepartments) {
      try {
        const row = await db('employees').where('sub_department_id', sd.id).whereNull('deleted_at').count('id as total').first();
        sd.count = row ? Number(row.total) : 0;
      } catch (e) { sd.count = 0; }
    }
    // Designations count
    for (const des of designations) {
      try {
        const row = await db('employees').where('current_designation_id', des.id).whereNull('deleted_at').count('id as total').first();
        des.count = row ? Number(row.total) : 0;
      } catch (e) { des.count = 0; }
    }
    // Grades count
    for (const g of grades) {
      try {
        const row = await db('employees').where(function () {
          this.where('grade', g.name).orWhere('grade_id', g.id);
        }).whereNull('deleted_at').count('id as total').first();
        g.count = row ? Number(row.total) : 0;
      } catch (e) { g.count = 0; }
    }
    // Employment Types count
    for (const et of employmentTypes) {
      try {
        const row = await db('employees').where(function () {
          this.where('employment_type', et.id).orWhere('employment_type', et.name);
        }).whereNull('deleted_at').count('id as total').first();
        et.count = row ? Number(row.total) : 0;
      } catch (e) { et.count = 0; }
    }
    // Employment Statuses count
    for (const es of employmentStatuses) {
      try {
        const row = await db('employees').where(function () {
          this.where('status', es.id).orWhere('status', es.name);
        }).whereNull('deleted_at').count('id as total').first();
        es.count = row ? Number(row.total) : 0;
      } catch (e) { es.count = 0; }
    }
  }

  // 9. Salary Components
  let salaryComponents: any[] = [];
  try {
    const hasSalaryComps = await db.schema.hasTable('salary_components');
    if (hasSalaryComps) {
      let q = db('salary_components').whereNull('deleted_at');
      if (req.ctx?.organizationId && (await db.schema.hasColumn('salary_components', 'organization_id'))) {
        q = q.where(function () {
          this.where('organization_id', req.ctx?.organizationId).orWhereNull('organization_id');
        });
      }
      const hasCompName = await db.schema.hasColumn('salary_components', 'component_name');
      const hasName = await db.schema.hasColumn('salary_components', 'name');
      const nameCol = hasCompName ? 'component_name' : (hasName ? 'name' : 'id');

      const hasCompCode = await db.schema.hasColumn('salary_components', 'component_code');
      const hasCode = await db.schema.hasColumn('salary_components', 'code');
      const codeCol = hasCompCode ? 'component_code' : (hasCode ? 'code' : nameCol);

      const rows = await q.select('id', `${nameCol} as compName`, `${codeCol} as compCode`);
      const seen = new Set<string>();
      for (const r of rows) {
        const name = String(r.compName || r.compCode || '').trim();
        const code = String(r.compCode || r.compName || '').trim().replace(/\s+/g, '_');
        if (name && !seen.has(code.toLowerCase())) {
          seen.add(code.toLowerCase());
          salaryComponents.push({ id: code, name, code });
        }
      }
    }
  } catch (e) {
    console.error('Error fetching salary components in scope-masters:', e);
  }

  if (salaryComponents.length === 0) {
    salaryComponents = [
      { id: 'Basic', name: 'Basic Salary', code: 'Basic' },
      { id: 'DA', name: 'Dearness Allowance (DA)', code: 'DA' },
      { id: 'HRA', name: 'House Rent Allowance (HRA)', code: 'HRA' },
      { id: 'Special_Allowance', name: 'Special Allowance', code: 'Special_Allowance' },
      { id: 'Conveyance', name: 'Conveyance Allowance', code: 'Conveyance' },
      { id: 'Medical_Allowance', name: 'Medical Allowance', code: 'Medical_Allowance' },
      { id: 'Gross_Salary', name: 'Gross Monthly Salary', code: 'Gross_Salary' },
      { id: 'CTC', name: 'Monthly CTC', code: 'CTC' },
    ];
  }

  res.json({
    success: true,
    data: {
      companies,
      locations,
      departments,
      subDepartments,
      designations,
      grades,
      employmentTypes,
      employmentStatuses,
      salaryComponents,
    },
  });
}));

// ─── Offer Letter Templates Master Routes ──────────────────────────────────────
const DEFAULT_PRESEEDED_OFFER_TEMPLATES = [
  {
    id: 'tpl_std_corp',
    template_name: 'Standard Corporate Offer Letter',
    template_code: 'TPL_STD_CORP',
    subject: 'Subject: Letter of Offer & Employment Agreement - {{candidate_name}}',
    company_name: 'Apponext Technologies Pvt. Ltd.',
    company_address: 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103',
    body_content: `Dear {{candidate_name}},

We are pleased to offer you employment with {{company_name}} in the capacity of {{position_title}}. You will be positioned in corporate grade {{grade_band}} at our {{office_location}} office, reporting directly to {{reporting_manager}} under a {{work_model}} work engagement layout.

Your target date of joining is set as {{offer_start_date}}, subject to successful completion of all background checking protocols. Your Annualized Cost to Company (CTC) compensation package is structured at {{currency}} {{cost_to_company}}.

By accepting this offer, you agree to comply with all company rules, policies, confidentiality protocols, and statutory regulations.`,
    bgv_mandatory: true,
    nda_mandatory: true,
    non_compete: true,
    relieving_letter: true,
    custom_clause: 'Standard 90 days probation applies. Relieving letter required prior to joining.',
    is_active: 'Yes',
    created_at: null,
    updated_at: null,
  },
  {
    id: 'tpl_exec_lead',
    template_name: 'Executive Leadership Offer Letter',
    template_code: 'TPL_EXEC_LEAD',
    subject: 'Subject: Confidential Executive Employment Offer - {{candidate_name}}',
    company_name: 'Apponext Technologies Pvt. Ltd.',
    company_address: 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103',
    body_content: `Dear {{candidate_name}},

On behalf of the Executive Management of {{company_name}}, it gives us immense pleasure to invite you to join our leadership team in the role of {{position_title}} (Grade: {{grade_band}}).

Your total annual CTC remuneration package will be {{currency}} {{cost_to_company}}, inclusive of fixed components, performance incentive bonuses, and joining allowance. You will report directly to {{reporting_manager}} based at {{office_location}}.

Your anticipated joining date is {{offer_start_date}}. This executive appointment is contingent upon customary reference verification and execution of the Senior Officer Confidentiality & IP Agreement.`,
    bgv_mandatory: true,
    nda_mandatory: true,
    non_compete: true,
    relieving_letter: true,
    custom_clause: 'Executive severance policy applies. Executive D&O insurance coverage included.',
    is_active: 'Yes',
    created_at: null,
    updated_at: null,
  },
  {
    id: 'tpl_tech_trainee',
    template_name: 'Technical Trainee Offer Letter',
    template_code: 'TPL_TECH_TRAINEE',
    subject: 'Subject: Offer of Graduate Technical Traineeship - {{candidate_name}}',
    company_name: 'Apponext Technologies Pvt. Ltd.',
    company_address: 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103',
    body_content: `Dear {{candidate_name}},

Congratulations! We are delighted to offer you a position as {{position_title}} in our {{department_name}} department at {{company_name}}.

Your traineeship program will commence on {{offer_start_date}} at our {{office_location}} center under {{work_model}} structure. Your annual CTC package is fixed at {{currency}} {{cost_to_company}}.

During the initial probation period of {{probation_period}}, your performance and progress will be systematically evaluated before full corporate confirmation.`,
    bgv_mandatory: true,
    nda_mandatory: true,
    non_compete: false,
    relieving_letter: true,
    custom_clause: 'Traineeship period of 6 months. Mandatory completion of onboarding technical certifications.',
    is_active: 'Yes',
    created_at: null,
    updated_at: null,
  },
  {
    id: 'tpl_sales_field',
    template_name: 'Sales & Business Development Offer Letter',
    template_code: 'TPL_SALES_FIELD',
    subject: 'Subject: Appointment Letter for Sales & Growth Role - {{candidate_name}}',
    company_name: 'Apponext Technologies Pvt. Ltd.',
    company_address: 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103',
    body_content: `Dear {{candidate_name}},

We are excited to extend an offer for the position of {{position_title}} within our {{department_name}} division at {{company_name}}.

Your base CTC is structured at {{currency}} {{cost_to_company}}, plus attractive quarterly sales commission incentives based on revenue targets. You will report to {{reporting_manager}} at {{office_location}}.

Your date of joining is confirmed as {{offer_start_date}}.`,
    bgv_mandatory: true,
    nda_mandatory: true,
    non_compete: true,
    relieving_letter: true,
    custom_clause: 'Quarterly sales commission structure as per Sales Incentive Plan Annexure B.',
    is_active: 'Yes',
    created_at: null,
    updated_at: null,
  }
];

router.get('/offer-templates', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  let dbTemplates: any[] = [];
  if (await db.schema.hasTable('notification_templates')) {
    dbTemplates = await db('notification_templates')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .where(function () {
        this.where('template_name', 'like', '%Offer%')
          .orWhere('template_code', 'like', '%OFFER%');
      })
      .orderBy('created_at', 'desc');
  }

  const mappedDb = dbTemplates
    .map((t: any) => {
      let parsed: any = {};
      if (t.email_notification) {
        try {
          parsed = typeof t.email_notification === 'string' && t.email_notification.startsWith('{')
            ? JSON.parse(t.email_notification)
            : { body_content: t.email_notification };
        } catch (e) {
          parsed = { body_content: t.email_notification };
        }
      }
      const tName = t.template_name || parsed.template_name || (t.template_code ? `Offer Template (${t.template_code})` : `Offer Letter Format #${t.id}`);
      return {
        id: t.id,
        template_name: tName,
        template_code: t.template_code || `OFFER_${t.id}`,
        subject: t.subject || parsed.subject || 'Letter of Offer & Employment Agreement',
        company_name: parsed.company_name || 'Apponext Technologies Pvt. Ltd.',
        company_address: parsed.company_address || 'Level 6, Tech Park Phase 2, Outer Ring Road, Bengaluru, 560103',
        body_content: parsed.body_content || (typeof t.email_notification === 'string' ? t.email_notification : ''),
        bgv_mandatory: parsed.bgv_mandatory !== false,
        nda_mandatory: parsed.nda_mandatory !== false,
        non_compete: parsed.non_compete !== false,
        relieving_letter: parsed.relieving_letter !== false,
        custom_clause: parsed.custom_clause || '',
        is_active: t.is_active || 'Yes',
        created_at: t.created_at,
        updated_at: t.updated_at,
      };
    })
    .filter(t => t.template_name && t.body_content);

  // Merge custom DB templates with pre-seeded standard templates
  const combined: any[] = [...mappedDb];
  for (const def of DEFAULT_PRESEEDED_OFFER_TEMPLATES) {
    if (!combined.some(c => String(c.template_code).toUpperCase() === String(def.template_code).toUpperCase())) {
      combined.push(def);
    }
  }

  res.json({ success: true, data: combined });
}));

router.post('/offer-templates', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const {
    template_name,
    template_code,
    subject,
    company_name,
    company_address,
    body_content,
    bgv_mandatory,
    nda_mandatory,
    non_compete,
    relieving_letter,
    custom_clause,
    is_active = 'Yes'
  } = req.body;

  const payloadMeta = JSON.stringify({
    company_name,
    company_address,
    body_content,
    bgv_mandatory: bgv_mandatory !== false,
    nda_mandatory: nda_mandatory !== false,
    non_compete: non_compete !== false,
    relieving_letter: relieving_letter !== false,
    custom_clause: custom_clause || '',
  });

  const [id] = await db('notification_templates').insert({
    uuid: uuidv4(),
    organization_id: ctx.organizationId,
    template_name: template_name || 'Custom Offer Template',
    template_code: template_code || `OFFER_${Date.now()}`,
    subject: subject || 'Letter of Offer',
    email_notification: payloadMeta,
    is_active: is_active || 'Yes',
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: new Date(),
    updated_at: new Date(),
  });

  res.status(201).json({ success: true, data: { id, template_name, template_code, subject } });
}));

router.delete('/offer-templates/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);
  if (!isNaN(id)) {
    await db('notification_templates')
      .where({ id, organization_id: ctx.organizationId })
      .update({ deleted_at: new Date() });
  }
  res.json({ success: true, message: 'Offer template deleted' });
}));

// ─── Grade / Pay Grade Master Routes ──────────────────────────────────────────
const gradeCtrl = new GradeController();
router.get('/grades', asyncHandler((req, res) => gradeCtrl.list(req, res)));
router.get('/grades/:id', asyncHandler((req, res) => gradeCtrl.get(req, res)));
router.post('/grades', asyncHandler((req, res) => gradeCtrl.create(req, res)));
router.patch('/grades/:id', asyncHandler((req, res) => gradeCtrl.update(req, res)));
router.delete('/grades/:id', asyncHandler((req, res) => gradeCtrl.delete(req, res)));

router.get('/pay-grades', asyncHandler((req, res) => gradeCtrl.list(req, res)));
router.get('/pay-grades/:id', asyncHandler((req, res) => gradeCtrl.get(req, res)));
router.post('/pay-grades', asyncHandler((req, res) => gradeCtrl.create(req, res)));
router.patch('/pay-grades/:id', asyncHandler((req, res) => gradeCtrl.update(req, res)));
router.delete('/pay-grades/:id', asyncHandler((req, res) => gradeCtrl.delete(req, res)));

// NOTE: /companies route is handled by CompanyController at the bottom of this file (line ~2809)

// Upcoming Holidays endpoint for Employees
router.get('/holidays/upcoming', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const limit = parseInt(req.query.limit as string, 10) || 5;

  const cacheKey = `${ctx.organizationId}:${ctx.userId}:${limit}`;
  const cachedHolidays = holidayCache.get(cacheKey);
  if (cachedHolidays) {
    res.status(200).json({ success: true, data: cachedHolidays });
    return;
  }

  // Find employee's location
  const user = await db('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).first('employee_id');
  let locationId = null;
  if (user?.employee_id) {
    const emp = await db('employees').where({ id: user.employee_id, organization_id: ctx.organizationId }).first('current_location_id');
    locationId = emp?.current_location_id;
  }

  const currentYear = new Date().getFullYear();
  let calendarsQuery = db('holiday_calendars')
    .where('organization_id', ctx.organizationId)
    .where('year', currentYear);

  if (locationId) {
    calendarsQuery = calendarsQuery.where(function () {
      this.where('applicable_location_id', locationId).orWhere('is_default', true);
    });
  } else {
    calendarsQuery = calendarsQuery.where('is_default', true);
  }

  const calendars = await calendarsQuery;
  const calendarIds = calendars.map(c => c.id);

  if (calendarIds.length === 0) {
    holidayCache.set(cacheKey, []);
    res.status(200).json({ success: true, data: [] });
    return;
  }

  // Get current date string (YYYY-MM-DD) based on server local time
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const holidays = await db('holidays')
    .whereIn('holiday_calendar_id', calendarIds)
    .where('holiday_date', '>=', todayStr)
    .orderBy('holiday_date', 'asc')
    .limit(limit)
    .select('id', 'holiday_name', 'holiday_date', 'holiday_type', 'is_optional');

  holidayCache.set(cacheKey, holidays);

  const response: ApiResponse = {
    success: true,
    data: holidays,
  };
  res.status(200).json(response);
}));

// Full Holiday Calendar endpoint for Employees
router.get('/holidays/my-calendar', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const cacheKey = `fullcal:${ctx.organizationId}:${ctx.userId}`;
  const cachedHolidays = holidayCache.get(cacheKey);
  if (cachedHolidays) {
    res.status(200).json({ success: true, data: cachedHolidays });
    return;
  }

  // Find employee's location
  const user = await db('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).first('employee_id');
  let locationId = null;
  if (user?.employee_id) {
    const emp = await db('employees').where({ id: user.employee_id, organization_id: ctx.organizationId }).first('current_location_id');
    locationId = emp?.current_location_id;
  }

  const currentYear = new Date().getFullYear();
  let calendarsQuery = db('holiday_calendars')
    .where('organization_id', ctx.organizationId)
    .where('year', currentYear);

  if (locationId) {
    calendarsQuery = calendarsQuery.where(function () {
      this.where('applicable_location_id', locationId).orWhere('is_default', true);
    });
  } else {
    calendarsQuery = calendarsQuery.where('is_default', true);
  }

  const calendars = await calendarsQuery;
  const calendarIds = calendars.map(c => c.id);

  if (calendarIds.length === 0) {
    holidayCache.set(cacheKey, []);
    res.status(200).json({ success: true, data: [] });
    return;
  }

  const holidays = await db('holidays')
    .whereIn('holiday_calendar_id', calendarIds)
    .orderBy('holiday_date', 'asc')
    .select('id', 'holiday_name', 'holiday_date', 'holiday_type', 'is_optional');

  holidayCache.set(cacheKey, holidays);

  const response: ApiResponse = {
    success: true,
    data: holidays,
  };
  res.status(200).json(response);
}));

/* duplicate root settings
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const settings = await db('organization_settings')
    .where('organization_id', ctx.organizationId)
    .first();

  const response: ApiResponse = {
    success: true,
    data: settings || { organization_id: ctx.organizationId },
  }

  // Find employee's location
  const user = await db('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).first('employee_id');
  let locationId = null;
  if (user?.employee_id) {
    const emp = await db('employees').where({ id: user.employee_id, organization_id: ctx.organizationId }).first('current_location_id');
    locationId = emp?.current_location_id;
  }

  const currentYear = new Date().getFullYear();
  let calendarsQuery = db('holiday_calendars')
    .where('organization_id', ctx.organizationId)
    .where('year', currentYear);

  if (locationId) {
    calendarsQuery = calendarsQuery.where(function() {
      this.where('applicable_location_id', locationId).orWhere('is_default', true);
    });
  } else {
    calendarsQuery = calendarsQuery.where('is_default', true);
  }

  const calendars = await calendarsQuery;
  const calendarIds = calendars.map(c => c.id);

  if (calendarIds.length === 0) {
    holidayCache.set(cacheKey, []);
    res.status(200).json({ success: true, data: [] });
    return;
  }

  // Get current date string (YYYY-MM-DD) based on server local time
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const holidays = await db('holidays')
    .whereIn('holiday_calendar_id', calendarIds)
    .where('holiday_date', '>=', todayStr)
    .orderBy('holiday_date', 'asc')
    .limit(limit)
    .select('id', 'holiday_name', 'holiday_date', 'holiday_type', 'is_optional');

  holidayCache.set(cacheKey, holidays);

  const response: ApiResponse = {
    success: true,
    data: holidays,
  };
  res.status(200).json(response);
}));

// Full Holiday Calendar endpoint for Employees
router.get('/holidays/my-calendar', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const cacheKey = `fullcal:${ctx.organizationId}:${ctx.userId}`;
  const cachedHolidays = holidayCache.get(cacheKey);
  if (cachedHolidays) {
    res.status(200).json({ success: true, data: cachedHolidays });
    return;
  }

  // Find employee's location
  const user = await db('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).first('employee_id');
  let locationId = null;
  if (user?.employee_id) {
    const emp = await db('employees').where({ id: user.employee_id, organization_id: ctx.organizationId }).first('current_location_id');
    locationId = emp?.current_location_id;
  }

  const currentYear = new Date().getFullYear();
  let calendarsQuery = db('holiday_calendars')
    .where('organization_id', ctx.organizationId)
    .where('year', currentYear);

  if (locationId) {
    calendarsQuery = calendarsQuery.where(function() {
      this.where('applicable_location_id', locationId).orWhere('is_default', true);
    });
  } else {
    calendarsQuery = calendarsQuery.where('is_default', true);
  }

  const calendars = await calendarsQuery;
  const calendarIds = calendars.map(c => c.id);

  if (calendarIds.length === 0) {
    holidayCache.set(cacheKey, []);
    res.status(200).json({ success: true, data: [] });
    return;
  }

  const holidays = await db('holidays')
    .whereIn('holiday_calendar_id', calendarIds)
    .orderBy('holiday_date', 'asc')
    .select('id', 'holiday_name', 'holiday_date', 'holiday_type', 'is_optional');

  holidayCache.set(cacheKey, holidays);

  const response: ApiResponse = {
    success: true,
    data: holidays,
  };
  res.status(200).json(response);
}));

*/

// Root endpoint - get organization settings
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const settings = await db('organization_settings')
    .where('organization_id', ctx.organizationId)
    .first();

  const response: ApiResponse = {
    success: true,
    data: settings || { organization_id: ctx.organizationId },
  };

  res.status(200).json(response);
}));

router.get('/locations', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 500;

  const db = getKnex();
  const offset = (page - 1) * pageSize;

  let query = db('locations')
    .where('organization_id', ctx.organizationId)
    .whereNull('deleted_at');

  if (ctx.companyId) {
    query = query.where('company_id', ctx.companyId);
  }

  const locations = await query
    .limit(pageSize)
    .offset(offset);

  const response: ApiResponse = {
    success: true,
    data: locations,
    meta: {
      page,
      pageSize,
      total: locations.length,
      hasMore: false,
      totalPages: 1,
    },
  };

  res.status(200).json(response);
}));

router.post('/locations', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const name = req.body.name || req.body.locationName || 'Office Location';
  const code = req.body.code || req.body.locationCode || `LOC-${Math.floor(1000 + Math.random() * 9000)}`;
  const address = req.body.address || req.body.addressLine1 || req.body.address_line1 || null;
  const city = req.body.city || null;
  const state = req.body.state || null;
  const country = req.body.country || 'India';
  const latitude = req.body.latitude || 19.0760;
  const longitude = req.body.longitude || 72.8777;

  const [id] = await db('locations').insert({
    uuid: uuidv4(),
    organization_id: ctx.organizationId,
    name,
    code,
    address_line1: address,
    city,
    state,
    country,
    status: 'active',
    created_by: ctx.userId || 1,
    updated_by: ctx.userId || 1,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Sync to attendance_locations table for attendance geofence verification
  const hasAttLocations = await db.schema.hasTable('attendance_locations');
  if (hasAttLocations) {
    const existingAttLoc = await db('attendance_locations')
      .where({ organization_id: ctx.organizationId, location_code: code })
      .first();

    if (!existingAttLoc) {
      const [attLocId] = await db('attendance_locations').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        location_name: name,
        location_code: code,
        address,
        latitude,
        longitude,
        timezone: 'Asia/Kolkata',
        is_primary: false,
        created_by: ctx.userId || 1,
        updated_by: ctx.userId || 1,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const hasGeofences = await db.schema.hasTable('attendance_geofences');
      if (hasGeofences) {
        await db('attendance_geofences').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          location_id: attLocId,
          geofence_name: `${name} Geofence`,
          latitude,
          longitude,
          radius_meters: 1000,
          created_by: ctx.userId || 1,
          updated_by: ctx.userId || 1,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  const response: ApiResponse = {
    success: true,
    data: { id, name, code, message: 'Location created successfully' },
  };
  res.json(response);
}));

async function ensureDepartmentColumns() {
  try {
    const db = getKnex();
    const hasTable = await db.schema.hasTable('departments');
    if (!hasTable) return;

    const [hasCompanyIds, hasCompanyEmails, hasIsActive, hasColour, hasEmail] = await Promise.all([
      db.schema.hasColumn('departments', 'company_ids'),
      db.schema.hasColumn('departments', 'company_emails'),
      db.schema.hasColumn('departments', 'is_active'),
      db.schema.hasColumn('departments', 'colour'),
      db.schema.hasColumn('departments', 'email'),
    ]);

    if (!hasCompanyIds) {
      await db.schema.table('departments', (table) => table.json('company_ids').nullable()).catch(() => { });
    }
    if (!hasCompanyEmails) {
      await db.schema.table('departments', (table) => table.json('company_emails').nullable()).catch(() => { });
    }
    if (!hasIsActive) {
      await db.schema.table('departments', (table) => table.string('is_active', 50).defaultTo('Yes')).catch(() => { });
    }
    if (!hasColour) {
      await db.schema.table('departments', (table) => table.string('colour', 50).defaultTo('#00b4d8')).catch(() => { });
    }
    if (!hasEmail) {
      await db.schema.table('departments', (table) => table.string('email', 150).nullable()).catch(() => { });
    }
  } catch (err) {
    console.warn('[ensureDepartmentColumns] schema check error:', err);
  }
}

function parseDeptCompanyIds(rawIds: any, singleCompanyId?: any): number[] {
  let ids: number[] = [];
  if (Array.isArray(rawIds)) {
    ids = rawIds.map((v) => Number(v)).filter((v) => !isNaN(v) && v > 0);
  } else if (typeof rawIds === 'string' && rawIds.trim()) {
    try {
      const parsed = JSON.parse(rawIds);
      if (Array.isArray(parsed)) {
        ids = parsed.map((v) => Number(v)).filter((v) => !isNaN(v) && v > 0);
      }
    } catch { }
  }
  if (ids.length === 0 && singleCompanyId) {
    const num = Number(singleCompanyId);
    if (!isNaN(num) && num > 0) ids = [num];
  }
  return ids;
}

function formatDeptResponse(dept: any) {
  if (!dept) return dept;
  const companyIds = parseDeptCompanyIds(dept.company_ids || dept.companyIds, dept.company_id || dept.companyId);
  let companyEmails = dept.company_emails || dept.companyEmails;
  if (typeof companyEmails === 'string') {
    try { companyEmails = JSON.parse(companyEmails); } catch { }
  }
  return {
    ...dept,
    company_ids: companyIds,
    companyIds: companyIds,
    company_emails: companyEmails || {},
    companyEmails: companyEmails || {},
  };
}

router.get('/departments', asyncHandler(async (req: Request, res: Response) => {
  await ensureDepartmentColumns();
  const ctx = req.ctx!;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 500;

  const db = getKnex();
  const offset = (page - 1) * pageSize;

  let query = db('departments')
    .where('organization_id', ctx.organizationId)
    .whereNull('deleted_at');

  if (ctx.companyId) {
    const cIdNum = Number(ctx.companyId);
    const cIdStr = String(ctx.companyId);
    query = query.where((builder) => {
      builder.where('company_id', cIdNum)
        .orWhereRaw("JSON_CONTAINS(company_ids, ?)", [JSON.stringify(cIdNum)])
        .orWhereRaw("JSON_CONTAINS(company_ids, ?)", [JSON.stringify(cIdStr)])
        .orWhereNull('company_id')
        .orWhereNull('company_ids');
    });
  }

  const departments = await query
    .limit(pageSize)
    .offset(offset);

  const formatted = departments.map((d: any) => ({
    ...d,
    colour: d.colour || d.color || '#00b4d8',
    color: d.color || d.colour || '#00b4d8',
    is_active: d.is_active || (d.status === 'inactive' ? 'No' : 'Yes'),
    isActive: d.is_active || (d.status === 'inactive' ? 'No' : 'Yes'),
  }));

  const response: ApiResponse = {
    success: true,
    data: formatted,
    meta: {
      page,
      pageSize,
      total: formatted.length,
      hasMore: false,
      totalPages: 1,
    } as any,
  };

  res.status(200).json(response);
}));

// List ALL department managers across all departments (for filter dropdowns)
router.get('/departments/managers', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  let managers = await db('department_managers as dm')
    .join('employees as e', 'e.id', 'dm.employee_id')
    .join('departments as d', 'd.id', 'dm.department_id')
    .where('dm.organization_id', ctx.organizationId)
    .whereNull('e.deleted_at')
    .select(
      'dm.id',
      'dm.manager_type as managerType',
      'dm.is_primary as isPrimary',
      'e.id as employeeId',
      'e.first_name as firstName',
      'e.last_name as lastName',
      db.raw('COALESCE(e.job_title, "") as designation'),
      'd.id as departmentId',
      'd.name as departmentName'
    )
    .orderBy('e.first_name');

  if (managers.length === 0) {
    const reportingMgrIds = db('employees')
      .whereNotNull('reporting_manager_id')
      .select('reporting_manager_id');

    const fallbackEmps = await db('employees as e')
      .leftJoin('departments as d', 'e.current_department_id', 'd.id')
      .where('e.organization_id', ctx.organizationId)
      .whereNull('e.deleted_at')
      .where(builder => {
        builder.whereIn('e.id', reportingMgrIds)
          .orWhere('e.job_title', 'like', '%Manager%')
          .orWhere('e.job_title', 'like', '%Head%')
          .orWhere('e.job_title', 'like', '%Director%')
          .orWhere('e.job_title', 'like', '%Lead%')
          .orWhere('e.job_title', 'like', '%VP%')
          .orWhere('e.job_title', 'like', '%Chief%');
      })
      .select(
        'e.id as id',
        'e.id as employeeId',
        'e.first_name as firstName',
        'e.last_name as lastName',
        db.raw('COALESCE(e.job_title, "") as designation'),
        'e.current_department_id as departmentId',
        'd.name as departmentName'
      )
      .orderBy('e.first_name');

    managers = fallbackEmps as any;
  }

  res.json({ success: true, data: managers });
}));

// List all managers assigned to one department, including their direct-report count.
router.get('/departments/:id/managers', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const departmentId = Number(req.params.id);
  const managers = await db('department_managers as dm')
    .join('employees as e', 'e.id', 'dm.employee_id')
    .where({ 'dm.organization_id': ctx.organizationId, 'dm.department_id': departmentId })
    .select(
      'dm.id',
      'dm.manager_type as managerType',
      'dm.is_primary as isPrimary',
      'e.id as employeeId',
      'e.first_name as firstName',
      'e.last_name as lastName'
    );

  const result = await Promise.all(
    managers.map(async (m: any) => {
      const countRes = await db('employees')
        .where({ organization_id: ctx.organizationId, reporting_manager_id: m.employeeId })
        .count('* as count')
        .first();
      return {
        ...m,
        directReports: Number((countRes as any)?.count || 0),
      };
    })
  );

  res.json({ success: true, data: result });
}));

// Assign an existing department employee as an additional manager or team lead.
router.post('/departments/:id/managers', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const departmentId = Number(req.params.id);
  const { employeeId, managerType = 'department_manager', isPrimary = false } = req.body;
  const employee = await db('employees').where({ id: employeeId, organization_id: ctx.organizationId, current_department_id: departmentId }).first('id');
  if (!employee) throw new Error('Manager must be an employee in the selected department');
  if (isPrimary) await db('department_managers').where({ organization_id: ctx.organizationId, department_id: departmentId }).update({ is_primary: false });
  const [id] = await db('department_managers').insert({ organization_id: ctx.organizationId, department_id: departmentId, employee_id: employeeId, manager_type: managerType, is_primary: Boolean(isPrimary), assigned_by: ctx.userId || 1, assigned_at: new Date() });
  res.status(201).json({ success: true, data: { id } });
}));

router.post('/departments', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const name = req.body.name || req.body.departmentName || 'Department';
  const code = req.body.code || req.body.departmentCode || `DEPT-${Math.floor(100 + Math.random() * 900)}`;
  const email = req.body.email || req.body.departmentMail || null;
  const colour = req.body.colour || req.body.color || '#00b4d8';
  const description = req.body.description || null;
  const companyId = req.body.companyId || req.body.company_id || ctx.companyId || null;
  const isActive = req.body.isActive || req.body.is_active || 'Yes';
  const status = (isActive === 'No' || isActive === 'inactive') ? 'inactive' : 'active';

  // Ensure missing columns on departments table are added if not present yet
  try {
    const hasColour = await db.schema.hasColumn('departments', 'colour');
    const hasColor = await db.schema.hasColumn('departments', 'color');
    const hasEmail = await db.schema.hasColumn('departments', 'email');
    const hasIsActive = await db.schema.hasColumn('departments', 'is_active');
    if (!hasColour || !hasColor || !hasEmail || !hasIsActive) {
      await db.schema.alterTable('departments', (table) => {
        if (!hasEmail) table.string('email', 255).nullable();
        if (!hasColour) table.string('colour', 50).nullable().defaultTo('#00b4d8');
        if (!hasColor) table.string('color', 50).nullable().defaultTo('#00b4d8');
        if (!hasIsActive) table.string('is_active', 10).nullable().defaultTo('Yes');
      });
    }
  } catch (e) {
    // Ignore concurrency/already altered table errors
  }

  // Safe insertion matching existing table columns
  const cols = await db('departments').columnInfo().catch(() => ({}));
  const insertPayload: Record<string, any> = {
    uuid: uuidv4(),
    organization_id: ctx.organizationId,
    name,
    code,
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: new Date(),
    updated_at: new Date(),
  };

  if ('description' in cols) insertPayload.description = description;
  if ('colour' in cols) insertPayload.colour = colour;
  if ('color' in cols) insertPayload.color = colour;
  if ('email' in cols) insertPayload.email = email;
  if ('company_id' in cols) insertPayload.company_id = companyId ? Number(companyId) : null;
  if ('is_active' in cols) insertPayload.is_active = isActive;
  if ('status' in cols) insertPayload.status = status;

  const [id] = await db('departments').insert(insertPayload);

  const created = await db('departments').where('id', id).first();

  const response: ApiResponse = {
    success: true,
    data: {
      ...created,
      id,
      name,
      code,
      colour: created?.colour || created?.color || colour,
      color: created?.color || created?.colour || colour,
      email: created?.email || email,
      is_active: created?.is_active || isActive,
      isActive: created?.is_active || isActive,
      status: created?.status || status,
    },
    message: 'Department created successfully',
  };

  res.status(201).json(response);
}));

// Get single department by ID
router.get('/departments/:id', asyncHandler(async (req: Request, res: Response) => {
  await ensureDepartmentColumns();
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  const dept = await db('departments')
    .where({ id, organization_id: ctx.organizationId })
    .first();

  if (!dept) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      ...dept,
      colour: dept.colour || dept.color || '#00b4d8',
      color: dept.color || dept.colour || '#00b4d8',
      is_active: dept.is_active || (dept.status === 'inactive' ? 'No' : 'Yes'),
      isActive: dept.is_active || (dept.status === 'inactive' ? 'No' : 'Yes'),
    },
  });
}));

// Update department by ID (supports PUT and PATCH)
const handleUpdateDepartment = asyncHandler(async (req: Request, res: Response) => {
  await ensureDepartmentColumns();
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  const name = req.body.name || req.body.departmentName;
  const code = req.body.code || req.body.departmentCode;
  const email = req.body.email;
  const colour = req.body.colour || req.body.color;
  const description = req.body.description;
  const isActive = req.body.isActive || req.body.is_active;

  const updatePayload: Record<string, any> = {
    updated_at: new Date(),
    updated_by: ctx.userId || 1,
  };

  const cols = await db('departments').columnInfo().catch(() => ({}));

  if (name !== undefined) updatePayload.name = name;
  if (code !== undefined) updatePayload.code = code;
  if (email !== undefined && 'email' in cols) updatePayload.email = email;
  if (colour !== undefined) {
    if ('colour' in cols) updatePayload.colour = colour;
    if ('color' in cols) updatePayload.color = colour;
  }
  if (description !== undefined && 'description' in cols) updatePayload.description = description;
  if (companyId !== undefined && 'company_id' in cols) updatePayload.company_id = companyId ? Number(companyId) : null;
  if (isActive !== undefined) {
    if ('is_active' in cols) updatePayload.is_active = isActive;
    if ('status' in cols) updatePayload.status = (isActive === 'No' || isActive === 'inactive') ? 'inactive' : 'active';
  }

  const rawCompanyIds = req.body.companyIds !== undefined ? req.body.companyIds : req.body.company_ids;
  const rawCompanyId = req.body.companyId !== undefined ? req.body.companyId : req.body.company_id;

  if (rawCompanyIds !== undefined || rawCompanyId !== undefined) {
    const companyIdsArray = parseDeptCompanyIds(rawCompanyIds, rawCompanyId);
    updatePayload.company_ids = companyIdsArray.length > 0 ? JSON.stringify(companyIdsArray) : null;
    updatePayload.company_id = companyIdsArray.length > 0 ? companyIdsArray[0] : (rawCompanyId ? Number(rawCompanyId) : null);
  }

  const rawCompanyEmails = req.body.companyEmails !== undefined ? req.body.companyEmails : (req.body.company_emails !== undefined ? req.body.company_emails : req.body.defaultEmails);
  if (rawCompanyEmails !== undefined) {
    updatePayload.company_emails = rawCompanyEmails && typeof rawCompanyEmails === 'object' ? JSON.stringify(rawCompanyEmails) : null;
  }

  const count = await db('departments')
    .where({ id, organization_id: ctx.organizationId })
    .update(updatePayload);

  if (!count) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  const updated = await db('departments')
    .where({ id, organization_id: ctx.organizationId })
    .first();

  res.json({
    success: true,
    data: {
      ...updated,
      colour: updated?.colour || updated?.color || colour || '#00b4d8',
      color: updated?.color || updated?.colour || colour || '#00b4d8',
      is_active: updated?.is_active || isActive || 'Yes',
      isActive: updated?.is_active || isActive || 'Yes',
    },
    message: 'Department updated successfully',
  });
});

router.put('/departments/:id', handleUpdateDepartment);
router.patch('/departments/:id', handleUpdateDepartment);

// Delete department by ID
router.delete('/departments/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  const count = await db('departments')
    .where({ id, organization_id: ctx.organizationId })
    .delete();

  if (!count) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.json({ success: true, message: 'Department deleted successfully' });
}));

// ==========================================
// Dynamic Employment Options (Grades, Types, Status)
// ==========================================

router.get('/employment-options', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  let dbGrades: string[] = [];
  try {
    const gradesRows = await db('grades')
      .select('name')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('name', 'asc');
    dbGrades = gradesRows.map((r: any) => r.name);
  } catch (err) {
    const fallbackRows = await db('employees')
      .distinct('grade')
      .where('organization_id', ctx.organizationId)
      .whereNotNull('grade')
      .whereNot('grade', '')
      .orderBy('grade', 'asc');
    dbGrades = fallbackRows.map((r: any) => r.grade);
  }
  if (dbGrades.length === 0) {
    dbGrades = ['Grade A', 'Grade B', 'Grade C'];
  }

  let dbEmployeeTypes: string[] = [];
  try {
    const typesRows = await db('employee_types')
      .select('name')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('name', 'asc');
    dbEmployeeTypes = typesRows.map((r: any) => r.name);
  } catch (err) {
    const fallbackRows = await db('employees')
      .distinct('employment_type')
      .where('organization_id', ctx.organizationId)
      .whereNotNull('employment_type')
      .whereNot('employment_type', '')
      .orderBy('employment_type', 'asc');
    dbEmployeeTypes = fallbackRows.map((r: any) => r.employment_type);
  }
  if (dbEmployeeTypes.length === 0) {
    dbEmployeeTypes = ['full_time', 'part_time', 'contract', 'internship'];
  }

  let dbEmployeeStatuses: string[] = [];
  try {
    const statusesRows = await db('employee_statuses')
      .select('name')
      .where('organization_id', ctx.organizationId)
      .whereNull('deleted_at')
      .orderBy('name', 'asc');
    dbEmployeeStatuses = statusesRows.map((r: any) => r.name);
  } catch (err) {
    const fallbackRows = await db('employees')
      .distinct('status')
      .where('organization_id', ctx.organizationId)
      .whereNotNull('status')
      .whereNot('status', '')
      .orderBy('status', 'asc');
    dbEmployeeStatuses = fallbackRows.map((r: any) => r.status);
  }
  if (dbEmployeeStatuses.length === 0) {
    dbEmployeeStatuses = ['candidate', 'onboarding', 'probation', 'active', 'notice', 'exit', 'alumni'];
  }

  const uniqueGrades = Array.from(new Set(dbGrades.filter(Boolean)));
  const uniqueTypes = Array.from(new Set(dbEmployeeTypes.filter(Boolean)));
  const uniqueStatuses = Array.from(new Set(dbEmployeeStatuses.filter(Boolean)));

  const response: ApiResponse = {
    success: true,
    data: {
      employeeTypes: uniqueTypes,
      employeeStatuses: uniqueStatuses,
      grades: uniqueGrades
    }
  };

  res.status(200).json(response);
}));

// GET /company-profile
router.get('/company-profile', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const org = await db('organizations').where('id', ctx.organizationId).first();
  const user = await db('users').where('id', ctx.userId).first();

  res.json({
    success: true,
    data: {
      id: org?.id,
      company_name: org?.name || 'Organization',
      organization_code: org?.code || 'ORG-1001',
      industry: org?.industry || 'Technology & Enterprise Solutions',
      website: org?.website_url || '',
      phone: org?.phone || user?.phone || '',
      address_line1: org?.location || org?.address_line1 || '',
      owner_name: org?.owner_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    },
  });
}));

// PUT and PATCH /company-profile
const handleUpdateCompanyProfile = asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const companyName = req.body.companyName || req.body.organizationName || req.body.company_name;
  const organizationCode = req.body.organizationCode || req.body.organization_code;
  const industry = req.body.industry;
  const website = req.body.website || req.body.websiteUrl;
  const phone = req.body.phone;
  const address = req.body.address || req.body.addressLine1 || req.body.location || req.body.address_line1;

  const orgUpdate: Record<string, any> = { updated_at: new Date() };
  if (companyName !== undefined) orgUpdate.name = companyName;
  if (organizationCode !== undefined) orgUpdate.code = organizationCode;
  if (industry !== undefined) orgUpdate.industry = industry;
  if (website !== undefined) {
    orgUpdate.website = website;
    orgUpdate.website_url = website;
  }
  if (phone !== undefined) orgUpdate.phone = phone;
  if (address !== undefined) {
    orgUpdate.address_line1 = address;
    orgUpdate.location = address;
  }

  if (Object.keys(orgUpdate).length > 1) {
    await db('organizations').where('id', ctx.organizationId).update(orgUpdate);
  }

  const updatedOrg = await db('organizations').where('id', ctx.organizationId).first();
  res.json({ success: true, data: updatedOrg, message: 'Company profile updated successfully' });
});

router.put('/company-profile', handleUpdateCompanyProfile);
router.patch('/company-profile', handleUpdateCompanyProfile);

// ==========================================
// Branches Settings (Regional Offices)
// ==========================================
const branchController = new BranchController();
router.get('/branches', asyncHandler((req, res) => branchController.list(req, res)));
router.get('/branches/:id', asyncHandler((req, res) => branchController.get(req, res)));
router.post('/branches', asyncHandler((req, res) => branchController.create(req, res)));
router.put('/branches/:id', asyncHandler((req, res) => branchController.update(req, res)));
router.patch('/branches/:id', asyncHandler((req, res) => branchController.update(req, res)));
router.delete('/branches/:id', asyncHandler((req, res) => branchController.delete(req, res)));
router.post('/branches/:id/restore', asyncHandler((req, res) => branchController.restore(req, res)));

// ==========================================
// Organization Settings (General HR Settings)
// ==========================================
router.get('/org-settings', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const settings = await db('organization_settings')
    .where('organization_id', ctx.organizationId);

  const settingsMap: Record<string, any> = {};
  settings.forEach(s => {
    const rawVal = s.settingValue !== undefined ? s.settingValue : s.setting_value;
    let parsedVal = rawVal;

    // Parse JSON string if needed (some databases return json columns as strings)
    if (typeof rawVal === 'string') {
      try {
        parsedVal = JSON.parse(rawVal);
      } catch (e) {
        parsedVal = rawVal;
      }
    }

    settingsMap[s.settingKey || s.setting_key] = parsedVal;
  });

  // Default value for sick leave doc threshold is 3
  if (settingsMap['sick_leave_doc_threshold'] === undefined) {
    settingsMap['sick_leave_doc_threshold'] = 3;
  }

  // Default values for Attendance Module Configuration
  if (settingsMap['attendance_mode'] === undefined) {
    settingsMap['attendance_mode'] = 'gps';
  }
  if (settingsMap['geofence_radius_meters'] === undefined) {
    settingsMap['geofence_radius_meters'] = 100;
  }
  if (settingsMap['whitelisted_ips'] === undefined) {
    settingsMap['whitelisted_ips'] = '192.168.1.1, 10.0.0.1';
  }
  if (settingsMap['require_checkout'] === undefined) {
    settingsMap['require_checkout'] = true;
  }
  if (settingsMap['live_tracking_enabled'] === undefined) {
    settingsMap['live_tracking_enabled'] = false;
  }
  if (settingsMap['tracking_interval_minutes'] === undefined) {
    settingsMap['tracking_interval_minutes'] = 15;
  }
  if (settingsMap['auto_checkout_enabled'] === undefined) {
    settingsMap['auto_checkout_enabled'] = false;
  }
  if (settingsMap['auto_checkout_buffer_minutes'] === undefined) {
    settingsMap['auto_checkout_buffer_minutes'] = 0;
  }

  res.json({ success: true, data: settingsMap });
}));

router.put('/org-settings', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const settings = req.body;

  for (const [key, value] of Object.entries(settings)) {
    const existing = await db('organization_settings')
      .where({ organization_id: ctx.organizationId, setting_key: key })
      .first();

    const dbVal = JSON.stringify(value);

    if (existing) {
      await db('organization_settings')
        .where({ id: existing.id })
        .update({
          setting_value: dbVal,
          updated_by: ctx.userId,
          updated_at: new Date()
        });
    } else {
      await db('organization_settings').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        setting_key: key,
        setting_value: dbVal,
        setting_type: typeof value,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  res.json({ success: true, message: 'Settings updated successfully' });
}));

// ==========================================
// Admin Holiday Calendars
// ==========================================

router.get('/holiday-calendars', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();

  let query = db('holiday_calendars as hc')
    .leftJoin('locations as l', 'hc.applicable_location_id', 'l.id')
    .where('hc.organization_id', ctx.organizationId)
    .where('hc.year', year);

  if (ctx.companyId) {
    query = query.where('hc.company_id', ctx.companyId);
  }

  const calendars = await query.select('hc.*', 'l.name as location_name');

  res.json({ success: true, data: calendars });
}));

router.post('/holiday-calendars', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const { name, year, description, is_default, applicable_location_id } = req.body;

  if (is_default) {
    // Unset other defaults for the same year
    await db('holiday_calendars')
      .where({ organization_id: ctx.organizationId, year, is_default: true })
      .update({ is_default: false });
  }

  const [id] = await db('holiday_calendars').insert({
    uuid: uuidv4(),
    organization_id: ctx.organizationId,
    company_id: req.body.companyId || req.body.company_id || ctx.companyId || null,
    name,
    year: year || new Date().getFullYear(),
    description,
    is_default: is_default || false,
    applicable_location_id: applicable_location_id || null,
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: new Date(),
    updated_at: new Date(),
  });

  res.status(201).json({ success: true, data: { id, message: 'Calendar created' } });
}));

router.put('/holiday-calendars/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const { name, description, is_default, applicable_location_id } = req.body;
  const id = Number(req.params.id);

  const cal = await db('holiday_calendars').where({ id, organization_id: ctx.organizationId }).first();
  if (!cal) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }

  if (is_default) {
    await db('holiday_calendars')
      .where({ organization_id: ctx.organizationId, year: cal.year, is_default: true })
      .whereNot('id', id)
      .update({ is_default: false });
  }

  await db('holiday_calendars')
    .where({ id })
    .update({
      name,
      description,
      is_default,
      applicable_location_id: applicable_location_id || null,
      updated_by: ctx.userId,
      updated_at: new Date()
    });

  res.json({ success: true, message: 'Calendar updated' });
}));

router.delete('/holiday-calendars/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  await db('holidays').where('holiday_calendar_id', id).delete();
  const count = await db('holiday_calendars').where({ id, organization_id: ctx.organizationId }).delete();

  if (!count) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  res.json({ success: true, message: 'Deleted' });
}));

// ==========================================
// Admin Holidays
// ==========================================

router.get('/holiday-calendars/:calendarId/holidays', asyncHandler(async (req: Request, res: Response) => {
  const db = getKnex();
  const calendarId = Number(req.params.calendarId);

  const holidays = await db('holidays')
    .where('holiday_calendar_id', calendarId)
    .orderBy('holiday_date', 'asc');

  res.json({ success: true, data: holidays });
}));

router.post('/holiday-calendars/:calendarId/holidays', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const calendarId = Number(req.params.calendarId);
  const { holiday_name, holiday_date, holiday_type, is_optional, description } = req.body;

  const [id] = await db('holidays').insert({
    uuid: uuidv4(),
    organization_id: ctx.organizationId,
    holiday_calendar_id: calendarId,
    holiday_name,
    holiday_date,
    holiday_type: holiday_type || 'public',
    is_optional: is_optional || false,
    description,
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Bust cache
  holidayCache.clear();

  res.status(201).json({ success: true, data: { id, message: 'Holiday created' } });
}));

router.put('/holidays/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);
  const { holiday_name, holiday_date, holiday_type, is_optional, description } = req.body;

  const count = await db('holidays')
    .where({ id, organization_id: ctx.organizationId })
    .update({
      holiday_name,
      holiday_date,
      holiday_type,
      is_optional,
      description,
      updated_by: ctx.userId,
      updated_at: new Date()
    });

  if (!count) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }

  // Bust cache
  holidayCache.clear();

  res.json({ success: true, message: 'Holiday updated' });
}));

router.delete('/holidays/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  const count = await db('holidays')
    .where({ id, organization_id: ctx.organizationId })
    .delete();

  if (!count) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }

  // Bust cache
  holidayCache.clear();

  res.json({ success: true, message: 'Holiday deleted' });
}));

// ==========================================
// Admin Leave Types (Quotas)
// ==========================================

router.get('/leave-types', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx;
  const db = getKnex();
  const orgId = ctx?.organizationId || (ctx as any)?.organization_id;

  let query = db('leave_types').whereNull('deleted_at');
  if (orgId) {
    query = query.where(function (this: any) {
      this.where('organization_id', orgId).orWhereNull('organization_id');
    });
  }

  const types = await query.orderBy('id', 'asc');
  const parsedTypes = types.map((t: any) => {
    const parseJsonField = (fieldVal: any) => {
      if (!fieldVal) return {};
      try {
        const parsed = typeof fieldVal === 'string' ? JSON.parse(fieldVal) : fieldVal;
        return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
      } catch (e) {
        return {};
      }
    };

    const alloc = parseJsonField(t.allocationSettings || t.allocation_settings);
    const app = parseJsonField(t.applicationSettings || t.application_settings);
    const payroll = parseJsonField(t.payrollSettings || t.payroll_settings);
    const empAlloc = parseJsonField(t.employmentAllocationSettings || t.employment_allocation_settings);
    const empApp = parseJsonField(t.employmentApplicationSettings || t.employment_application_settings);
    const enc = parseJsonField(t.encashmentSettings || t.encashment_settings);

    const color = t.color || alloc?.color || 'Sky';
    const icon = t.icon || alloc?.icon || 'Sun';
    const effective_from = t.effectiveFrom || t.effective_from || alloc?.effective_from || alloc?.effectiveFrom || null;
    const effective_to = t.effectiveTo || t.effective_to || alloc?.effective_to || alloc?.effectiveTo || null;
    return {
      ...t,
      color,
      themeColor: color,
      theme_color: color,
      icon,
      categoryIcon: icon,
      category_icon: icon,
      effective_from,
      effectiveFrom: effective_from,
      effective_to,
      effectiveTo: effective_to,
      allocation_settings: alloc,
      allocationSettings: alloc,
      application_settings: app,
      applicationSettings: app,
      payroll_settings: payroll,
      payrollSettings: payroll,
      employment_allocation_settings: empAlloc,
      employmentAllocationSettings: empAlloc,
      employment_application_settings: empApp,
      employmentApplicationSettings: empApp,
      encashment_settings: enc,
      encashmentSettings: enc,
    };
  });
  res.json({ success: true, data: parsedTypes });
}));

router.post('/leave-types', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const {
    leave_name,
    leave_code,
    annual_quota,
    carry_forward_enabled,
    carry_forward_limit,
    encashment_enabled,
    encashment_limit,
    sandwich_rule_enabled,
    gender_applicable,
    description,
    status,
    allow_negative_balance,
    negative_balance_action,
    pool_from_leave_type_id,
    paid_type,
    leave_classification,
    color,
    icon,
    effective_from,
    effective_to,
    allocation_settings,
    application_settings,
    payroll_settings,
    employment_allocation_settings,
    employment_application_settings,
    encashment_settings
  } = req.body;

  const existingCode = await db('leave_types')
    .where({ organization_id: ctx.organizationId, leave_code: leave_code.toUpperCase() })
    .whereNull('deleted_at')
    .first();

  if (existingCode) {
    res.status(400).json({ success: false, message: `A leave category with code '${leave_code.toUpperCase()}' already exists. Please edit the existing one.` });
    return;
  }

  const isAllowNeg = Boolean(allow_negative_balance);
  const action = isAllowNeg ? negative_balance_action : null;
  const poolId = (isAllowNeg && action === 'POOL_FROM_OTHER_LEAVE') ? (parseInt(pool_from_leave_type_id, 10) || null) : null;

  if (isAllowNeg && action === 'POOL_FROM_OTHER_LEAVE' && !poolId) {
    res.status(400).json({ success: false, message: 'Deduct leave type is required when Pooling is selected.' });
    return;
  }

  const stringifyJson = (val: any) => val ? (typeof val === 'string' ? val : JSON.stringify(val)) : null;

  let allocObj: any = {};
  if (allocation_settings) {
    try {
      allocObj = typeof allocation_settings === 'string' ? JSON.parse(allocation_settings) : { ...allocation_settings };
    } catch (e) {
      allocObj = {};
    }
  }
  if (color) allocObj.color = color;
  if (icon) allocObj.icon = icon;
  if (effective_from) allocObj.effective_from = effective_from;
  if (effective_to) allocObj.effective_to = effective_to;

  await db.transaction(async (trx) => {
    const [id] = await trx('leave_types').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      leave_name,
      leave_code: leave_code.toUpperCase(),
      annual_quota: parseInt(annual_quota, 10) || 0,
      carry_forward_enabled: Boolean(carry_forward_enabled),
      carry_forward_limit: parseInt(carry_forward_limit, 10) || null,
      encashment_enabled: Boolean(encashment_enabled),
      encashment_limit: parseInt(encashment_limit, 10) || null,
      sandwich_rule_enabled: Boolean(sandwich_rule_enabled),
      gender_applicable: gender_applicable || 'all',
      description: description || null,
      status: status || 'active',
      paid_type: paid_type || 'paid',
      allow_negative_balance: isAllowNeg,
      negative_balance_action: action,
      pool_from_leave_type_id: poolId,
      leave_classification: leave_classification || 'uncategorized',
      allocation_settings: stringifyJson(allocObj),
      application_settings: stringifyJson(application_settings),
      payroll_settings: stringifyJson(payroll_settings),
      employment_allocation_settings: stringifyJson(employment_allocation_settings),
      employment_application_settings: stringifyJson(employment_application_settings),
      encashment_settings: stringifyJson(encashment_settings),
      created_by: ctx.userId,
      updated_by: ctx.userId,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Resolve or create default leave policy for organization
    let defaultPolicy = await trx('leave_policies')
      .where('organization_id', ctx.organizationId)
      .where('is_default', true)
      .first();

    if (!defaultPolicy) {
      const [policyId] = await trx('leave_policies').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        name: 'Standard Leave Policy',
        code: 'STD_POLICY',
        is_default: true,
        status: 'active',
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date()
      });
      defaultPolicy = await trx('leave_policies').where('id', policyId).first();
    }

    const policyId = defaultPolicy.id;

    // For all existing employees, initialize policy assignments and balances for this new leave type!
    const employees = await trx('employees')
      .where({ organization_id: ctx.organizationId })
      .whereNull('deleted_at');

    const currentYear = new Date().getFullYear();
    const fyStart = `${currentYear}-04-01`;
    const fyEnd = `${currentYear + 1}-03-31`;

    for (const emp of employees) {
      // Check if assignment already exists
      const existingAssign = await trx('leave_policy_assignments')
        .where({ employee_id: emp.id, leave_type_id: id })
        .first();
      if (!existingAssign) {
        await trx('leave_policy_assignments').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: emp.id,
          leave_type_id: id,
          leave_policy_id: policyId, // Use the resolved policyId!
          annual_quota: parseInt(annual_quota, 10) || 0,
          carry_forward_enabled: Boolean(carry_forward_enabled) ? 1 : 0,
          carry_forward_limit: parseInt(carry_forward_limit, 10) || null,
          assignment_start_date: new Date(),
          is_active: true,
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      const existingBal = await trx('leave_balances')
        .where({ employee_id: emp.id, leave_type_id: id, financial_year_start: fyStart })
        .first();
      if (!existingBal) {
        await trx('leave_balances').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: emp.id,
          leave_type_id: id,
          financial_year_start: fyStart,
          financial_year_end: fyEnd,
          opening_balance: parseInt(annual_quota, 10) || 0,
          credited_balance: 0,
          consumed_balance: 0,
          available_balance: parseInt(annual_quota, 10) || 0,
          carry_forward_balance: 0,
          encashed_balance: 0,
          expired_balance: 0,
          pending_approval_balance: 0,
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    // Write to audit_logs
    await trx('audit_logs').insert({
      organization_id: ctx.organizationId,
      actor_user_id: ctx.userId,
      action: 'CREATE_LEAVE_TYPE',
      entity_type: 'leave_type',
      entity_id: String(id),
      before_state: null,
      after_state: JSON.stringify({
        leave_name,
        leave_code: leave_code.toUpperCase(),
        annual_quota: parseInt(annual_quota, 10) || 0,
        carry_forward_enabled: Boolean(carry_forward_enabled),
        carry_forward_limit: parseInt(carry_forward_limit, 10) || null,
        encashment_enabled: Boolean(encashment_enabled),
        encashment_limit: parseInt(encashment_limit, 10) || null,
        sandwich_rule_enabled: Boolean(sandwich_rule_enabled),
        gender_applicable: gender_applicable || 'all',
        description: description || null,
        status: status || 'active',
        paid_type: paid_type || 'paid',
        allow_negative_balance: isAllowNeg,
        negative_balance_action: action,
        pool_from_leave_type_id: poolId
      }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'unknown',
      created_at: new Date()
    }).catch(() => { });
  });

  res.status(201).json({ success: true, message: 'Leave type created successfully and assigned to employees' });
}));

router.put('/leave-types/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);
  const {
    leave_name,
    leave_code,
    annual_quota,
    carry_forward_enabled,
    carry_forward_limit,
    encashment_enabled,
    encashment_limit,
    sandwich_rule_enabled,
    gender_applicable,
    description,
    status,
    allow_negative_balance,
    negative_balance_action,
    pool_from_leave_type_id,
    paid_type,
    leave_classification,
    allocation_settings,
    application_settings,
    payroll_settings,
    employment_allocation_settings,
    employment_application_settings,
    encashment_settings
  } = req.body;

  const currentType = await db('leave_types').where({ id }).first();
  if (!currentType) {
    res.status(404).json({ success: false, message: 'Leave type not found' });
    return;
  }

  const isAllowNeg = Boolean(allow_negative_balance);
  const action = isAllowNeg ? negative_balance_action : null;
  const poolId = (isAllowNeg && action === 'POOL_FROM_OTHER_LEAVE') ? (parseInt(pool_from_leave_type_id, 10) || null) : null;

  if (isAllowNeg && action === 'POOL_FROM_OTHER_LEAVE' && !poolId) {
    res.status(400).json({ success: false, message: 'Deduct leave type is required when Pooling is selected.' });
    return;
  }

  if (isAllowNeg && action === 'POOL_FROM_OTHER_LEAVE' && poolId === id) {
    res.status(400).json({ success: false, message: 'Cannot pool from the same leave type.' });
    return;
  }

  let allocEntitlement = allocation_settings?.entitlementDays;
  if (!allocEntitlement && typeof allocation_settings === 'string') {
    try { allocEntitlement = JSON.parse(allocation_settings)?.entitlementDays; } catch (e) { }
  }
  const isQuotaProvided = annual_quota !== undefined || allocEntitlement !== undefined;
  const oldQuota = currentType.annual_quota || currentType.annualQuota || 0;
  const newQuota = isQuotaProvided
    ? (parseInt(annual_quota ?? allocEntitlement ?? 0, 10) || 0)
    : oldQuota;
  const quotaDiff = isQuotaProvided ? (newQuota - oldQuota) : 0;

  const stringifyJson = (val: any) => val ? (typeof val === 'string' ? val : JSON.stringify(val)) : null;

  const updateData: Record<string, any> = {
    updated_by: ctx.userId,
    updated_at: new Date()
  };

  if (leave_name !== undefined) updateData.leave_name = leave_name;
  if (leave_code !== undefined) updateData.leave_code = leave_code ? String(leave_code).toUpperCase() : currentType.leave_code;
  if (paid_type !== undefined) updateData.paid_type = paid_type;
  if (leave_classification !== undefined) updateData.leave_classification = leave_classification;
  if (status !== undefined) updateData.status = status;
  if (description !== undefined) updateData.description = description;
  // Helper to extract gender from condition groups if dynamic rules are used
  const extractGenderFromGroup = (group: any): string | null => {
    if (!group) return null;
    const conditions = group.conditions || group.rules;
    if (!Array.isArray(conditions) || conditions.length === 0) return null;
    for (const c of conditions) {
      if (c.conjunction || c.conditions || c.rules) {
        const nested = extractGenderFromGroup(c);
        if (nested) return nested;
      }
      const fact = (c.fact || c.field || '').toString().toLowerCase().replace(/[\s_-]+/g, '');
      if (fact === 'gender' && (c.operator === 'equals' || c.operator === '=' || c.operator === 'is equal to (=)')) {
        const val = (c.value || '').toString().toLowerCase().trim();
        if (val === 'male' || val === 'female' || val === 'other') return val;
      }
    }
    return null;
  };

  const onlyWhenGender = extractGenderFromGroup(allocation_settings?.onlyWhen || allocation_settings?.only_when || application_settings?.onlyWhen || application_settings?.only_when);

  if (gender_applicable !== undefined) {
    updateData.gender_applicable = gender_applicable;
  } else if (onlyWhenGender) {
    updateData.gender_applicable = onlyWhenGender;
  } else if (allocation_settings !== undefined || application_settings !== undefined) {
    // Conditions were updated but no gender condition found — reset to 'all'
    updateData.gender_applicable = 'all';
  }
  if (sandwich_rule_enabled !== undefined) updateData.sandwich_rule_enabled = Boolean(sandwich_rule_enabled);
  if (allow_negative_balance !== undefined) updateData.allow_negative_balance = isAllowNeg;
  if (negative_balance_action !== undefined) updateData.negative_balance_action = action;
  if (pool_from_leave_type_id !== undefined) updateData.pool_from_leave_type_id = poolId;

  if (isQuotaProvided) {
    updateData.annual_quota = newQuota > 0 ? newQuota : oldQuota;
  }

  const allocRaw = allocation_settings !== undefined ? allocation_settings : (currentType.allocationSettings || currentType.allocation_settings);
  let allocObj: any = {};
  if (allocRaw) {
    try {
      allocObj = typeof allocRaw === 'string' ? JSON.parse(allocRaw) : { ...allocRaw };
      if (typeof allocObj === 'string') {
        allocObj = JSON.parse(allocObj);
      }
    } catch (e) {
      allocObj = {};
    }
  }
  if (req.body.color !== undefined) allocObj.color = req.body.color;
  if (req.body.icon !== undefined) allocObj.icon = req.body.icon;
  if (req.body.effective_from !== undefined) allocObj.effective_from = req.body.effective_from;
  if (req.body.effective_to !== undefined) allocObj.effective_to = req.body.effective_to;
  if (req.body.effectiveFrom !== undefined) allocObj.effective_from = req.body.effectiveFrom;
  if (req.body.effectiveTo !== undefined) allocObj.effective_to = req.body.effectiveTo;

  // Sync allocObj.gender with the resolved gender_applicable to prevent stale values in JSON
  if (updateData.gender_applicable) {
    allocObj.gender = updateData.gender_applicable;
  }

  if (allocation_settings !== undefined || req.body.color !== undefined || req.body.icon !== undefined || req.body.effective_from !== undefined || req.body.effective_to !== undefined || req.body.effectiveFrom !== undefined || req.body.effectiveTo !== undefined || updateData.gender_applicable) {
    updateData.allocation_settings = stringifyJson(allocObj);
  }
  if (application_settings !== undefined && application_settings !== null) {
    updateData.application_settings = stringifyJson(application_settings);
  }
  if (payroll_settings !== undefined && payroll_settings !== null) {
    updateData.payroll_settings = stringifyJson(payroll_settings);
  }
  if (employment_allocation_settings !== undefined && employment_allocation_settings !== null) {
    updateData.employment_allocation_settings = stringifyJson(employment_allocation_settings);
  }
  if (employment_application_settings !== undefined && employment_application_settings !== null) {
    updateData.employment_application_settings = stringifyJson(employment_application_settings);
  }
  if (encashment_settings !== undefined && encashment_settings !== null) {
    updateData.encashment_settings = stringifyJson(encashment_settings);
  }

  // 1. Update leave type safely without wiping unpassed settings
  await db('leave_types')
    .where({ id })
    .update(updateData);

  // 2. Update all active policy assignments and balances ONLY IF quota actually changed
  if (isQuotaProvided && quotaDiff !== 0) {
    const assignmentUpdate: Record<string, any> = {
      annual_quota: newQuota,
      updated_by: ctx.userId,
      updated_at: new Date()
    };
    if (carry_forward_enabled !== undefined) assignmentUpdate.carry_forward_enabled = Boolean(carry_forward_enabled) ? 1 : 0;
    if (carry_forward_limit !== undefined) assignmentUpdate.carry_forward_limit = parseInt(carry_forward_limit, 10) || null;

    await db('leave_policy_assignments')
      .where({ organization_id: ctx.organizationId, leave_type_id: id })
      .update(assignmentUpdate);

    // 3. Update active leave balances for this financial year (adjust available/opening balances by the diff)
    const currentYear = new Date().getFullYear();

    const balances = await db('leave_balances')
      .where({ organization_id: ctx.organizationId, leave_type_id: id })
      .where((builder: any) => {
        builder.whereRaw('YEAR(financial_year_start) = ?', [currentYear])
          .orWhereNull('financial_year_start');
      });

    for (const bal of balances) {
      const currentOpening = parseFloat(bal.opening_balance || bal.openingBalance) || 0;
      const currentAvailable = parseFloat(bal.available_balance || bal.availableBalance) || 0;
      const updatedOpening = Math.max(0, currentOpening + quotaDiff);
      const updatedAvailable = Math.max(0, currentAvailable + quotaDiff);

      await db('leave_balances')
        .where({ id: bal.id })
        .update({
          opening_balance: updatedOpening,
          available_balance: updatedAvailable,
          updated_by: ctx.userId,
          updated_at: new Date()
        });
    }
  }

  // Write to audit_logs
  await db('audit_logs').insert({
    organization_id: ctx.organizationId,
    actor_user_id: ctx.userId,
    action: 'UPDATE_LEAVE_TYPE',
    entity_type: 'leave_type',
    entity_id: String(id),
    before_state: JSON.stringify({
      leave_name: currentType.leave_name,
      leave_code: currentType.leave_code,
      annual_quota: oldQuota,
      carry_forward_enabled: !!currentType.carry_forward_enabled,
      carry_forward_limit: currentType.carry_forward_limit,
      encashment_enabled: !!currentType.encashment_enabled,
      encashment_limit: currentType.encashment_limit,
      sandwich_rule_enabled: !!currentType.sandwich_rule_enabled,
      gender_applicable: currentType.gender_applicable,
      description: currentType.description,
      status: currentType.status,
      paid_type: currentType.paid_type,
      allow_negative_balance: !!currentType.allow_negative_balance,
      negative_balance_action: currentType.negative_balance_action,
      pool_from_leave_type_id: currentType.pool_from_leave_type_id
    }),
    after_state: JSON.stringify({
      leave_name: leave_name || currentType.leave_name,
      leave_code: leave_code ? String(leave_code).toUpperCase() : currentType.leave_code,
      annual_quota: newQuota,
      carry_forward_enabled: carry_forward_enabled !== undefined ? Boolean(carry_forward_enabled) : !!currentType.carry_forward_enabled,
      carry_forward_limit: carry_forward_limit !== undefined ? (parseInt(carry_forward_limit, 10) || null) : currentType.carry_forward_limit,
      encashment_enabled: encashment_enabled !== undefined ? Boolean(encashment_enabled) : !!currentType.encashment_enabled,
      encashment_limit: encashment_limit !== undefined ? (parseInt(encashment_limit, 10) || null) : currentType.encashment_limit,
      sandwich_rule_enabled: sandwich_rule_enabled !== undefined ? Boolean(sandwich_rule_enabled) : !!currentType.sandwich_rule_enabled,
      gender_applicable: gender_applicable || currentType.gender_applicable || 'all',
      description: description !== undefined ? description : currentType.description,
      status: status || currentType.status || 'active',
      paid_type: paid_type || currentType.paid_type || 'paid',
      allow_negative_balance: allow_negative_balance !== undefined ? isAllowNeg : !!currentType.allow_negative_balance,
      negative_balance_action: negative_balance_action !== undefined ? action : currentType.negative_balance_action,
      pool_from_leave_type_id: pool_from_leave_type_id !== undefined ? poolId : currentType.pool_from_leave_type_id
    }),
    ip_address: req.ip || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown',
    created_at: new Date()
  }).catch((err) => {
    console.error('Failed to insert audit log:', err);
  });

  res.json({ success: true, message: 'Leave type and employee quotas updated successfully' });
}));

// GET audit logs for a specific leave type
router.get('/leave-types/:id/audit-logs', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const idStr = String(req.params.id);

  try {
    const logs = await db('audit_logs')
      .where({ organization_id: ctx.organizationId, entity_type: 'leave_type' })
      .andWhere((builder: any) => {
        builder.where('entity_id', idStr).orWhere('entity_id', Number(req.params.id) || 0);
      })
      .orderBy('created_at', 'desc')
      .limit(100)
      .catch((err) => {
        console.warn('Could not query audit_logs table:', err.message);
        return [];
      });

    const userIds = (logs || []).map((l: any) => l.actorUserId || l.actor_user_id || l.user_id).filter(Boolean);
    let usersMap: Record<number, string> = {};
    if (userIds.length > 0) {
      try {
        const users = await db('users').whereIn('id', userIds).select('id', 'name', 'email');
        users.forEach((u: any) => {
          usersMap[u.id] = u.name || u.email || `User #${u.id}`;
        });
      } catch (e) {
        // ignore
      }
    }

    const safeParse = (val: any) => {
      if (!val) return {};
      if (typeof val === 'object') return val;
      try {
        return JSON.parse(val);
      } catch (e) {
        return {};
      }
    };

    const formattedLogs = (logs || []).map((log: any) => ({
      id: log.id,
      action: log.action || 'UPDATE_LEAVE_TYPE',
      actorName: usersMap[log.actorUserId || log.actor_user_id || log.user_id] || 'System Admin',
      beforeState: safeParse(log.beforeState || log.before_state),
      afterState: safeParse(log.afterState || log.after_state),
      ipAddress: log.ipAddress || log.ip_address || '127.0.0.1',
      createdAt: log.createdAt || log.created_at || new Date().toISOString()
    }));

    res.status(200).json({ success: true, data: formattedLogs });
  } catch (err: any) {
    console.error('Audit logs query error:', err);
    res.status(200).json({ success: true, data: [] });
  }
}));

// LEAVE YEAR SETTINGS ENDPOINTS
const ensureLeaveYearSettingsTable = async (db: any) => {
  const hasTable = await db.schema.hasTable('leave_year_settings');
  if (!hasTable) {
    await db.schema.createTable('leave_year_settings', (table: any) => {
      table.increments('id').primary();
      table.integer('organization_id').notNullable();
      table.integer('company_id').nullable();
      table.integer('start_day').notNullable().defaultTo(1);
      table.string('start_month', 20).notNullable().defaultTo('April');
      table.string('status', 20).notNullable().defaultTo('active');
      table.boolean('is_default').notNullable().defaultTo(false);
      table.json('locations').nullable();
      table.json('departments').nullable();
      table.json('grades').nullable();
      table.json('companies').nullable();
      table.integer('created_by').nullable();
      table.integer('updated_by').nullable();
      table.timestamps(true, true);
    });
  }
};

router.get('/leave-year-settings', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  await ensureLeaveYearSettingsTable(db);

  let settings = await db('leave_year_settings')
    .where({ organization_id: ctx.organizationId })
    .orderBy('is_default', 'asc')
    .orderBy('id', 'desc');

  if (settings.length === 0) {
    await db('leave_year_settings').insert({
      organization_id: ctx.organizationId,
      company_id: ctx.companyId || null,
      start_day: 1,
      start_month: 'April',
      status: 'active',
      is_default: true,
      locations: JSON.stringify([]),
      departments: JSON.stringify([]),
      grades: JSON.stringify([]),
      companies: JSON.stringify([]),
      created_by: ctx.userId,
      created_at: new Date(),
      updated_at: new Date()
    });
    settings = await db('leave_year_settings').where({ organization_id: ctx.organizationId });
  }

  const parseJson = (val: any) => {
    if (!val) return [];
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch (e) { return []; }
  };

  const formatted = settings.map((s: any) => ({
    id: s.id,
    organization_id: s.organization_id,
    company_id: s.company_id,
    start_day: s.start_day || s.startDay || 1,
    start_month: s.start_month || s.startMonth || 'April',
    status: s.status || 'active',
    is_default: Boolean(s.is_default || s.isDefault),
    locations: parseJson(s.locations),
    departments: parseJson(s.departments),
    grades: parseJson(s.grades),
    companies: parseJson(s.companies)
  }));

  res.json({ success: true, data: formatted });
}));

router.post('/leave-year-settings', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  await ensureLeaveYearSettingsTable(db);

  const { start_day, start_month, status, locations, departments, grades, companies } = req.body;

  const [id] = await db('leave_year_settings').insert({
    organization_id: ctx.organizationId,
    company_id: ctx.companyId || null,
    start_day: Number(start_day) || 1,
    start_month: start_month || 'April',
    status: status || 'active',
    is_default: false,
    locations: JSON.stringify(locations || []),
    departments: JSON.stringify(departments || []),
    grades: JSON.stringify(grades || []),
    companies: JSON.stringify(companies || []),
    created_by: ctx.userId,
    created_at: new Date(),
    updated_at: new Date()
  });

  res.json({ success: true, data: { id, message: 'Leave year setting created successfully' } });
}));

router.put('/leave-year-settings/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  await ensureLeaveYearSettingsTable(db);
  const id = Number(req.params.id);

  const { start_day, start_month, status, locations, departments, grades, companies } = req.body;

  await db('leave_year_settings')
    .where({ id, organization_id: ctx.organizationId })
    .update({
      start_day: Number(start_day) || 1,
      start_month: start_month || 'April',
      status: status || 'active',
      locations: JSON.stringify(locations || []),
      departments: JSON.stringify(departments || []),
      grades: JSON.stringify(grades || []),
      companies: JSON.stringify(companies || []),
      updated_by: ctx.userId,
      updated_at: new Date()
    });

  res.json({ success: true, message: 'Leave year setting updated successfully' });
}));

router.patch('/leave-year-settings/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  await ensureLeaveYearSettingsTable(db);
  const id = Number(req.params.id);

  const current = await db('leave_year_settings').where({ id, organization_id: ctx.organizationId }).first();
  if (!current) {
    res.status(404).json({ success: false, message: 'Setting not found' });
    return;
  }

  const newStatus = current.status === 'active' ? 'inactive' : 'active';
  await db('leave_year_settings')
    .where({ id })
    .update({ status: newStatus, updated_at: new Date() });

  res.json({ success: true, message: `Status updated to ${newStatus}` });
}));

router.delete('/leave-year-settings/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  await ensureLeaveYearSettingsTable(db);
  const id = Number(req.params.id);

  await db('leave_year_settings')
    .where({ id, organization_id: ctx.organizationId, is_default: false })
    .del();

  res.json({ success: true, message: 'Leave year setting deleted successfully' });
}));

router.delete('/leave-types/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  // Soft delete leave type
  await db('leave_types')
    .where({ id })
    .update({
      deleted_at: new Date(),
      status: 'inactive'
    });

  // Deactivate assignments
  await db('leave_policy_assignments')
    .where({ organization_id: ctx.organizationId, leave_type_id: id })
    .update({
      is_active: false,
      updated_at: new Date()
    });

  res.json({ success: true, message: 'Leave type deleted successfully' });
}));

// GET resolved settings for the logged-in employee based on their location
router.get('/org-leave-settings/my-resolved', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  try {
    const orgId = ctx?.organizationId || 1;
    let locationId: string | number | null = null;
    if (ctx?.userId) {
      const user = await db('users').where('id', ctx.userId).first();
      if (user?.employee_id) {
        const employee = await db('employees')
          .where('id', user.employee_id)
          .first();
        locationId = employee?.current_location_id || null;
      }
    }

    const settings = await getOrgLeaveSettings(orgId, locationId);
    res.status(200).json({ success: true, data: settings });
  } catch (err: any) {
    console.error('Error fetching my-resolved org leave settings:', err);
    res.status(200).json({
      success: true,
      data: {
        organizationId: ctx?.organizationId || 1,
        locationId: null,
        normalWorkingHoursDaily: 9,
        fullTimeHours: 8,
        weeklyWorkPattern: getDefaultWeeklyWorkPattern(),
        holidayYearStartMonth: 4,
        maxConsecutiveAnnualLeaveDays: null,
        leaveClubbingRules: [],
        leaveRestrictionRules: [],
        defaultWeekDay: null,
        disableLeaveApplicationReminder: false,
        showPopupOnWeekOffOrHoliday: false,
        leaveApplicationDateRestriction: false,
      }
    });
  }
}));

// GET resolved settings for a location or org-wide fallback
router.get('/org-leave-settings/resolved', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const locationId = req.query.locationId as string || null;
  try {
    const settings = await getOrgLeaveSettings(ctx.organizationId, locationId);
    res.status(200).json({ success: true, data: settings });
  } catch (err: any) {
    // Table may not exist yet if migration hasn't run
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.message?.includes('no such table') || err?.message?.includes("doesn't exist")) {
      res.status(200).json({
        success: true,
        data: {
          organizationId: ctx.organizationId,
          locationId: null,
          normalWorkingHoursDaily: 9,
          fullTimeHours: 8,
          weeklyWorkPattern: getDefaultWeeklyWorkPattern(),
          holidayYearStartMonth: 4,
          maxConsecutiveAnnualLeaveDays: null
        }
      });
      return;
    }
    throw err;
  }
}));

// GET list of all settings (org-wide and overrides)
router.get('/org-leave-settings', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  // Safely drop the foreign key constraint to support both locations and attendance_locations tables
  try {
    await db.schema.alterTable('org_leave_settings', (table) => {
      table.dropForeign(['location_id']);
    });
  } catch (fkErr) {
    // Ignore if constraint already dropped or doesn't exist
  }

  try {
    const settings = await db('org_leave_settings')
      .where('organization_id', ctx.organizationId);
    const parsedSettings = settings.map((row: any) => {
      const parseJson = (val: any) => {
        if (!val) return null;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
      };

      const getVal = (field1: string, field2: string) => {
        if (row[field1] !== undefined) return row[field1];
        if (row[field2] !== undefined) return row[field2];
        return null;
      };

      const normalWorkingHoursDaily = getVal('normalWorkingHoursDaily', 'normal_working_hours_daily');
      const fullTimeHours = getVal('fullTimeHours', 'full_time_hours');
      const weeklyWorkPattern = parseJson(getVal('weeklyWorkPattern', 'weekly_work_pattern'));
      const holidayYearStartMonth = getVal('holidayYearStartMonth', 'holiday_year_start_month');
      const maxConsecutiveAnnualLeaveDays = getVal('maxConsecutiveAnnualLeaveDays', 'max_consecutive_annual_leave_days');
      const leaveClubbingRules = parseJson(getVal('leaveClubbingRules', 'leave_clubbing_rules'));
      const leaveRestrictionRules = parseJson(getVal('leaveRestrictionRules', 'leave_restriction_rules'));
      const defaultWeekDay = getVal('defaultWeekDay', 'default_week_day');
      const disableLeaveApplicationReminder = getVal('disableLeaveApplicationReminder', 'disable_leave_application_reminder');
      const showPopupOnWeekOffOrHoliday = getVal('showPopupOnWeekOffOrHoliday', 'show_popup_on_week_off_or_holiday');
      const leaveApplicationDateRestriction = getVal('leaveApplicationDateRestriction', 'leave_application_date_restriction');
      const leaveApplicationStartDay = getVal('leaveApplicationStartDay', 'leave_application_start_day');
      const leaveApplicationStartMonth = getVal('leaveApplicationStartMonth', 'leave_application_start_month');
      const defaultLeaveMonth = getVal('defaultLeaveMonth', 'default_leave_month');
      const enableBackupPersonRaw = getVal('enableBackupPerson', 'enable_backup_person');
      const enableBackupPerson = enableBackupPersonRaw !== null && enableBackupPersonRaw !== undefined ? !!enableBackupPersonRaw : true;

      const organization_id = getVal('organizationId', 'organization_id');
      const location_id = getVal('locationId', 'location_id');

      return {
        ...row,
        normalWorkingHoursDaily,
        fullTimeHours,
        weeklyWorkPattern,
        holidayYearStartMonth,
        maxConsecutiveAnnualLeaveDays,
        leaveClubbingRules,
        leaveRestrictionRules,
        defaultWeekDay,
        disableLeaveApplicationReminder,
        showPopupOnWeekOffOrHoliday,
        leaveApplicationDateRestriction,
        leaveApplicationStartDay,
        leaveApplicationStartMonth,
        defaultLeaveMonth,
        enableBackupPerson,

        organization_id,
        location_id,
        normal_working_hours_daily: normalWorkingHoursDaily,
        full_time_hours: fullTimeHours,
        weekly_work_pattern: weeklyWorkPattern,
        holiday_year_start_month: holidayYearStartMonth,
        max_consecutive_annual_leave_days: maxConsecutiveAnnualLeaveDays,
        leave_clubbing_rules: leaveClubbingRules,
        leave_restriction_rules: leaveRestrictionRules,
        default_week_day: defaultWeekDay,
        disable_leave_application_reminder: disableLeaveApplicationReminder,
        show_popup_on_week_off_or_holiday: showPopupOnWeekOffOrHoliday,
        leave_application_date_restriction: leaveApplicationDateRestriction,
        leave_application_start_day: leaveApplicationStartDay,
        leave_application_start_month: leaveApplicationStartMonth,
        default_leave_month: defaultLeaveMonth,
        enable_backup_person: enableBackupPerson
      };
    });
    res.status(200).json({ success: true, data: parsedSettings });
  } catch (err: any) {
    // Table may not exist yet if migration hasn't run
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.message?.includes('no such table') || err?.message?.includes("doesn't exist")) {
      res.status(200).json({ success: true, data: [] });
    } else {
      throw err;
    }
  }
}));

// POST/PUT save settings (upsert style)
router.post('/org-leave-settings', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  try {
    // Check if table exists first
    try {
      await db.raw("SELECT 1 FROM org_leave_settings LIMIT 0");
    } catch (err: any) {
      if (err?.code === 'ER_NO_SUCH_TABLE' || err?.message?.includes('no such table') || err?.message?.includes("doesn't exist")) {
        res.status(503).json({ success: false, message: 'org_leave_settings table does not exist yet. Please run database migrations first (cd database && npm run migrate).' });
        return;
      }
      throw err;
    }

    // Safely check if enable_backup_person column exists
    const hasEnableBackupPersonCol = await db.schema.hasColumn('org_leave_settings', 'enable_backup_person');
    if (!hasEnableBackupPersonCol) {
      await db.schema.alterTable('org_leave_settings', (table) => {
        table.boolean('enable_backup_person').defaultTo(true);
      });
    }

    const {
      locationId, // UUID string
      normalWorkingHoursDaily,
      fullTimeHours,
      weeklyWorkPattern,
      holidayYearStartMonth,
      maxConsecutiveAnnualLeaveDays,
      leaveClubbingRules,
      leaveRestrictionRules,
      defaultWeekDay,
      disableLeaveApplicationReminder,
      showPopupOnWeekOffOrHoliday,
      leaveApplicationDateRestriction,
      leaveApplicationStartDay,
      leaveApplicationStartMonth,
      defaultLeaveMonth,
      enableBackupPerson,
      enable_backup_person
    } = req.body;

    const backupPersonVal = enableBackupPerson !== undefined ? enableBackupPerson : enable_backup_person;

    // Validate locationId exists or is null
    let finalLocationUuid: string | null = null;
    if (locationId && locationId !== 'null' && locationId !== 'undefined' && locationId !== 'all' && locationId !== 'global' && locationId !== 'organization') {
      let loc = await db('locations').where('uuid', locationId).orWhere('id', locationId).first();
      if (!loc) {
        loc = await db('attendance_locations').where('uuid', locationId).orWhere('id', locationId).first();
      }
      if (!loc) {
        const org = await db('organizations').where('uuid', locationId).orWhere('id', locationId).first();
        if (org) {
          finalLocationUuid = null;
        } else {
          finalLocationUuid = locationId;
        }
      } else {
        finalLocationUuid = loc.uuid || String(loc.id);
      }
    }

    // Check if settings already exist for this combination
    const query = db('org_leave_settings')
      .where('organization_id', ctx.organizationId);

    if (finalLocationUuid) {
      query.where('location_id', finalLocationUuid);
    } else {
      query.whereNull('location_id');
    }

    const existing = await query.first();

    const dataToSave: any = {
      updated_at: new Date(),
      updated_by: ctx.userId
    };

    const setIfDefined = (dbCol: string, val: any, transform?: (v: any) => any) => {
      if (val !== undefined) {
        dataToSave[dbCol] = transform ? transform(val) : val;
      } else if (!existing) {
        if (!finalLocationUuid) {
          if (dbCol === 'normal_working_hours_daily') dataToSave[dbCol] = 9;
          else if (dbCol === 'full_time_hours') dataToSave[dbCol] = 8;
          else if (dbCol === 'holiday_year_start_month') dataToSave[dbCol] = 4;
          else if (dbCol === 'leave_application_start_day') dataToSave[dbCol] = 1;
          else if (dbCol === 'enable_backup_person') dataToSave[dbCol] = true;
          else dataToSave[dbCol] = null;
        } else {
          dataToSave[dbCol] = null;
        }
      }
    };

    setIfDefined('normal_working_hours_daily', normalWorkingHoursDaily, (v) => v !== null && v !== '' ? parseFloat(v) : 9);
    setIfDefined('full_time_hours', fullTimeHours, (v) => v !== null && v !== '' ? parseFloat(v) : 8);
    setIfDefined('weekly_work_pattern', weeklyWorkPattern, (v) => v ? (typeof v === 'string' ? v : JSON.stringify(v)) : null);
    setIfDefined('holiday_year_start_month', holidayYearStartMonth, (v) => v !== null && v !== '' ? parseInt(v, 10) : null);
    setIfDefined('max_consecutive_annual_leave_days', maxConsecutiveAnnualLeaveDays, (v) => v !== null && v !== '' ? parseFloat(v) : null);
    setIfDefined('leave_clubbing_rules', leaveClubbingRules, (v) => v ? (typeof v === 'string' ? v : JSON.stringify(v)) : null);
    setIfDefined('leave_restriction_rules', leaveRestrictionRules, (v) => v ? (typeof v === 'string' ? v : JSON.stringify(v)) : null);
    setIfDefined('default_week_day', defaultWeekDay, (v) => v || null);
    setIfDefined('disable_leave_application_reminder', disableLeaveApplicationReminder, (v) => !!v);
    setIfDefined('show_popup_on_week_off_or_holiday', showPopupOnWeekOffOrHoliday, (v) => !!v);
    setIfDefined('leave_application_date_restriction', leaveApplicationDateRestriction, (v) => !!v);
    setIfDefined('leave_application_start_day', leaveApplicationStartDay, (v) => v !== null && v !== '' ? parseInt(v, 10) : 1);
    setIfDefined('leave_application_start_month', leaveApplicationStartMonth, (v) => v !== null && v !== '' ? parseInt(v, 10) : null);
    setIfDefined('default_leave_month', defaultLeaveMonth, (v) => v !== null && v !== '' ? parseInt(v, 10) : null);
    setIfDefined('enable_backup_person', backupPersonVal, (v) => !!v);

    if (existing) {
      await db('org_leave_settings')
        .where('id', existing.id)
        .update(dataToSave);
    } else {
      const id = uuidv4();
      await db('org_leave_settings').insert({
        id,
        organization_id: ctx.organizationId,
        location_id: finalLocationUuid,
        created_by: ctx.userId,
        created_at: new Date(),
        ...dataToSave
      });
    }

    // Clean up empty override row if all location overrides are deleted
    if (finalLocationUuid) {
      const updatedRow = await db('org_leave_settings')
        .where('organization_id', ctx.organizationId)
        .where('location_id', finalLocationUuid)
        .first();

      if (updatedRow) {
        const hasWorkPattern = updatedRow.weeklyWorkPattern !== null && updatedRow.weeklyWorkPattern !== undefined;
        const hasStartMonth = updatedRow.leaveApplicationStartMonth !== null && updatedRow.leaveApplicationStartMonth !== undefined;
        const hasHolidayMonth = updatedRow.holidayYearStartMonth !== null && updatedRow.holidayYearStartMonth !== undefined;
        const hasWeekDay = updatedRow.defaultWeekDay !== null && updatedRow.defaultWeekDay !== undefined;

        const parseJsonList = (val: any) => {
          if (!val) return [];
          if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return []; }
          }
          return val;
        };
        const clubbing = parseJsonList(updatedRow.leaveClubbingRules);
        const restriction = parseJsonList(updatedRow.leaveRestrictionRules);
        const hasClubbing = Array.isArray(clubbing) && clubbing.length > 0;
        const hasRestriction = Array.isArray(restriction) && restriction.length > 0;

        if (!hasWorkPattern && !hasStartMonth && !hasHolidayMonth && !hasWeekDay && !hasClubbing && !hasRestriction) {
          await db('org_leave_settings')
            .where('id', updatedRow.id)
            .delete();
        }
      }
    }

    res.status(200).json({ success: true, message: 'Leave settings saved successfully.' });
  } catch (err: any) {
    console.error('[SETTINGS POST ERROR]', err);
    throw err;
  }
}));




// DELETE organization settings row (to reset overrides to defaults)
router.delete('/org-leave-settings/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const { id } = req.params;

  await db('org_leave_settings')
    .where('id', id)
    .where('organization_id', ctx.organizationId)
    .delete();

  res.json({ success: true, message: 'Settings override deleted successfully.' });
}));

function parseStatusString(val: any, defaultStatus: 'active' | 'inactive' = 'active'): 'active' | 'inactive' {
  if (val === undefined || val === null || val === '') return defaultStatus;
  if (val === false || val === 'false' || val === 0 || val === '0' || val === 'inactive') return 'inactive';
  if (val === true || val === 'true' || val === 1 || val === '1' || val === 'active') return 'active';
  return 'active';
}

function toBool(val: any): boolean {
  return parseStatusString(val) === 'active';
}

function validateLatePolicyBody(body: any): string | null {
  const { name } = body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return 'Policy name is required.';
  }
  return null;
}

// safeParseJson helper for late deduction JSON columns
const safeParseJson = (val: any) => {
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return Array.isArray(val) ? val : [];
};

// Helper function to dynamically add 'status' column and drop 'is_active'
async function ensureLateDeductionTablesSchema(db: any) {
  try {
    const hasPolicy = await db.schema.hasTable('late_deduction_policies');
    if (hasPolicy) {
      const hasStatus = await db.schema.hasColumn('late_deduction_policies', 'status');
      const hasIsActive = await db.schema.hasColumn('late_deduction_policies', 'is_active');
      if (!hasStatus) {
        await db.schema.alterTable('late_deduction_policies', (table: any) => {
          table.string('status', 50).defaultTo('active');
        });
        if (hasIsActive) {
          // Copy values from is_active to status
          const rows = await db('late_deduction_policies');
          for (const row of rows) {
            await db('late_deduction_policies')
              .where('id', row.id)
              .update({ status: row.is_active === 0 || row.is_active === false ? 'inactive' : 'active' });
          }
          await db.schema.alterTable('late_deduction_policies', (table: any) => {
            table.dropColumn('is_active');
          });
        }
      }
    }

    const hasUpdation = await db.schema.hasTable('late_updations');
    if (hasUpdation) {
      const hasStatus = await db.schema.hasColumn('late_updations', 'status');
      const hasIsActive = await db.schema.hasColumn('late_updations', 'is_active');
      if (!hasStatus) {
        await db.schema.alterTable('late_updations', (table: any) => {
          table.string('status', 50).defaultTo('active');
        });
        if (hasIsActive) {
          // Copy values from is_active to status
          const rows = await db('late_updations');
          for (const row of rows) {
            await db('late_updations')
              .where('id', row.id)
              .update({ status: row.is_active === 0 || row.is_active === false ? 'inactive' : 'active' });
          }
          await db.schema.alterTable('late_updations', (table: any) => {
            table.dropColumn('is_active');
          });
        }
      }
    }
  } catch (err) {
    console.error('[ensureLateDeductionTablesSchema error]', err);
  }
}

// GET all late deduction policies
router.get('/late-deduction-policies', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  await ensureLateDeductionTablesSchema(db);

  const policies = await db('late_deduction_policies')
    .where('organization_id', ctx.organizationId)
    .orderBy('id', 'desc');

  const mapped = policies.map((p: any) => {
    const deduction_sequence = safeParseJson(p.deductionSequence || p.deduction_sequence);
    const locations = safeParseJson(p.locations);
    const departments = safeParseJson(p.departments);
    const grades = safeParseJson(p.grades);
    const shifts = safeParseJson(p.shifts);
    const employee_statuses = safeParseJson(p.employeeStatuses || p.employee_statuses);
    const status = p.status || 'active';

    return {
      ...p,
      policy_type: p.policyType || p.policy_type || 'Late Coming',
      first_deduction_on: p.firstDeductionOn ?? p.first_deduction_on ?? 3,
      buffer_allowed: p.bufferAllowed ?? p.buffer_allowed ?? 15,
      no_buffer_allowed: p.noBufferAllowed ?? p.no_buffer_allowed ?? 0,
      deduct_type: p.deductType || p.deduct_type || 'Leave',
      deduction_unit: p.deductionUnit ?? p.deduction_unit ?? 1.0,
      after_deduction_amount: p.afterDeductionAmount ?? p.after_deduction_amount ?? 0.5,
      after_deduction_every: p.afterDeductionEvery ?? p.after_deduction_every ?? 1,
      deduction_sequence,
      locations,
      departments,
      grades,
      shifts,
      employee_statuses,
      status,
      is_active: status === 'active'
    };
  });

  res.status(200).json({ success: true, data: mapped });
}));

// POST new late deduction policy
// GET late deduction policy eligibility data (locations, departments, shifts, employee_statuses)
router.get('/late-deduction-policies/eligibility-data', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  await ensureLateDeductionTablesSchema(db);

  // 1. Fetch locations
  const locations = await db('locations')
    .where('organization_id', ctx.organizationId)
    .whereNull('deleted_at');

  // 2. Fetch departments
  const departments = await db('departments')
    .where('organization_id', ctx.organizationId)
    .whereNull('deleted_at');

  // 3. Fetch shifts
  const shifts = await db('shift_templates')
    .where('organization_id', ctx.organizationId)
    .whereNull('deleted_at');

  // 4. Fetch employee statuses (distinct from employees)
  const statusesRows = await db('employees')
    .distinct('status')
    .where('organization_id', ctx.organizationId)
    .whereNotNull('status')
    .whereNot('status', '')
    .orderBy('status', 'asc');
  const employeeStatuses = statusesRows.map((r: any) => r.status);

  res.status(200).json({
    success: true,
    data: {
      locations,
      departments,
      shifts,
      employee_statuses: employeeStatuses.length > 0 ? employeeStatuses : ['Active', 'Inactive']
    }
  });
}));

// GET single late deduction policy by ID
router.get('/late-deduction-policies/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid policy ID.' });
  }

  const policy = await db('late_deduction_policies')
    .where({ id, organization_id: ctx.organizationId })
    .first();

  if (!policy) {
    return res.status(404).json({ success: false, message: 'Policy not found.' });
  }

  res.status(200).json({
    success: true,
    data: {
      ...policy,
      first_deduction_on: policy.first_deduction_on !== null && policy.first_deduction_on !== undefined ? Number(policy.first_deduction_on) : 3,
      firstDeductionOn: policy.first_deduction_on !== null && policy.first_deduction_on !== undefined ? Number(policy.first_deduction_on) : 3,
      buffer_allowed: policy.buffer_allowed !== null && policy.buffer_allowed !== undefined ? Number(policy.buffer_allowed) : 15,
      bufferAllowed: policy.buffer_allowed !== null && policy.buffer_allowed !== undefined ? Number(policy.buffer_allowed) : 15,
      no_buffer_allowed: policy.no_buffer_allowed !== null && policy.no_buffer_allowed !== undefined ? Number(policy.no_buffer_allowed) : 0,
      noBufferAllowed: policy.no_buffer_allowed !== null && policy.no_buffer_allowed !== undefined ? Number(policy.no_buffer_allowed) : 0,
      deduct_type: policy.deduct_type || 'Leave',
      deductType: policy.deduct_type || 'Leave',
      deduction_unit: policy.deduction_unit !== null && policy.deduction_unit !== undefined ? Number(policy.deduction_unit) : 1.0,
      deductionUnit: policy.deduction_unit !== null && policy.deduction_unit !== undefined ? Number(policy.deduction_unit) : 1.0,
      after_deduction_amount: policy.after_deduction_amount !== null && policy.after_deduction_amount !== undefined ? Number(policy.after_deduction_amount) : 0.5,
      afterDeductionAmount: policy.after_deduction_amount !== null && policy.after_deduction_amount !== undefined ? Number(policy.after_deduction_amount) : 0.5,
      after_deduction_every: policy.after_deduction_every !== null && policy.after_deduction_every !== undefined ? Number(policy.after_deduction_every) : 1,
      afterDeductionEvery: policy.after_deduction_every !== null && policy.after_deduction_every !== undefined ? Number(policy.after_deduction_every) : 1,
      policy_type: policy.policy_type || 'Late Coming',
      policyType: policy.policy_type || 'Late Coming',
      deduction_sequence: safeParseJson(policy.deduction_sequence),
      deductionSequence: safeParseJson(policy.deduction_sequence),
      locations: safeParseJson(policy.locations),
      departments: safeParseJson(policy.departments),
      grades: safeParseJson(policy.grades),
      shifts: safeParseJson(policy.shifts),
      employee_statuses: safeParseJson(policy.employee_statuses),
      employeeStatuses: safeParseJson(policy.employee_statuses),
      is_active: parseStatusString(policy.is_active, 'active'),
      status: parseStatusString(policy.is_active, 'active'),
      isActive: toBool(policy.is_active),
    },
  });
}));

// POST create late deduction policy
router.post('/late-deduction-policies', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const {
    name,
    policy_type,
    first_deduction_on,
    buffer_allowed,
    no_buffer_allowed,
    deduct_type,
    deduction_unit,
    after_deduction_amount,
    after_deduction_every,
    deduction_sequence,
    locations,
    departments,
    grades,
    shifts,
    employee_statuses,
    status,
    is_active
  } = req.body;

  const finalStatus = status || (is_active === false ? 'inactive' : 'active');

  const [id] = await db('late_deduction_policies').insert({
    organization_id: ctx.organizationId,
    name,
    policy_type: policy_type || 'Late Coming',
    first_deduction_on: parseInt(first_deduction_on, 10) || 3,
    buffer_allowed: parseInt(buffer_allowed, 10) || 15,
    no_buffer_allowed: parseInt(no_buffer_allowed, 10) || 0,
    deduct_type: deduct_type || 'Leave',
    deduction_unit: parseFloat(deduction_unit) || 1.0,
    after_deduction_amount: parseFloat(after_deduction_amount) || 0.5,
    after_deduction_every: parseInt(after_deduction_every, 10) || 1,
    deduction_sequence: deduction_sequence ? JSON.stringify(deduction_sequence) : null,
    locations: locations ? JSON.stringify(locations) : null,
    departments: departments ? JSON.stringify(departments) : null,
    grades: grades ? JSON.stringify(grades) : null,
    shifts: shifts ? JSON.stringify(shifts) : null,
    employee_statuses: employee_statuses ? JSON.stringify(employee_statuses) : null,
    status: finalStatus,
    created_at: new Date(),
    updated_at: new Date()
  });

  res.status(201).json({
    success: true,
    message: 'Late deduction policy created successfully.',
    data: { id },
  });
}));

// PATCH toggle late deduction policy status
router.patch('/late-deduction-policies/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, message: 'Invalid policy ID.' });
  }

  const existing = await db('late_deduction_policies')
    .where({ id, organization_id: ctx.organizationId })
    .first();

  if (!existing) {
    return res.status(404).json({ success: false, message: 'Policy not found.' });
  }

  const incomingVal = req.body.status !== undefined
    ? req.body.status
    : (req.body.is_active !== undefined ? req.body.is_active : req.body.isActive);
  const currentStatus = parseStatusString(existing.status || existing.is_active, 'active');
  const newStatus = incomingVal !== undefined
    ? parseStatusString(incomingVal, 'active')
    : (currentStatus === 'active' ? 'inactive' : 'active');

  await db('late_deduction_policies')
    .where({ id, organization_id: ctx.organizationId })
    .update({
      status: newStatus,
      updated_at: new Date(),
    });

  res.status(200).json({
    success: true,
    message: `Policy ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully.`,
    data: { status: newStatus, is_active: newStatus === 'active', isActive: newStatus === 'active' },
  });
}));

// PUT update late deduction policy
router.put('/late-deduction-policies/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  const {
    name,
    policy_type,
    first_deduction_on,
    buffer_allowed,
    no_buffer_allowed,
    deduct_type,
    deduction_unit,
    after_deduction_amount,
    after_deduction_every,
    deduction_sequence,
    locations,
    departments,
    grades,
    shifts,
    employee_statuses,
    status,
    is_active
  } = req.body;

  const finalStatus = status || (is_active === false ? 'inactive' : 'active');

  await db('late_deduction_policies')
    .where({ id, organization_id: ctx.organizationId })
    .update({
      name,
      policy_type: policy_type || 'Late Coming',
      first_deduction_on: parseInt(first_deduction_on, 10) || 3,
      buffer_allowed: parseInt(buffer_allowed, 10) || 15,
      no_buffer_allowed: parseInt(no_buffer_allowed, 10) || 0,
      deduct_type: deduct_type || 'Leave',
      deduction_unit: parseFloat(deduction_unit) || 1.0,
      after_deduction_amount: parseFloat(after_deduction_amount) || 0.5,
      after_deduction_every: parseInt(after_deduction_every, 10) || 1,
      deduction_sequence: deduction_sequence ? JSON.stringify(deduction_sequence) : null,
      locations: locations ? JSON.stringify(locations) : null,
      departments: departments ? JSON.stringify(departments) : null,
      grades: grades ? JSON.stringify(grades) : null,
      shifts: shifts ? JSON.stringify(shifts) : null,
      employee_statuses: employee_statuses ? JSON.stringify(employee_statuses) : null,
      status: finalStatus,
      updated_at: new Date()
    });

  res.status(200).json({ success: true, message: 'Late deduction policy updated successfully.' });
}));

// DELETE late deduction policy
router.delete('/late-deduction-policies/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  await db('late_deduction_policies')
    .where({ id, organization_id: ctx.organizationId })
    .delete();

  res.status(200).json({ success: true, message: 'Late deduction policy deleted successfully.' });
}));

// GET all late updations
router.get('/late-updations', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  await ensureLateDeductionTablesSchema(db);

  const updations = await db('late_updations')
    .where('organization_id', ctx.organizationId)
    .orderBy('id', 'desc');

  const mapped = updations.map((p: any) => {
    const locations = safeParseJson(p.locations);
    const departments = safeParseJson(p.departments);
    const grades = safeParseJson(p.grades);
    const shifts = safeParseJson(p.shifts);
    const employee_statuses = safeParseJson(p.employeeStatuses || p.employee_statuses);
    const status = p.status || 'active';
    const auto_apply_leave = p.autoApplyLeave ?? p.auto_apply_leave ?? false;

    return {
      ...p,
      late_coming_after: p.lateComingAfter || p.late_coming_after || '09:30',
      update_for: p.updateFor || p.update_for || 'Half Day',
      auto_apply_leave: auto_apply_leave === 1 || auto_apply_leave === true,
      locations,
      departments,
      grades,
      shifts,
      employee_statuses,
      status,
      is_active: status === 'active'
    };
  });

  res.status(200).json({ success: true, data: mapped });
}));

// POST new late updation
router.post('/late-updations', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  await ensureLateDeductionTablesSchema(db);

  const {
    name,
    late_coming_after,
    update_for,
    auto_apply_leave,
    locations,
    departments,
    grades,
    shifts,
    employee_statuses,
    status,
    is_active
  } = req.body;

  const finalStatus = status || (is_active === false ? 'inactive' : 'active');

  const [id] = await db('late_updations').insert({
    organization_id: ctx.organizationId,
    name,
    late_coming_after: late_coming_after || '09:30',
    update_for: update_for || 'Half Day',
    auto_apply_leave: auto_apply_leave === undefined ? false : !!auto_apply_leave,
    locations: locations ? JSON.stringify(locations) : null,
    departments: departments ? JSON.stringify(departments) : null,
    grades: grades ? JSON.stringify(grades) : null,
    shifts: shifts ? JSON.stringify(shifts) : null,
    employee_statuses: employee_statuses ? JSON.stringify(employee_statuses) : null,
    status: finalStatus,
    created_at: new Date(),
    updated_at: new Date()
  });

  res.status(201).json({ success: true, message: 'Late updation created successfully.', data: { id } });
}));

// PUT update late updation
router.put('/late-updations/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  await ensureLateDeductionTablesSchema(db);

  const id = Number(req.params.id);

  const {
    name,
    late_coming_after,
    update_for,
    auto_apply_leave,
    locations,
    departments,
    grades,
    shifts,
    employee_statuses,
    status,
    is_active
  } = req.body;

  const finalStatus = status || (is_active === false ? 'inactive' : 'active');

  await db('late_updations')
    .where({ id, organization_id: ctx.organizationId })
    .update({
      name,
      late_coming_after: late_coming_after || '09:30',
      update_for: update_for || 'Half Day',
      auto_apply_leave: auto_apply_leave === undefined ? false : !!auto_apply_leave,
      locations: locations ? JSON.stringify(locations) : null,
      departments: departments ? JSON.stringify(departments) : null,
      grades: grades ? JSON.stringify(grades) : null,
      shifts: shifts ? JSON.stringify(shifts) : null,
      employee_statuses: employee_statuses ? JSON.stringify(employee_statuses) : null,
      status: finalStatus,
      updated_at: new Date()
    });

  res.status(200).json({ success: true, message: 'Late updation updated successfully.' });
}));

// DELETE late updation
router.delete('/late-updations/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  await db('late_updations')
    .where({ id, organization_id: ctx.organizationId })
    .delete();

  res.status(200).json({ success: true, message: 'Late updation deleted successfully.' });
}));

// GET all auto deduction logs
router.get('/late-auto-deductions/logs', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const logs = await db('late_auto_deduction_logs')
    .where('organization_id', ctx.organizationId)
    .orderBy('id', 'desc');

  res.status(200).json({ success: true, data: logs });
}));

// POST manual trigger or dry-run of late auto deduction
router.post('/late-auto-deductions/run', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const { month, isDryRun } = req.body; // e.g., '2026-07'

  // Retrieve active employees
  const employees = await db('employees')
    .where('organization_id', ctx.organizationId)
    .whereNull('deleted_at');

  // Retrieve active late policies
  const policies = await db('late_deduction_policies')
    .where('organization_id', ctx.organizationId)
    .where('status', 'active');

  const preview = [];
  let totalDeductions = 0;

  for (const emp of employees) {
    // Find matching policy for this employee
    const matchedPolicy = policies.find((policy: any) => {
      // Check location eligibility (match either branch ID or location ID)
      if (policy.locations) {
        const locIds = safeParseJson(policy.locations);
        if (locIds.length > 0 &&
          !locIds.includes(Number(emp.current_location_id)) &&
          !locIds.includes(Number(emp.current_branch_id))) {
          return false;
        }
      }

      // Check department eligibility
      if (policy.departments) {
        const deptIds = safeParseJson(policy.departments);
        if (deptIds.length > 0 && !deptIds.includes(Number(emp.current_department_id))) {
          return false;
        }
      }

      // Check grade eligibility
      if (policy.grades) {
        const grades = safeParseJson(policy.grades);
        if (grades.length > 0 && !grades.includes(emp.grade)) {
          return false;
        }
      }

      // Check employee status eligibility
      if (policy.employee_statuses) {
        const statuses = safeParseJson(policy.employee_statuses);
        if (statuses.length > 0 && !statuses.includes(emp.status)) {
          return false;
        }
      }

      return true;
    });

    if (!matchedPolicy) continue;

    // Shift check eligibility
    if (matchedPolicy.shifts) {
      const shiftIds = safeParseJson(matchedPolicy.shifts);
      if (shiftIds.length > 0) {
        const assignment = await db('employee_shift_assignments')
          .where('employee_id', emp.id)
          .first();
        if (!assignment || !shiftIds.includes(Number(assignment.shift_id))) {
          continue;
        }
      }
    }

    // Query actual attendance records for this month based on policy type (is_late vs is_early_departure)
    const isLatePolicy = matchedPolicy.policy_type === 'Late Coming';
    const checkColumn = isLatePolicy ? 'is_late' : 'is_early_departure';

    const lateRecords = await db('attendance_records')
      .where('organization_id', ctx.organizationId)
      .where('employee_id', emp.id)
      .where(checkColumn, true)
      .andWhereRaw("DATE_FORMAT(check_in_date, '%Y-%m') = ?", [month]);

    const lateCount = lateRecords.length;

    const firstDeductionOn = matchedPolicy.first_deduction_on || 3;
    if (lateCount >= firstDeductionOn) {
      const deductionUnit = parseFloat(matchedPolicy.deduction_unit) || 1.0;
      const afterDeductionAmount = parseFloat(matchedPolicy.after_deduction_amount) || 0.5;
      const afterDeductionEvery = parseInt(matchedPolicy.after_deduction_every, 10) || 1;

      const remainingLates = lateCount - firstDeductionOn;
      const deduction = deductionUnit + (Math.floor(remainingLates / afterDeductionEvery) * afterDeductionAmount);

      if (deduction > 0) {
        totalDeductions += deduction;
        const deductionDetails: Array<{ type: string; amount: number }> = [];
        let remainingDeduction = deduction;

        // Perform multi-tier deduction sequence from balances
        const deductionSequence = safeParseJson(matchedPolicy.deduction_sequence);
        const deductType = matchedPolicy.deduct_type || 'Leave';

        if (deductType === 'Salary') {
          deductionDetails.push({ type: 'Salary', amount: remainingDeduction });
          remainingDeduction = 0;
        } else {
          // Sequentially deduct from the leave types priority sequence list
          for (const seqItem of deductionSequence) {
            if (remainingDeduction <= 0) break;

            if (seqItem === 'Salary') {
              deductionDetails.push({ type: 'Salary', amount: remainingDeduction });
              remainingDeduction = 0;
              break;
            }

            // Find matching leave type by name/code
            const leaveType = await db('leave_types')
              .where('organization_id', ctx.organizationId)
              .where(function () {
                this.whereRaw('LOWER(leave_name) = ?', [seqItem.toLowerCase()])
                  .orWhereRaw('LOWER(leave_code) = ?', [seqItem.toLowerCase()]);
              })
              .first();

            if (leaveType) {
              const currentYear = new Date().getFullYear();
              const fyStart = `${currentYear}-04-01`;

              const activeBalance = await db('leave_balances')
                .where({ employee_id: emp.id, leave_type_id: leaveType.id })
                .where(function (this: any) {
                  this.where('financial_year_start', fyStart)
                    .orWhereRaw('YEAR(financial_year_start) = ?', [currentYear]);
                })
                .first();

              if (activeBalance) {
                const avail = parseFloat(activeBalance.available_balance || activeBalance.availableBalance || 0);
                if (avail > 0) {
                  const toDeduct = Math.min(avail, remainingDeduction);
                  const newAvailable = avail - toDeduct;
                  const newConsumed = parseFloat(activeBalance.consumed_balance || activeBalance.consumedBalance || 0) + toDeduct;

                  if (!isDryRun) {
                    await db('leave_balances')
                      .where('id', activeBalance.id)
                      .update({
                        available_balance: newAvailable,
                        consumed_balance: newConsumed,
                        updated_by: ctx.userId,
                        updated_at: new Date()
                      });

                    const hasLedger = await db.schema.hasTable('leave_ledger_entries');
                    if (hasLedger) {
                      await db('leave_ledger_entries').insert({
                        organization_id: ctx.organizationId,
                        employee_id: emp.id,
                        leave_type_id: leaveType.id,
                        transaction_type: 'DEBIT',
                        amount: toDeduct,
                        reason: `Late Deduction for month ${month} (${lateCount} lates)`,
                        created_by: ctx.userId,
                        created_at: new Date()
                      }).catch(() => { });
                    }
                  }

                  deductionDetails.push({ type: leaveType.leave_name || leaveType.leaveName, amount: toDeduct });
                  remainingDeduction -= toDeduct;
                }
              }
            }
          }

          if (remainingDeduction > 0) {
            deductionDetails.push({ type: 'LWP / Unpaid', amount: remainingDeduction });
          }
        }

        preview.push({
          employeeId: emp.id,
          employeeName: emp.first_name ? `${emp.first_name} ${emp.last_name || ''}`.trim() : `Employee #${emp.id}`,
          lateCount,
          deductedDays: deduction,
          details: deductionDetails.map(d => `${d.amount} day(s) from ${d.type}`).join(', ')
        });
      }
    }
  }

  if (!isDryRun && preview.length > 0) {
    await db('late_auto_deduction_logs').insert({
      organization_id: ctx.organizationId,
      month,
      evaluated: employees.length,
      deducted_leaves: totalDeductions,
      status: 'Success',
      execution_time: new Date()
    });
  }

  res.status(200).json({
    success: true,
    message: isDryRun ? 'Dry run generated successfully.' : 'Late deduction executed successfully.',
    data: {
      evaluated: employees.length,
      totalDeducted: totalDeductions,
      preview
    }
  });
}));

const gradeController = new GradeController();
router.get('/grades', asyncHandler(gradeController.list.bind(gradeController)));
router.get('/pay-grades', asyncHandler(gradeController.list.bind(gradeController)));
router.get('/grades/:id', asyncHandler(gradeController.get.bind(gradeController)));
router.post('/grades', asyncHandler(gradeController.create.bind(gradeController)));
router.put('/grades/:id', asyncHandler(gradeController.update.bind(gradeController)));
router.patch('/grades/:id', asyncHandler(gradeController.update.bind(gradeController)));
router.delete('/grades/:id', asyncHandler(gradeController.delete.bind(gradeController)));
router.post('/grades/:id/restore', asyncHandler(gradeController.restore.bind(gradeController)));
// --- Designations ---
router.get('/designations', asyncHandler(async (req: Request, res: Response) => {
  const result = await designationService.listDesignations(req.ctx!, req.query);
  res.json({ success: true, data: result.items, meta: result.meta });
}));

router.get('/designations/:id', asyncHandler(async (req: Request, res: Response) => {
  const data = await designationService.getDesignation(req.ctx!, req.params.id);
  res.json({ success: true, data });
}));

router.post('/designations', asyncHandler(async (req: Request, res: Response) => {
  const data = await designationService.createDesignation(req.ctx!, req.body);
  res.status(201).json({ success: true, data, message: 'Designation created successfully' });
}));

router.put('/designations/:id', asyncHandler(async (req: Request, res: Response) => {
  const data = await designationService.updateDesignation(req.ctx!, req.params.id, req.body);
  res.json({ success: true, data, message: 'Designation updated successfully' });
}));

router.delete('/designations/:id', asyncHandler(async (req: Request, res: Response) => {
  await designationService.deleteDesignation(req.ctx!, req.params.id);
  res.json({ success: true, message: 'Designation deleted successfully' });
}));

// --- Dummy routes for Designation mappings (if needed) ---
router.get('/org-companies-options', asyncHandler(async (req: Request, res: Response) => {
  const db = getKnex();
  const orgs = await db('organizations').select('id', 'name', 'location').whereNull('deleted_at');
  const formatted = orgs.map(o => ({
    id: o.id,
    name: o.location ? `${o.name} (${o.location})` : o.name
  }));
  res.json({ success: true, data: formatted });
}));
router.get('/org-locations', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  // 1. Fetch locations from master locations table
  let locQuery = db('locations')
    .where('organization_id', ctx.organizationId)
    .whereNull('deleted_at');

  if (ctx.companyId) {
    locQuery = locQuery.where('company_id', ctx.companyId);
  }

  const locs = await locQuery;

  const masterLocs = locs.map((l: any) => ({
    id: String(l.id),
    name: l.location_name || l.name || [l.office_type, l.city, l.state].filter(Boolean).join(' - ') || `Location #${l.id}`
  }));

  // 2. Fetch primary location from organizations table
  const orgs = await db('organizations')
    .where('id', ctx.organizationId)
    .whereNull('deleted_at')
    .select('id', 'name', 'location');

  const orgLocs = orgs
    .filter((o: any) => o.location && o.location.trim())
    .map((o: any) => ({
      id: `org-${o.id}`,
      name: `${o.name} (${o.location}) [Organization Location]`
    }));

  const combined = [...orgLocs, ...masterLocs];
  const uniqueList: any[] = [];
  const seenNames = new Set<string>();

  for (const item of combined) {
    if (item.name && !seenNames.has(item.name)) {
      seenNames.add(item.name);
      uniqueList.push(item);
    }
  }

  if (uniqueList.length === 0) {
    uniqueList.push(
      { id: 'loc-default-1', name: 'Main Corporate Office - Tech Park' },
      { id: 'loc-default-2', name: 'Regional Office - Delhi NCR' }
    );
  }

  res.json({ success: true, data: uniqueList });
}));
router.get('/shifts', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  let query = db('shift_templates').whereNull('deleted_at');
  if (ctx?.organizationId) {
    query = query.where(builder => {
      builder.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
    });
  }

  if (ctx?.companyId) {
    query = query.where('company_id', ctx.companyId);
  }

  const shifts = await query.orderBy('id', 'desc');

  if (!shifts || shifts.length === 0) {
    return res.json({
      success: true,
      data: []
    });
  }

  const formatted = shifts.map((s: any) => {
    const isRoster = (s.shift_type || s.shiftType || '').toLowerCase() === 'roster';
    const categoryTag = isRoster ? 'Roster Shift' : 'General Shift';
    const nameStr = s.shift_name || s.shiftName || s.name || `Shift #${s.id}`;
    return {
      id: String(s.id),
      name: nameStr,
      isRoster,
      shift_type: s.shift_type
    };
  });

  res.json({ success: true, data: formatted });
}));

// ==========================================
// COMPANY MASTER CRUD ROUTES
// ==========================================
import { CompanyController } from './controllers/CompanyController';
const companyCtrl = new CompanyController();

router.get('/companies', asyncHandler((req, res) => companyCtrl.list(req, res)));
router.get('/companies/:id', asyncHandler((req, res) => companyCtrl.getById(req, res)));
router.post('/companies', asyncHandler((req, res) => companyCtrl.create(req, res)));
router.put('/companies/:id', asyncHandler((req, res) => companyCtrl.update(req, res)));
router.delete('/companies/:id', asyncHandler((req, res) => companyCtrl.delete(req, res)));


// ─── Break Master Routes ──────────────────────────────────────────────────────
// Auto-create the `breaks` table if it doesn't exist yet (inline migration)
(async () => {
  try {
    const db = getKnex();
    const exists = await db.schema.hasTable('breaks');
    if (!exists) {
      await db.schema.createTable('breaks', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable().index();
        table.string('name', 150).notNullable();
        table.enum('break_type', ['Manual', 'Auto']).notNullable().defaultTo('Manual');
        table.string('biometric_device', 100).nullable();
        table.string('max_allow_time', 10).notNullable().defaultTo('00:15');
        table.enum('is_active', ['Yes', 'No']).notNullable().defaultTo('Yes');
        table.bigInteger('created_by').unsigned().nullable();
        table.bigInteger('updated_by').unsigned().nullable();
        table.datetime('created_at').notNullable();
        table.datetime('updated_at').notNullable();
        table.datetime('deleted_at').nullable();
        table.index(['organization_id', 'deleted_at']);
        table.index(['organization_id', 'is_active']);
      });
      console.log('[Settings] ✅ Created table: breaks');
    }
  } catch (err) {
    console.error('[Settings] ❌ Failed to create breaks table:', err);
  }
})();

const breakCtrl = new BreakController();
router.get('/breaks', asyncHandler((req, res) => breakCtrl.list(req, res)));
router.get('/breaks/:id', asyncHandler((req, res) => breakCtrl.get(req, res)));
router.post('/breaks', asyncHandler((req, res) => breakCtrl.create(req, res)));
router.patch('/breaks/:id', asyncHandler((req, res) => breakCtrl.update(req, res)));
router.delete('/breaks/:id', asyncHandler((req, res) => breakCtrl.delete(req, res)));
router.post('/breaks/:id/restore', asyncHandler((req, res) => breakCtrl.restore(req, res)));

// ─── Roles & Responsibilities Routes ──────────────────────────────────────────
(async () => {
  try {
    const db = getKnex();
    const exists = await db.schema.hasTable('roles_responsibilities');
    if (!exists) {
      await db.schema.createTable('roles_responsibilities', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable().index();
        table.bigInteger('company_id').unsigned().nullable();
        table.string('company_name', 150).nullable();
        table.bigInteger('department_id').unsigned().nullable();
        table.string('department_name', 150).nullable();
        table.bigInteger('designation_id').unsigned().nullable();
        table.string('designation_name', 150).nullable();
        table.bigInteger('kra_form_id').unsigned().nullable();
        table.string('kra_form', 150).nullable();
        table.text('responsibilities').notNullable();
        table.enum('is_active', ['Yes', 'No']).notNullable().defaultTo('Yes');
        table.bigInteger('created_by').unsigned().nullable();
        table.bigInteger('updated_by').unsigned().nullable();
        table.datetime('created_at').notNullable();
        table.datetime('updated_at').notNullable();
        table.datetime('deleted_at').nullable();
        table.index(['organization_id', 'deleted_at']);
        table.index(['organization_id', 'is_active']);
      });
      console.log('[Settings] ✅ Created table: roles_responsibilities');
    } else {
      // Migrate: add kra_form_id if missing
      const hasKraFormId = await db.schema.hasColumn('roles_responsibilities', 'kra_form_id');
      if (!hasKraFormId) {
        await db.schema.alterTable('roles_responsibilities', (table) => {
          table.bigInteger('kra_form_id').unsigned().nullable().after('designation_name');
        });
        console.log('[Settings] ✅ Migrated: added kra_form_id to roles_responsibilities');
      }
    }
  } catch (err) {
    console.error('[Settings] ❌ Failed to create/migrate roles_responsibilities table:', err);
  }
})();

const rolesRespCtrl = new RolesResponsibilityController();
router.get('/roles-responsibilities', asyncHandler((req, res) => rolesRespCtrl.list(req, res)));
router.get('/roles-responsibilities/:id', asyncHandler((req, res) => rolesRespCtrl.get(req, res)));
router.post('/roles-responsibilities', asyncHandler((req, res) => rolesRespCtrl.create(req, res)));
router.patch('/roles-responsibilities/:id', asyncHandler((req, res) => rolesRespCtrl.update(req, res)));
router.delete('/roles-responsibilities/:id', asyncHandler((req, res) => rolesRespCtrl.delete(req, res)));
router.post('/roles-responsibilities/:id/restore', asyncHandler((req, res) => rolesRespCtrl.restore(req, res)));

// ─── KRA Form Master Routes ───────────────────────────────────────────────────
(async () => {
  try {
    const db = getKnex();
    const exists = await db.schema.hasTable('kra_forms');
    if (!exists) {
      await db.schema.createTable('kra_forms', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable().index();
        table.string('title', 150).notNullable();
        table.text('description').nullable();
        table.enum('is_active', ['Yes', 'No']).notNullable().defaultTo('Yes');
        table.bigInteger('created_by').unsigned().nullable();
        table.bigInteger('updated_by').unsigned().nullable();
        table.datetime('created_at').notNullable();
        table.datetime('updated_at').notNullable();
        table.datetime('deleted_at').nullable();
        table.index(['organization_id', 'deleted_at']);
        table.index(['organization_id', 'is_active']);
      });
      console.log('[Settings] ✅ Created table: kra_forms');
    }
  } catch (err) {
    console.error('[Settings] ❌ Failed to create kra_forms table:', err);
  }
})();

const kraCtrl = new KraController();
router.get('/kras', asyncHandler((req, res) => kraCtrl.list(req, res)));
router.get('/kras/:id', asyncHandler((req, res) => kraCtrl.get(req, res)));
router.post('/kras', asyncHandler((req, res) => kraCtrl.create(req, res)));
router.patch('/kras/:id', asyncHandler((req, res) => kraCtrl.update(req, res)));
router.delete('/kras/:id', asyncHandler((req, res) => kraCtrl.delete(req, res)));
router.post('/kras/:id/restore', asyncHandler((req, res) => kraCtrl.restore(req, res)));

// ─── Notification Merge Codes Routes ──────────────────────────────────────────
(async () => {
  try {
    const db = getKnex();
    const exists = await db.schema.hasTable('notification_merge_codes');
    if (!exists) {
      await db.schema.createTable('notification_merge_codes', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable().index();
        table.string('module_name', 100).notNullable();
        table.string('sub_module_name', 100).notNullable();
        table.string('merge_code', 100).nullable();
        table.text('description').nullable();
        table.enum('is_active', ['Yes', 'No']).notNullable().defaultTo('Yes');
        table.bigInteger('created_by').unsigned().nullable();
        table.bigInteger('updated_by').unsigned().nullable();
        table.datetime('created_at').notNullable();
        table.datetime('updated_at').notNullable();
        table.datetime('deleted_at').nullable();
        table.index(['organization_id', 'deleted_at']);
        table.index(['organization_id', 'is_active']);
        table.index(['module_name', 'sub_module_name']);
      });
      console.log('[Settings] ✅ Created table: notification_merge_codes');
    } else {
      await db.schema.alterTable('notification_merge_codes', (table) => {
        table.string('merge_code', 100).nullable().alter();
      }).catch(() => { });
    }

    // Seed default merge codes if empty
    const count = await db('notification_merge_codes').count({ count: '*' }).first();
    const total = parseInt(String((count as any)?.count || 0), 10);

    if (total === 0) {
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const defaultSeeds = [
        // Employee Module
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'Name', description: 'Employee full legal name', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'Company Name', description: 'Company / Organization name', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'Department', description: 'Assigned department name', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'Grade', description: 'Employee grade level', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'Location', description: 'Work location / office branch', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'Shift ID', description: 'Shift assignment ID or name', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'Payroll Slab', description: 'Payroll tax or salary slab', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'Created', description: 'Employee joining or creation date', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'Employee Code', description: 'Unique employee ID / code', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'Gender', description: 'Gender identity', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'Email', description: 'Official email address', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Employee', sub_module_name: 'DOB', description: 'Date of birth', is_active: 'Yes', created_at: now, updated_at: now },

        // Workhour Module
        { uuid: uuidv4(), organization_id: 1, module_name: 'Workhour', sub_module_name: 'Application', description: 'Workhour application submission merge tags', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Workhour', sub_module_name: 'Approval', description: 'Workhour application approval merge tags', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Workhour', sub_module_name: 'Cancellation', description: 'Workhour application cancellation merge tags', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Workhour', sub_module_name: 'Rejection', description: 'Workhour application rejection merge tags', is_active: 'Yes', created_at: now, updated_at: now },

        // Leave Module
        { uuid: uuidv4(), organization_id: 1, module_name: 'Leave', sub_module_name: 'Application', description: 'Leave application request merge tags', is_active: 'Yes', created_at: now, updated_at: now },
        { uuid: uuidv4(), organization_id: 1, module_name: 'Leave', sub_module_name: 'Approval', description: 'Leave application approval merge tags', is_active: 'Yes', created_at: now, updated_at: now },

        // Attendance Module
        { uuid: uuidv4(), organization_id: 1, module_name: 'Attendance', sub_module_name: 'Regularization', description: 'Attendance regularization merge tags', is_active: 'Yes', created_at: now, updated_at: now },

        // System Module
        { uuid: uuidv4(), organization_id: 1, module_name: 'System', sub_module_name: 'Notification', description: 'General system notification action link merge tags', is_active: 'Yes', created_at: now, updated_at: now },
      ];
      await db('notification_merge_codes').insert(defaultSeeds);
      console.log('[Settings] 🌱 Seeded default notification merge codes');
    }
  } catch (err) {
    console.error('[Settings] ❌ Failed to create/seed notification_merge_codes table:', err);
  }
})();

const mergeCodeCtrl = new MergeCodeController();
router.get('/merge-codes', asyncHandler((req, res) => mergeCodeCtrl.list(req, res)));
router.get('/merge-codes/:id', asyncHandler((req, res) => mergeCodeCtrl.get(req, res)));
router.post('/merge-codes', asyncHandler((req, res) => mergeCodeCtrl.create(req, res)));
router.patch('/merge-codes/:id', asyncHandler((req, res) => mergeCodeCtrl.update(req, res)));
router.delete('/merge-codes/:id', asyncHandler((req, res) => mergeCodeCtrl.delete(req, res)));
router.post('/merge-codes/:id/restore', asyncHandler((req, res) => mergeCodeCtrl.restore(req, res)));

// ─── Notification Templates Routes ────────────────────────────────────────────
(async () => {
  try {
    const db = getKnex();
    const exists = await db.schema.hasTable('notification_templates');

    if (!exists) {
      await db.schema.createTable('notification_templates', (table) => {
        table.bigIncrements('id').primary();
        table.string('uuid', 36).notNullable().unique();
        table.bigInteger('organization_id').unsigned().notNullable().index();
        table.string('template_name', 255).notNullable();
        table.string('subject', 500).notNullable();
        table.text('email_notification').notNullable();
        table.enum('is_active', ['Yes', 'No']).notNullable().defaultTo('Yes');
        table.bigInteger('created_by').unsigned().nullable();
        table.bigInteger('updated_by').unsigned().nullable();
        table.datetime('created_at').notNullable();
        table.datetime('updated_at').notNullable();
        table.datetime('deleted_at').nullable();
        table.index(['organization_id', 'deleted_at']);
        table.index(['organization_id', 'is_active']);
      });
      console.log('[Settings] ✅ Created table: notification_templates');
    } else {
      // Add our required columns if they don't exist (table may have old schema)
      const notifCols = [
        { name: 'template_code', type: (t: any) => t.string('template_code', 100).nullable() },
        { name: 'template_name', type: (t: any) => t.string('template_name', 255).nullable() },
        { name: 'template_description', type: (t: any) => t.text('template_description').nullable() },
        { name: 'category', type: (t: any) => t.string('category', 100).nullable() },
        { name: 'channels', type: (t: any) => t.json('channels').nullable() },
        { name: 'subject_line', type: (t: any) => t.string('subject_line', 500).nullable() },
        { name: 'subject', type: (t: any) => t.string('subject', 500).nullable() },
        { name: 'body_text', type: (t: any) => t.text('body_text').nullable() },
        { name: 'body_html', type: (t: any) => t.text('body_html').nullable() },
        { name: 'email_notification', type: (t: any) => t.text('email_notification').nullable() },
        { name: 'sms_text', type: (t: any) => t.string('sms_text', 160).nullable() },
        { name: 'whatsapp_template_name', type: (t: any) => t.string('whatsapp_template_name', 100).nullable() },
        { name: 'variables', type: (t: any) => t.json('variables').nullable() },
        { name: 'version_number', type: (t: any) => t.integer('version_number').defaultTo(1) },
        { name: 'is_published', type: (t: any) => t.boolean('is_published').defaultTo(true) },
        { name: 'is_active', type: (t: any) => t.enum('is_active', ['Yes', 'No']).notNullable().defaultTo('Yes') },
        { name: 'status', type: (t: any) => t.string('status', 50).defaultTo('published') },
        { name: 'company_id', type: (t: any) => t.bigInteger('company_id').unsigned().nullable() },
        { name: 'created_by', type: (t: any) => t.bigInteger('created_by').unsigned().nullable() },
        { name: 'updated_by', type: (t: any) => t.bigInteger('updated_by').unsigned().nullable() },
        { name: 'deleted_at', type: (t: any) => t.datetime('deleted_at').nullable() },
      ];

      for (const col of notifCols) {
        if (!(await db.schema.hasColumn('notification_templates', col.name))) {
          await db.schema.table('notification_templates', col.type).catch(() => { });
        }
      }
    }
  } catch (err) {
    console.error('[Settings] ❌ Failed to create/migrate notification_templates table:', err);
  }
})();

const notifTemplateCtrl = new NotificationTemplateSettingsController();
router.get('/notification-templates', asyncHandler((req, res) => notifTemplateCtrl.list(req, res)));
router.get('/notification-templates/:id', asyncHandler((req, res) => notifTemplateCtrl.get(req, res)));
router.post('/notification-templates', asyncHandler((req, res) => notifTemplateCtrl.create(req, res)));
router.patch('/notification-templates/:id', asyncHandler((req, res) => notifTemplateCtrl.update(req, res)));
router.delete('/notification-templates/:id', asyncHandler((req, res) => notifTemplateCtrl.delete(req, res)));
router.post('/notification-templates/:id/restore', asyncHandler((req, res) => notifTemplateCtrl.restore(req, res)));

// ==========================================
// RESOURCE PLAN CRUD ROUTES
// ==========================================
router.get('/resource-plans', asyncHandler(async (req, res) => {
  const ctx = req.ctx;
  const db = getKnex();
  let query = db('resource_plans').select('*');

  if (ctx?.companyId) {
    query = query.where((builder) => {
      builder.where('company_id', ctx.companyId).orWhereNull('company_id');
    });
  }

  const plans = await query.orderBy('created_at', 'desc');
  // Knex's postProcessResponse already converts snake_case to camelCase
  res.json({ success: true, data: plans });
}));

router.post('/resource-plans', asyncHandler(async (req, res) => {
  const ctx = req.ctx;
  const db = getKnex();
  const id = uuidv4();
  const { companyId, locationId, departmentId, designationId, staffRequired, status } = req.body;

  await db('resource_plans').insert({
    id,
    company_id: companyId || ctx?.companyId || null,
    location_id: locationId || null,
    department_id: departmentId,
    designation_id: designationId,
    staff_required: staffRequired || 1,
    status: status || 'active'
  });

  res.json({ success: true, data: { id } });
}));

router.put('/resource-plans/:id', asyncHandler(async (req, res) => {
  const db = getKnex();
  const { id } = req.params;
  const { companyId, locationId, departmentId, designationId, staffRequired, status } = req.body;

  await db('resource_plans').where({ id }).update({
    company_id: companyId,
    location_id: locationId || null,
    department_id: departmentId,
    designation_id: designationId,
    staff_required: staffRequired,
    status,
    updated_at: db.fn.now()
  });

  res.json({ success: true, message: 'Resource plan updated successfully' });
}));

router.delete('/resource-plans/:id', asyncHandler(async (req, res) => {
  const db = getKnex();
  const { id } = req.params;

  await db('resource_plans').where({ id }).delete();

  res.json({ success: true, message: 'Resource plan deleted successfully' });
}));
// ==========================================
// EVENTS MASTER CRUD ROUTES
// ==========================================
const eventCtrl = new EventController();

router.get('/events', asyncHandler((req, res) => eventCtrl.list(req, res)));
router.get('/events/:id', asyncHandler((req, res) => eventCtrl.getById(req, res)));
router.post('/events', asyncHandler((req, res) => eventCtrl.create(req, res)));
router.put('/events/:id', asyncHandler((req, res) => eventCtrl.update(req, res)));
router.delete('/events/:id', asyncHandler((req, res) => eventCtrl.delete(req, res)));

// ==========================================
// ID CARD DESIGNER & TEMPLATE CRUD ROUTES
// ==========================================
const idCardCtrl = new IdCardTemplateController();

router.get('/id-card/templates', asyncHandler((req, res) => idCardCtrl.list(req, res)));
router.post('/id-card/templates', asyncHandler((req, res) => idCardCtrl.create(req, res)));
router.get('/id-card/templates/:id', asyncHandler((req, res) => idCardCtrl.getById(req, res)));
router.put('/id-card/templates/:id', asyncHandler((req, res) => idCardCtrl.update(req, res)));
router.delete('/id-card/templates/:id', asyncHandler((req, res) => idCardCtrl.delete(req, res)));
router.post('/id-card/templates/:id/publish', asyncHandler((req, res) => idCardCtrl.publish(req, res)));
router.post('/id-card/templates/:id/duplicate', asyncHandler((req, res) => idCardCtrl.duplicate(req, res)));
router.get('/id-card/templates/:id/versions', asyncHandler((req, res) => idCardCtrl.getVersions(req, res)));
router.post('/id-card/templates/:id/rollback/:versionId', asyncHandler((req, res) => idCardCtrl.rollback(req, res)));
router.get('/id-card/active-template', asyncHandler((req, res) => idCardCtrl.resolveActive(req, res)));
router.post('/id-card/upload-asset', asyncHandler((req, res) => idCardCtrl.uploadAsset(req, res)));

export default router;






