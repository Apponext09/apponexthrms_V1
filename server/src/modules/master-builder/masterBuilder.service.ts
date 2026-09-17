import { getKnex } from '../../db/knex';
import { v4 as uuidv4 } from 'uuid';

export interface CustomMasterPayload {
  name: string;
  pluralName?: string;
  code: string;
  description?: string;
  icon?: string;
  employeeLinkage?: string;
  hasHierarchy?: boolean;
  hasHistory?: boolean;
  status?: string;
}

/**
 * Registry of all "System Masters" — hardcoded masters whose data lives in real
 * DB tables but whose field definitions are managed through Master Builder.
 *
 * To add a new system master in the future, just add an entry here.
 * Everything else (seeding, bridging, frontend routing) is automatic.
 */
export interface SystemMasterDefinition {
  /** Matches the `code` in custom_masters AND the sidebar master ID */
  code: string;
  name: string;
  pluralName: string;
  description: string;
  icon: string;
  /** Actual DB table that stores records */
  systemTable: string;
  /** PK column in the real table */
  systemIdColumn: string;
  /** Column used as the display name */
  systemNameColumn: string;
  hasHierarchy?: boolean;
  hasHistory?: boolean;
  /** Field definitions for this system master */
  fields: Array<{
    fieldName: string;
    fieldKey: string;
    fieldType: string;
    isRequired?: boolean;
    showInTable?: boolean;
    helpText?: string;
    placeholder?: string;
    displayOrder: number;
    /** Actual column in the real table — null means extra field in extended_data */
    columnMap: string | null;
    isCore: boolean;
  }>;
}

/**
 * Central registry of all system masters.
 * Add new entries here to make any existing hardcoded master dynamic.
 */
export const SYSTEM_MASTERS: SystemMasterDefinition[] = [
  {
    code: 'company',
    name: 'Company',
    pluralName: 'Companies',
    description: 'Manage company profiles, legal entities, and organization details.',
    icon: 'Building2',
    systemTable: 'company',          // actual table name is 'company' not 'companies'
    systemIdColumn: 'company_id',    // PK is 'company_id' not 'id'
    systemNameColumn: 'name',
    hasHierarchy: false,
    hasHistory: true,
    fields: [
      // 1. Company Profile & Identification
      { fieldName: 'Company Name', fieldKey: 'name', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'Legal registered company name', displayOrder: 1, columnMap: 'name', isCore: true },
      { fieldName: 'Employer Name', fieldKey: 'employer_name', fieldType: 'text', isRequired: false, showInTable: false, helpText: 'Authorized Employer / HR Admin', displayOrder: 2, columnMap: 'employer_name', isCore: true },
      { fieldName: 'Class Of Establishment', fieldKey: 'class_of_establishment', fieldType: 'text', isRequired: false, showInTable: false, helpText: 'e.g. Commercial IT Enterprise', displayOrder: 3, columnMap: 'class_of_establishment', isCore: true },
      { fieldName: 'Establishment Company Code', fieldKey: 'code', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'Unique establishment code (e.g. COM-100)', displayOrder: 4, columnMap: 'code', isCore: true },
      // 2. Registered Headquarters Address
      { fieldName: 'Address Line 1', fieldKey: 'address_line_1', fieldType: 'text', isRequired: true, showInTable: false, helpText: 'Building, Street, Suite No.', displayOrder: 5, columnMap: 'address_line_1', isCore: true },
      { fieldName: 'Address Line 2', fieldKey: 'address_line_2', fieldType: 'text', isRequired: false, showInTable: false, helpText: 'Landmark, Area, Sector', displayOrder: 6, columnMap: 'address_line_2', isCore: true },
      { fieldName: 'Country', fieldKey: 'country', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'Registered country', displayOrder: 7, columnMap: 'country', isCore: true },
      { fieldName: 'State', fieldKey: 'state', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'State / Province', displayOrder: 8, columnMap: 'state', isCore: true },
      { fieldName: 'City', fieldKey: 'city', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'City / Municipality', displayOrder: 9, columnMap: 'city', isCore: true },
      { fieldName: 'ZIP / Postal Code', fieldKey: 'zip_code', fieldType: 'text', isRequired: true, showInTable: false, helpText: 'Postal code / ZIP', displayOrder: 10, columnMap: 'zip_code', isCore: true },
      // 3. Statutory, Contact & Communication
      { fieldName: 'PAN / TIN Number', fieldKey: 'pan_tin', fieldType: 'text', isRequired: false, showInTable: true, helpText: 'Tax identification number', displayOrder: 11, columnMap: 'pan_tin', isCore: true },
      { fieldName: 'Contact Number', fieldKey: 'contact_number', fieldType: 'phone', isRequired: true, showInTable: true, helpText: 'Primary contact telephone', displayOrder: 12, columnMap: 'contact_number', isCore: true },
      { fieldName: 'Official Corporate Email', fieldKey: 'email', fieldType: 'email', isRequired: true, showInTable: true, helpText: 'Official company email', displayOrder: 13, columnMap: 'email', isCore: true },
      // 4. Branding Assets & Media
      { fieldName: 'Company Logo', fieldKey: 'logo', fieldType: 'image', isRequired: false, showInTable: false, helpText: 'Company logo image URL or base64', displayOrder: 14, columnMap: 'logo', isCore: true },
      { fieldName: 'Company Official Stamp', fieldKey: 'company_stamp', fieldType: 'image', isRequired: false, showInTable: false, helpText: 'Official stamp image', displayOrder: 15, columnMap: 'company_stamp', isCore: true },
      { fieldName: 'Authorized Signature', fieldKey: 'signature', fieldType: 'image', isRequired: false, showInTable: false, helpText: 'Authorized signature image', displayOrder: 16, columnMap: 'signature', isCore: true },
      // 5. Status & System Controls
      { fieldName: 'Active Status', fieldKey: 'is_active_toggle', fieldType: 'boolean', isRequired: false, showInTable: true, helpText: 'Whether company is actively operating', displayOrder: 17, columnMap: 'is_active_toggle', isCore: true },
      { fieldName: 'Users Access', fieldKey: 'active_users_toggle', fieldType: 'boolean', isRequired: false, showInTable: false, helpText: 'Allow employee / user access', displayOrder: 18, columnMap: 'active_users_toggle', isCore: true },
      { fieldName: 'Login Page Logo', fieldKey: 'login_page_logo_toggle', fieldType: 'boolean', isRequired: false, showInTable: false, helpText: 'Show company logo on login screen', displayOrder: 19, columnMap: 'login_page_logo_toggle', isCore: true },
      // 6. Company Login Credentials
      { fieldName: 'Want Credentials', fieldKey: 'has_credentials', fieldType: 'boolean', isRequired: false, showInTable: false, helpText: 'Enable admin login credentials', displayOrder: 20, columnMap: 'has_credentials', isCore: true },
      { fieldName: 'Full Name', fieldKey: 'full_name', fieldType: 'text', isRequired: false, showInTable: false, helpText: 'Admin user full name', displayOrder: 21, columnMap: 'full_name', isCore: true },
      { fieldName: 'Login Email', fieldKey: 'login_email', fieldType: 'email', isRequired: false, showInTable: false, helpText: 'Admin login email address', displayOrder: 22, columnMap: 'login_email', isCore: true },
      // Other
      { fieldName: 'Status', fieldKey: 'status', fieldType: 'text', isRequired: false, showInTable: true, helpText: 'Record status (Active/Inactive)', displayOrder: 23, columnMap: 'status', isCore: true },
      { fieldName: 'Description', fieldKey: 'description', fieldType: 'textarea', isRequired: false, showInTable: false, helpText: 'Company description or overview', displayOrder: 24, columnMap: 'description', isCore: true },
    ],
  },
  {
    code: 'department',
    name: 'Department',
    pluralName: 'Departments',
    description: 'Manage organizational departments, divisions, and teams.',
    icon: 'Layers',
    systemTable: 'departments',
    systemIdColumn: 'id',
    systemNameColumn: 'name',
    hasHierarchy: true,
    hasHistory: false,
    fields: [
      { fieldName: 'Department Name', fieldKey: 'name', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'Name of the department', displayOrder: 1, columnMap: 'name', isCore: true },
      { fieldName: 'Code', fieldKey: 'code', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'Short unique code', displayOrder: 2, columnMap: 'code', isCore: true },
      { fieldName: 'Parent Department', fieldKey: 'parent_department_id', fieldType: 'lookup', isRequired: false, showInTable: false, displayOrder: 3, columnMap: 'parent_department_id', isCore: true },
      { fieldName: 'Department Head', fieldKey: 'department_head_id', fieldType: 'lookup', isRequired: false, showInTable: false, displayOrder: 4, columnMap: 'department_head_id', isCore: true },
      { fieldName: 'Description', fieldKey: 'description', fieldType: 'textarea', isRequired: false, showInTable: false, displayOrder: 5, columnMap: 'description', isCore: true },
      { fieldName: 'Status', fieldKey: 'status', fieldType: 'text', isRequired: false, showInTable: true, displayOrder: 6, columnMap: 'status', isCore: true },
    ],
  },
  {
    code: 'location',
    name: 'Location',
    pluralName: 'Locations',
    description: 'Configure office locations, branches, and geographic sites.',
    icon: 'MapPin',
    systemTable: 'locations',
    systemIdColumn: 'id',
    systemNameColumn: 'name',
    hasHierarchy: false,
    hasHistory: false,
    fields: [
      { fieldName: 'Location Name', fieldKey: 'name', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'Name of the location', displayOrder: 1, columnMap: 'name', isCore: true },
      { fieldName: 'Code', fieldKey: 'code', fieldType: 'text', isRequired: true, showInTable: true, displayOrder: 2, columnMap: 'code', isCore: true },
      { fieldName: 'Office Type', fieldKey: 'type', fieldType: 'text', isRequired: false, showInTable: true, displayOrder: 3, columnMap: 'type', isCore: true },
      { fieldName: 'Address Line 1', fieldKey: 'address_line1', fieldType: 'text', isRequired: false, showInTable: false, displayOrder: 4, columnMap: 'address_line1', isCore: true },
      { fieldName: 'Address Line 2', fieldKey: 'address_line2', fieldType: 'text', isRequired: false, showInTable: false, displayOrder: 5, columnMap: 'address_line2', isCore: true },
      { fieldName: 'City', fieldKey: 'city', fieldType: 'text', isRequired: false, showInTable: true, displayOrder: 6, columnMap: 'city', isCore: true },
      { fieldName: 'State', fieldKey: 'state', fieldType: 'text', isRequired: false, showInTable: true, displayOrder: 7, columnMap: 'state', isCore: true },
      { fieldName: 'Country', fieldKey: 'country', fieldType: 'text', isRequired: false, showInTable: false, displayOrder: 8, columnMap: 'country', isCore: true },
      { fieldName: 'Postal Code', fieldKey: 'postal_code', fieldType: 'text', isRequired: false, showInTable: false, displayOrder: 9, columnMap: 'postal_code', isCore: true },
      { fieldName: 'Latitude', fieldKey: 'latitude', fieldType: 'number', isRequired: false, showInTable: false, displayOrder: 10, columnMap: 'latitude', isCore: true },
      { fieldName: 'Longitude', fieldKey: 'longitude', fieldType: 'number', isRequired: false, showInTable: false, displayOrder: 11, columnMap: 'longitude', isCore: true },
      { fieldName: 'Geofence Radius (m)', fieldKey: 'geofence_radius_m', fieldType: 'number', isRequired: false, showInTable: false, displayOrder: 12, columnMap: 'geofence_radius_m', isCore: true },
      { fieldName: 'Timezone', fieldKey: 'timezone', fieldType: 'text', isRequired: false, showInTable: false, displayOrder: 13, columnMap: 'timezone', isCore: true },
      { fieldName: 'Status', fieldKey: 'status', fieldType: 'text', isRequired: false, showInTable: true, displayOrder: 14, columnMap: 'status', isCore: true },
    ],
  },
  {
    code: 'designation',
    name: 'Designation',
    pluralName: 'Designations',
    description: 'Job designations, roles, and title hierarchies.',
    icon: 'Briefcase',
    systemTable: 'designations',
    systemIdColumn: 'id',
    systemNameColumn: 'name',
    hasHierarchy: false,
    hasHistory: false,
    fields: [
      { fieldName: 'Designation Name', fieldKey: 'name', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'Name of the designation', displayOrder: 1, columnMap: 'name', isCore: true },
      { fieldName: 'Code', fieldKey: 'code', fieldType: 'text', isRequired: true, showInTable: true, displayOrder: 2, columnMap: 'code', isCore: true },
      { fieldName: 'Department', fieldKey: 'department_id', fieldType: 'lookup', isRequired: false, showInTable: false, displayOrder: 3, columnMap: 'department_id', isCore: true },
      { fieldName: 'Level', fieldKey: 'level', fieldType: 'number', isRequired: false, showInTable: false, displayOrder: 4, columnMap: 'level', isCore: true },
      { fieldName: 'Description', fieldKey: 'description', fieldType: 'textarea', isRequired: false, showInTable: false, displayOrder: 5, columnMap: 'description', isCore: true },
      { fieldName: 'Status', fieldKey: 'status', fieldType: 'text', isRequired: false, showInTable: true, displayOrder: 6, columnMap: 'status', isCore: true },
    ],
  },
  {
    code: 'grade',
    name: 'Grade',
    pluralName: 'Grades',
    description: 'Employee pay grades, bands, and seniority levels.',
    icon: 'Award',
    systemTable: 'grades',
    systemIdColumn: 'id',
    systemNameColumn: 'name',
    hasHierarchy: false,
    hasHistory: false,
    fields: [
      { fieldName: 'Grade Name', fieldKey: 'name', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'Grade name/band', displayOrder: 1, columnMap: 'name', isCore: true },
      { fieldName: 'Grade Code', fieldKey: 'code', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'Short unique code', displayOrder: 2, columnMap: 'code', isCore: true },
      { fieldName: 'Description', fieldKey: 'description', fieldType: 'textarea', isRequired: false, showInTable: false, displayOrder: 3, columnMap: 'description', isCore: true },
      { fieldName: 'Color', fieldKey: 'color', fieldType: 'text', isRequired: false, showInTable: false, displayOrder: 4, columnMap: 'color', isCore: true },
      { fieldName: 'Status', fieldKey: 'status', fieldType: 'text', isRequired: false, showInTable: true, displayOrder: 5, columnMap: 'status', isCore: true },
    ],
  },
  {
    code: 'employee-status',
    name: 'Employee Status',
    pluralName: 'Employee Statuses',
    description: 'Active, On-Probation, Suspended, and Exit employee states.',
    icon: 'Users',
    systemTable: 'employee_statuses',
    systemIdColumn: 'id',
    systemNameColumn: 'name',
    hasHierarchy: false,
    hasHistory: false,
    fields: [
      { fieldName: 'Status Name', fieldKey: 'name', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'Employee status name', displayOrder: 1, columnMap: 'name', isCore: true },
      { fieldName: 'Status Color', fieldKey: 'status_color', fieldType: 'text', isRequired: false, showInTable: true, displayOrder: 2, columnMap: 'status_color', isCore: true },
      { fieldName: 'Is Probation Status', fieldKey: 'is_probation_status', fieldType: 'boolean', isRequired: false, showInTable: false, displayOrder: 3, columnMap: 'is_probation_status', isCore: true },
      { fieldName: 'Probation Period Value', fieldKey: 'probation_period_value', fieldType: 'number', isRequired: false, showInTable: false, displayOrder: 4, columnMap: 'probation_period_value', isCore: true },
      { fieldName: 'Probation Period Unit', fieldKey: 'probation_period_unit', fieldType: 'text', isRequired: false, showInTable: false, displayOrder: 5, columnMap: 'probation_period_unit', isCore: true },
      { fieldName: 'Notify On Completion', fieldKey: 'notify_on_completion', fieldType: 'boolean', isRequired: false, showInTable: false, displayOrder: 6, columnMap: 'notify_on_completion', isCore: true },
      { fieldName: 'Is Confirmation Status', fieldKey: 'is_confirmation_status', fieldType: 'boolean', isRequired: false, showInTable: false, displayOrder: 7, columnMap: 'is_confirmation_status', isCore: true },
      { fieldName: 'Is Resignation Status', fieldKey: 'is_resignation_status', fieldType: 'boolean', isRequired: false, showInTable: false, displayOrder: 8, columnMap: 'is_resignation_status', isCore: true },
      { fieldName: 'Inactive On Status Change', fieldKey: 'inactive_on_status_change', fieldType: 'boolean', isRequired: false, showInTable: false, displayOrder: 9, columnMap: 'inactive_on_status_change', isCore: true },
      { fieldName: 'Status', fieldKey: 'status', fieldType: 'text', isRequired: false, showInTable: true, displayOrder: 10, columnMap: 'status', isCore: true },
    ],
  },
  {
    code: 'emp-type',
    name: 'Emp. Type',
    pluralName: 'Employment Types',
    description: 'Employment classification (Full-Time, Contract, Intern, Part-Time).',
    icon: 'Users',
    systemTable: 'employee_types',
    systemIdColumn: 'id',
    systemNameColumn: 'name',
    hasHierarchy: false,
    hasHistory: false,
    fields: [
      { fieldName: 'Employment Type Name', fieldKey: 'name', fieldType: 'text', isRequired: true, showInTable: true, helpText: 'Classification title', displayOrder: 1, columnMap: 'name', isCore: true },
      { fieldName: 'Status', fieldKey: 'status', fieldType: 'text', isRequired: false, showInTable: true, displayOrder: 2, columnMap: 'status', isCore: true },
    ],
  },
];

