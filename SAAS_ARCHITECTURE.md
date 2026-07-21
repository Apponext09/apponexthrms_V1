# ApponextHRMS → Enterprise SaaS Platform Architecture

**Version**: 1.0  
**Date**: 2026-07-18  
**Scope**: Complete Multi-Tenant SaaS Transformation  
**Complexity**: Enterprise-Grade  
**Estimated Duration**: 6-12 months (full implementation)  

---

## 📊 **EXECUTIVE SUMMARY**

Transform ApponextHRMS from single-tenant HRMS into a production-grade multi-tenant SaaS platform supporting:

- ✅ **Unlimited Organizations** (Tenants)
- ✅ **Complete Data Isolation** (No cross-tenant data leaks)
- ✅ **Module Licensing** (Per-org feature control)
- ✅ **Subscription Management** (Multiple plans)
- ✅ **Billing & Revenue** (Razorpay, Stripe)
- ✅ **Super Admin Portal** (Central management)
- ✅ **Enterprise RBAC** (Platform + Tenant roles)
- ✅ **Monitoring & Observability** (Production-grade)
- ✅ **Security & Compliance** (SOC 2, GDPR-ready)

---

## 🏛️ **PLATFORM ARCHITECTURE**

### **DNS & Domain Strategy**

```
admin.apponext.com       → Super Admin Portal
app.apponext.com         → HRMS Application (Tenant)
api.apponext.com         → Shared Backend API
auth.apponext.com        → Authentication Service
billing.apponext.com     → Billing Service (Internal)
monitor.apponext.com     → Monitoring Dashboard
cdn.apponext.com         → File Delivery CDN
```

### **Multi-Tenant Resolution**

**Organizations identified by:**
```
1. Subdomain: tenant-a.app.apponext.com
2. Domain: customer.com (custom domain)
3. Organization ID in JWT (fallback)
4. API Key header (API requests)
```

### **Service Decomposition**

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                           │
├──────────────────────────────────────────────────────────────┤
│  Super Admin Portal    │    Tenant HRMS Portal               │
│  (admin.apponext.com)  │    (app.apponext.com)               │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│  (Rate Limiting, Auth, Tenant Routing, Module Licensing)    │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    Microservices                             │
├──────────────────────────────────────────────────────────────┤
│ Auth Service   │ Organization  │ Subscription  │ Billing    │
│                │ Service       │ Service       │ Service    │
├──────────────────────────────────────────────────────────────┤
│ HRMS Core      │ Module        │ Monitoring    │ Reporting  │
│ Service        │ Licensing     │ Service       │ Service    │
├──────────────────────────────────────────────────────────────┤
│ Notification   │ File          │ Audit         │ Feature    │
│ Service        │ Service       │ Service       │ Flag       │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
├──────────────────────────────────────────────────────────────┤
│ PostgreSQL Shared DB (Platform + Org Metadata)              │
│ MongoDB Org Data (Or PostgreSQL schemas per org)             │
│ Redis Cache (Sessions, Quotas, Flags)                        │
│ Elasticsearch (Audit logs, Analytics)                        │
│ S3 (File Storage)                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ **DATABASE SCHEMA**

### **Core Platform Tables**

