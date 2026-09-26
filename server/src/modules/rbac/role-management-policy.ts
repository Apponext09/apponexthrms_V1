export const ROLE_MANAGERS = ['organization_admin', 'ceo', 'hr', 'hr_admin', 'hr_manager'];

const PRIVILEGED_TARGETS = new Set(['organization_admin', 'org_admin', 'admin', 'owner', 'ceo', 'cto', 'cfo', 'coo', 'cxo', 'hr', 'hr_admin', 'hr_manager']);

export function canManageRoleMenu(actorRoles: string[], targetRole: string): boolean {
  if (actorRoles.some((role) => ['organization_admin', 'ceo'].includes(role))) return true;
  return actorRoles.some((role) => ['hr', 'hr_admin', 'hr_manager'].includes(role)) && !PRIVILEGED_TARGETS.has(targetRole);
}
