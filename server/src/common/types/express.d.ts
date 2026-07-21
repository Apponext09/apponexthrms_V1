import type { TenantContext } from '../../db/types';

declare global {
  namespace Express {
    interface Request {
      /**
       * Tenant context for multi-tenant isolation
       * Contains organization ID, user ID, user roles, and tenant ID
       * Automatically populated by auth middleware
       */
      tenantContext?: TenantContext;

      /**
       * User ID from JWT token
       * Extracted by auth middleware
       */
      userId?: number;

      /**
       * User email from JWT token
       * Extracted by auth middleware
       */
      userEmail?: string;

      /**
       * Organization ID for current tenant
       * Used for multi-tenant data isolation
       */
      organizationId?: number;

      /**
       * User roles assigned to current user
       * Used for role-based access control
       */
      userRoles?: string[];

      /**
       * Performance-specific context
       * Available after performance module initialization
       */
      performanceContext?: {
        currentCycleId?: number;
        userPermissions?: string[];
      };
    }
  }
}

export {};
