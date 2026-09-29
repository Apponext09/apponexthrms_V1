import { describe, expect, it } from 'vitest';
import { ROLE_MANAGERS, canManageRoleMenu } from './role-management-policy';

describe('Access Roles management policy', () => {
  it('allows organization admin and HR to open role management', () => {
    expect(ROLE_MANAGERS).toEqual(expect.arrayContaining(['organization_admin', 'ceo', 'hr', 'hr_admin', 'hr_manager']));
    expect(ROLE_MANAGERS).not.toContain('super_admin');
  });

  it('lets HR manage lower roles but not Admin/HR system-role access', () => {
    expect(canManageRoleMenu(['hr'], 'employee')).toBe(true);
    expect(canManageRoleMenu(['hr_admin'], 'recruiter')).toBe(true);
    expect(canManageRoleMenu(['hr_manager'], 'organization_admin')).toBe(false);
    expect(canManageRoleMenu(['hr'], 'hr')).toBe(false);
  });

  it('lets organization admin manage organization roles, but not ordinary employees', () => {
    expect(canManageRoleMenu(['organization_admin'], 'hr')).toBe(true);
    expect(canManageRoleMenu(['employee'], 'employee')).toBe(false);
  });
});
