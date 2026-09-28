import { useEffect, useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore, useAuthHydrated, hasStoredAccessToken } from '../features/auth/store/authStore';
import type { Role } from '@/config/roles';
import { hasAnyRole } from '@/lib/rbac';
import { PolicyAcceptanceModal } from '../features/auth/components/PolicyAcceptanceModal';
import { useMenuAccess } from '@/features/access/useMenuAccess';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  requiredPermissions?: string[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermissions
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const menuAccess = useMenuAccess();
  const authHydrated = useAuthHydrated();
  const [sessionValid, setSessionValid] = useState(true);
  const lastUserIdRef = useRef<number | null>(user?.id ?? null);

  const allowedRolesKey = allowedRoles ? allowedRoles.slice().sort().join(',') : '';
  const requiredPermissionsKey = requiredPermissions ? requiredPermissions.slice().sort().join(',') : '';

  useEffect(() => {
    if (!authHydrated) return;
    // Get current user ID from store
    const currentUserId = user?.id;

    // Check if user changed (logout + login with different user)
    if (currentUserId && lastUserIdRef.current && currentUserId !== lastUserIdRef.current) {
      // User changed - invalidate session
      setSessionValid(false);
      window.location.href = '/login?' + new Date().getTime();
      return;
    }

    // Store current user ID for comparison
    if (currentUserId) {
      lastUserIdRef.current = currentUserId;
    }

    // 1. Set strict cache-control headers (prevent duplicate tags on every render)
    if (!document.querySelector('meta[http-equiv="Cache-Control"]')) {
      const meta1 = document.createElement('meta');
      meta1.httpEquiv = 'Cache-Control';
      meta1.content = 'no-cache, no-store, must-revalidate, max-age=0';
      document.head.appendChild(meta1);
    }

    if (!document.querySelector('meta[http-equiv="Pragma"]')) {
      const meta2 = document.createElement('meta');
      meta2.httpEquiv = 'Pragma';
      meta2.content = 'no-cache';
      document.head.appendChild(meta2);
    }

    if (!document.querySelector('meta[http-equiv="Expires"]')) {
      const meta3 = document.createElement('meta');
      meta3.httpEquiv = 'Expires';
      meta3.content = '-1';
      document.head.appendChild(meta3);
    }

    // 2. Prevent back button by clearing history
    const popstateHandler = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', popstateHandler);

    // 3. Re-check auth on visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const { isAuthenticated: currentAuth, user: currentUser } = useAuthStore.getState();

        // If not authenticated, redirect immediately
        if (!currentAuth || !currentUser) {
          if (!hasStoredAccessToken()) {
            window.location.href = '/login?' + new Date().getTime();
          }
          return;
        }

        // Check if user ID changed (different user logged in)
        if (lastUserIdRef.current && currentUser.id !== lastUserIdRef.current) {
          // Different user - force redirect
          window.location.href = '/login?' + new Date().getTime();
          return;
        }

        // The rendered access guard checks current menu grants after refocus.
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Re-check on window focus (user comes back to browser)
    const handleFocus = () => {
      const { isAuthenticated: currentAuth, user: currentUser } = useAuthStore.getState();

      if (!currentAuth || !currentUser) {
        if (!hasStoredAccessToken()) {
          window.location.href = '/login?' + new Date().getTime();
        }
        return;
      }

      if (lastUserIdRef.current && currentUser.id !== lastUserIdRef.current) {
        window.location.href = '/login?' + new Date().getTime();
        return;
      }

      // Do not reject a custom role solely because it lacks a legacy role label.
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('popstate', popstateHandler);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
    // Role arrays are represented by stable keys to avoid re-registering listeners every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedRolesKey, requiredPermissionsKey, user?.id, authHydrated]);

  if (!authHydrated) {
    return null;
  }

  // 1. Check if user is authenticated
  if (!isAuthenticated || !user) {
    console.warn('[ProtectedRoute] Access denied: User not authenticated', {
      pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      timestamp: new Date().toISOString(),
    });
    return <Navigate to="/login" replace />;
  }

  // 2. Check role-based access
  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user.roles || [];
    const accessRole = (user.accessRole || user.role || '').toLowerCase();
    const effectiveRoles = Array.from(new Set([...userRoles.map((r) => String(r).toLowerCase()), accessRole].filter(Boolean)));

    // User must have at least one of the allowed roles
    if (!hasAnyRole(effectiveRoles, allowedRoles) && (window.location.pathname.startsWith('/superadmin') || menuAccess.error || (menuAccess.ready && !menuAccess.canAccessPath(`${window.location.pathname}${window.location.search}`)))) {
      console.warn('[ProtectedRoute] Access denied: Insufficient role', {
        userRoles: effectiveRoles,
        allowedRoles,
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      return <Navigate to="/unauthorized" replace />;
    }
    if (!hasAnyRole(effectiveRoles, allowedRoles) && !menuAccess.ready) return null;
  }

  // 3. Check permission-based access
  if (requiredPermissions && requiredPermissions.length > 0) {
    const userPermissions = user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(perm =>
      userPermissions.includes(perm) || userPermissions.includes('*')
    );

    if (!hasAllPermissions) {
      console.warn('[ProtectedRoute] Access denied: Insufficient permissions', {
        userPermissions,
        requiredPermissions,
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (!sessionValid) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <PolicyAcceptanceModal />
      {children}
    </>
  );
}
