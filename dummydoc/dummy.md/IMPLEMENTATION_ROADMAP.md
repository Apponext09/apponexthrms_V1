# ApponextHRMS SaaS - Implementation Roadmap

**Scope**: Transform single-tenant HRMS into enterprise multi-tenant SaaS platform  
**Duration**: 16 weeks (4 months) for full implementation  
**Team Size**: 6-8 developers recommended  

---

## 📋 **PHASE 1: DATABASE & INFRASTRUCTURE (Weeks 1-2)**

### Week 1: Database Migration

**Tasks**:
1. **Backup existing database** ✅
   - Export current schema and data
   - Create recovery plan

2. **Create new SaaS schema** ✅
   - Run DATABASE_SCHEMA.sql
   - Create indexes
   - Set up Row-Level Security (RLS) policies

3. **Data migration strategy**
   - Existing single organization → Organization A
   - Create default subscription_plan
   - Map existing users to platform_users table
   - Migrate all business data with organization_id

4. **Database hardening**
   - Enable SSL for connections
   - Set up automated backups (daily)
   - Create read replicas for analytics
   - Set up monitoring/alerts

### Week 2: Infrastructure Setup

**Tasks**:
1. **Docker containerization**
   ```dockerfile
   # Separate containers for:
   - api-gateway (Kong or custom)
   - auth-service
   - hrms-service
   - billing-service
   - monitoring-service
   - worker-service (background jobs)
   ```

2. **Redis setup**
   - Session storage
   - Rate limiting
   - Feature flags cache
   - API quota tracking

3. **Elasticsearch setup**
   - Audit logs indexing
   - Full-text search
   - Analytics

4. **Message queue setup**
   - RabbitMQ or Redis Streams
   - Email queue
   - SMS queue
   - WhatsApp queue

5. **CDN setup**
   - CloudFront or Cloudflare
   - File delivery optimization

---

## 🔐 **PHASE 2: MULTI-TENANT ISOLATION (Weeks 3-4)**

### Week 3: Core Tenant Isolation

**Middleware Development**:

```typescript
// 1. Tenant Context Extraction Middleware
// File: server/src/middleware/tenantContext.ts

export async function resolveTenantContext(req, res, next) {
  // Extract tenant ID from:
  // 1. JWT claims (organization_id)
  // 2. Subdomain (tenant.app.apponext.com)
  // 3. Custom domain
  // 4. API key header
  
  const tenantId = extractTenantId(req);
  
  // Verify organization exists and active
  const org = await Organization.findById(tenantId);
  if (!org || org.status === 'suspended') {
    return res.status(403).json({ error: 'Organization not found or suspended' });
  }
  
  // Set context for all queries
  req.tenantId = tenantId;
  req.organization = org;
  req.user.tenantId = tenantId;
  
  next();
}

// 2. Verify Module License Middleware
export async function verifyModuleLicense(moduleName) {
  return async (req, res, next) => {
    const org = req.organization;
    const subscription = await getOrgSubscription(org.id);
    
    if (!subscription.plan.modules.includes(moduleName)) {
      return res.status(403).json({
        error: 'Module not licensed',
        module: moduleName
      });
    }
    
    // Check API quota
    const usage = await getOrgApiUsage(org.id, new Date());
    const plan = subscription.plan;
    
    if (usage.requests >= plan.max_api_requests_monthly) {
      return res.status(429).json({ error: 'API quota exceeded' });
    }
    
    next();
  };
}

// 3. Rate Limiter Middleware
export async function rateLimiter(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  const orgId = req.tenantId;
  
  const key = apiKey ? `api_key:${apiKey}` : `org:${orgId}`;
  const limit = apiKey ? 10000 : 1000; // requests/hour
  
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 3600);
  }
  
  if (current > limit) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', limit - current);
  
  next();
}
```

**Database Isolation**:

