import type { ReactNode } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';

interface PermissionGateProps {
  permission: string | string[];
  mode?: 'all' | 'any';
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Presentation guard for action buttons and controls. The server remains the
 * security boundary; this component keeps unavailable actions out of the UI.
 */
export function PermissionGate({ permission, mode = 'all', fallback = null, children }: PermissionGateProps) {
  const user = useAuthStore((state) => state.user);
  const granted = user?.permissions ?? [];
  const roles = [...(user?.roles ?? []), user?.accessRole, user?.role].filter(Boolean).map((role) => String(role).toLowerCase());
  const privileged = roles.some((role) => ['organization_admin', 'super_admin', 'admin', 'ceo', 'hr', 'hr_admin', 'hr_manager'].includes(role));
  const required = Array.isArray(permission) ? permission : [permission];
  const allowed = privileged || granted.includes('*') || (mode === 'any'
    ? required.some((code) => granted.includes(code))
    : required.every((code) => granted.includes(code)));

  return <>{allowed ? children : fallback}</>;
}
