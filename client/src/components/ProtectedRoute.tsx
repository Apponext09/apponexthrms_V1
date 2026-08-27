import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../features/auth/store/authStore';
import type { Role } from '@/config/roles';
import { hasAnyRole } from '@/lib/rbac';
import { PolicyAcceptanceModal } from '../features/auth/components/PolicyAcceptanceModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoles = user?.roles || [];
    if (!hasAnyRole(userRoles, allowedRoles)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return (
    <>
      <PolicyAcceptanceModal />
      {user?.policyAccepted ? children : null}
    </>
  );
}