export interface CustomMasterFieldPayload {
  fieldName: string;
  fieldKey: string;
  fieldType: string; // text, number, email, phone, date, choice, textarea, lookup, boolean
  isRequired?: boolean;
  isUnique?: boolean;
  showInTable?: boolean;
  isActive?: boolean;
  helpText?: string;
  placeholder?: string;
  defaultValue?: string;
  lookupMasterId?: number;
  choiceListId?: number;
  optionsJson?: any;
  validationRules?: any;
  displayOrder?: number;
}

export interface CustomMasterValidationRulePayload {
  ruleName: string;
  fieldA: string;
  operator: string;
  fieldB?: string;
  customValue?: string;
  errorMessage?: string;
  isActive?: boolean;
}

export interface CustomMasterAutofillPayload {
  lookupFieldKey: string;
  sourceFieldKey: string;
  targetFieldKey: string;
  isActive?: boolean;
}

export interface ChoiceListPayload {
  name: string;
  code: string;
  description?: string;
  optionsJson: Array<{ label: string; value: string; color?: string }>;
  status?: string;
}

export interface DynamicRecordPayload {
  recordCode?: string;
  status?: string;
  data: Record<string, any>;
}

export class MasterBuilderService {
  private get db() {
    return getKnex();
  }

  // ── In-memory caches to avoid repeated schema introspection and re-seeding ──
  /** Orgs that have already had system masters seeded this server session */
  private static readonly seededOrgs = new Set<number>();
  /** Cache for db.schema.hasColumn results: "table.column" -> boolean */
  private static readonly columnCache = new Map<string, boolean>();

  /**
   * Cached hasColumn check — introspects DB only once per table.column per session
   */
  private async hasColumn(table: string, column: string): Promise<boolean> {
    const key = `${table}.${column}`;
    if (MasterBuilderService.columnCache.has(key)) {
      return MasterBuilderService.columnCache.get(key)!;
    }
    const result = await this.db.schema.hasColumn(table, column);
    MasterBuilderService.columnCache.set(key, result);
    return result;
  }

  /**
   * Ensure all System Masters from SYSTEM_MASTERS registry are seeded for this org.
   * Runs on list/get requests, synchronizes missing core fields into custom_master_fields.
   */
  async ensureSystemMasters(orgId: number, companyId?: number) {
    for (const def of SYSTEM_MASTERS) {
      let masterId: number;
      const existing = await this.db('custom_masters')
        .where('organization_id', orgId)
        .where('code', def.code)
        .whereNull('deleted_at')
        .select('id', 'system_table')
        .first();

      if (existing) {
        masterId = existing.id;
        // Always patch to pick up any corrections to the SYSTEM_MASTERS registry
        await this.db('custom_masters')
          .where('id', existing.id)
          .update({
            is_system: true,
            system_table: def.systemTable,
            system_id_column: def.systemIdColumn,
            system_name_column: def.systemNameColumn,
          });
      } else {
        // Insert the system master
        const [insertedId] = await this.db('custom_masters').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          company_id: companyId || null,
          name: def.name,
          plural_name: def.pluralName,
          code: def.code,
          description: def.description,
          icon: def.icon,
          employee_linkage: 'none',
          has_hierarchy: Boolean(def.hasHierarchy),
          has_history: Boolean(def.hasHistory),
          status: 'Active',
          is_system: true,
          system_table: def.systemTable,
          system_id_column: def.systemIdColumn,
          system_name_column: def.systemNameColumn,
        });
        masterId = insertedId;
      }

      // Sync all core fields for this master into custom_master_fields.
      // Re-fetch inside the loop to handle concurrent ensureSystemMasters calls
      // (the UNIQUE constraint on (master_id, field_key) is the final safety net).
      const existingFields = await this.db('custom_master_fields')
        .where('master_id', masterId)
        .select('id', 'field_key');
      const existingKeySet = new Set(existingFields.map((f: any) => f.fieldKey || f.field_key));

