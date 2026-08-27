import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/authStore';
import type { Role } from '@/config/roles';
import { hasAnyRole } from '@/lib/rbac';
import { PolicyAcceptanceModal } from '../features/auth/components/PolicyAcceptanceModal';

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
  const [sessionValid, setSessionValid] = useState(true);
  const [lastUserId, setLastUserId] = useState<number | null>(null);

  // Aggressive cache prevention and session validation
  useEffect(() => {
    // Get current user ID from store
    const currentUserId = user?.id;

    // Check if user changed (logout + login with different user)
    if (currentUserId && lastUserId && currentUserId !== lastUserId) {
      // User changed - invalidate session
      setSessionValid(false);
      window.location.href = '/login?' + new Date().getTime();
      return;
    }

    // Store current user ID for comparison
    if (currentUserId) {
      setLastUserId(currentUserId);
    }

    // 1. Set strict cache-control headers
    const meta1 = document.createElement('meta');
    meta1.httpEquiv = 'Cache-Control';
    meta1.content = 'no-cache, no-store, must-revalidate, max-age=0';
    document.head.appendChild(meta1);

    const meta2 = document.createElement('meta');
    meta2.httpEquiv = 'Pragma';
    meta2.content = 'no-cache';
    document.head.appendChild(meta2);

    const meta3 = document.createElement('meta');
    meta3.httpEquiv = 'Expires';
    meta3.content = '-1';
    document.head.appendChild(meta3);

    // 2. Prevent back button by clearing history
    window.history.pushState(null, '', window.location.href);
    const popstateHandler = (e: PopStateEvent) => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', popstateHandler);

    // 3. Re-check auth on visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const { isAuthenticated: currentAuth, user: currentUser } = useAuthStore.getState();

        // If not authenticated, redirect immediately
        if (!currentAuth || !currentUser) {
          window.location.href = '/login?' + new Date().getTime();
          return;
        }

        // Check if user ID changed (different user logged in)
        if (lastUserId && currentUser.id !== lastUserId) {
          // Different user - force redirect
          window.location.href = '/login?' + new Date().getTime();
          return;
        }

        // If current page requires specific roles, verify user still has them
        if (allowedRoles && allowedRoles.length > 0) {
          const userRoles = currentUser.roles || [];
          if (!hasAnyRole(userRoles, allowedRoles)) {
            window.location.href = '/unauthorized?' + new Date().getTime();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Re-check on window focus (user comes back to browser)
    const handleFocus = () => {
      const { isAuthenticated: currentAuth, user: currentUser } = useAuthStore.getState();

      if (!currentAuth || !currentUser) {
        window.location.href = '/login?' + new Date().getTime();
        return;
      }

      if (lastUserId && currentUser.id !== lastUserId) {
        window.location.href = '/login?' + new Date().getTime();
        return;
      }

      if (allowedRoles && allowedRoles.length > 0) {
        const userRoles = currentUser.roles || [];
        if (!hasAnyRole(userRoles, allowedRoles)) {
          window.location.href = '/unauthorized?' + new Date().getTime();
        }
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('popstate', popstateHandler);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [allowedRoles, lastUserId, user?.id]);

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
    if (!hasAnyRole(userRoles, allowedRoles)) {
      console.warn('[ProtectedRoute] Access denied: Insufficient role', {
        userRoles,
        allowedRoles,
        pathname: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
        userId: user.id,
        timestamp: new Date().toISOString(),
      });
      return <Navigate to="/unauthorized" replace />;
    }
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

  return <>{children}</>;
}
