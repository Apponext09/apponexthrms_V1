import { getKnex } from '../../../db/knex';
import { AppError, ValidationError } from '../../../common/errors';
import { AuditService } from '../../audit/audit.service';
import { NotificationService } from '../../notifications/services/notification.service';

export interface CreateCandidateInput {
  organizationId: string;
  positionId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  source?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  createdBy: string;
}

export interface UpdateCandidateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  updatedBy: string;
}

export class CandidateService {
  constructor(
    private db: any,
    private auditService: any = new AuditService(),
    private notificationService: any = new NotificationService()
  ) {}

  /**
   * Create a new candidate
   */
  async createCandidate(input: CreateCandidateInput): Promise<any> {
    await this.validateCandidateInput(input);

    const result = await this.db.query(
      `INSERT INTO candidates (
        organization_id, position_id, first_name, last_name, email, phone,
        source, address_line_1, address_line_2, city, state, postal_code, country,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING
        id, organization_id as "organizationId", position_id as "positionId",
        first_name as "firstName", last_name as "lastName", email, phone,
        status, source, applied_at as "appliedAt", created_at as "createdAt"`,
      [
        input.organizationId,
        input.positionId,
        input.firstName,
        input.lastName,
        input.email,
        input.phone || null,
        input.source || null,
        input.addressLine1 || null,
        input.addressLine2 || null,
        input.city || null,
        input.state || null,
        input.postalCode || null,
        input.country || null,
        input.createdBy,
      ]
    );

    const candidate = result.rows[0];

    await this.auditService.logChange({
      entityType: 'candidate',
      entityId: candidate.id,
      organizationId: input.organizationId,
      action: 'create',
      changes: { candidate: 'created' },
      userId: input.createdBy,
    });

    await this.notificationService.notifyNewCandidate({
      candidateId: candidate.id,
      organizationId: input.organizationId,
      candidateName: `${input.firstName} ${input.lastName}`,
      positionId: input.positionId,
    });

    return candidate;
  }

  /**
   * Get candidate by ID
   */
  async getCandidateById(candidateId: string, organizationId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT
        id, organization_id as "organizationId", position_id as "positionId",
        first_name as "firstName", last_name as "lastName", email, phone,
        status, source, applied_at as "appliedAt",
        address_line_1 as "addressLine1", address_line_2 as "addressLine2",
        city, state, postal_code as "postalCode", country,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM candidates
      WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [candidateId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Candidate not found', 404);
    }

    return result.rows[0];
  }