```sql
-- Platform (Super Admin only)
organizations
├── id, name, slug, domain, custom_domain
├── status (active, suspended, trial, archived)
├── plan_id (foreign key to subscription_plans)
├── owner_id, owner_email
├── created_at, expires_at
└── metadata (JSON: branding, settings)

subscription_plans
├── id, name, type (starter, professional, business, enterprise)
├── price_monthly, price_annual
├── max_employees, max_admins, max_branches
├── max_storage_gb, max_api_requests_monthly
├── features (JSON: feature flags included)
└── created_at, updated_at

organization_subscriptions
├── id, organization_id, subscription_plan_id
├── status (active, expired, trial, paused)
├── started_at, expires_at, renews_at
├── auto_renew, payment_method
├── current_cycle_start, current_cycle_end
└── created_at, updated_at

organization_modules
├── id, organization_id, module_name
├── enabled (boolean)
├── license_tier (basic, professional, enterprise)
├── license_expires_at
├── api_quota_monthly, api_quota_used
└── created_at, updated_at

-- Features available for organization
organization_features
├── id, organization_id, feature_flag_id
├── enabled, expires_at
└── created_at, updated_at

-- Org limits (dynamic based on plan)
organization_limits
├── id, organization_id
├── max_employees, current_employees
├── max_storage_gb, used_storage_gb
├── max_api_requests, used_api_requests (monthly)
├── max_branches, current_branches
├── max_departments, current_departments
└── updated_at

-- Billing
organization_billing
├── id, organization_id
├── billing_email, billing_address
├── tax_id, gst_number
├── payment_method (stripe, razorpay, manual)
├── stripe_customer_id, razorpay_customer_id
├── auto_billing (boolean)
└── created_at, updated_at

invoices
├── id, organization_id, subscription_id
├── invoice_number, invoice_date, due_date
├── amount, tax_amount, total_amount
├── status (draft, sent, paid, overdue, cancelled)
├── payment_date, payment_method
├── items (JSON: line items)
└── created_at, updated_at

coupons
├── id, code, discount_type (percentage, fixed)
├── discount_value, max_uses, used_count
├── valid_from, valid_until
├── applicable_plans (JSON array)
└── created_at

-- Platform Users
platform_users
├── id, email, password_hash
├── role (super_admin, platform_admin, support_engineer, billing_manager)
├── status (active, inactive)
├── created_at, last_login
└── 2fa_enabled

-- API Management
organization_api_keys
├── id, organization_id
├── key_hash, secret_hash
├── name, permissions (JSON)
├── rate_limit_per_minute
├── last_used_at, created_at, expires_at
└── status (active, revoked)

organization_integrations
├── id, organization_id, integration_name
├── status (active, inactive)
├── api_key_hash, access_token_hash
├── webhook_url, webhook_secret
├── synced_at, error_message
└── created_at, updated_at

-- Audit
platform_audit_logs
├── id, organization_id, user_id
├── action, resource_type, resource_id
├── changes (JSON: old_value, new_value)
├── ip_address, user_agent
├── status (success, failure)
└── created_at

failed_logins
├── id, email/user_id, reason
├── ip_address, user_agent
├── created_at

-- Feature Flags
feature_flags
├── id, name, description
├── enabled_for_all
├── rollout_percentage
├── targeting_rules (JSON)
├── created_at, updated_at

-- Monitoring
system_health
├── id, metric_name
├── cpu_usage, ram_usage, disk_usage
├── database_connections
├── queue_length, failed_jobs
├── api_response_time, error_rate
├── created_at (timestamp)

api_usage
├── id, organization_id, month_year
├── requests_count, errors_count
├── average_response_time
├── top_endpoints (JSON)
└── created_at

-- Support
support_tickets
├── id, organization_id, created_by_user_id
├── subject, description, priority
├── status (open, in_progress, resolved, closed)
├── assigned_to_user_id
├── created_at, updated_at, resolved_at
└── attachments (JSON)
```

### **Tenant-Specific Tables** (Multi-schema or prefix)

```sql
-- Each org has schema: org_{organization_id}

employees
├── id, organization_id, employee_code
├── first_name, last_name, email
├── department_id, branch_id, designation_id
└── ... (all existing fields)

attendance
├── id, organization_id, employee_id
├── check_in_time, check_out_time, date
├── status (present, absent, half_day, wfh)
└── ...

leaves
├── id, organization_id, employee_id
├── leave_type_id, start_date, end_date
├── status (draft, submitted, approved, rejected)
└── ...

payroll_runs
├── id, organization_id
├── month, year, status
├── total_salary, total_deductions
└── ...

(All other business tables with organization_id prefix)
```

---

## 🔐 **TENANT ISOLATION STRATEGY**

### **Row-Level Security (RLS)**

```sql
-- PostgreSQL RLS Policy Example
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON employees
  USING (organization_id = current_setting('app.current_org_id')::uuid);

CREATE POLICY org_isolation_insert ON employees
  WITH CHECK (organization_id = current_setting('app.current_org_id')::uuid);
```

### **Application-Level Isolation**

