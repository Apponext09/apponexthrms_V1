# ApponextHRMS Frontend - SaaS Transformation Strategy

**Goal**: Transform single-tenant React frontend into multi-tenant, feature-gated SaaS UI  

---

## 🏗️ **ARCHITECTURE CHANGES**

### Current Structure → New Structure

**BEFORE** (Single-Tenant):
```
client/src/
├── features/
│   ├── employee/
│   ├── attendance/
│   ├── leaves/
│   ├── payroll/
│   ├── performance/
│   └── ... (all modules always visible)
├── components/
└── pages/
```

**AFTER** (Multi-Tenant SaaS):
```
client/src/
├── features/
│   ├── employee/
│   ├── attendance/
│   ├── leaves/
│   ├── payroll/
│   ├── performance/
│   └── ... (dynamically loaded based on license)
│
├── tenant/
│   ├── context/
│   │   ├── TenantContext.tsx (organization, subscription, modules)
│   │   ├── useEnabledModules.ts
│   │   ├── useTenantContext.ts
│   │   └── useSubscriptionLimits.ts
│   │
│   ├── components/
│   │   ├── ModuleGate.tsx (403 if not licensed)
│   │   ├── FeatureGate.tsx (feature flags)
│   │   ├── LimitWarning.tsx (quota/limits)
│   │   └── UpgradePrompt.tsx (upsell)
│   │
│   └── hooks/
│       ├── useOrganization.ts
│       ├── useSubscription.ts
│       ├── useApiQuota.ts
│       └── useModuleLicense.ts
│
├── admin-portal/
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Organizations.tsx
│   │   ├── Subscriptions.tsx
│   │   ├── Billing.tsx
│   │   ├── Users.tsx
│   │   └── Settings.tsx
│   │
│   ├── components/
│   │   ├── OrganizationForm.tsx
│   │   ├── ModuleLicensing.tsx
│   │   ├── SubscriptionManager.tsx
│   │   └── MetricsDashboard.tsx
│   │
│   └── services/
│       ├── adminApi.ts
│       └── organizationService.ts
│
├── shared/
│   ├── hooks/
│   │   ├── useAuth.ts (updated for multi-tenant)
│   │   ├── useTenant.ts (NEW)
│   │   ├── useApi.ts (auto-add tenantId)
│   │   └── usePermission.ts (RBAC)
│   │
│   ├── types/
│   │   ├── tenant.ts
│   │   ├── subscription.ts
│   │   ├── organization.ts
│   │   └── module.ts
│   │
│   └── components/
│       ├── TenantBoundary.tsx (error boundary)
│       ├── ModuleNav.tsx (dynamic sidebar)
│       └── QuotaIndicator.tsx
│
└── config/
    ├── modules.ts (module registry)
    ├── features.ts (feature flags)
    └── api.ts (updated for multi-tenant)
```

---

## 🎯 **IMPLEMENTATION PHASES**

### Phase 1: Tenant Context & Hooks

**File: `client/src/tenant/context/TenantContext.tsx`**

```typescript
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/config/api';

interface Organization {
  id: string;
  name: string;
  slug: string;
  custom_domain?: string;
  logo_url?: string;
}

interface Subscription {
  id: string;
  plan_name: string;
  status: 'active' | 'trial' | 'suspended' | 'expired';
  expires_at: string;
  plan_id: string;
}

interface TenantContextType {
  organization: Organization | null;
  subscription: Subscription | null;
  enabledModules: string[];
  limits: Record<string, number>;
  usage: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  isModuleEnabled: (module: string) => boolean;
  canAccessModule: (module: string) => boolean;
  getRemainingQuota: (resource: string) => number;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      setIsLoading(true);
      
      // Load organization
      const orgRes = await apiClient.get('/organizations/current');
      setOrganization(orgRes.data.data);

      // Load subscription
      const subRes = await apiClient.get('/subscriptions/current');
      setSubscription(subRes.data.data);

      // Load enabled modules
      const modRes = await apiClient.get('/organizations/current/modules');
      setEnabledModules(
        modRes.data.data
          .filter((m: any) => m.enabled)
          .map((m: any) => m.module_name)
      );

      // Load limits
      const limRes = await apiClient.get('/organizations/current/limits');
      setLimits(limRes.data.data);

      // Load usage
      const usageRes = await apiClient.get('/organizations/current/usage');
      setUsage(usageRes.data.data);

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load tenant data');
    } finally {
      setIsLoading(false);
    }
  };

  const isModuleEnabled = (module: string): boolean => {
    return enabledModules.includes(module);
  };

  const canAccessModule = (module: string): boolean => {
    return (
      isModuleEnabled(module) &&
      subscription?.status === 'active'
    );
  };

  const getRemainingQuota = (resource: string): number => {
    return (limits[resource] || 0) - (usage[resource] || 0);
  };

  const value: TenantContextType = {
    organization,
    subscription,
    enabledModules,
    limits,
    usage,
    isLoading,
    error,
    isModuleEnabled,
    canAccessModule,
    getRemainingQuota,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = React.useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}
```