  /**
   * List candidates with filters
   */
  async listCandidates(
    organizationId: string,
    filters?: {
      positionId?: string;
      status?: string;
      source?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ rows: any[]; total: number }> {
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    let query = `
      SELECT
        id, position_id as "positionId", first_name as "firstName",
        last_name as "lastName", email, phone, status, source, applied_at as "appliedAt"
      FROM candidates
      WHERE organization_id = $1 AND deleted_at IS NULL
    `;

    const params = [organizationId];

    if (filters?.positionId) {
      query += ` AND position_id = $${params.length + 1}`;
      params.push(filters.positionId);
    }

    if (filters?.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    if (filters?.source) {
      query += ` AND source = $${params.length + 1}`;
      params.push(filters.source);
    }

    if (filters?.search) {
      query += ` AND (first_name ILIKE $${params.length + 1} OR last_name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    const countResult = await this.db.query(
      query.replace('SELECT id, position_id', 'SELECT COUNT(*) as count'),
      params
    );

    const total = parseInt(countResult.rows[0].count, 10);

    const result = await this.db.query(
      query + ` ORDER BY applied_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    return { rows: result.rows, total };
  }

  /**
   * Update candidate
   */
  async updateCandidate(
    candidateId: string,
    organizationId: string,
    input: UpdateCandidateInput
  ): Promise<any> {
    const candidate = await this.getCandidateById(candidateId, organizationId);

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (input.firstName) {
      updates.push(`first_name = $${paramCount}`);
      values.push(input.firstName);
      paramCount++;
    }

    if (input.lastName) {
      updates.push(`last_name = $${paramCount}`);
      values.push(input.lastName);
      paramCount++;
    }

    if (input.email && input.email !== candidate.email) {
      await this.validateEmailUnique(input.email, organizationId);
      updates.push(`email = $${paramCount}`);
      values.push(input.email);
      paramCount++;
    }

    if (input.phone) {
      updates.push(`phone = $${paramCount}`);
      values.push(input.phone);
      paramCount++;
    }

    if (input.status) {
      updates.push(`status = $${paramCount}`);
      values.push(input.status);
      paramCount++;
    }

    if (input.source) {
      updates.push(`source = $${paramCount}`);
      values.push(input.source);
      paramCount++;
    }

    if (updates.length === 0) {
      return candidate;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    updates.push(`updated_by = $${paramCount}`);
    values.push(input.updatedBy);
    paramCount++;

    values.push(candidateId);
    values.push(organizationId);

    const result = await this.db.query(
      `UPDATE candidates
      SET ${updates.join(', ')}
      WHERE id = $${paramCount} AND organization_id = $${paramCount + 1} AND deleted_at IS NULL
      RETURNING
        id, first_name as "firstName", last_name as "lastName", email,
        phone, status, source, updated_at as "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      throw new AppError('Failed to update candidate', 500);
    }

    await this.auditService.logChange({
      entityType: 'candidate',
      entityId: candidateId,
      organizationId,
      action: 'update',
      changes: input,
      userId: input.updatedBy,
    });

    return result.rows[0];
  }

  /**
   * Update candidate status
   */
  async updateCandidateStatus(
    candidateId: string,
    organizationId: string,
    status: string,
    userId: string
  ): Promise<any> {
    const validStatuses = ['applied', 'shortlisted', 'interviewed', 'rejected', 'offered', 'hired'];

    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid candidate status: ${status}`);
    }

    const result = await this.db.query(
      `UPDATE candidates
      SET status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND organization_id = $4 AND deleted_at IS NULL
      RETURNING id, status, updated_at as "updatedAt"`,
      [status, userId, candidateId, organizationId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Candidate not found', 404);
    }

    await this.auditService.logChange({
      entityType: 'candidate',
      entityId: candidateId,
      organizationId,
      action: 'update',
      changes: { status },
      userId,
    });

    await this.notificationService.notifyCandidateStatusChange({
      candidateId,
      organizationId,
      newStatus: status,
    });

    return result.rows[0];
  }

  /**
   * Soft delete candidate
   */
  async deleteCandidate(candidateId: string, organizationId: string, userId: string): Promise<void> {
    const result = await this.db.query(
      `UPDATE candidates
      SET deleted_at = CURRENT_TIMESTAMP, updated_by = $1
      WHERE id = $2 AND organization_id = $3 AND deleted_at IS NULL`,
      [userId, candidateId, organizationId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Candidate not found', 404);
    }

    await this.auditService.logChange({
      entityType: 'candidate',
      entityId: candidateId,
      organizationId,
      action: 'delete',
      changes: { deleted: true },
      userId,
    });
  }

  /**
   * Validate candidate email is unique within organization
   */
  private async validateEmailUnique(email: string, organizationId: string): Promise<void> {
    const result = await this.db.query(
      `SELECT id FROM candidates WHERE email = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [email, organizationId]
    );

    if (result.rows.length > 0) {
      throw new ValidationError('Email already exists for another candidate');
    }
  }

  /**
   * Validate candidate input
   */
  private async validateCandidateInput(input: CreateCandidateInput): Promise<void> {
    if (!input.firstName || input.firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }

    if (!input.lastName || input.lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }

    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new ValidationError('Valid email is required');
    }

    await this.validateEmailUnique(input.email, input.organizationId);

    const positionResult = await this.db.query(
      `SELECT id FROM job_positions WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
      [input.positionId, input.organizationId]
    );

    if (positionResult.rows.length === 0) {
      throw new ValidationError('Invalid position ID');
    }
  }
}
