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

  /**
   * Seed default custom masters for tenant if empty
   */
  async ensureSeedMasters(orgId: number, companyId?: number) {
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

    const recordCountRes = await this.db('custom_master_records')
      .where('master_id', masterId)
      .whereNull('deleted_at')
      .count('id as cnt')
      .first();

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
      recordsCount: Number((recordCountRes as any)?.cnt || (recordCountRes as any)?.count || 0),
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
    const master = await this.db('custom_masters')
      .where('id', masterId)
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .first();
    if (!master) throw new Error('Master not found');

    const key = payload.fieldKey
      ? payload.fieldKey.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : payload.fieldName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const [fieldId] = await this.db('custom_master_fields').insert({
      uuid: uuidv4(),
      master_id: masterId,
      field_name: payload.fieldName.trim(),
      field_key: key,
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
      options_json: payload.optionsJson ? JSON.stringify(payload.optionsJson) : null,
      validation_rules: payload.validationRules ? JSON.stringify(payload.validationRules) : null,
      display_order: payload.displayOrder || 0,
    });

    const f: any = await this.db('custom_master_fields').where('id', fieldId).first();
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
      optionsJson: typeof (f.optionsJson || f.options_json) === 'string' ? JSON.parse(f.optionsJson || f.options_json) : (f.optionsJson || f.options_json),
      validationRules: typeof (f.validationRules || f.validation_rules) === 'string' ? JSON.parse(f.validationRules || f.validation_rules) : (f.validationRules || f.validation_rules),
      displayOrder: f.displayOrder || f.display_order || 0,
    };
  }

  async updateField(orgId: number, masterId: number, fieldId: number, payload: Partial<CustomMasterFieldPayload>) {
    const master = await this.db('custom_masters')
      .where('id', masterId)
      .where('organization_id', orgId)
      .first();
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
    if (payload.optionsJson !== undefined) updateData.options_json = JSON.stringify(payload.optionsJson);
    if (payload.validationRules !== undefined) updateData.validation_rules = JSON.stringify(payload.validationRules);
    if (payload.displayOrder !== undefined) updateData.display_order = payload.displayOrder;

    await this.db('custom_master_fields')
      .where('id', fieldId)
      .where('master_id', masterId)
      .update(updateData);

    const f: any = await this.db('custom_master_fields').where('id', fieldId).first();
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
      optionsJson: typeof (f.optionsJson || f.options_json) === 'string' ? JSON.parse(f.optionsJson || f.options_json) : (f.optionsJson || f.options_json),
      validationRules: typeof (f.validationRules || f.validation_rules) === 'string' ? JSON.parse(f.validationRules || f.validation_rules) : (f.validationRules || f.validation_rules),
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

    const parsed = rows.map(mapRow);

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
    const master = await this.db('custom_masters')
      .where('id', masterId)
      .where('organization_id', orgId)
      .whereNull('deleted_at')
      .first();

    if (!master) throw new Error('Master not found');

    const errors = await this.validateRecordData(orgId, masterId, payload.data || {});
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }

    const code = payload.recordCode || `${master.code.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const [recordId] = await this.db('custom_master_records').insert({
      uuid: uuidv4(),
      organization_id: orgId,
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
    await this.db('custom_master_records')
      .where('id', recordId)
      .where('master_id', masterId)
      .where('organization_id', orgId)
      .update({ deleted_at: new Date() });
    return true;
  }
}

export const masterBuilderService = new MasterBuilderService();