### Phase 2: Module Gating Components

**File: `client/src/tenant/components/ModuleGate.tsx`**

```typescript
import React from 'react';
import { useTenant } from '../context/TenantContext';

interface ModuleGateProps {
  module: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ModuleGate({
  module,
  children,
  fallback = <ModuleLockedPrompt module={module} />,
}: ModuleGateProps) {
  const { canAccessModule } = useTenant();

  if (!canAccessModule(module)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

function ModuleLockedPrompt({ module }: { module: string }) {
  const { subscription } = useTenant();

  if (subscription?.status === 'trial') {
    return (
      <div className="locked-module">
        <h3>Upgrade to Access {module}</h3>
        <p>This module is available in Professional plan and above.</p>
        <button>Upgrade Plan</button>
      </div>
    );
  }

  return (
    <div className="locked-module">
      <h3>{module} Module Not Available</h3>
      <p>Contact support to enable this module for your organization.</p>
    </div>
  );
}
```

**File: `client/src/tenant/components/FeatureGate.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { apiClient } from '@/config/api';

interface FeatureGateProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({
  flag,
  children,
  fallback = null,
}: FeatureGateProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkFeature();
  }, [flag]);

  const checkFeature = async () => {
    try {
      const res = await apiClient.get(`/features/${flag}/enabled`);
      setIsEnabled(res.data.data.enabled);
    } catch (error) {
      setIsEnabled(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### Phase 3: Dynamic Sidebar

**File: `client/src/shared/components/ModuleNav.tsx`**

```typescript
import React from 'react';
import { useTenant } from '@/tenant/context/TenantContext';
import { Link } from 'react-router-dom';

const MODULE_REGISTRY = {
  dashboard: {
    name: 'Dashboard',
    path: '/dashboard',
    icon: 'dashboard',
  },
  employees: {
    name: 'Employees',
    path: '/employees',
    icon: 'people',
  },
  attendance: {
    name: 'Attendance',
    path: '/attendance',
    icon: 'schedule',
  },
  leaves: {
    name: 'Leaves',
    path: '/leaves',
    icon: 'event_note',
  },
  payroll: {
    name: 'Payroll',
    path: '/payroll',
    icon: 'attach_money',
  },
  performance: {
    name: 'Performance',
    path: '/performance',
    icon: 'trending_up',
  },
  recruitment: {
    name: 'Recruitment',
    path: '/recruitment',
    icon: 'person_add',
  },
  assets: {
    name: 'Assets',
    path: '/assets',
    icon: 'inventory',
  },
  workflow: {
    name: 'Workflow',
    path: '/workflow',
    icon: 'workflow',
  },
};

export function ModuleNav() {
  const { enabledModules } = useTenant();

  const visibleModules = Object.entries(MODULE_REGISTRY)
    .filter(([key]) => enabledModules.includes(key))
    .map(([, module]) => module);

  return (
    <nav className="module-nav">
      {visibleModules.map((module) => (
        <Link key={module.path} to={module.path}>
          <span className="icon">{module.icon}</span>
          <span className="label">{module.name}</span>
        </Link>
      ))}
    </nav>
  );
}
```

### Phase 4: API Auto-Tenant Integration

**File: `client/src/config/api.ts`**

```typescript
import axios from 'axios';
import { useAuth } from '@/shared/hooks/useAuth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add tenant context
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (tenantId && !config.params?.skip_tenant_id) {
    // Add tenantId to all requests (backend uses JWT, this is for compatibility)
    config.headers['X-Organization-ID'] = tenantId;
  }

  return config;
});

