export const ORGANIZATION_PORTALS = ['admin', 'hr', 'manager', 'team_lead', 'employee', 'intern', 'consultant', 'finance'] as const;
export type SessionPortal = typeof ORGANIZATION_PORTALS[number];

export function sessionPortal(primary: string | undefined, fallback: SessionPortal): SessionPortal {
  return ORGANIZATION_PORTALS.includes(primary as SessionPortal) ? primary as SessionPortal : fallback;
}

export function portalRoot(portal: SessionPortal): string {
  return portal === 'admin' ? '' : `/${portal.replace('_', '-')}`;
}

const usablePage = (path: string) => path.startsWith('/') && !/[:*]/.test(path) &&
  !/^\/(superadmin|login|unauthorized)(\/|$)/.test(path) &&
  !/^\/(hr|manager|employee|intern|consultant|finance|team-lead)\/?$/.test(path);

/** Stay in the user's portal when possible; never choose an ungranted dashboard. */
export function grantedLandingPath(paths: string[], primary: string | undefined, preferred: string): string {
  const fallback = ORGANIZATION_PORTALS.find((portal) => portal !== 'admin' && preferred.startsWith(`${portalRoot(portal)}/`)) ?? 'admin';
  const portal = sessionPortal(primary, fallback);
  const permitted = paths.filter(usablePage);
  const own = permitted.filter((path) => portal === 'admin'
    ? !/^\/(hr|manager|team-lead|employee|intern|consultant|finance)(\/|$)/.test(path)
    : path.startsWith(`${portalRoot(portal)}/`));
  const home = `${portalRoot(portal)}/dashboard`;
  if (own.includes(preferred)) return preferred;
  if (own.includes(home)) return home;
  return own[0] ?? permitted[0] ?? '/unauthorized';
}