```typescript
// 1. Query Wrapper with Auto-Tenant Filtering
export class TenantAwareRepository {
  async query(sql, params, tenantId) {
    // Automatically add organization_id filter
    if (!sql.includes('organization_id')) {
      sql = `${sql.replace(';', '')} WHERE organization_id = $${params.length + 1};`;
      params.push(tenantId);
    }
    
    return db.query(sql, params);
  }
  
  async findEmployees(tenantId, filters = {}) {
    // Always scoped to tenant
    return this.query(
      'SELECT * FROM employees WHERE created_at > $1',
      [filters.since],
      tenantId
    );
  }
}

// 2. Row-Level Security Example (PostgreSQL)
export async function setupRLS() {
  await db.query(`
    ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY org_isolation ON employees
    USING (organization_id = current_setting('app.current_org_id')::uuid);
    
    CREATE POLICY org_insert ON employees
    WITH CHECK (organization_id = current_setting('app.current_org_id')::uuid);
  `);
}
```

### Week 4: Tenant Routing & Verification

**Tenant Routing Implementation**:

```typescript
// 1. Subdomain Router
export function subdomainRouter() {
  return (req, res, next) => {
    const host = req.get('host');
    const match = host.match(/^([a-zA-Z0-9-]+)\.app\.apponext\.com$/);
    
    if (match) {
      const slug = match[1];
      // Load org from slug
      req.params.tenantSlug = slug;
    }
    
    next();
  };
}

// 2. Custom Domain Router
export async function customDomainRouter() {
  return async (req, res, next) => {
    const host = req.get('host');
    
    const domain = await OrganizationDomain.findOne({ domain: host });
    if (domain) {
      req.params.tenantId = domain.organization_id;
    }
    
    next();
  };
}

// 3. API Key Router
export async function apiKeyRouter(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey) {
    const key = await OrganizationApiKey.findByHash(apiKey);
    if (!key) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    req.tenantId = key.organization_id;
    req.apiKey = key;
  }
  
  next();
}
```

**Testing & Verification**:

```typescript
// Test 1: Verify data isolation
describe('Tenant Isolation', () => {
  it('Should not return data from other tenants', async () => {
    const org1 = await createOrg('org1');
    const org2 = await createOrg('org2');
    
    await Employee.create({ organization_id: org1.id, name: 'Alice' });
    await Employee.create({ organization_id: org2.id, name: 'Bob' });
    
    const result = await queryAs(org1, 'SELECT * FROM employees');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });
  
  it('Should prevent cross-tenant SQL injection', async () => {
    const org1 = await createOrg('org1');
    
    const injection = "'; DROP TABLE employees; --";
    const result = await queryAs(org1, `SELECT * FROM employees WHERE name = '${injection}'`);
    
    expect(result).toBeDefined(); // Should not crash
    const count = await db.query('SELECT COUNT(*) FROM employees');
    expect(count).toBeGreaterThan(0); // Table should still exist
  });
});
```

---

## 💰 **PHASE 3: SUBSCRIPTION & BILLING (Weeks 5-7)**

### Week 5: Subscription Management

**Backend Implementation**:

