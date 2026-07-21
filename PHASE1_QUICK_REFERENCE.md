# Phase 1: Quick Reference Guide
## Marketplace + Licensing Engine (6 Weeks)

**Print this. Put it on your desk. Refer to it daily.**

---

## 🎯 **THE MISSION**

Build a SaaS marketplace and feature-level licensing engine for ApponextHRMS.

**Why?** Organizations will pay 4-12x more for customizable features + marketplace addons.

**Success?** Week 6: Marketplace MVP shipping to production.

---

## 📊 **BY THE NUMBERS**

| Metric | Value |
|--------|-------|
| Timeline | 6 weeks (42 days) |
| Team | 3 engineers |
| Lines of Code | ~3,000 (backend + frontend) |
| Database Tables | 6 new tables |
| API Endpoints | 12+ new endpoints |
| Components | 8+ new React components |
| Test Coverage Target | 95%+ |
| License Check Latency | <50ms |
| Deployment | Week 6 to production |

---

## 👥 **TEAM ROLES**

### **Backend Lead** (40 hrs/week)
- Marketplace service (subscribe, manage subscriptions)
- Licensing service (enable/disable features)
- API routes & controllers
- Database optimization
- **Owner of**: Marketplace + licensing core logic

### **Frontend Engineer** (40 hrs/week)
- Addon marketplace UI
- Subscription management UI
- License status display
- Admin controls for features
- **Owner of**: All marketplace UI components

### **DevOps Engineer** (25 hrs/week)
- Database migrations & backups
- CI/CD pipeline updates
- Performance monitoring
- Production deployment
- **Owner of**: Infrastructure & deployment

---

## 📅 **6-WEEK SPRINT BREAKDOWN**

### **Week 1: Foundation**
```
✅ Module structure created
✅ Database schemas ready
✅ API skeleton built
✅ React components scaffolded
Goal: Infrastructure ready
```

### **Week 2: Marketplace MVP**
```
✅ Subscribe to addons (working)
✅ Trial system (working)
✅ Billing integration (started)
Goal: End-to-end marketplace flow
```

### **Week 3: Licensing Engine**
```
✅ Feature licensing (working)
✅ Enable/disable features (working)
✅ License checks <50ms (verified)
Goal: Feature-level control complete
```

### **Week 4: Integration**
```
✅ Connect to all 15 modules
✅ Cross-org isolation verified
✅ Performance targets met
Goal: System integrated & tested
```

### **Week 5: Security**
```
✅ Security audit (passed)
✅ Test coverage (95%+)
✅ Production-ready quality
Goal: Battle-hardened & secure
```

### **Week 6: Launch**
```
✅ Deploy to production
✅ Team trained
✅ Documentation complete
Goal: Live & working
```

---

## 🏗️ **DATABASE SCHEMA (6 Tables)**

```sql
marketplace_addons
├── id, key, name, description
├── pricing_model, base_price, currency
├── trial_days, trial_enabled
├── features (JSON array)
├── status (active/beta/deprecated)

organization_addon_subscriptions
├── id, organization_id, addon_id
├── subscription_status (trial/active/suspended/cancelled)
├── billing_cycle (monthly/yearly)
├── prices, dates
├── enabled_features (JSON object: {feature_key: true/false})

organization_module_features
├── id, organization_id, module_key, feature_key
├── enabled (boolean)
├── usage tracking & limits

addon_billing_history
├── invoice tracking, payment status
├── stripe_charge_id, razorpay_payment_id

addon_trials
├── trial start/end dates
├── trial status & conversion

feature_access_logs
├── Audit log of all feature access attempts
├── Tracks granted/denied access
```

---

## 🔧 **API ENDPOINTS (Phase 1)**

### **Public (No Auth Required)**
```
GET  /marketplace/addons              → Get all addons
GET  /marketplace/addons/:id          → Get addon details
```

