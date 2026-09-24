import type { Request, Response } from 'express';
import { getKnex } from '../../../db/knex';
import { v4 as uuidv4 } from 'uuid';
import argon2 from 'argon2';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { ApiResponse } from '@apponexthrms/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper to process Base64 data URL and save as physical file in server/uploads/companies/
 */
function saveBase64Image(dataUrl: string | null | undefined, prefix: string): string | null {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  if (!dataUrl.startsWith('data:image/')) return dataUrl; // Already a URL or path

  try {
    const uploadsDir = path.join(__dirname, '../../../../uploads/companies');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return dataUrl;

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `${prefix}_${Date.now()}_${Math.floor(100 + Math.random() * 900)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);
    console.log(`📸 Saved image file to disk: ${filePath}`);

    return `/uploads/companies/${filename}`;
  } catch (err) {
    console.error(`Failed to save base64 image (${prefix}):`, err);
    return dataUrl;
  }
}

export class CompanyController {
  private validateCompanyDetails(input: Record<string, any>): string | null {
    const value = (camel: string, snake: string = camel) => String(input[camel] ?? input[snake] ?? '').trim();
    const name = value('name');
    const employerName = value('employerName', 'employer_name');
    const establishmentClass = value('classOfEstablishment', 'class_of_establishment');
    const code = value('code');
    const addressLine1 = value('addressLine1', 'address_line_1');
    const country = value('country');
    const state = value('state');
    const city = value('city');
    const zipCode = value('zipCode', 'zip_code');
    const panNumber = value('panTin', 'pan_tin').toUpperCase();
    const contactNumber = value('contactNumber', 'contact_number');
    const email = value('email');

    if (name.length < 2 || name.length > 150) return 'Company Name must be 2-150 characters.';
    if (employerName.length < 2 || employerName.length > 150) return 'Employer Name must be 2-150 characters.';
    if (establishmentClass.length < 2 || establishmentClass.length > 100) return 'Class Of Establishment must be 2-100 characters.';
    if (!/^[A-Za-z0-9-_]{2,30}$/.test(code)) return 'Establishment Company Code must be 2-30 letters, numbers, hyphens, or underscores.';
    if (addressLine1.length < 3 || addressLine1.length > 255) return 'Address Line 1 must be 3-255 characters.';
    if (!country || !state || !city) return 'Country, State, and City are required.';
    if (country.toLowerCase() === 'india' ? !/^\d{6}$/.test(zipCode) : !/^\d{3,10}$/.test(zipCode)) {
      return country.toLowerCase() === 'india'
        ? 'PIN Code must be exactly 6 digits.'
        : 'Postal / ZIP Code must contain 3-10 digits.';
    }
    if (!/^\d{10,15}$/.test(contactNumber)) return 'Contact Number must contain 10-15 digits only.';
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) return 'Please enter a valid Corporate Email address.';
    if (panNumber && !/^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{10}$/.test(panNumber)) {
      return 'PAN Number must be exactly 10 alphanumeric characters and include both letters and numbers.';
    }
    return null;
  }

  private async findDuplicateName(organizationId: number | undefined, name: string, excludeCompanyId?: number): Promise<any> {
    const db = getKnex();
    let query = db('company')
      .where('organization_id', organizationId)
      .whereRaw('LOWER(name) = ?', [name.trim().toLowerCase()])
      .whereNull('deleted_at');
    if (excludeCompanyId) query = query.whereNot('company_id', excludeCompanyId);
    return query.first();
  }

  /**
   * GET /api/v1/settings/companies
   * Fetch all companies for organization
   */
  async list(req: Request, res: Response): Promise<void> {
    const ctx = req.ctx;
    const db = getKnex();

    let query = db('company').whereNull('deleted_at');

    if (ctx?.organizationId) {
      query = query.where(function () {
        this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      });
    }

    const hasIsParent = await db.schema.hasColumn('company', 'is_parent').catch(() => false);
    if (hasIsParent) {
      query = query.orderBy('is_parent', 'desc');
    }
    const companies = await query.orderBy('company_id', 'asc');

    // Never expose password_hash in list responses
    let safeCompanies = companies.map(({ password_hash: _ph, ...rest }: any) => rest);

    // Fallback: If no companies exist yet, return/auto-seed primary company from organizations table
    if (safeCompanies.length === 0) {
      try {
        const org = ctx?.organizationId
          ? await db('organizations').where('id', ctx.organizationId).first()
          : await db('organizations').first();

        if (org) {
          const hasCompanyTable = await db.schema.hasTable('company');
          if (hasCompanyTable) {
            const hasOrgCol = await db.schema.hasColumn('company', 'organization_id');
            const insertPayload: any = {
              uuid: org.uuid || `company-uuid-${org.id || 1}-${Date.now()}`,
              code: org.code || 'COMP-001',
              name: org.name || 'Apponext HRMS',
              employer_name: org.owner_name || org.name || 'Apponext HRMS',
              status: 'Active',
              is_active_toggle: 1,
              active_users_toggle: 1,
            };
            if (hasOrgCol) {
              insertPayload.organization_id = org.id;
            }
            await db('company').insert(insertPayload);
            const freshCompanies = await db('company').whereNull('deleted_at');
            if (freshCompanies.length > 0) {
              safeCompanies = freshCompanies.map(({ password_hash: _ph, ...rest }: any) => rest);
            }
          }

          if (safeCompanies.length === 0) {
            safeCompanies = [
              {
                companyId: org.id || 1,
                id: org.id || 1,
                organizationId: org.id,
                code: org.code || 'COMP-001',
                name: org.name || 'Apponext HRMS',
                employerName: org.owner_name || org.name || 'Apponext HRMS',
                status: 'Active',
                isActiveToggle: true,
                activeUsersToggle: true,
                isParent: true,
              }
            ];
          }
        }
      } catch (e) {
        console.warn('CompanyController fallback notice:', e);
      }
    }

    const response: ApiResponse = {
      success: true,
      data: safeCompanies,
    };

    res.status(200).json(response);
  }

  /**
   * GET /api/v1/settings/companies/:id
   * Fetch single company by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    const ctx = req.ctx;
    const db = getKnex();
    const { id } = req.params;

    const isUuid = typeof id === 'string' && (id.includes('-') || isNaN(Number(id)));
    let query = db('company')
      .where(isUuid ? { uuid: id } : { company_id: Number(id) })
      .whereNull('deleted_at');

    if (ctx?.organizationId) {
      query = query.where(function () {
        this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      });
    }

    const company = await query.first();

    if (!company) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company not found' } });
      return;
    }

    // Never expose password_hash in single-company responses
    const { password_hash: _ph, ...safeCompany } = company as any;
    res.status(200).json({ success: true, data: safeCompany });
  }

  /**
   * POST /api/v1/settings/companies
   * Create new company with all form fields & physical file upload persistence
   */
  async create(req: Request, res: Response): Promise<void> {
    const ctx = req.ctx!;
    const db = getKnex();
    const body = req.body;

    const validationError = this.validateCompanyDetails(body);
    if (validationError) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: validationError } });
      return;
    }

    const duplicateName = await this.findDuplicateName(ctx.organizationId, body.name);
    if (duplicateName) {
      res.status(409).json({ success: false, error: { code: 'DUPLICATE_COMPANY_NAME', message: 'A company with this name already exists in this organization.' } });
      return;
    }

    let code = String(body.code).trim().toUpperCase();
    const existingCode = await db('company')
      .where({ organization_id: ctx.organizationId, code })
      .whereNull('deleted_at')
      .first();
    if (existingCode) {
      code = `${code}-${Math.floor(100 + Math.random() * 900)}`;
    }
    const uuid = uuidv4();

    // Process & Save Base64 Images to disk under uploads/companies/
    const logoUrl = saveBase64Image(body.logo, 'logo');
    const stampUrl = saveBase64Image(body.companyStamp || body.company_stamp, 'stamp');
    const signatureUrl = saveBase64Image(body.signature, 'signature');

    const payload = {
      uuid,
      organization_id: ctx.organizationId,
      code,
      name: String(body.name).trim(),
      employer_name: String(body.employerName ?? body.employer_name).trim(),
      class_of_establishment: String(body.classOfEstablishment ?? body.class_of_establishment).trim(),
      address_line_1: body.addressLine1 || body.address_line_1 || null,
      address_line_2: body.addressLine2 || body.address_line_2 || null,
      country: body.country || null,
      zip_code: body.zipCode || body.zip_code || null,
      state: body.state || null,
      city: body.city || null,
      pan_tin: body.panTin || body.pan_tin ? String(body.panTin ?? body.pan_tin).trim().toUpperCase() : null,
      contact_number: body.contactNumber || body.contact_number || null,
      email: body.email || null,
      logo: logoUrl,
      company_stamp: stampUrl,
      signature: signatureUrl,
      is_active_toggle: body.isActiveToggle !== undefined ? (body.isActiveToggle ? 1 : 0) : 1,
      active_users_toggle: body.activeUsersToggle !== undefined ? (body.activeUsersToggle ? 1 : 0) : 1,
      login_page_logo_toggle: body.loginPageLogoToggle !== undefined ? (body.loginPageLogoToggle ? 1 : 0) : 0,
      description: body.description || null,
      status: body.status || 'Active',
      // Credentials
      has_credentials: body.hasCredentials ? 1 : 0,
      full_name: body.hasCredentials ? (body.fullName || body.full_name || null) : null,
      login_email: body.hasCredentials ? (body.loginEmail || body.login_email || null) : null,
      password_hash: null, // set below after hashing
      created_by: ctx.userId,
      updated_by: ctx.userId,
    };

    // Hash password with Argon2id if credentials are enabled and a password was provided
    if (body.hasCredentials && body.password) {
      payload.password_hash = await argon2.hash(body.password);
    }

    const [insertedId] = await db('company').insert(payload);

    // Auto-create default company-wise payroll cycle
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const cycleStartDate = new Date(year, month, 1).toISOString().split('T')[0];
      const cycleEndDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      const cutoffDate = new Date(year, month, 25).toISOString().split('T')[0];
      const creditDate = new Date(year, month, 28).toISOString().split('T')[0];
      const cycleCode = `CYC-${(code || `COM${insertedId}`).replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

      await db('payroll_cycles').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        company_id: insertedId,
        cycle_name: `Monthly Pay Cycle (${body.name || 'Company'})`,
        cycle_code: cycleCode,
        cycle_type: 'monthly',
        frequency: 'Monthly',
        cycle_start_date: cycleStartDate,
        cycle_end_date: cycleEndDate,
        payroll_run_date: cutoffDate,
        salary_credit_date: creditDate,
        start_date: 1,
        cutoff_day: 25,
        disbursement_date_str: '28',
        total_days_calc: '30',
        is_active: 1,
        created_by: ctx.userId || 10,
        updated_by: ctx.userId || 10,
      });
    } catch (cycleErr) {
      console.warn('Could not auto-create default payroll cycle for company:', cycleErr);
    }

    const createdCompanyRaw = await db('company').where({ company_id: insertedId }).first();
    const { password_hash: _ph2, ...createdCompany } = (createdCompanyRaw || {}) as any;

    const response: ApiResponse = {
      success: true,
      data: createdCompany,
    };

    res.status(201).json(response);
  }

  /**
   * Helper to ensure company credentials columns exist in database
   */
  private async ensureCompanyCredentialsColumns(): Promise<void> {
    const db = getKnex();
    const hasHasCredentials = await db.schema.hasColumn('company', 'has_credentials');
    if (!hasHasCredentials) {
      await db.schema.alterTable('company', (table) => {
        table.boolean('has_credentials').defaultTo(false).notNullable();
        table.string('full_name', 255).nullable();
        table.string('login_email', 255).nullable();
        table.text('password_hash').nullable();
      });
    }
  }

  /**
   * PUT /api/v1/settings/companies/:id
   * Update existing company with all form fields & physical file upload persistence
   */
  async update(req: Request, res: Response): Promise<void> {
    await this.ensureCompanyCredentialsColumns();
    const ctx = req.ctx!;
    const db = getKnex();
    const { id } = req.params;
    const body = req.body;

    const isUuid = typeof id === 'string' && (id.includes('-') || isNaN(Number(id)));
    let query = db('company')
      .where(isUuid ? { uuid: id } : { company_id: Number(id) })
      .whereNull('deleted_at');

    if (ctx?.organizationId) {
      query = query.where(function () {
        this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      });
    }

    const existing = await query.first();

    if (!existing) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Company record not found' } });
      return;
    }

    const candidate = {
      ...existing,
      ...body,
      name: body.name ?? existing.name,
      employerName: body.employerName ?? body.employer_name ?? existing.employer_name,
      classOfEstablishment: body.classOfEstablishment ?? body.class_of_establishment ?? existing.class_of_establishment,
      addressLine1: body.addressLine1 ?? body.address_line_1 ?? existing.address_line_1,
      country: body.country ?? existing.country,
      state: body.state ?? existing.state,
      city: body.city ?? existing.city,
      zipCode: body.zipCode ?? body.zip_code ?? existing.zip_code,
      panTin: body.panTin ?? body.pan_tin ?? existing.pan_tin,
      contactNumber: body.contactNumber ?? body.contact_number ?? existing.contact_number,
      email: body.email ?? existing.email,
      code: body.code ?? existing.code,
    };
    const validationError = this.validateCompanyDetails(candidate);
    if (validationError) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: validationError } });
      return;
    }
    const duplicateName = await this.findDuplicateName(ctx.organizationId, candidate.name, Number(existing.company_id));
    if (duplicateName) {
      res.status(409).json({ success: false, error: { code: 'DUPLICATE_COMPANY_NAME', message: 'A company with this name already exists in this organization.' } });
      return;
    }

    const updatePayload: Record<string, any> = {
      updated_by: ctx.userId,
      updated_at: db.fn.now(),
    };

    if (body.code !== undefined) updatePayload.code = String(body.code).trim().toUpperCase();
    if (body.name !== undefined) updatePayload.name = String(body.name).trim();
    if (body.employerName !== undefined || body.employer_name !== undefined)
      updatePayload.employer_name = body.employerName ?? body.employer_name;
    if (body.classOfEstablishment !== undefined || body.class_of_establishment !== undefined)
      updatePayload.class_of_establishment = body.classOfEstablishment ?? body.class_of_establishment;
    if (body.addressLine1 !== undefined || body.address_line_1 !== undefined)
      updatePayload.address_line_1 = body.addressLine1 ?? body.address_line_1;
    if (body.addressLine2 !== undefined || body.address_line_2 !== undefined)
      updatePayload.address_line_2 = body.addressLine2 ?? body.address_line_2;
    if (body.country !== undefined) updatePayload.country = body.country;
    if (body.zipCode !== undefined || body.zip_code !== undefined)
      updatePayload.zip_code = body.zipCode ?? body.zip_code;
    if (body.state !== undefined) updatePayload.state = body.state;
    if (body.city !== undefined) updatePayload.city = body.city;
    if (body.panTin !== undefined || body.pan_tin !== undefined)
      updatePayload.pan_tin = body.panTin || body.pan_tin ? String(body.panTin ?? body.pan_tin).trim().toUpperCase() : null;
    if (body.contactNumber !== undefined || body.contact_number !== undefined)
      updatePayload.contact_number = body.contactNumber ?? body.contact_number;
    if (body.email !== undefined) updatePayload.email = body.email;

    if (body.logo !== undefined) {
      updatePayload.logo = saveBase64Image(body.logo, 'logo');
    }
    if (body.companyStamp !== undefined || body.company_stamp !== undefined) {
      updatePayload.company_stamp = saveBase64Image(body.companyStamp ?? body.company_stamp, 'stamp');
    }
    if (body.signature !== undefined) {
      updatePayload.signature = saveBase64Image(body.signature, 'signature');
    }

    if (body.isActiveToggle !== undefined) updatePayload.is_active_toggle = body.isActiveToggle ? 1 : 0;
    if (body.activeUsersToggle !== undefined) updatePayload.active_users_toggle = body.activeUsersToggle ? 1 : 0;
    if (body.loginPageLogoToggle !== undefined) updatePayload.login_page_logo_toggle = body.loginPageLogoToggle ? 1 : 0;
    if (body.description !== undefined) updatePayload.description = body.description;
    if (body.status !== undefined) updatePayload.status = body.status;

    // Credentials update
    if (body.hasCredentials !== undefined) {
      updatePayload.has_credentials = body.hasCredentials ? 1 : 0;
      if (!body.hasCredentials) {
        // Credentials disabled — wipe all credential fields
        updatePayload.full_name    = null;
        updatePayload.login_email  = null;
        updatePayload.password_hash = null;
      } else {
        if (body.fullName   !== undefined) updatePayload.full_name   = body.fullName   || body.full_name   || null;
        if (body.loginEmail !== undefined) updatePayload.login_email = body.loginEmail || body.login_email || null;
        // Only re-hash if a new non-empty password was supplied
        if (body.password) {
          updatePayload.password_hash = await argon2.hash(body.password);
        }
      }
    }

    const targetCompanyId = existing.company_id ?? existing.companyId ?? existing.id;
    if (targetCompanyId) {
      await db('company').where({ company_id: Number(targetCompanyId) }).update(updatePayload);
    } else {
      await db('company').where({ uuid: existing.uuid }).update(updatePayload);
    }

    const updatedCompanyRaw = targetCompanyId
      ? await db('company').where({ company_id: Number(targetCompanyId) }).first()
      : await db('company').where({ uuid: existing.uuid }).first();

    const { password_hash: _ph3, ...updatedCompany } = (updatedCompanyRaw || {}) as any;

    const response: ApiResponse = {
      success: true,
      data: updatedCompany,
    };

    res.status(200).json(response);
  }

  /**
   * DELETE /api/v1/settings/companies/:id
   * Soft delete company
   */
  async delete(req: Request, res: Response): Promise<void> {
    const ctx = req.ctx!;
    const db = getKnex();
    const { id } = req.params;

    await db('company')
      .where({ organization_id: ctx.organizationId, company_id: id })
      .update({ deleted_at: db.fn.now() });

    res.status(200).json({ success: true, message: 'Company deleted successfully' });
  }
}
