import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSubscriptionStore } from '@/features/subscriptions/store/subscriptionStore';

interface ModuleRouteProps {
  module: string;
  fallbackPath?: string;
  children?: React.ReactNode;
}

/**
 * Route wrapper that checks if the organization's subscription plan includes the required module.
 * If the module is not enabled in the subscription plan, redirects to fallbackPath (default: /dashboard).
 * If no subscription plan is assigned, allows unrestricted access.
 */
export function ModuleRoute({ module, fallbackPath = '/dashboard', children }: ModuleRouteProps) {
  const { hasModule, isGatingEnabled } = useSubscriptionStore();

  if (isGatingEnabled && !hasModule(module)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
