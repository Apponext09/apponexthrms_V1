import { afterEach, describe, expect, it, vi } from 'vitest';
import { RbacService } from './rbac.service';
import { requireMenuModule, requireMenuPage } from './requireMenuAccess';

const ctx = { organizationId: 7, userId: 42 };
const access = (routes: string[]) => ({
  configured: true,
  roleCodes: ['custom_role'],
  menuCodes: routes.map((route) => `page:employee:${route}`),
  paths: routes,
  items: routes.map((route) => ({ code: `page:employee:${route}`, route, portal: 'employee', parentId: 1 })),
});

afterEach(() => vi.restoreAllMocks());

describe('database-backed menu guards', () => {
  it('allows a granted child page and denies a different child in the same module', async () => {
    vi.spyOn(RbacService.prototype, 'getMyMenus').mockResolvedValue(access(['/employee/attendance']) as any);
    const allowed = vi.fn();
    await requireMenuPage(['/employee/attendance'])({ ctx } as any, {} as any, allowed);
    expect(allowed).toHaveBeenCalledWith();
    const denied = vi.fn();
    await requireMenuPage(['/attendance/live-tracking'])({ ctx } as any, {} as any, denied);
    expect(denied.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });

  it('does not treat a parent-only grant as module API access', async () => {
    vi.spyOn(RbacService.prototype, 'getMyMenus').mockResolvedValue({ ...access([]), menuCodes: ['module:attendance'] } as any);
    const next = vi.fn();
    await requireMenuModule('attendance')({ ctx } as any, {} as any, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403 });
  });

  it('fails closed when permission lookup fails', async () => {
    vi.spyOn(RbacService.prototype, 'getMyMenus').mockRejectedValue(new Error('database unavailable'));
    const next = vi.fn();
    await requireMenuPage(['/employee/attendance'])({ ctx } as any, {} as any, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(next).not.toHaveBeenCalledWith();
  });
});
