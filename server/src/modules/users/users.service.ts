import { NotFoundError } from '../../common/errors/index';
import { AuditService } from '../audit/audit.service';
import { UsersRepository } from './users.repository';
import { SessionRepository } from '../auth/repositories/session.repository';
import type { TenantContext } from '../../db/types';
import type { UpdateUserInput } from './users.types';

export class UsersService {
  private usersRepo: UsersRepository;
  private sessionRepo: SessionRepository;
  private auditService: AuditService;

  constructor() {
    this.usersRepo = new UsersRepository();
    this.sessionRepo = new SessionRepository();
    this.auditService = new AuditService();
  }

  /**
   * List users in organization
   */
  async listUsers(ctx: TenantContext, page: number = 1, pageSize: number = 20) {
    return this.usersRepo.list(ctx, { page, pageSize });
  }

  /**
   * Get user by ID
   */
  async getUser(ctx: TenantContext, userId: number) {
    const user = await this.usersRepo.getWithRoles(ctx, userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Update user
   */
  async updateUser(ctx: TenantContext, userId: number, input: UpdateUserInput) {
    const user = await this.usersRepo.getById(ctx, userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await this.usersRepo.update(ctx, userId, {
      email: input.email,
      mobile: input.mobile,
      mobile_country_code: input.mobileCountryCode,
      status: input.status,
    } as any);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'USER',
      entityId: userId,
      beforeState: {
        email: user.email,
        mobile: user.mobile,
        status: user.status,
      },
      afterState: input,
    });

    return updated;
  }

  /**
   * Force logout user (revoke all sessions)
   */
  async forceLogout(ctx: TenantContext, userId: number) {
    const userCtx: TenantContext = {
      organizationId: ctx.organizationId,
      userId,
      sessionUuid: 'system', // For audit purposes
    };

    const revokedCount = await this.sessionRepo.revokeAllForUser(userCtx, 'admin_force_logout');

    // Audit log
    await this.auditService.log(ctx, {
      action: 'FORCE_LOGOUT',
      entityType: 'USER',
      entityId: userId,
      afterState: {
        sessionsRevoked: revokedCount,
      },
    });

    return { sessionsRevoked: revokedCount };
  }
}
