import { afterEach, describe, expect, it, vi } from 'vitest';
import { requirePermission } from '../../common/middleware/requirePermission';
import { RbacService } from './rbac.service';

afterEach(() => vi.restoreAllMocks());
describe('full tab API permissions', () => {
  it('allows read data from a saved matching page grant', async () => {
    vi.spyOn(RbacService.prototype, 'hasAllPermissions').mockResolvedValue(false);
    vi.spyOn(RbacService.prototype, 'hasMenuReadPermission').mockResolvedValue(true);
    const next = vi.fn();
    requirePermission('recruitment.job.read')({ ctx: { organizationId: 7, userId: 42 }, user: { roles: ['custom_role'] }, method: 'GET' } as any, {} as any, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith());
  });
  it('allows employee edit only with the explicit update action', async () => {
    vi.spyOn(RbacService.prototype, 'hasAllPermissions').mockResolvedValue(true);
    const next = vi.fn();
    requirePermission('employee.profile.update')({ ctx: { organizationId: 7, userId: 42 }, user: { roles: ['finance'] }, method: 'PUT' } as any, {} as any, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith());
  });
  it('does not turn a page grant into mutation access', async () => {
    vi.spyOn(RbacService.prototype, 'hasAllPermissions').mockResolvedValue(false);
    vi.spyOn(RbacService.prototype, 'hasMenuReadPermission').mockResolvedValue(true);
    const next = vi.fn();
    requirePermission('recruitment.job.write')({ ctx: { organizationId: 7, userId: 42 }, user: { roles: ['custom_role'] }, method: 'PATCH' } as any, {} as any, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.any(Error)));
    expect(next).not.toHaveBeenCalledWith();
  });
});