```typescript
// Middleware: Set tenant context
app.use((req, res, next) => {
  const orgId = extractOrgIdFromRequest(req);
  
  // Validate org ownership from JWT
  const user = verifyJWT(req.headers.authorization);
  if (user.organization_id !== orgId) {
    throw new ForbiddenError('Tenant mismatch');
  }
  
  // Set context for all queries
  req.tenantId = orgId;
  req.user = user;
  
  next();
});

// Query wrapper: Auto-add organization_id filter
async function query(sql, params, tenantId) {
  // Add WHERE organization_id = tenantId
  // Prevents accidental data leaks
  const safeSql = addTenantFilter(sql, tenantId);
  return db.query(safeSql, [tenantId, ...params]);
}
```

---

## 📋 **MODULE LICENSING SYSTEM**

### **Module Registry**

```typescript
const MODULES = {
  DASHBOARD: 'dashboard',
  EMPLOYEES: 'employees',
  ATTENDANCE: 'attendance',
  LEAVES: 'leaves',
  PAYROLL: 'payroll',
  PERFORMANCE: 'performance',
  RECRUITMENT: 'recruitment',
  ASSETS: 'assets',
  WORKFLOW: 'workflow',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
  SETTINGS: 'settings',
  AI_ASSISTANT: 'ai_assistant',
  VISITOR_MANAGEMENT: 'visitor_management',
  TRAINING: 'training',
  HELPDESK: 'helpdesk',
};

// Each plan defines allowed modules
PLANS.STARTER = {
  modules: [MODULES.DASHBOARD, MODULES.EMPLOYEES, MODULES.ATTENDANCE],
};

PLANS.PROFESSIONAL = {
  modules: [
    MODULES.DASHBOARD,
    MODULES.EMPLOYEES,
    MODULES.ATTENDANCE,
    MODULES.LEAVES,
    MODULES.PAYROLL,
    MODULES.RECRUITMENT,
  ],
};

PLANS.ENTERPRISE = {
  modules: Object.values(MODULES), // All modules
};
```

### **License Check Middleware**

```typescript
// Verify module access before every request
async function checkModuleLicense(module) {
  return async (req, res, next) => {
    const org = await getOrganization(req.tenantId);
    const subscription = await getSubscription(org.subscription_id);
    
    if (!subscription.plan.modules.includes(module)) {
      return res.status(403).json({
        error: 'Module not licensed',
        message: `Module "${module}" not available in your plan`,
      });
    }
    
    next();
  };
}

// Apply to routes
router.get('/employees', checkModuleLicense(MODULES.EMPLOYEES), ...);
router.post('/leaves', checkModuleLicense(MODULES.LEAVES), ...);
```

### **Frontend Module Filtering**

```typescript
// Hook: Get enabled modules for org
async function useEnabledModules() {
  const { data: org } = useQuery('organization', getOrganization);
  const { data: subscription } = useQuery('subscription', getSubscription);
  
  const enabledModules = subscription?.plan?.modules || [];
  
  return {
    isEnabled: (module) => enabledModules.includes(module),
    modules: enabledModules,
  };
}

// Filter sidebar
const SIDEBAR_ITEMS = [
  { id: 'dashboard', module: MODULES.DASHBOARD, ... },
  { id: 'employees', module: MODULES.EMPLOYEES, ... },
  { id: 'leaves', module: MODULES.LEAVES, ... },
];

function Sidebar() {
  const { isEnabled } = useEnabledModules();
  
  return (
    <nav>
      {SIDEBAR_ITEMS.filter(item => isEnabled(item.module)).map(item => (
        <NavItem key={item.id} {...item} />
      ))}
    </nav>
  );
}
```

---

## 💰 **SUBSCRIPTION & BILLING**

### **Subscription Flow**

```
Organization Signup
    ↓
Select Plan
    ↓
Choose Billing (Monthly/Annual)
    ↓
Enter Payment Details (Stripe/Razorpay)
    ↓
Trial Period (14 days) OR Immediate Activation
    ↓
Generate Invoice
    ↓
Auto-renewal 24 hours before expiry
    ↓
Webhook: Payment Success
    ↓
Update subscription status
```

### **Webhook Handlers**

```typescript
// Stripe webhook
POST /webhooks/stripe
- invoice.payment_succeeded → Update subscription
- customer.subscription.updated → Update limits
- customer.subscription.deleted → Suspend organization

// Razorpay webhook
POST /webhooks/razorpay
- payment.authorized → Update subscription
- subscription.halted → Suspend organization
```

