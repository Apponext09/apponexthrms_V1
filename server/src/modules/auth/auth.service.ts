import { v4 as uuidv4 } from 'uuid';
import { hash, verify as verifyHash } from 'argon2';
import { getKnex } from '../../db/knex';
import { generateAccessToken, generateRefreshToken, decodeToken } from '../../common/lib/jwt';
import { hashSha256, constantTimeCompare } from '../../common/lib/encryption';
import { logger } from '@/common/lib/logger';
import {
  UnauthorizedError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/index';
import { UserRepository } from './repositories/user.repository';
import { SessionRepository } from './repositories/session.repository';
import { AuditService } from '../audit/audit.service';
import { RbacService } from '../rbac/rbac.service';
import type { TenantContext } from '../../db/types';
import type {
  LoginResponse,
  RegisterOrganizationResponse,
  RefreshTokenResponse,
  MeResponse,
} from './auth.types';
import type { User, Organization } from '@apponexthrms/shared';

/**
 * Extract client IP address from request (handling proxies)
 */
function getClientIp(req?: any): string {
  if (!req) return '127.0.0.1';

  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

/**
 * Extract user-agent from request
 */
function getUserAgent(req?: any): string {
  if (!req) return 'unknown';
  return req.headers?.['user-agent'] || 'unknown';
}

export class AuthService {
  private userRepo: UserRepository;
  private sessionRepo: SessionRepository;
  private auditService: AuditService;
  private rbacService: RbacService;
  private db = getKnex();

  constructor() {
    this.userRepo = new UserRepository();
    this.sessionRepo = new SessionRepository();
    this.auditService = new AuditService();
    this.rbacService = new RbacService();
  }

  /**
   * Register a new organization and admin user
   */
  async registerOrganization(
    input: {
      organizationName: string;
      slug: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    },
    req?: any
  ): Promise<RegisterOrganizationResponse> {
    // Check if slug is unique
    const existingOrg = await this.db('organizations').where('slug', input.slug).first();
    if (existingOrg) {
      throw new ConflictError(`Organization slug '${input.slug}' already exists`);
    }

    // Check if email is globally unique
    const existingUser = await this.db('users').where('email', input.email).first();
    if (existingUser) {
      throw new ConflictError(`Email '${input.email}' is already registered`);
    }

    // Create transaction for atomic operation
    return this.db.transaction(async (trx) => {
      // Create organization
      const orgUuid = uuidv4();
      const [orgId] = await trx('organizations').insert({
        uuid: orgUuid,
        name: input.organizationName,
        slug: input.slug,
        status: 'trial',
        plan_tier: 'starter',
        timezone: 'UTC',
        locale: 'en',
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Create admin user
      const userUuid = uuidv4();
      const passwordHash = await hash(input.password, {
        type: 2, // argon2id
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });

      const [userId] = await trx('users').insert({
        uuid: userUuid,
        organization_id: orgId,
        email: input.email,
        status: 'active',
        password_hash: passwordHash,
        must_change_password: false,
        failed_login_attempts: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Assign organization_admin role
      const adminRole = await trx('roles')
        .where('code', 'organization_admin')
        .where(trx.raw('(organization_id = ? OR is_platform_role = true)', [orgId]))
        .first();

      if (!adminRole) {
        throw new Error('organization_admin role not found');
      }

      await trx('user_roles').insert({
        organization_id: orgId,
        user_id: userId,
        role_id: adminRole.id,
        assigned_by: userId, // Self-assign for first user
        assigned_at: new Date(),
      });

      // Create session
      const sessionUuid = uuidv4();
      const accessToken = generateAccessToken({
        sub: String(userId),
        oid: String(orgId),
        sid: sessionUuid,
      });

      const refreshToken = generateRefreshToken({
        sub: String(userId),
        oid: String(orgId),
        sid: sessionUuid,
      });

      const refreshTokenHash = hashSha256(refreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const clientIp = getClientIp(req);
      const userAgent = getUserAgent(req);

      await trx('auth_sessions').insert({
        uuid: sessionUuid,
        organization_id: orgId,
        user_id: userId,
        refresh_token_hash: refreshTokenHash,
        device_type: 'web',
        user_agent: userAgent,
        ip_address: clientIp,
        is_trusted: false,
        last_active_at: new Date(),
        expires_at: expiresAt,
        created_at: new Date(),
      });

      // Audit log
      await this.auditService.log(
        {
          organizationId: orgId,
          userId,
          sessionUuid,
        },
        {
          action: 'CREATE',
          entityType: 'USER',
          entityId: userId,
          afterState: {
            email: input.email,
            status: 'active',
          },
        }
      );

      return {
        user: {
          id: userId,
          uuid: userUuid,
          organizationId: orgId,
          email: input.email,
          status: 'active',
          emailVerifiedAt: null,
          mobileVerifiedAt: null,
          mfaEnabled: false,
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: null,
          lastPasswordChangedAt: null,
          mustChangePassword: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          employeeId: null,
          mobile: null,
          mobileCountryCode: null,
        },
        organization: {
          id: orgId,
          uuid: orgUuid,
          name: input.organizationName,
          slug: input.slug,
        },
        accessToken,
        refreshToken,
      };
    });
  }

  /**
   * Login with email and password
   */
  async login(email: string, password: string, req?: any): Promise<LoginResponse> {

    const user = await this.userRepo.getByEmail(email);

    if (!user) {
        throw new UnauthorizedError('Invalid email or password');
    }


    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        throw new UnauthorizedError('Account is locked. Please try again later.');
    }

    // Check if account is suspended
    if (user.status === 'suspended') {
        throw new UnauthorizedError('Account is suspended');
    }

    // Verify password
    const passwordHashRow = await this.db('users')
      .where('id', user.id)
      .select('password_hash')
      .first();

    // Try both snake_case and camelCase since Knex might convert
    const hash = passwordHashRow?.password_hash || passwordHashRow?.passwordHash;

    let passwordValid = false;
    try {
        if (!hash) {
        throw new Error('Password hash not found in database');
      }
      passwordValid = await verifyHash(hash, password);
      } catch (err) {
        passwordValid = false;
    }

    if (!passwordValid) {
        // Increment failed login attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const lockoutAfterAttempts = 5;
      const lockoutDuration = 15 * 60 * 1000; // 15 minutes

      let updateData: any = {
        failed_login_attempts: failedAttempts,
      };

      if (failedAttempts >= lockoutAfterAttempts) {
        updateData.locked_until = new Date(Date.now() + lockoutDuration);
      }

      await this.db('users').where('id', user.id).update(updateData);

      throw new UnauthorizedError('Invalid email or password');
    }


    // Create session
    const ctx: TenantContext = {
      organizationId: user.organizationId,
      userId: user.id,
      sessionUuid: uuidv4(), // Temporary, will be set in session
    };

    const sessionUuid = uuidv4();
    const accessToken = generateAccessToken({
      sub: String(user.id),
      oid: String(user.organizationId),
      sid: sessionUuid,
    });

    const refreshToken = generateRefreshToken({
      sub: String(user.id),
      oid: String(user.organizationId),
      sid: sessionUuid,
    });

    const refreshTokenHash = hashSha256(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const clientIp = getClientIp(req);
    const userAgent = getUserAgent(req);

    await this.sessionRepo.create(
      {
        organizationId: user.organizationId,
        userId: user.id,
        sessionUuid,
      },
      {
        uuid: sessionUuid,
        organization_id: user.organizationId,
        user_id: user.id,
        refresh_token_hash: refreshTokenHash,
        device_type: 'web',
        user_agent: userAgent,
        ip_address: clientIp,
        is_trusted: false,
        last_active_at: new Date(),
        expires_at: expiresAt,
      } as any
    );

    // Reset failed attempts and update last login
    ctx.sessionUuid = sessionUuid;
    await this.db('users').where('id', user.id).update({
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date(),
    });

    // Audit log
    await this.auditService.log(ctx, {
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
    });

    // Get organization
    const org = await this.db('organizations').where('id', user.organizationId).first();

    // Get user permissions
    const userWithPerms = await this.userRepo.getWithPermissions(ctx, user.id);
    const roles = userWithPerms?.roles || [];
    const permissions = userWithPerms?.permissions || [];

    return {
      accessToken,
      refreshToken,
      user,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      permissions,
      roles,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(ctx: TenantContext, refreshToken: string): Promise<RefreshTokenResponse> {
    // Verify refresh token signature
    let decoded;
    try {
      decoded = decodeToken(refreshToken);
      if (!decoded) {
        throw new UnauthorizedError('Invalid refresh token');
      }
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Get session from DB (with tenant isolation check)
    const session = await this.sessionRepo.getActiveByUuid(decoded.sid, ctx);
    if (!session) {
      throw new UnauthorizedError('Session expired or revoked');
    }

    // Verify refresh token hash matches (use constant-time comparison to prevent timing attacks)
    const refreshTokenHash = hashSha256(refreshToken);
    if (!constantTimeCompare(session.refresh_token_hash, refreshTokenHash)) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Verify claims match context
    if (
      parseInt(decoded.sub, 10) !== ctx.userId ||
      parseInt(decoded.oid, 10) !== ctx.organizationId
    ) {
      throw new UnauthorizedError('Token claims do not match context');
    }

    // Generate new tokens
    const newSessionUuid = uuidv4();
    const newAccessToken = generateAccessToken({
      sub: String(ctx.userId),
      oid: String(ctx.organizationId),
      sid: newSessionUuid,
    });

    const newRefreshToken = generateRefreshToken({
      sub: String(ctx.userId),
      oid: String(ctx.organizationId),
      sid: newSessionUuid,
    });

    // Revoke old session
    await this.sessionRepo.revoke(ctx, session.uuid, 'token_refresh');

    // Create new session
    const newRefreshTokenHash = hashSha256(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.sessionRepo.create(ctx, {
      uuid: newSessionUuid,
      organization_id: ctx.organizationId,
      user_id: ctx.userId,
      refresh_token_hash: newRefreshTokenHash,
      device_type: 'web',
      user_agent: 'unknown',
      ip_address: '127.0.0.1',
      is_trusted: false,
      last_active_at: new Date(),
      expires_at: expiresAt,
    } as any);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout (revoke session)
   */
  async logout(ctx: TenantContext): Promise<void> {
    await this.sessionRepo.revoke(ctx, ctx.sessionUuid, 'user_logout');

    // Audit log
    await this.auditService.log(ctx, {
      action: 'LOGOUT',
      entityType: 'USER',
      entityId: ctx.userId,
    });
  }

  /**
   * Get current user
   */
  async getMe(ctx: TenantContext): Promise<MeResponse> {
    const user = await this.userRepo.getById(ctx, ctx.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const org = await this.db('organizations').where('id', ctx.organizationId).first();

    const userWithPerms = await this.userRepo.getWithPermissions(ctx, ctx.userId);
    const roles = userWithPerms?.roles || [];
    const permissions = userWithPerms?.permissions || [];

    return {
      user,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
      permissions,
      roles,
    };
  }

  /**
   * Change password
   */
  async changePassword(
    ctx: TenantContext,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userRepo.getById(ctx, ctx.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const passwordHashRow = await this.db('users')
      .where('id', user.id)
      .select('password_hash')
      .first();

    // Try both snake_case and camelCase since Knex might convert
    const hash = passwordHashRow?.password_hash || passwordHashRow?.passwordHash;

    let currentPasswordValid = false;
    try {
      currentPasswordValid = await verifyHash(hash, currentPassword);
    } catch {
      currentPasswordValid = false;
    }

    if (!currentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hash(newPassword, {
      type: 2,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    // Update password
    await this.db('users').where('id', user.id).update({
      password_hash: newPasswordHash,
      last_password_changed_at: new Date(),
      updated_at: new Date(),
    });

    // Revoke all sessions (force re-login)
    await this.sessionRepo.revokeAllForUser(ctx, 'password_changed');

    // Audit log
    await this.auditService.log(ctx, {
      action: 'CHANGE_PASSWORD',
      entityType: 'USER',
      entityId: user.id,
    });
  }
}



