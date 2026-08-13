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
    const safeCompanies = companies.map(({ password_hash: _ph, ...rest }: any) => rest);

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

    let code = body.code || `COM-${Math.floor(100 + Math.random() * 900)}`;
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
      name: body.name || 'New Company',
      employer_name: body.employerName || body.employer_name || null,
      class_of_establishment: body.classOfEstablishment || body.class_of_establishment || null,
      address_line_1: body.addressLine1 || body.address_line_1 || null,
      address_line_2: body.addressLine2 || body.address_line_2 || null,
      country: body.country || null,
      zip_code: body.zipCode || body.zip_code || null,
      state: body.state || null,
      city: body.city || null,
      pan_tin: body.panTin || body.pan_tin || null,
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

    const createdCompanyRaw = await db('company').where({ company_id: insertedId }).first();
    const { password_hash: _ph2, ...createdCompany } = (createdCompanyRaw || {}) as any;

    const response: ApiResponse = {
      success: true,
      data: createdCompany,
    };

    res.status(201).json(response);
  }

  /**
   * PUT /api/v1/settings/companies/:id
   * Update existing company with all form fields & physical file upload persistence
   */
  async update(req: Request, res: Response): Promise<void> {
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

    const updatePayload: Record<string, any> = {
      updated_by: ctx.userId,
      updated_at: db.fn.now(),
    };

    if (body.code !== undefined) updatePayload.code = body.code;
    if (body.name !== undefined) updatePayload.name = body.name;
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
      updatePayload.pan_tin = body.panTin ?? body.pan_tin;
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