// Response interceptor: Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { status, data } = error.response || {};

    if (status === 401) {
      // Token expired
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    } else if (status === 403) {
      // Module not licensed or permission denied
      if (data?.error === 'Module not licensed') {
        window.location.href = '/upgrade';
      }
    } else if (status === 429) {
      // Rate limit or quota exceeded
      console.error('Quota exceeded:', data?.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

### Phase 5: Admin Portal Structure

**File: `client/src/admin-portal/pages/Dashboard.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/adminApi';
import MetricsDashboard from '../components/MetricsDashboard';
import RecentActivity from '../components/RecentActivity';

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const res = await adminApi.get('/dashboard/metrics');
      setMetrics(res.data.data);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <h1>Platform Dashboard</h1>

      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard label="Total Organizations" value={metrics?.totalOrganizations} />
        <KPICard label="MRR" value={`$${metrics?.mrr?.toLocaleString()}`} />
        <KPICard label="Active Users" value={metrics?.activeUsers} />
        <KPICard label="System Health" value={metrics?.systemHealth?.status} />
      </div>

      {/* Charts */}
      <MetricsDashboard metrics={metrics} />

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}

function KPICard({ label, value }: { label: string; value: any }) {
  return (
    <div className="kpi-card">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
    </div>
  );
}
```

---

## 🔐 **AUTHENTICATION FLOW**

### Updated Auth Flow

```
User visits app.apponext.com/tenant-a.apponext.com
    ↓
Detect organization from URL
    ↓
Login/SSO
    ↓
Backend returns JWT with organization_id
    ↓
Frontend stores: token + organization_id
    ↓
TenantProvider loads organization context
    ↓
ModuleNav renders only enabled modules
    ↓
Route guards prevent access to disabled modules
```

### Updated Auth Hook

```typescript
// File: client/src/shared/hooks/useAuth.ts

export function useAuth() {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    validateToken();
  }, []);

  const validateToken = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No token');

      // Decode JWT to get organization_id
      const decoded = decodeJWT(token);
      
      // Verify token is still valid
      const res = await apiClient.get('/auth/me');
      
      setUser(res.data.data.user);
      setOrganization(res.data.data.organization);
      
      // Store organization_id for later
      localStorage.setItem('tenantId', decoded.organization_id);
    } catch (error) {
      localStorage.removeItem('accessToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    
    const { user, organization, token } = res.data.data;
    const decoded = decodeJWT(token);
    
    localStorage.setItem('accessToken', token);
    localStorage.setItem('tenantId', decoded.organization_id);
    
    setUser(user);
    setOrganization(organization);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('tenantId');
    setUser(null);
    setOrganization(null);
  };

  return {
    user,
    organization,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
```

---

## 🚀 **ROUTING WITH MODULE GATING**

**File: `client/src/routes.tsx`**

```typescript
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './shared/components/ProtectedRoute';
import { ModuleGate } from './tenant/components/ModuleGate';
import { TenantProvider } from './tenant/context/TenantContext';

// Pages
import Dashboard from './features/dashboard/pages/Dashboard';
import EmployeeList from './features/employee/pages/EmployeeList';
import AttendancePage from './features/attendance/pages/AttendancePage';
import LeaveApplications from './features/leaves/pages/LeaveApplications';
import PayrollDashboard from './features/payroll/pages/PayrollDashboard';
import PerformancePage from './features/performance/pages/PerformancePage';
import RecruitmentJobs from './features/recruitment/pages/RecruitmentJobs';
import AssetManagement from './features/asset/pages/AssetManagement';

// Admin Portal
import AdminDashboard from './admin-portal/pages/Dashboard';
import OrganizationManagement from './admin-portal/pages/Organizations';
import SubscriptionManagement from './admin-portal/pages/Subscriptions';

export default function AppRoutes() {
  return (
    <TenantProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Tenant Routes (Protected) */}
        <Route
          path="/"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <ModuleGate module="employees">
                <EmployeeList />
              </ModuleGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <ModuleGate module="attendance">
                <AttendancePage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaves"
          element={
            <ProtectedRoute>
              <ModuleGate module="leaves">
                <LeaveApplications />
              </ModuleGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/payroll"
          element={
            <ProtectedRoute>
              <ModuleGate module="payroll">
                <PayrollDashboard />
              </ModuleGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/performance"
          element={
            <ProtectedRoute>
              <ModuleGate module="performance">
                <PerformancePage />
              </ModuleGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/recruitment"
          element={
            <ProtectedRoute>
              <ModuleGate module="recruitment">
                <RecruitmentJobs />
              </ModuleGate>
            </ProtectedRoute>
          }
        />

        <Route
          path="/assets"
          element={
            <ProtectedRoute>
              <ModuleGate module="assets">
                <AssetManagement />
              </ModuleGate>
            </ProtectedRoute>
          }
        />

        {/* Admin Portal Routes */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/organizations"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <OrganizationManagement />
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/subscriptions"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <SubscriptionManagement />
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </TenantProvider>
  );
}

// Admin Route Guard
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user?.roles?.includes('super_admin') && !user?.roles?.includes('platform_admin')) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
```

---

## 📦 **DEPLOYMENT & CONFIGURATION**

### Environment Variables

```bash
# .env.production
REACT_APP_API_URL=https://api.apponext.com
REACT_APP_ADMIN_PORTAL_URL=https://admin.apponext.com
REACT_APP_AUTH_URL=https://auth.apponext.com
REACT_APP_BILLING_URL=https://billing.apponext.com

# Stripe/Razorpay
REACT_APP_STRIPE_PUBLIC_KEY=pk_live_xxx
REACT_APP_RAZORPAY_KEY=rzp_live_xxx
```

### Multi-Domain Support

```
admin.apponext.com       → Super Admin Portal
app.apponext.com         → HRMS (Tenant A)
tenant-a.apponext.com    → HRMS (Tenant A via subdomain)
customer.com             → HRMS (Tenant A via custom domain)
```

---

## ✅ **MIGRATION CHECKLIST**

- [ ] TenantProvider context implemented
- [ ] ModuleGate component implemented
- [ ] Module registry created
- [ ] API client updated
- [ ] Sidebar dynamic rendering
- [ ] Route guards implemented
- [ ] Admin portal scaffolding
- [ ] Authentication flow updated
- [ ] Tested with multiple organizations
- [ ] Performance tested
- [ ] Documentation updated

---

**Status**: Frontend transformation strategy complete ✅

