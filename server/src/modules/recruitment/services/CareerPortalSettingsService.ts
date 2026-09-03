import { getKnex } from '../../../db/knex';

export const DEFAULT_FORM_FIELDS_CONFIG = {
  dateOfBirth: { enabled: true, required: false },
  gender: { enabled: true, required: true },
  emailId: { enabled: true, required: true },
  contactNumber: { enabled: true, required: true },
  address: { enabled: true, required: false },
  country: { enabled: true, required: false },
  zipcode: { enabled: true, required: false },
  state: { enabled: true, required: false },
  city: { enabled: true, required: false },
  maritalStatus: { enabled: true, required: false },
  currentCompany: { enabled: true, required: false },
  qualification: { enabled: true, required: false },
  university: { enabled: true, required: false },
  relevantExperience: { enabled: true, required: false },
  totalExperience: { enabled: true, required: false },
  skills: { enabled: true, required: false },
  comments: { enabled: true, required: false },
  resume: { enabled: true, required: true },
  signature: { enabled: true, required: true },
};

export class CareerPortalSettingsService {
  /**
   * Ensure career_portal_settings table exists
   */
  private async ensureTable() {
    const db = getKnex();
    const hasTable = await db.schema.hasTable('career_portal_settings');
    if (!hasTable) {
      await db.schema.createTable('career_portal_settings', (table) => {
        table.increments('id').primary();
        table.integer('organization_id').unsigned().notNullable().unique();
        table.string('portal_title', 255).defaultTo('Career Portal');
        table.text('portal_tagline').nullable();
        table.text('banner_description').nullable();
        table.text('company_logo_url', 'longtext').nullable();
        table.string('primary_color', 50).defaultTo('#4f46e5');
        table.boolean('show_account_info').defaultTo(false);
        table.boolean('show_back_to_hrms').defaultTo(true);
        table.text('copyright_text').nullable();
        table.json('form_fields_config').nullable();
        table.timestamps(true, true);
      });
    } else {
      try {
        await db.raw('ALTER TABLE career_portal_settings MODIFY COLUMN company_logo_url LONGTEXT');
      } catch (e) {
        // ignored if already LONGTEXT
      }
    }
  }

  /**
   * Get settings for an organization (or return defaults)
   */
  async getSettings(organizationId?: number) {
    await this.ensureTable();
    const db = getKnex();

    // Always fetch the latest updated career portal settings row
    let row = await db('career_portal_settings')
      .orderBy('updated_at', 'desc')
      .first();

    if (!row) {
      return {
        organizationId: organizationId || 1,
        portalTitle: 'Career Portal',
        portalTagline: 'Find Your Next Opportunity',
        bannerDescription: 'Explore open roles, apply directly, or submit a referral application.',
        companyLogoUrl: '',
        primaryColor: '#4f46e5',
        showAccountInfo: false,
        showBackToHrms: true,
        copyrightText: `© ${new Date().getFullYear()} HRMS Career Portal. All rights reserved.`,
        formFieldsConfig: DEFAULT_FORM_FIELDS_CONFIG,
      };
    }

    let rawConfig = row.formFieldsConfig ?? row.form_fields_config;
    let parsedConfig = rawConfig;
    if (typeof parsedConfig === 'string') {
      try {
        parsedConfig = JSON.parse(parsedConfig);
      } catch (e) {
        parsedConfig = DEFAULT_FORM_FIELDS_CONFIG;
      }
    }

    const title = row.portalTitle ?? row.portal_title;
    const tagline = row.portalTagline ?? row.portal_tagline;
    const desc = row.bannerDescription ?? row.banner_description;
    const logo = row.companyLogoUrl ?? row.company_logo_url;
    const color = row.primaryColor ?? row.primary_color;
    const showAcc = row.showAccountInfo ?? row.show_account_info;
    const showBack = row.showBackToHrms ?? row.show_back_to_hrms;
    const copyright = row.copyrightText ?? row.copyright_text;

    return {
      id: row.id,
      organizationId: row.organizationId ?? row.organization_id ?? 1,
      portalTitle: title || 'Career Portal',
      portalTagline: tagline || 'Find Your Next Opportunity',
      bannerDescription: desc || 'Explore open roles, apply directly, or submit a referral application.',
      companyLogoUrl: logo || '',
      primaryColor: color || '#4f46e5',
      showAccountInfo: Boolean(showAcc),
      showBackToHrms: showBack === null || showBack === undefined ? true : Boolean(showBack),
      copyrightText: copyright || `© ${new Date().getFullYear()} HRMS Career Portal. All rights reserved.`,
      formFieldsConfig: { ...DEFAULT_FORM_FIELDS_CONFIG, ...(parsedConfig || {}) },
    };
  }

  /**
   * Save/Update settings for an organization
   */
  async updateSettings(organizationId: number = 1, payload: any) {
    await this.ensureTable();
    const db = getKnex();

    // Check for existing settings record (or master row)
    const existing = await db('career_portal_settings')
      .orderBy('updated_at', 'desc')
      .first();

    console.log('[updateSettings] existing row id:', existing?.id, 'portalTitle:', existing?.portalTitle || existing?.portal_title);

    // Ensure formFieldsConfig is properly stringified
    let formFieldsStr: string;
    if (typeof payload.formFieldsConfig === 'string') {
      formFieldsStr = payload.formFieldsConfig;
    } else if (payload.formFieldsConfig && typeof payload.formFieldsConfig === 'object') {
      formFieldsStr = JSON.stringify(payload.formFieldsConfig);
    } else {
      formFieldsStr = JSON.stringify(DEFAULT_FORM_FIELDS_CONFIG);
    }

    const dataToSave: Record<string, any> = {
      portal_title: payload.portalTitle || 'Career Portal',
      portal_tagline: payload.portalTagline || 'Find Your Next Opportunity',
      banner_description: payload.bannerDescription || '',
      company_logo_url: payload.companyLogoUrl || '',
      primary_color: payload.primaryColor || '#4f46e5',
      show_account_info: payload.showAccountInfo ? 1 : 0,
      show_back_to_hrms: payload.showBackToHrms !== false ? 1 : 0,
      copyright_text: payload.copyrightText || '',
      form_fields_config: formFieldsStr,
      updated_at: db.fn.now(),
    };

    console.log('[updateSettings] dataToSave.portal_title:', dataToSave.portal_title);
    console.log('[updateSettings] dataToSave.company_logo_url length:', dataToSave.company_logo_url?.length);
    console.log('[updateSettings] dataToSave.form_fields_config (first 200 chars):', formFieldsStr.substring(0, 200));

    if (existing) {
      const affectedRows = await db('career_portal_settings')
        .where('id', existing.id)
        .update(dataToSave);
      console.log('[updateSettings] UPDATE affected rows:', affectedRows);
    } else {
      const [insertId] = await db('career_portal_settings').insert({
        ...dataToSave,
        organization_id: organizationId || 1,
        created_at: db.fn.now(),
      });
      console.log('[updateSettings] INSERT new row id:', insertId);
    }

    // Verify the write
    const verify = await db('career_portal_settings').orderBy('updated_at', 'desc').first();
    console.log('[updateSettings] VERIFY after write - portal_title:', verify?.portal_title, ', logo_len:', verify?.company_logo_url?.length);

    return this.getSettings(organizationId);
  }
}
