import { describe, expect, it } from 'vitest';
import { grantedLandingPath, sessionPortal } from './portalNavigation';

describe('pages stay in the current logged-in portal', () => {
  it('opens Profile for a profile-only Intern instead of an ungranted dashboard', () => {
    expect(grantedLandingPath(['/intern/profile'], 'intern', '/intern/dashboard')).toBe('/intern/profile');
  });
  it('prefers the Intern page even when older grants contain employee pages', () => {
    expect(grantedLandingPath(['/employee/profile', '/intern/profile'], 'intern', '/intern/dashboard')).toBe('/intern/profile');
  });
  it('keeps the session portal when opening content from another portal', () => {
    expect(sessionPortal('intern', 'admin')).toBe('intern');
    expect(sessionPortal('finance', 'hr')).toBe('finance');
  });
  it('opens a granted shared module without requiring a second login', () => {
    expect(grantedLandingPath(['/recruitment/jobs'], 'intern', '/intern/dashboard')).toBe('/recruitment/jobs');
  });
  it('does not select unresolved, ungranted or platform routes', () => {
    expect(grantedLandingPath(['/intern', '/employees/:id', '/superadmin/dashboard'], 'intern', '/intern/dashboard')).toBe('/unauthorized');
    expect(grantedLandingPath([], 'intern', '/intern/dashboard')).toBe('/unauthorized');
  });
  it('respects the configured custom-role portal over a legacy preferred dashboard', () => {
    expect(grantedLandingPath(['/intern/profile', '/employee/dashboard'], 'intern', '/employee/dashboard')).toBe('/intern/profile');
    expect(sessionPortal('invalid', 'intern')).toBe('intern');
  });
});