```typescript
// File: server/src/services/SubscriptionService.ts

export class SubscriptionService {
  
  // Create new subscription
  async createSubscription(organizationId, planId, billingCycle = 'monthly') {
    const plan = await SubscriptionPlan.findById(planId);
    const org = await Organization.findById(organizationId);
    
    // Create subscription
    const subscription = await OrganizationSubscription.create({
      organization_id: organizationId,
      subscription_plan_id: planId,
      status: 'trial',
      subscription_type: billingCycle,
      trial_started_at: new Date(),
      trial_ends_at: addDays(new Date(), plan.trial_days),
    });
    
    // Initialize module access
    for (const module of plan.features) {
      await OrganizationModule.create({
        organization_id: organizationId,
        module_name: module,
        enabled: true,
      });
    }
    
    // Set limits
    await OrganizationLimits.create({
      organization_id: organizationId,
      max_employees: plan.max_employees,
      max_storage_gb: plan.max_storage_gb,
      max_api_requests: plan.max_api_requests_monthly,
    });
    
    return subscription;
  }
  
  // Activate paid subscription
  async activateSubscription(subscriptionId, paymentMethod, transactionId) {
    const subscription = await OrganizationSubscription.findById(subscriptionId);
    
    // Create invoice
    const invoice = await this.createInvoice(subscription);
    
    // Process payment
    const payment = await this.processPayment({
      amount: this.calculatePrice(subscription),
      method: paymentMethod,
      organizationId: subscription.organization_id,
      invoiceId: invoice.id,
    });
    
    if (!payment.success) {
      throw new PaymentError('Payment failed');
    }
    
    // Update subscription
    await subscription.update({
      status: 'active',
      started_at: new Date(),
      expires_at: this.calculateExpiry(subscription),
      payment_method: paymentMethod,
      stripe_subscription_id: payment.stripeId,
      renews_at: this.calculateRenewalDate(subscription),
    });
    
    // Log event
    await this.logEvent('subscription_activated', subscription);
    
    // Send confirmation email
    await this.sendConfirmationEmail(subscription);
    
    return subscription;
  }
  
  // Auto-renew subscription before expiry
  async autoRenewSubscription(subscriptionId) {
    const subscription = await OrganizationSubscription.findById(subscriptionId);
    
    if (!subscription.auto_renew || subscription.status !== 'active') {
      return;
    }
    
    // Create renewal invoice
    const invoice = await this.createInvoice(subscription, 'renewal');
    
    // Process payment via Stripe/Razorpay
    const payment = await this.processAutomaticPayment(subscription);
    
    if (payment.success) {
      await subscription.update({
        expires_at: addMonths(subscription.expires_at, 
          subscription.subscription_type === 'monthly' ? 1 : 12),
        current_cycle_start: subscription.current_cycle_end,
        current_cycle_end: calculateNextCycleEnd(subscription),
      });
      
      await this.sendRenewalConfirmation(subscription);
    } else {
      // Mark as failed
      await invoice.update({ status: 'payment_failed' });
      await this.sendPaymentFailedNotice(subscription);
    }
  }
  
  // Handle payment webhooks
  async handlePaymentWebhook(provider, event) {
    if (provider === 'stripe') {
      return this.handleStripeWebhook(event);
    } else if (provider === 'razorpay') {
      return this.handleRazorpayWebhook(event);
    }
  }
  
  private async handleStripeWebhook(event) {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailure(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object);
        break;
    }
  }
}
```

### Week 6: Billing & Invoicing

**Invoice Generation**:

```typescript
// File: server/src/services/InvoiceService.ts

export class InvoiceService {
  
  async createInvoice(subscription, type = 'initial') {
    const org = await Organization.findById(subscription.organization_id);
    const plan = await SubscriptionPlan.findById(subscription.subscription_plan_id);
    const billing = await OrganizationBilling.findByOrgId(org.id);
    
    // Calculate amounts
    const planPrice = subscription.subscription_type === 'monthly' 
      ? plan.price_monthly 
      : plan.price_annual / 12;
    
    const subtotal = planPrice;
    const taxAmount = this.calculateTax(subtotal, billing.country, billing.gst_number);
    const total = subtotal + taxAmount;
    
    // Create invoice
    const invoice = await Invoice.create({
      organization_id: org.id,
      subscription_id: subscription.id,
      
      invoice_number: await this.generateInvoiceNumber(org),
      invoice_date: new Date(),
      due_date: addDays(new Date(), 30),
      
      amount: subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      currency: 'USD',
      
      status: 'draft',
      items: [{
        description: `${plan.name} Plan - ${subscription.subscription_type}`,
        quantity: 1,
        rate: planPrice,
        amount: planPrice,
        hsn_code: '998394', // IT Services
      }],
    });
    
    return invoice;
  }
  
  async generateInvoiceNumber(org) {
    const count = await Invoice.countByOrg(org.id);
    const date = new Date();
    return `INV-${date.getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  
  async sendInvoice(invoiceId) {
    const invoice = await Invoice.findById(invoiceId);
    const org = await Organization.findById(invoice.organization_id);
    const billing = await OrganizationBilling.findByOrgId(org.id);
    
    // Generate PDF
    const pdf = await this.generateInvoicePDF(invoice);
    
    // Send email
    await EmailService.send({
      to: billing.billing_email,
      subject: `Invoice ${invoice.invoice_number}`,
      template: 'invoice',
      data: { invoice, org },
      attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: pdf }],
    });
    
    await invoice.update({ status: 'sent', sent_at: new Date() });
  }
  
  private calculateTax(amount, country, gstNumber) {
    // India: 18% GST
    if (country === 'IN' && gstNumber) {
      return amount * 0.18;
    }
    
    // EU: 21% VAT (example)
    if (country.startsWith('EU')) {
      return amount * 0.21;
    }
    
    // US: No federal tax (state-specific)
    return 0;
  }
}
```

### Week 7: Payment Integration (Stripe + Razorpay)

```typescript
// File: server/src/services/PaymentService.ts