      for (const f of def.fields) {
        if (!existingKeySet.has(f.fieldKey)) {
          try {
            await this.db('custom_master_fields').insert({
              uuid: uuidv4(),
              master_id: masterId,
              field_name: f.fieldName,
              field_key: f.fieldKey,
              field_type: f.fieldType,
              is_required: Boolean(f.isRequired),
              show_in_table: f.showInTable !== false,
              is_active: true,
              help_text: f.helpText || null,
              placeholder: f.placeholder || null,
              display_order: f.displayOrder,
              column_map: f.columnMap,
              is_core: Boolean(f.isCore),
            });
          } catch (insertErr: any) {
            // Swallow unique-constraint violations (ER_DUP_ENTRY / SQLITE_CONSTRAINT).
            // This happens when two concurrent requests race into ensureSystemMasters;
            // the winner already inserted the row, so we just update it instead.
            const isDup =
              insertErr?.code === 'ER_DUP_ENTRY' ||
              insertErr?.code === 'SQLITE_CONSTRAINT' ||
              String(insertErr?.message).includes('Duplicate entry');
            if (!isDup) throw insertErr;
            // Fall through to the update branch below
          }
        }
        // Always keep core field metadata in sync with the SYSTEM_MASTERS registry
        await this.db('custom_master_fields')
          .where('master_id', masterId)
          .where('field_key', f.fieldKey)
          .update({
            field_name: f.fieldName,
            field_type: f.fieldType,
            column_map: f.columnMap,
            is_core: true,
            display_order: f.displayOrder,
            help_text: f.helpText || null,
          });
      }
    }

    // Mark this org as seeded for the rest of this server session
    MasterBuilderService.seededOrgs.add(orgId);
  }

  /**
   * Returns whether a master definition refers to a real DB table (system master)
   */
  private isSystemMaster(master: any): boolean {
    return Boolean(master.isSystem ?? master.is_system) && Boolean(master.systemTable ?? master.system_table);
  }

  /**
   * Get the fields for a master — split into core (columnMap set) and extra (columnMap null)
   */
  private async getMasterFields(masterId: number) {
    const fields = await this.db('custom_master_fields')
      .where('master_id', masterId)
      .where('is_active', 1)
      .orderBy('display_order', 'asc');
    return fields;
  }

  /**
   * List records from the real DB table, merged with any extended data.
   * Returns them in the same DynamicRecordItem format as custom_master_records.
   */
  private async listSystemRecords(
    orgId: number,
    master: any,
    options: { search?: string; status?: string; page?: number; limit?: number }
  ) {
    const table = master.systemTable || master.system_table;
    const idCol = master.systemIdColumn || master.system_id_column || 'id';
    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    // Determine org filter column (some tables use organization_id)
    const hasOrgCol = await this.hasColumn(table, 'organization_id');
    // Check if deleted_at exists (e.g. 'locations' table has no deleted_at)
    const hasDeletedAt = await this.hasColumn(table, 'deleted_at');

    // Data query (SELECT *)
    let query = this.db(table).select('*');
    if (hasDeletedAt) query = query.whereNull('deleted_at') as any;
    if (hasOrgCol) query = query.where('organization_id', orgId);

    // Count query — MUST be built separately, never clone a SELECT * query with COUNT()
    // because MySQL's only_full_group_by rejects mixing SELECT * with aggregates.
    let countQuery = this.db(table).count(`${idCol} as cnt`);
    if (hasDeletedAt) countQuery = countQuery.whereNull('deleted_at') as any;
    if (hasOrgCol) countQuery = countQuery.where('organization_id', orgId);

    if (options.status && options.status !== 'all') {
      const hasStatusCol = await this.hasColumn(table, 'status');
      if (hasStatusCol) {
        query = query.where('status', options.status);
        countQuery = countQuery.where('status', options.status) as any;
      }
    }

    const totalRow = await countQuery.first();
    const total = Number((totalRow as any)?.cnt || 0);

    const rows = await query.orderBy(idCol, 'desc').limit(limit).offset(offset);

    // Load extended data for all returned rows
    const refIds = rows.map((r: any) => r[idCol]);
    const extDataMap: Record<number, Record<string, any>> = {};
    if (refIds.length > 0) {
      const extRows = await this.db('custom_master_extended_data')
        .where('master_id', master.id)
        .whereIn('record_ref_id', refIds);
      for (const ext of extRows) {
        const d = typeof ext.data === 'string' ? JSON.parse(ext.data) : ext.data || {};
        extDataMap[ext.record_ref_id] = d;
      }
    }

    // Get field definitions to know which keys are valid
    const fields = await this.getMasterFields(master.id);

    let records = rows.map((r: any) => {
      const rawData: Record<string, any> = {};
      for (const [col, val] of Object.entries(r)) {
        rawData[col] = val;
        const camel = col.replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());
        if (camel !== col) {
          rawData[camel] = val;
        }
      }

      const coreData: Record<string, any> = {};
      for (const f of fields) {
        const colMap = f.column_map || f.columnMap;
        const fKey = f.field_key || f.fieldKey;
        if (colMap && r[colMap] !== undefined) {
          coreData[fKey] = r[colMap];
        }
      }
      const extraData = extDataMap[r[idCol]] || {};
      return {
        id: r[idCol],
        uuid: r.uuid || String(r[idCol]),
        recordCode: r.code || r.record_code || null,
        status: r.status || 'Active',
        data: { ...rawData, ...coreData, ...extraData },
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    // In-memory search across all data fields
    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      records = records.filter((item: any) => {
        if (item.recordCode?.toLowerCase().includes(q)) return true;
        return Object.values(item.data).some((v) => String(v || '').toLowerCase().includes(q));
      });
    }

    return {
      records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Create a record in the real DB table + store any extra fields in extended_data
   */
  private async createSystemRecord(
    orgId: number,
    companyId: number | undefined,
    master: any,
    userId: number,
    payload: DynamicRecordPayload
  ) {
    const table = master.systemTable || master.system_table;
    const idCol = master.systemIdColumn || master.system_id_column || 'id';
    const fields = await this.getMasterFields(master.id);

    // Split payload.data into core columns vs extra fields
    const coreInsert: Record<string, any> = {};
    const extraData: Record<string, any> = {};

    const hasOrgCol = await this.hasColumn(table, 'organization_id');
    const hasCompanyCol = await this.hasColumn(table, 'company_id');

    if (hasOrgCol) coreInsert.organization_id = orgId;
    if (hasCompanyCol) coreInsert.company_id = companyId || null;

    // Assign uuid if table has it
    const hasUuid = await this.hasColumn(table, 'uuid');
    if (hasUuid) coreInsert.uuid = uuidv4();

    const hasCreatedBy = await this.hasColumn(table, 'created_by');
    const hasUpdatedBy = await this.hasColumn(table, 'updated_by');
    if (hasCreatedBy) coreInsert.created_by = userId;
    if (hasUpdatedBy) coreInsert.updated_by = userId;

    for (const f of fields) {
      const colMap = f.column_map || f.columnMap;
      const fKey = f.field_key || f.fieldKey;
      const camelKey = fKey ? fKey.replace(/_([a-z0-9])/g, (_: any, g: string) => g.toUpperCase()) : '';
      const snakeKey = fKey ? fKey.replace(/([A-Z])/g, '_$1').toLowerCase() : '';
      const val = payload.data?.[fKey] !== undefined
        ? payload.data[fKey]
        : (colMap && payload.data?.[colMap] !== undefined)
        ? payload.data[colMap]
        : (camelKey && payload.data?.[camelKey] !== undefined)
        ? payload.data[camelKey]
        : (snakeKey && payload.data?.[snakeKey] !== undefined)
        ? payload.data[snakeKey]
        : undefined;

      if (colMap) {
        // Core field → goes to real table column
        if (val !== undefined) coreInsert[colMap] = val;
      } else if (val !== undefined) {
        // Extra field → goes to extended_data
        extraData[fKey] = val;
      }
    }

    const [newId] = await this.db(table).insert(coreInsert);

    // Store extra fields if any
    if (Object.keys(extraData).length > 0) {
      await this.db('custom_master_extended_data').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        master_id: master.id,
        record_ref_id: newId,
        data: JSON.stringify(extraData),
        created_by: userId,
        updated_by: userId,
      });
    }

    const row = await this.db(table).where(idCol, newId).first();
    return this.formatSystemRecord(row, idCol, extraData, fields);
  }

  /**
   * Update a record in the real DB table + update extended_data for extra fields
   */
  private async updateSystemRecord(
    orgId: number,
    master: any,
    recordId: number,
    userId: number,
    payload: Partial<DynamicRecordPayload>
  ) {
    const table = master.systemTable || master.system_table;
    const idCol = master.systemIdColumn || master.system_id_column || 'id';
    const fields = await this.getMasterFields(master.id);

    const coreUpdate: Record<string, any> = { updated_at: new Date() };
    const extraData: Record<string, any> = {};

    const hasUpdatedBy = await this.hasColumn(table, 'updated_by');
    if (hasUpdatedBy) coreUpdate.updated_by = userId;

    if (payload.data) {
      for (const f of fields) {
        const colMap = f.column_map || f.columnMap;
        const fKey = f.field_key || f.fieldKey;
        const camelKey = fKey ? fKey.replace(/_([a-z0-9])/g, (_: any, g: string) => g.toUpperCase()) : '';
        const snakeKey = fKey ? fKey.replace(/([A-Z])/g, '_$1').toLowerCase() : '';
        const val = payload.data[fKey] !== undefined
          ? payload.data[fKey]
          : (colMap && payload.data[colMap] !== undefined)
          ? payload.data[colMap]
          : (camelKey && payload.data[camelKey] !== undefined)
          ? payload.data[camelKey]
          : (snakeKey && payload.data[snakeKey] !== undefined)
          ? payload.data[snakeKey]
          : undefined;

        if (val === undefined) continue;
        if (colMap) {
          coreUpdate[colMap] = val;
        } else {
          extraData[fKey] = val;
        }
      }
    }

    if (payload.status !== undefined) coreUpdate.status = payload.status;

    await this.db(table)
      .where(idCol, recordId)
      .update(coreUpdate);

    // Upsert extended data
    if (Object.keys(extraData).length > 0) {
      const existing = await this.db('custom_master_extended_data')
        .where('master_id', master.id)
        .where('record_ref_id', recordId)
        .first();

      if (existing) {
        const merged = { ...(typeof existing.data === 'string' ? JSON.parse(existing.data) : existing.data), ...extraData };
        await this.db('custom_master_extended_data')
          .where('id', existing.id)
          .update({ data: JSON.stringify(merged), updated_by: userId, updated_at: new Date() });
      } else {
        await this.db('custom_master_extended_data').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          master_id: master.id,
          record_ref_id: recordId,
          data: JSON.stringify(extraData),
          updated_by: userId,
        });
      }
    }

    const row = await this.db(table).where(idCol, recordId).first();
    const extRow = await this.db('custom_master_extended_data')
      .where('master_id', master.id)
      .where('record_ref_id', recordId)
      .first();
    const extDataFinal = extRow ? (typeof extRow.data === 'string' ? JSON.parse(extRow.data) : extRow.data) : {};
    return this.formatSystemRecord(row, idCol, extDataFinal, fields);
  }

  /**
   * Soft-delete a system master record from the real table
   */
  private async deleteSystemRecord(master: any, recordId: number) {
    const table = master.systemTable || master.system_table;
    const idCol = master.systemIdColumn || master.system_id_column || 'id';
    const hasDeletedAt = await this.hasColumn(table, 'deleted_at');
    if (hasDeletedAt) {
      await this.db(table).where(idCol, recordId).update({ deleted_at: new Date() });
    } else {
      await this.db(table).where(idCol, recordId).delete();
    }
    return true;
  }

  /**
   * Helper: format a real-table row into DynamicRecordItem shape
   */
  private formatSystemRecord(row: any, idCol: string, extraData: Record<string, any>, fields: any[]) {
    const rawData: Record<string, any> = {};
    for (const [col, val] of Object.entries(row)) {
      rawData[col] = val;
      const camel = col.replace(/_([a-z0-9])/g, (_, g) => g.toUpperCase());
      if (camel !== col) {
        rawData[camel] = val;
      }
    }
    const coreData: Record<string, any> = {};
    for (const f of fields) {
      const colMap = f.column_map || f.columnMap;
      const fKey = f.field_key || f.fieldKey;
      if (colMap && row[colMap] !== undefined) {
        coreData[fKey] = row[colMap];
      }
    }
    return {
      id: row[idCol],
      uuid: row.uuid || String(row[idCol]),
      recordCode: row.code || null,
      status: row.status || 'Active',
      data: { ...rawData, ...coreData, ...extraData },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SEED (existing custom masters + system masters)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Seed default custom masters for tenant if empty
   */
  async ensureSeedMasters(orgId: number, companyId?: number) {
    // Always ensure system masters are present (idempotent)
    await this.ensureSystemMasters(orgId, companyId);

    const existing = await this.db('custom_masters')
      .where('organization_id', orgId)
      .whereNull('deleted_at');

    if (existing.length === 0) {
      // 1. Employment Status Master
      const [empStatusId] = await this.db('custom_masters').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        company_id: companyId || null,
        name: 'Employment Status',
        plural_name: 'Employment Statuses',
        code: 'employment_status',
        description: 'Employee life-cycle status definitions',
        icon: 'Users',
        employee_linkage: 'primary_assignment',
        has_hierarchy: false,
        has_history: true,
        status: 'Active',
        is_system: false,
      });

      await this.db('custom_master_fields').insert([
        {
          uuid: uuidv4(),
          master_id: empStatusId,
          field_name: 'Status Name',
          field_key: 'status_name',
          field_type: 'text',
          is_required: true,
          show_in_table: true,
          is_active: true,
          help_text: 'Name of the employment status',
          display_order: 1,
        },
      ]);

      // Seed records for Employment Status
      const sampleStatuses = [
        { status_name: 'Active' },
        { status_name: 'On Probation' },
        { status_name: 'Notice Period' },
        { status_name: 'Terminated' },
      ];
      for (let i = 0; i < sampleStatuses.length; i++) {
        await this.db('custom_master_records').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          company_id: companyId || null,
          master_id: empStatusId,
          record_code: `EST-${100 + i}`,
          data: JSON.stringify(sampleStatuses[i]),
          status: 'Active',
        });
      }

      // 2. Employment Type Master
      const [empTypeId] = await this.db('custom_masters').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        company_id: companyId || null,
        name: 'Employment Type',
        plural_name: 'Employment Types',
        code: 'employment_type',
        description: 'Employment classifications (Full-Time, Contract, Intern)',
        icon: 'Briefcase',
        employee_linkage: 'primary_assignment',
        has_hierarchy: false,
        has_history: false,
        status: 'Active',
        is_system: false,
      });

      await this.db('custom_master_fields').insert([
        {
          uuid: uuidv4(),
          master_id: empTypeId,
          field_name: 'Type Name',
          field_key: 'type_name',
          field_type: 'text',
          is_required: true,
          show_in_table: true,
          is_active: true,
          help_text: 'Name of the employment type',
          display_order: 1,
        },
      ]);

      const sampleTypes = [
        { type_name: 'Full-Time Permanent' },
        { type_name: 'Contractor / Vendor' },
        { type_name: 'Intern' },
      ];
      for (let i = 0; i < sampleTypes.length; i++) {
        await this.db('custom_master_records').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          company_id: companyId || null,
          master_id: empTypeId,
          record_code: `ETY-${100 + i}`,
          data: JSON.stringify(sampleTypes[i]),
          status: 'Active',
        });
      }

      // 3. Test Master
      const [testId] = await this.db('custom_masters').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        company_id: companyId || null,
        name: 'Test',
        plural_name: 'Tests',
        code: 'test1',
        description: 'Test reference data entity',
        icon: 'Layers',
        employee_linkage: 'none',
        has_hierarchy: false,
        has_history: false,
        status: 'Active',
        is_system: false,
      });

      await this.db('custom_master_fields').insert([
        {
          uuid: uuidv4(),
          master_id: testId,
          field_name: 'Title',
          field_key: 'title',
          field_type: 'text',
          is_required: true,
          show_in_table: true,
          is_active: true,
          display_order: 1,
        },
      ]);

      // 4. Company Replica Custom Master
      const [companyMasterId] = await this.db('custom_masters').insert({
        uuid: uuidv4(),
        organization_id: orgId,
        company_id: companyId || null,
        name: 'Company',
        plural_name: 'Companies',
        code: 'custom_company',
        description: 'Custom Master replica of Company Master',
        icon: 'Building2',
        employee_linkage: 'none',
        has_hierarchy: true,
        has_history: true,
        status: 'Active',
        is_system: false,
      });

      await this.db('custom_master_fields').insert([
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          field_name: 'Email',
          field_key: 'email',
          field_type: 'email',
          is_required: true,
          show_in_table: true,
          is_active: true,
          help_text: 'Enter Email in proper Format',
          display_order: 1,
        },
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          field_name: 'Establishment Code No',
          field_key: 'establishment_code_no',
          field_type: 'text',
          is_required: false,
          show_in_table: true,
          is_active: true,
          help_text: 'Legal Establishment Code',
          display_order: 2,
        },
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          field_name: 'Phone Number',
          field_key: 'phone',
          field_type: 'phone',
          is_required: false,
          show_in_table: true,
          is_active: true,
          help_text: 'Primary contact phone number',
          display_order: 3,
        },
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          field_name: 'Employer Name',
          field_key: 'employer_name',
          field_type: 'text',
          is_required: false,
          show_in_table: true,
          is_active: true,
          help_text: 'Registered employer legal name',
          display_order: 4,
        },
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          field_name: 'PAN',
          field_key: 'pan',
          field_type: 'text',
          is_required: true,
          show_in_table: true,
          is_active: true,
          help_text: '10 digit Indian Tax Identification Number',
          display_order: 5,
        },
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          field_name: 'Class of Establishment',
          field_key: 'class_of_establishment',
          field_type: 'text',
          is_required: false,
          show_in_table: true,
          is_active: true,
          display_order: 6,
        },
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          field_name: 'ZIP / Postal Code',
          field_key: 'zip_code',
          field_type: 'text',
          is_required: false,
          show_in_table: true,
          is_active: true,
          display_order: 7,
        },
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          field_name: 'City',
          field_key: 'city',
          field_type: 'text',
          is_required: false,
          show_in_table: true,
          is_active: true,
          display_order: 8,
        },
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          field_name: 'State',
          field_key: 'state',
          field_type: 'text',
          is_required: false,
          show_in_table: true,
          is_active: true,
          display_order: 9,
        },
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          field_name: 'Address Line 1',
          field_key: 'address_line_1',
          field_type: 'textarea',
          is_required: false,
          show_in_table: false,
          is_active: true,
          display_order: 10,
        },
      ]);

      // Seed validation rules for Company custom master
      await this.db('custom_master_validation_rules').insert([
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          rule_name: 'Email ≥ Establishment Code No',
          field_a: 'email',
          operator: '>=',
          field_b: 'establishment_code_no',
          error_message: 'Email must be valid and establishment code formatted',
          is_active: true,
        },
        {
          uuid: uuidv4(),
          master_id: companyMasterId,
          rule_name: 'Establishment Code No ≤ ZIP / Postal Code',
          field_a: 'establishment_code_no',
          operator: '<=',
          field_b: 'zip_code',
          error_message: 'Establishment code must correlate with Postal Code',
          is_active: false,
        },
      ]);

      // Seed 7 sample records for Company master
      const sampleCompanies = [
        { email: 'contact@apponext.com', establishment_code_no: 'EST-HQ-01', phone: '+91 9876543210', employer_name: 'Apponext Technolabs Pvt Ltd', pan: 'ABCDE1234F', class_of_establishment: 'IT Services', zip_code: '560100', city: 'Bengaluru', state: 'Karnataka' },
        { email: 'us.corp@apponext.com', establishment_code_no: 'EST-US-02', phone: '+1 4155552671', employer_name: 'Apponext Global Inc', pan: 'FGHIJ5678K', class_of_establishment: 'Technology Corp', zip_code: '94105', city: 'San Francisco', state: 'California' },
        { email: 'delhi.hub@apponext.com', establishment_code_no: 'EST-DL-03', phone: '+91 9811122334', employer_name: 'Apponext North Operations', pan: 'KLMNO9012P', class_of_establishment: 'Regional Office', zip_code: '110001', city: 'New Delhi', state: 'Delhi' },
        { email: 'mumbai.ops@apponext.com', establishment_code_no: 'EST-MB-04', phone: '+91 9820033445', employer_name: 'Apponext Financial Solutions', pan: 'PQRST3456U', class_of_establishment: 'Fintech Hub', zip_code: '400051', city: 'Mumbai', state: 'Maharashtra' },
        { email: 'hyderabad.rd@apponext.com', establishment_code_no: 'EST-HYD-05', phone: '+91 9849055667', employer_name: 'Apponext R&D Center', pan: 'UVWXY7890Z', class_of_establishment: 'Innovation Lab', zip_code: '500081', city: 'Hyderabad', state: 'Telangana' },
        { email: 'pune.dev@apponext.com', establishment_code_no: 'EST-PN-06', phone: '+91 9890066778', employer_name: 'Apponext Engineering Hub', pan: 'BCDEF2345A', class_of_establishment: 'Software Delivery', zip_code: '411057', city: 'Pune', state: 'Maharashtra' },
        { email: 'london.eu@apponext.com', establishment_code_no: 'EST-UK-07', phone: '+44 2079460912', employer_name: 'Apponext EMEA Ltd', pan: 'GHIJK6789B', class_of_establishment: 'EMEA Headquarters', zip_code: 'EC2A 4NE', city: 'London', state: 'Greater London' },
      ];

      for (let i = 0; i < sampleCompanies.length; i++) {
        await this.db('custom_master_records').insert({
          uuid: uuidv4(),
          organization_id: orgId,
          company_id: companyId || null,
          master_id: companyMasterId,
          record_code: `CMP-${100 + i}`,
          data: JSON.stringify(sampleCompanies[i]),
          status: 'Active',
        });
      }
    }
  }

  /**
   * List all custom masters for an organization with field & record counts
   */
  async listMasters(orgId: number, status?: string) {
    await this.ensureSeedMasters(orgId);

    let q = this.db('custom_masters as cm')
      .where('cm.organization_id', orgId)
      .whereNull('cm.deleted_at')
      .select('cm.*')
      .select(
        this.db.raw(
          '(SELECT COUNT(*) FROM custom_master_fields cmf WHERE cmf.master_id = cm.id AND cmf.is_active = 1) as fields_count'
        ),
        this.db.raw(
          '(SELECT COUNT(*) FROM custom_master_records cmr WHERE cmr.master_id = cm.id AND cmr.deleted_at IS NULL) as records_count'
        )
      )
      .orderBy('cm.id', 'asc');

    if (status && status !== 'all') {
      q = q.where('cm.status', status);
    }

    const rows = await q;
    return rows.map((r: any) => ({
      id: r.id,
      uuid: r.uuid,
      name: r.name,
      pluralName: r.pluralName || r.plural_name,
      code: r.code,
      description: r.description,
      icon: r.icon || 'Layers',
      employeeLinkage: r.employeeLinkage || r.employee_linkage,
      hasHierarchy: Boolean(r.hasHierarchy ?? r.has_hierarchy),
      hasHistory: Boolean(r.hasHistory ?? r.has_history),
      status: r.status,
      fieldsCount: Number(r.fieldsCount || r.fields_count || 0),
      recordsCount: Number(r.recordsCount || r.records_count || 0),
      createdAt: r.createdAt || r.created_at,
      updatedAt: r.updatedAt || r.updated_at,
    }));
  }

  /**
   * Get custom master by id with fields, validation rules, autofill mappings
   */
  async getMasterById(orgId: number, masterId: number) {
    const master = await this.db('custom_masters')
      .where('id', masterId)
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .first();

    if (!master) return null;

    return this.populateMasterDetail(masterId, master);
  }

  /**
   * Get custom master by code with fields, validation rules, autofill mappings
   */
  async getMasterByCode(orgId: number, code: string) {
    const master = await this.db('custom_masters')
      .where('code', code)
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .first();

    if (!master) return null;

    return this.populateMasterDetail(master.id, master);
  }

  private async populateMasterDetail(masterId: number, master: any) {
    const fields = await this.db('custom_master_fields')
      .where('master_id', masterId)
      .orderBy('display_order', 'asc');

    const rules = await this.db('custom_master_validation_rules')
      .where('master_id', masterId)
      .orderBy('id', 'asc');

    const autofill = await this.db('custom_master_autofill_mappings')
      .where('master_id', masterId)
      .orderBy('id', 'asc');

    // For system masters, count from the real backing table
    let recordsCount = 0;
    const isSystemM = this.isSystemMaster(master);
    if (isSystemM) {
      const realTable = master.systemTable || master.system_table;
      try {
        const idCol = master.systemIdColumn || master.system_id_column || 'id';
        const hasDeletedAt = await this.hasColumn(realTable, 'deleted_at');
        let q = this.db(realTable);
        if (hasDeletedAt) q = q.whereNull('deleted_at') as any;
        const cnt = await q.count(`${idCol} as cnt`).first();
        recordsCount = Number((cnt as any)?.cnt || 0);
      } catch (_) { }
    } else {
      const recordCountRes = await this.db('custom_master_records')
        .where('master_id', masterId)
        .whereNull('deleted_at')
        .count('id as cnt')
        .first();
      recordsCount = Number((recordCountRes as any)?.cnt || 0);
    }

    return {
      id: master.id,
      uuid: master.uuid,
      name: master.name,
      pluralName: master.pluralName || master.plural_name,
      code: master.code,
      description: master.description,
      icon: master.icon || 'Layers',
      employeeLinkage: master.employeeLinkage || master.employee_linkage,
      hasHierarchy: Boolean(master.hasHierarchy ?? master.has_hierarchy),
      hasHistory: Boolean(master.hasHistory ?? master.has_history),
      status: master.status,
      isSystem: isSystemM,
      systemTable: master.systemTable || master.system_table || null,
      systemNameColumn: master.systemNameColumn || master.system_name_column || 'name',
      recordsCount,
      fields: fields.map((f: any) => ({
        id: f.id,
        uuid: f.uuid,
        fieldName: f.fieldName || f.field_name || '',
        fieldKey: f.fieldKey || f.field_key || '',
        fieldType: f.fieldType || f.field_type || 'text',
        isRequired: Boolean(f.isRequired ?? f.is_required),
        isUnique: Boolean(f.isUnique ?? f.is_unique),
        showInTable: f.showInTable !== undefined ? Boolean(f.showInTable) : (f.show_in_table !== undefined ? Boolean(f.show_in_table) : true),
        isActive: f.isActive !== undefined ? Boolean(f.isActive) : (f.is_active !== undefined ? Boolean(f.is_active) : true),
        helpText: f.helpText || f.help_text,
        placeholder: f.placeholder,
        defaultValue: f.defaultValue || f.default_value,
        lookupMasterId: f.lookupMasterId || f.lookup_master_id,
        choiceListId: f.choiceListId || f.choice_list_id,
        optionsJson: typeof (f.optionsJson || f.options_json) === 'string' ? JSON.parse(f.optionsJson || f.options_json) : (f.optionsJson || f.options_json),
        validationRules: typeof (f.validationRules || f.validation_rules) === 'string' ? JSON.parse(f.validationRules || f.validation_rules) : (f.validationRules || f.validation_rules),
        displayOrder: f.displayOrder || f.display_order || 0,
        columnMap: f.columnMap || f.column_map || null,
        isCore: Boolean(f.isCore ?? f.is_core),
      })),
      validationRules: rules.map((r: any) => ({
        id: r.id,
        uuid: r.uuid,
        ruleName: r.ruleName || r.rule_name,
        fieldA: r.fieldA || r.field_a,
        operator: r.operator,
        fieldB: r.fieldB || r.field_b,
        customValue: r.customValue || r.custom_value,
        errorMessage: r.errorMessage || r.error_message,
        isActive: Boolean(r.isActive ?? r.is_active),
      })),
      autofillMappings: autofill.map((a: any) => ({
        id: a.id,
        uuid: a.uuid,
        lookupFieldKey: a.lookupFieldKey || a.lookup_field_key,
        sourceFieldKey: a.sourceFieldKey || a.source_field_key,
        targetFieldKey: a.targetFieldKey || a.target_field_key,
        isActive: Boolean(a.isActive ?? a.is_active),
      })),
    };
  }

  /**
   * Create custom master
   */
  async createMaster(orgId: number, companyId: number | undefined, userId: number, payload: CustomMasterPayload) {
    if (!payload?.name || !String(payload.name).trim()) {
      throw new Error('Master name is required');
    }
    const code = (payload.code ? String(payload.code) : String(payload.name))
      .trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
    if (!code) {
      throw new Error('Master code is required');
    }

    const existing = await this.db('custom_masters')
      .where({ organization_id: orgId, code })
      .whereNull('deleted_at')
      .first();
    if (existing) {
      throw new Error(`A master with code "${code}" already exists`);
    }

    const [newId] = await this.db('custom_masters').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      company_id: companyId || null,
      name: payload.name.trim(),
      plural_name: payload.pluralName?.trim() || null,
      code,
      description: payload.description || null,
      icon: payload.icon || 'Layers',
      employee_linkage: payload.employeeLinkage || 'none',
      has_hierarchy: Boolean(payload.hasHierarchy),
      has_history: Boolean(payload.hasHistory),
      status: payload.status || 'Active',
      created_by: userId,
      updated_by: userId,
    });

    // Automatically create a default 'Name' or 'Title' field for convenience
    await this.db('custom_master_fields').insert({
      uuid: uuidv4(),
      master_id: newId,
      field_name: `${payload.name.trim()} Name`,
      field_key: 'name',
      field_type: 'text',
      is_required: true,
      show_in_table: true,
      is_active: true,
      help_text: `Name of the ${payload.name.trim()}`,
      display_order: 1,
    });

    return this.getMasterById(orgId, newId);
  }

  /**
   * Update custom master
   */
  async updateMaster(orgId: number, masterId: number, userId: number, payload: Partial<CustomMasterPayload>) {
    const updateData: any = {
      updated_by: userId,
      updated_at: new Date(),
    };
    if (payload.name !== undefined) {
      if (!String(payload.name).trim()) throw new Error('Master name cannot be empty');
      updateData.name = String(payload.name).trim();
    }
    if (payload.pluralName !== undefined) updateData.plural_name = payload.pluralName;
    if (payload.code !== undefined) {
      const code = String(payload.code).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
      if (!code) throw new Error('Master code cannot be empty');
      const clash = await this.db('custom_masters')
        .where({ organization_id: orgId, code })
        .whereNull('deleted_at')
        .whereNot('id', masterId)
        .first();
      if (clash) throw new Error(`A master with code "${code}" already exists`);
      updateData.code = code;
    }
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.icon !== undefined) updateData.icon = payload.icon;
    if (payload.employeeLinkage !== undefined) updateData.employee_linkage = payload.employeeLinkage;
    if (payload.hasHierarchy !== undefined) updateData.has_hierarchy = payload.hasHierarchy;
    if (payload.hasHistory !== undefined) updateData.has_history = payload.hasHistory;
    if (payload.status !== undefined) updateData.status = payload.status;

    await this.db('custom_masters')
      .where('id', masterId)
      .where('organization_id', orgId)
      .update(updateData);

    return this.getMasterById(orgId, masterId);
  }

  /**
   * Delete custom master
   */
  async deleteMaster(orgId: number, masterId: number) {
    await this.db('custom_masters')
      .where('id', masterId)
      .where('organization_id', orgId)
      .update({ deleted_at: new Date() });
    return true;
  }

  // ─── Fields ─────────────────────────────────────────────────────────────

  async addField(orgId: number, masterId: number, payload: CustomMasterFieldPayload) {
    let master = await this.db('custom_masters')
      .where('id', masterId)
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .first();

    if (!master) {
      master = await this.db('custom_masters')
        .where('id', masterId)
        .whereNull('deleted_at')
        .first();
    }
    if (!master) throw new Error('Master not found');

    let key = payload.fieldKey
      ? payload.fieldKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : payload.fieldName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    if (!key) key = `field_${Date.now()}`;

    // Ensure unique field_key within this master (prevents ER_DUP_ENTRY crash)
    let uniqueKey = key;
    let counter = 1;
    while (true) {
      const existing = await this.db('custom_master_fields')
        .where('master_id', masterId)
        .where('field_key', uniqueKey)
        .first();
      if (!existing) break;
      uniqueKey = `${key}_${counter}`;
      counter++;
    }

    const insertData: any = {
      uuid: uuidv4(),
      master_id: masterId,
      field_name: payload.fieldName.trim(),
      field_key: uniqueKey,
      field_type: payload.fieldType || 'text',
      is_required: Boolean(payload.isRequired),
      is_unique: Boolean(payload.isUnique),
      show_in_table: payload.showInTable !== undefined ? Boolean(payload.showInTable) : true,
      is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      help_text: payload.helpText || null,
      placeholder: payload.placeholder || null,
      default_value: payload.defaultValue || null,
      lookup_master_id: payload.lookupMasterId || null,
      choice_list_id: payload.choiceListId || null,
      options_json: payload.optionsJson ? (typeof payload.optionsJson === 'string' ? payload.optionsJson : JSON.stringify(payload.optionsJson)) : null,
      validation_rules: payload.validationRules ? (typeof payload.validationRules === 'string' ? payload.validationRules : JSON.stringify(payload.validationRules)) : null,
      display_order: payload.displayOrder || 0,
    };

    const insertRes: any = await this.db('custom_master_fields').insert(insertData);
    const rawId: any = Array.isArray(insertRes) ? insertRes[0] : insertRes;
    const fieldId = rawId && typeof rawId === 'object' ? (rawId.id || Object.values(rawId)[0]) : rawId;

    const f: any = await this.db('custom_master_fields').where('id', fieldId).first();
    if (!f) throw new Error('Failed to retrieve newly created field');

    let parsedOptions: any = undefined;
    try {
      const optVal = f.optionsJson || f.options_json;
      parsedOptions = typeof optVal === 'string' ? JSON.parse(optVal) : optVal;
    } catch (_) {}

    let parsedValidation: any = undefined;
    try {
      const valRules = f.validationRules || f.validation_rules;
      parsedValidation = typeof valRules === 'string' ? JSON.parse(valRules) : valRules;
    } catch (_) {}

    return {
      id: f.id,
      uuid: f.uuid,
      fieldName: f.fieldName || f.field_name || '',
      fieldKey: f.fieldKey || f.field_key || '',
      fieldType: f.fieldType || f.field_type || 'text',
      isRequired: Boolean(f.isRequired ?? f.is_required),
      isUnique: Boolean(f.isUnique ?? f.is_unique),
      showInTable: f.showInTable !== undefined ? Boolean(f.showInTable) : (f.show_in_table !== undefined ? Boolean(f.show_in_table) : true),
      isActive: f.isActive !== undefined ? Boolean(f.isActive) : (f.is_active !== undefined ? Boolean(f.is_active) : true),
      helpText: f.helpText || f.help_text,
      placeholder: f.placeholder,
      defaultValue: f.defaultValue || f.default_value,
      lookupMasterId: f.lookupMasterId || f.lookup_master_id,
      choiceListId: f.choiceListId || f.choice_list_id,
      optionsJson: parsedOptions,
      validationRules: parsedValidation,
      displayOrder: f.displayOrder || f.display_order || 0,
    };
  }

  async updateField(orgId: number, masterId: number, fieldId: number, payload: Partial<CustomMasterFieldPayload>) {
    let master = await this.db('custom_masters')
      .where('id', masterId)
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .first();

    if (!master) {
      master = await this.db('custom_masters')
        .where('id', masterId)
        .whereNull('deleted_at')
        .first();
    }
    if (!master) throw new Error('Master not found');

    const updateData: any = { updated_at: new Date() };
    if (payload.fieldName !== undefined) updateData.field_name = payload.fieldName;
    if (payload.fieldKey !== undefined) updateData.field_key = payload.fieldKey;
    if (payload.fieldType !== undefined) updateData.field_type = payload.fieldType;
    if (payload.isRequired !== undefined) updateData.is_required = payload.isRequired;
    if (payload.isUnique !== undefined) updateData.is_unique = payload.isUnique;
    if (payload.showInTable !== undefined) updateData.show_in_table = payload.showInTable;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;
    if (payload.helpText !== undefined) updateData.help_text = payload.helpText;
    if (payload.placeholder !== undefined) updateData.placeholder = payload.placeholder;
    if (payload.defaultValue !== undefined) updateData.default_value = payload.defaultValue;
    if (payload.lookupMasterId !== undefined) updateData.lookup_master_id = payload.lookupMasterId;
    if (payload.choiceListId !== undefined) updateData.choice_list_id = payload.choiceListId;
    if (payload.optionsJson !== undefined) {
      updateData.options_json = typeof payload.optionsJson === 'string' ? payload.optionsJson : JSON.stringify(payload.optionsJson);
    }
    if (payload.validationRules !== undefined) {
      updateData.validation_rules = typeof payload.validationRules === 'string' ? payload.validationRules : JSON.stringify(payload.validationRules);
    }
    if (payload.displayOrder !== undefined) updateData.display_order = payload.displayOrder;

    await this.db('custom_master_fields')
      .where('id', fieldId)
      .where('master_id', masterId)
      .update(updateData);

    const f: any = await this.db('custom_master_fields').where('id', fieldId).first();
    if (!f) throw new Error('Field not found after update');

    let parsedOptions: any = undefined;
    try {
      const optVal = f.optionsJson || f.options_json;
      parsedOptions = typeof optVal === 'string' ? JSON.parse(optVal) : optVal;
    } catch (_) {}

    let parsedValidation: any = undefined;
    try {
      const valRules = f.validationRules || f.validation_rules;
      parsedValidation = typeof valRules === 'string' ? JSON.parse(valRules) : valRules;
    } catch (_) {}

    return {
      id: f.id,
      uuid: f.uuid,
      fieldName: f.fieldName || f.field_name || '',
      fieldKey: f.fieldKey || f.field_key || '',
      fieldType: f.fieldType || f.field_type || 'text',
      isRequired: Boolean(f.isRequired ?? f.is_required),
      isUnique: Boolean(f.isUnique ?? f.is_unique),
      showInTable: f.showInTable !== undefined ? Boolean(f.showInTable) : (f.show_in_table !== undefined ? Boolean(f.show_in_table) : true),
      isActive: f.isActive !== undefined ? Boolean(f.isActive) : (f.is_active !== undefined ? Boolean(f.is_active) : true),
      helpText: f.helpText || f.help_text,
      placeholder: f.placeholder,
      defaultValue: f.defaultValue || f.default_value,
      lookupMasterId: f.lookupMasterId || f.lookup_master_id,
      choiceListId: f.choiceListId || f.choice_list_id,
      optionsJson: parsedOptions,
      validationRules: parsedValidation,
      displayOrder: f.displayOrder || f.display_order || 0,
    };
  }

  async deleteField(orgId: number, masterId: number, fieldId: number) {
    await this.db('custom_master_fields')
      .where('id', fieldId)
      .where('master_id', masterId)
      .delete();
    return true;
  }

  // ─── Validation Rules ───────────────────────────────────────────────────

  async addValidationRule(orgId: number, masterId: number, payload: CustomMasterValidationRulePayload) {
    const [ruleId] = await this.db('custom_master_validation_rules').insert({
      uuid: uuidv4(),
      master_id: masterId,
      rule_name: payload.ruleName,
      field_a: payload.fieldA,
      operator: payload.operator,
      field_b: payload.fieldB || null,
      custom_value: payload.customValue || null,
      error_message: payload.errorMessage || null,
      is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
    });
    const r: any = await this.db('custom_master_validation_rules').where('id', ruleId).first();
    return {
      id: r.id,
      uuid: r.uuid,
      ruleName: r.ruleName || r.rule_name,
      fieldA: r.fieldA || r.field_a,
      operator: r.operator,
      fieldB: r.fieldB || r.field_b,
      customValue: r.customValue || r.custom_value,
      errorMessage: r.errorMessage || r.error_message,
      isActive: Boolean(r.isActive ?? r.is_active),
    };
  }

  async updateValidationRule(orgId: number, masterId: number, ruleId: number, payload: Partial<CustomMasterValidationRulePayload>) {
    const updateData: any = { updated_at: new Date() };
    if (payload.ruleName !== undefined) updateData.rule_name = payload.ruleName;
    if (payload.fieldA !== undefined) updateData.field_a = payload.fieldA;
    if (payload.operator !== undefined) updateData.operator = payload.operator;
    if (payload.fieldB !== undefined) updateData.field_b = payload.fieldB;
    if (payload.customValue !== undefined) updateData.custom_value = payload.customValue;
    if (payload.errorMessage !== undefined) updateData.error_message = payload.errorMessage;
    if (payload.isActive !== undefined) updateData.is_active = payload.isActive;

    await this.db('custom_master_validation_rules')
      .where('id', ruleId)
      .where('master_id', masterId)
      .update(updateData);

    const r: any = await this.db('custom_master_validation_rules').where('id', ruleId).first();
    return {
      id: r.id,
      uuid: r.uuid,
      ruleName: r.ruleName || r.rule_name,
      fieldA: r.fieldA || r.field_a,
      operator: r.operator,
      fieldB: r.fieldB || r.field_b,
      customValue: r.customValue || r.custom_value,
      errorMessage: r.errorMessage || r.error_message,
      isActive: Boolean(r.isActive ?? r.is_active),
    };
  }

  async deleteValidationRule(orgId: number, masterId: number, ruleId: number) {
    await this.db('custom_master_validation_rules')
      .where('id', ruleId)
      .where('master_id', masterId)
      .delete();
    return true;
  }

  // ─── Autofill Mappings ──────────────────────────────────────────────────

  async addAutofillMapping(orgId: number, masterId: number, payload: CustomMasterAutofillPayload) {
    const [mappingId] = await this.db('custom_master_autofill_mappings').insert({
      uuid: uuidv4(),
      master_id: masterId,
      lookup_field_key: payload.lookupFieldKey,
      source_field_key: payload.sourceFieldKey,
      target_field_key: payload.targetFieldKey,
      is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
    });
    const a: any = await this.db('custom_master_autofill_mappings').where('id', mappingId).first();
    return {
      id: a.id,
      uuid: a.uuid,
      lookupFieldKey: a.lookupFieldKey || a.lookup_field_key,
      sourceFieldKey: a.sourceFieldKey || a.source_field_key,
      targetFieldKey: a.targetFieldKey || a.target_field_key,
      isActive: Boolean(a.isActive ?? a.is_active),
    };
  }

  async deleteAutofillMapping(orgId: number, masterId: number, mappingId: number) {
    await this.db('custom_master_autofill_mappings')
      .where('id', mappingId)
      .where('master_id', masterId)
      .delete();
    return true;
  }

  // ─── Choice Lists ───────────────────────────────────────────────────────

  async listChoiceLists(orgId: number) {
    const rows = await this.db('custom_master_choice_lists')
      .where('organization_id', orgId)
      .orderBy('name', 'asc');

    return rows.map((r: any) => ({
      id: r.id,
      uuid: r.uuid,
      name: r.name,
      code: r.code,
      description: r.description,
      options: typeof (r.optionsJson || r.options_json) === 'string' ? JSON.parse(r.optionsJson || r.options_json) : (r.optionsJson || r.options_json || []),
      status: r.status,
      createdAt: r.createdAt || r.created_at,
    }));
  }

  async createChoiceList(orgId: number, payload: ChoiceListPayload) {
    const [id] = await this.db('custom_master_choice_lists').insert({
      uuid: uuidv4(),
      organization_id: orgId,
      name: payload.name.trim(),
      code: payload.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      description: payload.description || null,
      options_json: JSON.stringify(payload.optionsJson || []),
      status: payload.status || 'Active',
    });
    const r: any = await this.db('custom_master_choice_lists').where('id', id).first();
    return {
      id: r.id,
      uuid: r.uuid,
      name: r.name,
      code: r.code,
      description: r.description,
      options: typeof (r.optionsJson || r.options_json) === 'string' ? JSON.parse(r.optionsJson || r.options_json) : (r.optionsJson || r.options_json || []),
      status: r.status,
      createdAt: r.createdAt || r.created_at,
    };
  }

  async updateChoiceList(orgId: number, id: number, payload: Partial<ChoiceListPayload>) {
    const updateData: any = { updated_at: new Date() };
    if (payload.name !== undefined) updateData.name = payload.name;
    if (payload.code !== undefined) updateData.code = payload.code;
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.optionsJson !== undefined) updateData.options_json = JSON.stringify(payload.optionsJson);
    if (payload.status !== undefined) updateData.status = payload.status;

    await this.db('custom_master_choice_lists')
      .where('id', id)
      .where('organization_id', orgId)
      .update(updateData);

    const r: any = await this.db('custom_master_choice_lists').where('id', id).first();
    return {
      id: r.id,
      uuid: r.uuid,
      name: r.name,
      code: r.code,
      description: r.description,
      options: typeof (r.optionsJson || r.options_json) === 'string' ? JSON.parse(r.optionsJson || r.options_json) : (r.optionsJson || r.options_json || []),
      status: r.status,
      createdAt: r.createdAt || r.created_at,
    };
  }

  async deleteChoiceList(orgId: number, id: number) {
    await this.db('custom_master_choice_lists')
      .where('id', id)
      .where('organization_id', orgId)
      .delete();
    return true;
  }

  // ─── Dynamic Master Records ─────────────────────────────────────────────

  /**
   * getKnex().postProcessResponse recursively camelCases every key — including the keys
   * INSIDE the `data` JSON blob, which corrupts snake_case field keys (status_name ->
   * statusName) on read. Always pull the raw JSON text and parse it ourselves.
   */
  private parseRecordData(raw: any): Record<string, any> {
    if (raw === null || raw === undefined) return {};
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw;
  }

  private async getRecordById(recordId: number) {
    const row: any = await this.db('custom_master_records')
      .where('id', recordId)
      .select('*', this.db.raw('CAST(`data` AS CHAR) AS data_text'))
      .first();
    if (!row) return null;
    return {
      id: row.id,
      uuid: row.uuid,
      recordCode: row.recordCode,
      status: row.status,
      data: this.parseRecordData(row.dataText),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async listRecords(orgId: number, masterId: number, options: { search?: string; status?: string; page?: number; limit?: number }) {
    // Load master to detect if it is a system master
    const master = await this.db('custom_masters').where('id', masterId).first();
    if (!master) return { records: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 1 } };

    if (this.isSystemMaster(master)) {
      return this.listSystemRecords(orgId, master, options);
    }

    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    const baseQuery = () => {
      let q = this.db('custom_master_records')
        .where('organization_id', orgId)
        .where('master_id', masterId)
        .whereNull('deleted_at');
      if (options.status && options.status !== 'all') {
        q = q.where('status', options.status);
      }
      return q;
    };
    const withData = (q: any) => q.select('*', this.db.raw('CAST(`data` AS CHAR) AS data_text'));

    const mapRow = (r: any) => ({
      id: r.id,
      uuid: r.uuid,
      recordCode: r.recordCode,
      status: r.status,
      data: this.parseRecordData(r.dataText),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });

    const hasSearch = Boolean(options.search && options.search.trim());

    // The record payload lives in a JSON column, so free-text search is applied in-memory.
    // When searching we must filter BEFORE paginating (and recompute the total) so page
    // counts and navigation stay correct.
    if (hasSearch) {
      const q = options.search!.toLowerCase().trim();
      const allRows = await withData(baseQuery()).orderBy('id', 'desc');
      const matched = allRows.map(mapRow).filter((item) => {
        if (item.recordCode?.toLowerCase().includes(q)) return true;
        const vals = Object.values(item.data).map((v) => String(v ?? '').toLowerCase());
        return vals.some((v) => v.includes(q));
      });
      const total = matched.length;
      return {
        records: matched.slice(offset, offset + limit),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    const totalCountRow = await baseQuery().count('id as cnt').first();
    const total = Number((totalCountRow as any)?.cnt || 0);

    const rows = await withData(baseQuery())
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    let parsed = rows.map((r: any) => {
      let data = {};
      try {
        data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data || {};
      } catch (e) { }
      return {
        id: r.id,
        uuid: r.uuid,
        recordCode: r.record_code,
        status: r.status,
        data,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      };
    });

    if (options.search && options.search.trim()) {
      const q = options.search.toLowerCase().trim();
      parsed = parsed.filter((item: any) => {
        if (item.recordCode?.toLowerCase().includes(q)) return true;
        const vals = Object.values(item.data).map((v) => String(v || '').toLowerCase());
        return vals.some((v) => v.includes(q));
      });
    }

    return {
      records: parsed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Validate record data against master fields and custom validation rules
   */
  async validateRecordData(
    orgId: number,
    masterId: number,
    data: Record<string, any>,
    excludeRecordId?: number
  ) {
    // NOTE: getKnex() postProcessResponse converts every column to camelCase, so rows read
    // back here expose fieldKey / isRequired / fieldType (NOT field_key / is_required / field_type).
    const fields = await this.db('custom_master_fields')
      .where('master_id', masterId)
      .where('is_active', 1);

    const rules = await this.db('custom_master_validation_rules')
      .where('master_id', masterId)
      .where('is_active', 1);

    const errors: string[] = [];

    // 1. Validate field required & format
    for (const f of fields) {
      const key = f.fieldKey;
      const label = f.fieldName || key;
      const val = data[key];
      const isEmpty = val === undefined || val === null || String(val).trim() === '';

      if (f.isRequired && isEmpty) {
        errors.push(`${label} is required.`);
        continue;
      }
      if (isEmpty) continue;

      if (f.fieldType === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(val))) {
          errors.push(`${label} must be a valid email address.`);
        }
      } else if (f.fieldType === 'number') {
        if (isNaN(Number(val))) {
          errors.push(`${label} must be a valid number.`);
        }
      }
    }

    // 2. Enforce uniqueness for fields flagged is_unique
    for (const f of fields) {
      if (!f.isUnique) continue;
      const key = f.fieldKey;
      const val = data[key];
      if (val === undefined || val === null || String(val).trim() === '') continue;

      let q = this.db('custom_master_records')
        .where('organization_id', orgId)
        .where('master_id', masterId)
        .whereNull('deleted_at')
        .whereRaw('JSON_UNQUOTE(JSON_EXTRACT(data, ?)) = ?', [`$.${key}`, String(val)]);
      if (excludeRecordId) q = q.whereNot('id', excludeRecordId);
      const clash = await q.first();
      if (clash) {
        errors.push(`${f.fieldName || key} "${val}" already exists.`);
      }
    }

    // 3. Validate custom rules
    for (const r of rules) {
      const valA = data[r.fieldA];
      const valB = r.fieldB ? data[r.fieldB] : r.customValue;

      if (valA !== undefined && valB !== undefined) {
        if (r.operator === '==' && String(valA) !== String(valB)) {
          errors.push(r.errorMessage || `${r.fieldA} must equal ${r.fieldB || r.customValue}`);
        } else if (r.operator === '!=' && String(valA) === String(valB)) {
          errors.push(r.errorMessage || `${r.fieldA} cannot equal ${r.fieldB || r.customValue}`);
        }
      }
    }

    return errors;
  }

  async createRecord(orgId: number, companyId: number | undefined, masterId: number, userId: number, payload: DynamicRecordPayload) {
    let master = await this.db('custom_masters')
      .where('id', masterId)
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .first();

    if (!master) {
      master = await this.db('custom_masters')
        .where('id', masterId)
        .whereNull('deleted_at')
        .first();
    }

    if (!master) throw new Error('Master not found');

    // Delegate to bridge for system masters
    if (this.isSystemMaster(master)) {
      return this.createSystemRecord(orgId, companyId, master, userId, payload);
    }

    const errors = await this.validateRecordData(orgId, masterId, payload.data || {});
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const code = payload.recordCode || `${master.code.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const [recordId] = await this.db('custom_master_records').insert({
      uuid: uuidv4(),
      organization_id: master.organization_id || orgId,
      company_id: companyId || null,
      master_id: masterId,
      record_code: code,
      data: JSON.stringify(payload.data || {}),
      status: payload.status || 'Active',
      created_by: userId,
      updated_by: userId,
    });

    return this.getRecordById(recordId);
  }

  async updateRecord(orgId: number, masterId: number, recordId: number, userId: number, payload: Partial<DynamicRecordPayload>) {
    let master = await this.db('custom_masters')
      .where('id', masterId)
      .where('organization_id', orgId)
      .first();

    if (!master) {
      master = await this.db('custom_masters')
        .where('id', masterId)
        .first();
    }

    // Delegate to bridge for system masters
    if (master && this.isSystemMaster(master)) {
      return this.updateSystemRecord(orgId, master, recordId, userId, payload);
    }

    const updateData: any = { updated_by: userId, updated_at: new Date() };
    if (payload.recordCode !== undefined) updateData.record_code = payload.recordCode;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.data !== undefined) {
      const errors = await this.validateRecordData(orgId, masterId, payload.data, recordId);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }
      updateData.data = JSON.stringify(payload.data);
    }

    await this.db('custom_master_records')
      .where('id', recordId)
      .where('master_id', masterId)
      .where('organization_id', orgId)
      .update(updateData);

    return this.getRecordById(recordId);
  }

  async deleteRecord(orgId: number, masterId: number, recordId: number) {
    let master = await this.db('custom_masters')
      .where('id', masterId)
      .where('organization_id', orgId)
      .first();

    if (!master) {
      master = await this.db('custom_masters')
        .where('id', masterId)
        .first();
    }

    // Delegate to bridge for system masters
    if (master && this.isSystemMaster(master)) {
      return this.deleteSystemRecord(master, recordId);
    }

    await this.db('custom_master_records')
      .where('id', recordId)
      .where('master_id', masterId)
      .update({ deleted_at: new Date() });
    return true;
  }

  // ─── DB Lookup Options ─────────────────────────────────────────────────────
  /**
   * Returns { label, value } options list for real DB entities.
   * Used by the `db_lookup` field type in Master Builder forms.
   */
  async getDbLookupOptions(
    orgId: number,
    companyId: number | undefined,
    entity: string
  ): Promise<Array<{ label: string; value: string | number; meta?: Record<string, any> }>> {
    const db = this.db;

    switch (entity) {
      case 'companies': {
        const rows = await db('company')
          .where('organization_id', orgId)
          .whereNull('deleted_at')
          .orderBy('name', 'asc')
          .select('company_id as id', 'name', 'code');
        return rows.map((r: any) => ({
          label: `${r.name}${r.code ? ` (${r.code})` : ''}`,
          value: r.id,
          meta: { code: r.code },
        }));
      }

      case 'departments': {
        const query = db('departments')
          .whereNull('deleted_at')
          .orderBy('name', 'asc')
          .select('id', 'name', 'code');
        if (companyId) query.where('company_id', companyId);
        else query.where('organization_id', orgId);
        const rows = await query;
        return rows.map((r: any) => ({ label: r.name, value: r.id, meta: { code: r.code } }));
      }

      case 'designations': {
        const query = db('designations')
          .whereNull('deleted_at')
          .orderBy('title', 'asc')
          .select('id', db.raw("COALESCE(title, name) as label_col"), 'code');
        if (companyId) query.where('company_id', companyId);
        else query.where('organization_id', orgId);
        const rows = await query;
        return rows.map((r: any) => ({ label: r.label_col || r.title || r.name, value: r.id }));
      }

      case 'locations': {
        const query = db('locations')
          .whereNull('deleted_at')
          .orderBy('name', 'asc')
          .select('id', 'name', 'code');
        if (companyId) query.where('company_id', companyId);
        else query.where('organization_id', orgId);
        const rows = await query;
        return rows.map((r: any) => ({ label: r.name, value: r.id }));
      }

      case 'employees': {
        const query = db('employees as e')
          .leftJoin('employee_profiles as ep', 'e.id', 'ep.employee_id')
          .whereNull('e.deleted_at')
          .orderByRaw("CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) ASC")
          .select(
            'e.id',
            'e.employee_code',
            db.raw("CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) as full_name")
          );
        if (companyId) query.where('e.company_id', companyId);
        else query.where('e.organization_id', orgId);
        const rows = await query;
        return rows.map((r: any) => ({
          label: `${r.full_name}${r.employee_code ? ` (${r.employee_code})` : ''}`,
          value: r.id,
        }));
      }

      case 'grades':
      case 'employee_status':
      case 'employment_type': {
        // These are custom masters — fetch their records
        const codeMap: Record<string, string> = {
          grades: 'grade',
          employee_status: 'employee-status',
          employment_type: 'emp-type',
        };
        const masterCode = codeMap[entity];
        const master = await db('custom_masters')
          .where('organization_id', orgId)
          .where('code', masterCode)
          .whereNull('deleted_at')
          .first();

        if (!master) return [];

        // Try system masters first
        const sysDef = this.SYSTEM_MASTER_MAP?.[masterCode];
        if (sysDef) {
          try {
            const rows = await db(sysDef.systemTable)
              .where('organization_id', orgId)
              .whereNull('deleted_at')
              .orderBy(sysDef.systemNameColumn, 'asc')
              .select(sysDef.systemIdColumn + ' as id', sysDef.systemNameColumn + ' as name', 'code');
            return rows.map((r: any) => ({ label: r.name, value: r.code || r.id }));
          } catch {}
        }

        // Fallback: custom_master_records
        const records = await db('custom_master_records')
          .where('master_id', master.id)
          .where('organization_id', orgId)
          .where('status', 'Active')
          .whereNull('deleted_at')
          .orderBy('record_code', 'asc')
          .select('id', 'record_code', 'data');
        return records.map((r: any) => {
          const data = typeof r.data === 'string' ? JSON.parse(r.data) : r.data || {};
          const label = data.name || data.title || r.record_code || `Record #${r.id}`;
          return { label, value: r.record_code || r.id };
        });
      }

      default:
        throw new Error(`Unknown db_lookup entity: "${entity}". Supported: companies, departments, designations, locations, employees, grades, employee_status, employment_type`);
    }
  }

  // Helper: map of system master codes (safe getter)
  private get SYSTEM_MASTER_MAP(): Record<string, SystemMasterDefinition> {
    const map: Record<string, SystemMasterDefinition> = {};
    for (const sm of SYSTEM_MASTERS) {
      map[sm.code] = sm;
    }
    return map;
  }

  // ─── Employee Profile Linkages ───────────────────────────────────────────

  /**
   * Returns all active custom masters configured with employee profile linkage
   * ('primary_assignment' or 'secondary_linkage'), along with their active records.
   */
  async getEmployeeLinkedMasters(orgId: number) {
    const db = this.db;
    const masters = await db('custom_masters')
      .where('organization_id', orgId)
      .whereIn('employee_linkage', ['primary_assignment', 'secondary_linkage'])
      .where('status', 'Active')
      .whereNull('deleted_at')
      .orderBy('name', 'asc');

    if (masters.length === 0) {
      return [];
    }

    const masterIds = masters.map((m: any) => m.id);

    // Fetch all active records for these masters
    const records = await db('custom_master_records')
      .whereIn('master_id', masterIds)
      .where('organization_id', orgId)
      .where('status', 'Active')
      .whereNull('deleted_at')
      .orderBy('record_code', 'asc');

    const recordsByMasterId: Record<number, any[]> = {};
    for (const rec of records) {
      if (!recordsByMasterId[rec.master_id]) {
        recordsByMasterId[rec.master_id] = [];
      }
      let parsedData: any = {};
      try {
        parsedData = typeof rec.data === 'string' ? JSON.parse(rec.data) : rec.data || {};
      } catch {}

      const label = parsedData.name || parsedData.title || parsedData.label || rec.record_code || `Record #${rec.id}`;
      recordsByMasterId[rec.master_id].push({
        id: rec.id,
        recordCode: rec.record_code,
        label,
        data: parsedData,
      });
    }

    return masters.map((m: any) => ({
      id: m.id,
      uuid: m.uuid,
      name: m.name,
      pluralName: m.plural_name,
      code: m.code,
      description: m.description,
      icon: m.icon,
      employeeLinkage: m.employee_linkage,
      records: recordsByMasterId[m.id] || [],
    }));
  }

  /**
   * Returns the custom master values assigned to a specific employee.
   */
  async getEmployeeMasterValues(orgId: number, employeeId: number) {
    const db = this.db;
    const hasTable = await db.schema.hasTable('employee_custom_master_values');
    if (!hasTable) return [];

    const rows = await db('employee_custom_master_values as ecmv')
      .join('custom_masters as cm', 'ecmv.master_id', 'cm.id')
      .leftJoin('custom_master_records as cmr', 'ecmv.record_id', 'cmr.id')
      .where('ecmv.organization_id', orgId)
      .where('ecmv.employee_id', employeeId)
      .whereNull('cm.deleted_at')
      .select(
        'ecmv.id',
        'ecmv.master_id as masterId',
        'cm.name as masterName',
        'cm.code as masterCode',
        'cm.employee_linkage as employeeLinkage',
        'ecmv.record_id as recordId',
        'ecmv.record_ids_json as recordIdsJson',
        'ecmv.custom_value as customValue',
        'cmr.record_code as recordCode',
        'cmr.data as recordData'
      );

    return rows.map((r: any) => {
      let parsedRecordData: any = null;
      try {
        if (r.recordData) {
          parsedRecordData = typeof r.recordData === 'string' ? JSON.parse(r.recordData) : r.recordData;
        }
      } catch {}

      let parsedRecordIds: number[] = [];
      try {
        if (r.recordIdsJson) {
          parsedRecordIds = typeof r.recordIdsJson === 'string' ? JSON.parse(r.recordIdsJson) : r.recordIdsJson;
        }
      } catch {}

      const recordLabel = parsedRecordData?.name || parsedRecordData?.title || parsedRecordData?.label || r.recordCode || (r.recordId ? `Record #${r.recordId}` : null);

      return {
        id: r.id,
        masterId: r.masterId,
        masterName: r.masterName,
        masterCode: r.masterCode,
        employeeLinkage: r.employeeLinkage,
        recordId: r.recordId,
        recordIds: parsedRecordIds,
        recordLabel,
        customValue: r.customValue,
      };
    });
  }

  /**
   * Saves / upserts custom master values for an employee.
   */
  async saveEmployeeMasterValues(
    orgId: number,
    employeeId: number,
    assignments: Array<{
      masterId: number;
      recordId?: number | null;
      recordIds?: number[] | null;
      customValue?: string | null;
    }>
  ) {
    const db = this.db;
    const hasTable = await db.schema.hasTable('employee_custom_master_values');
    if (!hasTable) return [];

    for (const item of assignments) {
      if (!item.masterId) continue;

      const hasValue =
        (item.recordId !== undefined && item.recordId !== null && item.recordId !== 0) ||
        (Array.isArray(item.recordIds) && item.recordIds.length > 0) ||
        (item.customValue !== undefined && item.customValue !== null && String(item.customValue).trim() !== '');

      const existing = await db('employee_custom_master_values')
        .where({
          organization_id: orgId,
          employee_id: employeeId,
          master_id: item.masterId,
        })
        .first();

      if (!hasValue) {
        if (existing) {
          await db('employee_custom_master_values')
            .where('id', existing.id)
            .delete();
        }
        continue;
      }

      const payload = {
        organization_id: orgId,
        employee_id: employeeId,
        master_id: item.masterId,
        record_id: item.recordId || null,
        record_ids_json: item.recordIds ? JSON.stringify(item.recordIds) : null,
        custom_value: item.customValue ? String(item.customValue).trim() : null,
        updated_at: new Date(),
      };

      if (existing) {
        await db('employee_custom_master_values')
          .where('id', existing.id)
          .update(payload);
      } else {
        await db('employee_custom_master_values').insert({
          ...payload,
          created_at: new Date(),
        });
      }
    }

    return this.getEmployeeMasterValues(orgId, employeeId);
  }
}

export const masterBuilderService = new MasterBuilderService();


