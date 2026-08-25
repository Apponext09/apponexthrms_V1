import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/authStore';
import { usePendingPolicies } from '../features/policy/api/usePolicies';
import type { Role } from '@/config/roles';
import { hasAnyRole } from '@/lib/rbac';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes('super_admin') || false;

  // Check for pending policies if authenticated and not super_admin
  const { data: pendingPolicies = [] } = usePendingPolicies({
    enabled: isAuthenticated && !isSuperAdmin && location.pathname !== '/policy-acceptance',
  });

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Interstitial redirect if pending mandatory policies exist
  if (!isSuperAdmin && pendingPolicies.length > 0 && location.pathname !== '/policy-acceptance') {
    return <Navigate to="/policy-acceptance" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user?.roles || [];
    if (!hasAnyRole(userRoles, allowedRoles)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