export class PaymentService {
  
  async processPayment(order) {
    const { amount, currency, method, organizationId } = order;
    const org = await Organization.findById(organizationId);
    const billing = await OrganizationBilling.findByOrgId(organizationId);
    
    if (method === 'stripe') {
      return this.processStripePayment(order, billing);
    } else if (method === 'razorpay') {
      return this.processRazorpayPayment(order, billing);
    }
  }
  
  private async processStripePayment(order, billing) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Get or create Stripe customer
    let customerId = billing.stripe_customer_id;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: billing.billing_email,
        address: {
          line1: billing.billing_address,
          city: billing.billing_city,
          state: billing.billing_state,
          postal_code: billing.billing_zip,
          country: billing.billing_country,
        },
      });
      
      customerId = customer.id;
      await billing.update({ stripe_customer_id: customerId });
    }
    
    // Create payment intent
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(order.amount * 100), // Convert to cents
      currency: order.currency.toLowerCase(),
      customer: customerId,
      metadata: {
        organizationId: order.organizationId,
        invoiceId: order.invoiceId,
      },
    });
    
    return {
      success: true,
      stripeId: intent.id,
      clientSecret: intent.client_secret,
    };
  }
  
  private async processRazorpayPayment(order, billing) {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    
    const paymentLink = await razorpay.paymentLink.create({
      amount: Math.round(order.amount * 100), // Convert to paise
      currency: order.currency,
      accept_partial: false,
      customer: {
        email: billing.billing_email,
        contact: billing.phone,
      },
      notify: {
        sms: true,
        email: true,
      },
      reminder_enable: true,
      notes: {
        organizationId: order.organizationId,
        invoiceId: order.invoiceId,
      },
      callback_url: `${process.env.API_BASE_URL}/payments/razorpay/callback`,
      callback_method: 'get',
    });
    
    return {
      success: true,
      razorpayId: paymentLink.id,
      shortUrl: paymentLink.short_url,
    };
  }
}
```

---

## 🎛️ **PHASE 4: SUPER ADMIN PORTAL (Weeks 8-10)**

### Architecture

```
super-admin-portal/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   │   ├── MetricsCard.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   ├── GrowthChart.tsx
│   │   │   └── SystemHealth.tsx
│   │   ├── Organizations/
│   │   │   ├── OrganizationList.tsx
│   │   │   ├── OrganizationForm.tsx
│   │   │   ├── OrganizationDetail.tsx
│   │   │   └── ModuleLicensing.tsx
│   │   ├── Subscriptions/
│   │   │   ├── SubscriptionManagement.tsx
│   │   │   ├── PlanEditor.tsx
│   │   │   └── BillingDashboard.tsx
│   │   ├── Users/
│   │   │   ├── UserManagement.tsx
│   │   │   ├── PlatformRoles.tsx
│   │   │   └── ImpersonationPanel.tsx
│   │   └── Settings/
│   │       ├── SystemSettings.tsx
│   │       ├── EmailConfig.tsx
│   │       └── IntegrationSettings.tsx
│   ├── pages/
│   └── services/
```

### Week 8: Dashboard Development

```typescript
// File: super-admin-portal/src/pages/Dashboard.tsx

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  
  useEffect(() => {
    fetchDashboardMetrics();
  }, []);
  
  return (
    <div className="dashboard">
      {/* Key Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Organizations"
          value={metrics?.totalOrganizations}
          trend={metrics?.trend}
        />
        <MetricCard
          title="MRR"
          value={`$${metrics?.mrr?.toLocaleString()}`}
          change={metrics?.mrrChange}
        />
        <MetricCard
          title="Active Users"
          value={metrics?.activeUsers}
        />
        <MetricCard
          title="Churn Rate"
          value={`${metrics?.churnRate}%`}
        />
      </div>
      
      {/* Charts */}
      <div className="charts">
        <RevenueChart data={metrics?.revenueHistory} />
        <GrowthChart data={metrics?.growthMetrics} />
      </div>
      
      {/* System Health */}
      <SystemHealth status={metrics?.systemHealth} />
      
      {/* Recent Activity */}
      <RecentActivity logs={metrics?.recentLogs} />
    </div>
  );
}
```

### Week 9: Organization Management

```typescript
// File: super-admin-portal/src/components/Organizations/OrganizationForm.tsx