### **Protected (Org Required)**
```
GET    /marketplace/subscriptions     → Get org's subscriptions
POST   /marketplace/subscribe         → Subscribe to addon
PATCH  /marketplace/subscriptions/:id → Upgrade/downgrade
DELETE /marketplace/subscriptions/:id → Cancel subscription
GET    /marketplace/billing-history   → Get invoices
GET    /marketplace/trials            → Get org's trials
POST   /marketplace/trials/:id/convert → Convert trial to paid
```

---

## 📁 **FILE STRUCTURE**

```
Backend:
server/src/modules/
├── marketplace/
│   ├── marketplace.service.ts        (Subscribe, manage addons)
│   ├── marketplace.controller.ts     (API handlers)
│   ├── marketplace.repository.ts     (Database queries)
│   ├── marketplace.routes.ts         (Route definitions)
│   ├── marketplace.types.ts          (TypeScript interfaces)
│   └── tests/
│       └── marketplace.service.test.ts
├── licensing/
│   ├── licensing.service.ts          (Feature licensing)
│   ├── licensing.repository.ts       (Database queries)
│   ├── licensing.controller.ts       (API handlers)
│   ├── licensing.types.ts            (TypeScript interfaces)
│   └── tests/
│       └── licensing.service.test.ts
└── common/middleware/
    └── licenseCheck.middleware.ts    (403 on unauthorized)

Frontend:
client/src/features/marketplace/
├── context/
│   └── AddonContext.tsx              (React context for addons)
├── pages/
│   ├── MarketplacePage.tsx           (Addon listing)
│   └── SubscriptionsPage.tsx         (Manage subscriptions)
├── components/
│   ├── AddonCard.tsx                 (Individual addon)
│   ├── AddonDetails.tsx              (Detailed view)
│   ├── SubscriptionManager.tsx       (Manage subscriptions)
│   └── BillingHistory.tsx            (Invoices)
└── hooks/
    └── useAddons.ts                  (Custom hook)
```

---

## 💻 **CODE YOU'LL WRITE**

### **Backend Service (TypeScript)**
```typescript
// Marketplace Service
class MarketplaceService {
  async getAvailableAddons() { }
  async subscribeToAddon(ctx, input) { }
  async updateSubscription(ctx, id, input) { }
  async cancelSubscription(ctx, id) { }
  async getOrgSubscriptions(ctx) { }
}

// Licensing Service
class LicensingService {
  async hasFeatureAccess(ctx, moduleKey, featureKey) { }
  async setFeatureAccess(ctx, moduleKey, featureKey, enabled) { }
  async trackFeatureAccess(ctx, moduleKey, featureKey, granted) { }
  async getOrgFeatures(ctx) { }
}

// Middleware
export const licenseCheck = (options) => {
  return async (req, res, next) => {
    const hasAccess = await licensingService.hasFeatureAccess(...)
    if (!hasAccess) return res.status(403).json({error: "Not licensed"})
    next()
  }
}
```

### **Frontend Component (React)**
```typescript
// AddonContext
export const AddonProvider: React.FC = ({ children }) => {
  const addons = useQuery(...)      // Fetch addons
  const subscriptions = useQuery(...) // Fetch subscriptions
  const isSubscribed = (key) => {...}
  const hasFeature = (key, feature) => {...}
  return <AddonContext.Provider value={...}>{children}</AddonContext.Provider>
}

// MarketplacePage
export const MarketplacePage: React.FC = () => {
  const { addons, isSubscribed } = useAddons()
  return (
    <div>
      {addons.map(addon => (
        <AddonCard key={addon.id} addon={addon} isSubscribed={isSubscribed(addon.key)} />
      ))}
    </div>
  )
}

// AddonCard
export const AddonCard: React.FC<{addon, isSubscribed}> = ({addon, isSubscribed}) => {
  const subscribeMutation = useMutation(...)
  return (
    <div>
      <h3>{addon.name}</h3>
      <p>${addon.base_price}/month</p>
      {!isSubscribed && <Button onClick={() => subscribeMutation.mutate(...)}>Subscribe</Button>}
    </div>
  )
}
```

