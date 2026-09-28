import { afterEach, describe, expect, it, vi } from 'vitest';
import { requirePermission } from '../../common/middleware/requirePermission';
import { RbacService } from './rbac.service';

afterEach(() => vi.restoreAllMocks());
describe('full tab API permissions', () => {
  it('allows mutation from a saved matching tab grant without an extra action grant', async () => {
    vi.spyOn(RbacService.prototype, 'hasAllPermissions').mockResolvedValue(false);
    vi.spyOn(RbacService.prototype, 'getMyMenus').mockResolvedValue({
      items: [{ route: '/hr/recruitment/jobs' }],
    } as any);
    const next = vi.fn();
    requirePermission('recruitment.job.write')({ ctx: { organizationId: 7, userId: 42 }, user: { roles: ['custom_role'] }, method: 'PATCH' } as any, {} as any, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith());
  });
  it('allows employee edit through the Employees tab', async () => {
    vi.spyOn(RbacService.prototype, 'hasAllPermissions').mockResolvedValue(false);
    vi.spyOn(RbacService.prototype, 'getMyMenus').mockResolvedValue({ items: [{ route: '/employees' }] } as any);
    const next = vi.fn();
    requirePermission('employee.profile.update')({ ctx: { organizationId: 7, userId: 42 }, user: { roles: ['finance'] }, method: 'PUT' } as any, {} as any, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith());
  });
  it('fails closed when the saved tab lookup fails', async () => {
    vi.spyOn(RbacService.prototype, 'hasAllPermissions').mockResolvedValue(false);
    vi.spyOn(RbacService.prototype, 'getMyMenus').mockRejectedValue(new Error('access lookup unavailable'));
    const next = vi.fn();
    requirePermission('recruitment.job.write')({ ctx: { organizationId: 7, userId: 42 }, user: { roles: ['custom_role'] }, method: 'PATCH' } as any, {} as any, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.any(Error)));
    expect(next).not.toHaveBeenCalledWith();
  });
});