export function OrganizationForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    custom_domain: '',
    subscription_plan_id: null,
    owner_email: '',
    max_employees: 100,
    // ... other fields
  });
  
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const plans = useQuery('plans', fetchPlans);
  const availableModules = useQuery('modules', fetchAvailableModules);
  
  const handleModuleToggle = (module: string) => {
    setSelectedModules(prev =>
      prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Create organization
    const org = await apiClient.post('/organizations', {
      ...formData,
      enabled_modules: selectedModules,
    });
    
    // Create subscription
    await apiClient.post('/subscriptions', {
      organization_id: org.id,
      subscription_plan_id: formData.subscription_plan_id,
    });
    
    onSubmit(org);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        placeholder="Organization name"
        value={formData.name}
        onChange={e => setFormData({...formData, name: e.target.value})}
      />
      
      {/* Module Selection */}
      <div className="module-selection">
        <h3>Enable Modules</h3>
        {availableModules.data?.map(module => (
          <label key={module.id}>
            <input
              type="checkbox"
              checked={selectedModules.includes(module.id)}
              onChange={() => handleModuleToggle(module.id)}
            />
            {module.name}
          </label>
        ))}
      </div>
      
      <button type="submit">Create Organization</button>
    </form>
  );
}
```

### Week 10: Subscription & Billing Management

```typescript
// File: super-admin-portal/src/pages/Billing.tsx