---

## 🛡️ **RBAC IMPLEMENTATION**

### **Platform Roles**

```
Super Admin
  ├── Manage organizations
  ├── Manage subscriptions
  ├── View all data
  ├── Impersonate users
  └── System settings

Platform Admin
  ├── Manage organizations (sub-set)
  ├── View analytics
  └── Support tickets

Support Engineer
  ├── View org data (read-only)
  ├── Impersonate users
  ├── View support tickets
  └── Manage tickets

Billing Manager
  ├── View invoices
  ├── Manage subscriptions
  └── View revenue
```

### **Tenant Roles** (Already implemented, enhance)

```
Organization Admin
  ├── Manage all modules
  ├── Manage users
  ├── View billing
  └── View audit logs

HR Manager
  ├── Employee management
  ├── Leave approvals
  ├── Payroll
  └── Recruitment

Manager
  ├── View direct reports
  ├── Leave approvals
  └── Attendance

Employee
  ├── View own data
  ├── Apply leave
  └── View payslips
```

---

## 📊 **SUPER ADMIN DASHBOARD METRICS**

```typescript
interface DashboardMetrics {
  // Organization Metrics
  totalOrganizations: number;
  activeOrganizations: number;
  suspendedOrganizations: number;
  trialOrganizations: number;
  expiredTrials: number;
  
  // Revenue Metrics
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  totalRevenue: number;
  totalRefunds: number;
  averageRevenuePerOrg: number;
  
  // User Metrics
  totalEmployees: number;
  activeUsers: number;
  logins24h: number;
  churn_rate: number; // %
  
  // System Health
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  database_connections: number;
  api_response_time: number;
  error_rate: number;
  
  // Platform Usage
  api_requests_today: number;
  api_requests_month: number;
  storage_used_gb: number;
  queue_jobs_pending: number;
  failed_jobs_today: number;
  
  // Business Metrics
  top_customers: Customer[];
  new_signups_today: number;
  churned_today: number;
  expiring_subscriptions_30d: number;
  
  // Support
  open_support_tickets: number;
  avg_resolution_time: number;
}
```

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: Database & Core Architecture** (Week 1-2)
- [x] Design SaaS database schema
- [ ] Implement row-level security
- [ ] Create organization service
- [ ] Create subscription service

### **Phase 2: Multi-Tenant Isolation** (Week 3-4)
- [ ] Tenant context middleware
- [ ] Tenant routing
- [ ] Data isolation verification
- [ ] Module licensing system

### **Phase 3: Super Admin Portal** (Week 5-8)
- [ ] Dashboard UI
- [ ] Organization management
- [ ] Module licensing UI
- [ ] Subscription management UI
- [ ] Billing dashboard

### **Phase 4: Billing System** (Week 9-10)
- [ ] Stripe integration
- [ ] Razorpay integration
- [ ] Invoice generation
- [ ] Auto-renewal logic
- [ ] Webhook handlers

### **Phase 5: Monitoring & Security** (Week 11-12)
- [ ] System monitoring
- [ ] Audit logging
- [ ] Security alerts
- [ ] Rate limiting

### **Phase 6: Testing & Optimization** (Week 13-16)
- [ ] Security testing
- [ ] Load testing
- [ ] Performance optimization
- [ ] Documentation

---

## ✅ **SUCCESS CRITERIA**

- ✅ Complete data isolation (no cross-tenant leaks)
- ✅ Module licensing working (disabled modules inaccessible)
- ✅ Billing automation (subscriptions, invoices, renewals)
- ✅ Super Admin dashboard fully functional
- ✅ Multi-tenant routing working
- ✅ RBAC enforced at API level
- ✅ 99.9% uptime capability
- ✅ Audit trail for all actions
- ✅ Support impersonation working
- ✅ API rate limiting enforced

---

## 📚 **DOCUMENTATION FILES**

This document is the foundation. Next files will cover:

1. **Database Schema (SQL)**
2. **Backend Implementation Guide**
3. **Super Admin Portal Design**
4. **Security & Compliance**
5. **API Documentation**
6. **Deployment & DevOps**
7. **Testing Strategy**

---

**Status**: Foundation Architecture ✅  
**Next**: Detailed Implementation Plans