---

## ✅ **DAILY CHECKLIST**

Every morning, check:

- [ ] Read yesterday's standup notes
- [ ] Know your sprint task for today
- [ ] Code compiles locally
- [ ] Tests pass locally
- [ ] No merge conflicts
- [ ] Slack channel read (any urgent messages?)

Every evening:

- [ ] Commit & push code
- [ ] Document blockers in Slack
- [ ] Update Jira ticket status
- [ ] Tests passing on CI/CD

---

## 🚨 **BLOCKERS = ESCALATE IMMEDIATELY**

**Don't wait, don't work around, escalate now**:
- Database migration fails
- API design conflict
- Performance issue (>50ms)
- Test failures you can't fix
- Unclear requirements
- Cross-team dependency blocked
- Security vulnerability

**How to escalate**: Post in #phase1-marketplace channel with tag `@backend-lead` or `@tech-lead`

---

## 📊 **SUCCESS METRICS**

### **Week 1**
- [ ] Code compiles
- [ ] Tests passing
- [ ] Database ready

### **Week 2**
- [ ] Subscribe flow works
- [ ] Trial system works
- [ ] Staging deployment done

### **Week 3**
- [ ] License checks <50ms
- [ ] Features can be toggled
- [ ] No data leaks

### **Week 4**
- [ ] Integrated with all modules
- [ ] Performance tests pass
- [ ] 90%+ test coverage

### **Week 5**
- [ ] Security audit clean
- [ ] 95%+ test coverage
- [ ] Production-ready code

### **Week 6**
- [ ] Deployed to production
- [ ] Zero critical bugs
- [ ] Team trained

---

## 🎓 **TECH YOU NEED TO KNOW**

### **Backend**
- Express.js routing patterns
- TypeScript interfaces & types
- MySQL queries & optimization
- Redis caching (Week 3)
- JWT authentication (already used)

### **Frontend**
- React Hooks (useState, useContext, useQuery)
- React Query (data fetching)
- TailwindCSS (styling)
- Radix UI (components - already used)
- React Router (navigation - already used)

### **DevOps**
- MySQL migrations
- CI/CD pipelines (GitHub Actions)
- Docker basics
- Load testing tools
- Monitoring & alerting

---

## 📚 **REFERENCE DOCUMENTS**

Keep these open:

1. **`PHASE1_DETAILED_IMPLEMENTATION.md`**
   - Complete code examples
   - Database schemas
   - Component architecture

2. **`PHASE1_KICKOFF_PLAN.md`**
   - Week-by-week tasks
   - Success criteria
   - Risk items

3. **Database Schema** (printed)
   - 6 tables
   - Relationships
   - Indexes

---

## 🎯 **WIN CONDITIONS**

### **Week 6 Finale**

✅ **Feature Complete**
- Marketplace addon store works
- Subscriptions (trial, paid, cancel) work
- Feature licensing enforced
- <50ms license checks

✅ **Quality Gates Passed**
- 95%+ test coverage
- Security audit clean
- Performance targets met
- 0 cross-org data leaks

✅ **Production Ready**
- Deployed to live servers
- Monitoring alerts working
- Team trained
- Support docs ready

✅ **Next Phase Ready**
- Codebase clean
- Architecture sound
- Lessons documented
- Phase 2 sprint planned

---

## 💪 **YOU'VE GOT THIS**

This is ambitious, but achievable.

**Key to success**:
1. Communication (daily standups)
2. Quality (test everything)
3. Speed (don't overthink, ship)
4. Teamwork (help each other)
5. Focus (no scope creep)

**6 weeks. 3 engineers. 1 marketplace.**

Let's build something great. 🚀

---

**Phase 1 Kickoff**: July 19, 2026 (TODAY)  
**Phase 1 Complete**: August 30, 2026  
**Target**: Production deployment + ready for Phase 2