export default function BillingDashboard() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  
  return (
    <div className="billing-dashboard">
      {/* Org selector */}
      <OrganizationSelector
        organizations={organizations}
        onSelect={setSelectedOrg}
      />
      
      {selectedOrg && (
        <>
          {/* Subscription Details */}
          <SubscriptionDetails org={selectedOrg} />
          
          {/* Recent Invoices */}
          <InvoiceList org={selectedOrg} />
          
          {/* Payment History */}
          <PaymentHistory org={selectedOrg} />
          
          {/* Actions */}
          <div className="actions">
            <button onClick={() => handleUpgradeDowngrade(selectedOrg)}>
              Change Plan
            </button>
            <button onClick={() => handleManualInvoice(selectedOrg)}>
              Generate Invoice
            </button>
            <button onClick={() => handleRefund(selectedOrg)}>
              Process Refund
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 📊 **PHASE 5: MONITORING & OBSERVABILITY (Weeks 11-12)**

### System Monitoring Service

```typescript
// File: server/src/services/MonitoringService.ts

export class MonitoringService {
  
  async collectMetrics() {
    const [
      cpuUsage,
      memoryUsage,
      diskUsage,
      dbConnections,
      apiStats,
      queueStats,
    ] = await Promise.all([
      this.getCPUUsage(),
      this.getMemoryUsage(),
      this.getDiskUsage(),
      this.getDBConnections(),
      this.getAPIStats(),
      this.getQueueStats(),
    ]);
    
    const health = {
      timestamp: new Date(),
      cpu: cpuUsage,
      memory: memoryUsage,
      disk: diskUsage,
      database: dbConnections,
      api: apiStats,
      queue: queueStats,
      status: this.calculateHealthStatus(cpuUsage, memoryUsage, diskUsage),
    };
    
    // Store metrics
    await SystemHealth.create(health);
    
    // Check thresholds and alert
    this.checkAlerts(health);
    
    return health;
  }
  
  private calculateHealthStatus(cpu: number, memory: number, disk: number) {
    if (cpu > 80 || memory > 85 || disk > 90) return 'critical';
    if (cpu > 60 || memory > 75 || disk > 80) return 'warning';
    return 'healthy';
  }
  
  private async checkAlerts(health: any) {
    if (health.status === 'critical') {
      await AlertService.sendAlert({
        level: 'critical',
        title: 'System Health Critical',
        message: `CPU: ${health.cpu}%, Memory: ${health.memory}%, Disk: ${health.disk}%`,
      });
    }
  }
}
```

---

## ✅ **PHASE 6: TESTING & DEPLOYMENT (Weeks 13-16)**

### Test Strategy

```typescript
// tests/e2e/tenant-isolation.test.ts

describe('Tenant Isolation', () => {
  
  it('Should isolate data between tenants', async () => {
    const org1 = await createOrganization('Org 1');
    const org2 = await createOrganization('Org 2');
    
    const emp1 = await createEmployee(org1.id, { name: 'Alice' });
    const emp2 = await createEmployee(org2.id, { name: 'Bob' });
    
    const org1Employees = await getEmployees(org1.id);
    expect(org1Employees).toHaveLength(1);
    expect(org1Employees[0].name).toBe('Alice');
  });
  
  it('Should prevent cross-tenant data access', async () => {
    const org1 = await createOrganization('Org 1');
    const org2 = await createOrganization('Org 2');
    
    const org2Token = await generateToken(org2.id);
    
    // Try to access org1 data with org2 token
    const response = await request(api)
      .get(`/employees?organization_id=${org1.id}`)
      .set('Authorization', `Bearer ${org2Token}`);
    
    expect(response.status).toBe(403);
  });
});

// tests/e2e/subscription.test.ts

describe('Subscription Lifecycle', () => {
  
  it('Should auto-renew subscription', async () => {
    const org = await createOrganization('Test Org');
    const subscription = await createSubscription(org.id, 'monthly');
    
    // Move time to 1 day before expiry
    await fastForward(subscription.expires_at - 1.days());
    
    // Trigger renewal
    await SubscriptionService.processRenewals();
    
    const updated = await getSubscription(subscription.id);
    expect(updated.status).toBe('active');
    expect(updated.expires_at).toBeGreaterThan(subscription.expires_at);
  });
  
  it('Should create invoice on renewal', async () => {
    // ... test invoice creation
  });
  
  it('Should handle payment failures', async () => {
    // ... test payment retry logic
  });
});

// tests/e2e/module-licensing.test.ts

describe('Module Licensing', () => {
  
  it('Should block access to unlicensed modules', async () => {
    const org = await createOrganization('Starter Org');
    const starterPlan = await getPlan('starter');
    
    await createSubscription(org.id, starterPlan.id);
    
    const token = await generateToken(org.id);
    
    // Try to access recruitment (not in starter)
    const response = await request(api)
      .get('/recruitment/jobs')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('not licensed');
  });
  
  it('Should allow access to licensed modules', async () => {
    const org = await createOrganization('Professional Org');
    const proPlan = await getPlan('professional');
    
    await createSubscription(org.id, proPlan.id);
    
    const token = await generateToken(org.id);
    
    const response = await request(api)
      .get('/recruitment/jobs')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response.status).toBe(200);
  });
});
```

---

## 📈 **DEPLOYMENT CHECKLIST**

### Pre-Deployment

- [ ] All tests passing
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] DNS records updated
- [ ] CDN configured
- [ ] Backups tested
- [ ] Monitoring alerts set up
- [ ] Support process documented

### Deployment

- [ ] Blue-green deployment
- [ ] Database schema migration
- [ ] Run data integrity checks
- [ ] Smoke tests
- [ ] Monitor error logs
- [ ] Check API response times
- [ ] Verify payment processing

### Post-Deployment

- [ ] Monitor dashboards 24/7 first week
- [ ] Customer communications
- [ ] Documentation updates
- [ ] Team training
- [ ] Support escalation process

---

## 📊 **SUCCESS METRICS**

- ✅ 0 data leaks between tenants
- ✅ Module licensing enforced on 100% of APIs
- ✅ Payment success rate > 95%
- ✅ Platform uptime > 99.9%
- ✅ API response time < 200ms (p95)
- ✅ Support ticket resolution < 4 hours

---

**Timeline**: 16 weeks (4 months) for production-grade SaaS platform  
**Status**: Ready for implementation ✅

