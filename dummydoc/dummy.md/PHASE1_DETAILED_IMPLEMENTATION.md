# Phase 1: Foundation Implementation (Weeks 1-6)
## SaaS Marketplace + Module Licensing Engine

**Objective**: Build the core marketplace and feature-level licensing system

**Timeline**: 6 weeks  
**Team**: 3 engineers (1 backend lead, 1 frontend, 1 database/DevOps)  
**Deliverable**: Ability to sell addons with granular feature control

---

## 📋 **WEEK 1-2: Database & API Design**

### **Database Schema Additions**

#### 1. **Marketplace Addons Table**

```sql
CREATE TABLE IF NOT EXISTS marketplace_addons (
  id CHAR(36) PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description LONGTEXT,
  category VARCHAR(50),
  icon_url VARCHAR(500),
  
  pricing_model ENUM('fixed', 'usage-based', 'hybrid'),
  base_price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  
  trial_days INT DEFAULT 14,
  trial_enabled BOOLEAN DEFAULT TRUE,
  
  features LONGTEXT, -- JSON array of features included
  max_users_allowed INT,
  max_api_calls INT,
  
  status ENUM('active', 'beta', 'deprecated', 'archived') DEFAULT 'active',
  published_at TIMESTAMP NULL,
  deprecated_at TIMESTAMP NULL,
  
  support_url VARCHAR(500),
  documentation_url VARCHAR(500),
  changelog_url VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  INDEX idx_key (key),
  INDEX idx_category (category),
  INDEX idx_status (status)
);
```

#### 2. **Organization Addon Subscriptions**

```sql
CREATE TABLE IF NOT EXISTS organization_addon_subscriptions (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  addon_id CHAR(36) NOT NULL,
  
  subscription_status ENUM('trial', 'active', 'suspended', 'cancelled') DEFAULT 'trial',
  
  -- Billing
  billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
  monthly_price DECIMAL(10, 2),
  yearly_price DECIMAL(10, 2),
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  
  -- Trial
  trial_started_at TIMESTAMP NULL,
  trial_ends_at TIMESTAMP NULL,
  trial_converted_to_paid BOOLEAN DEFAULT FALSE,
  
  -- Subscription lifecycle
  subscription_started_at TIMESTAMP NULL,
  subscription_ends_at TIMESTAMP NULL,
  next_renewal_date TIMESTAMP NULL,
  
  -- Usage tracking
  api_calls_used INT DEFAULT 0,
  api_calls_limit INT,
  users_added INT DEFAULT 0,
  users_limit INT,
  
  -- Addon features enabled/disabled per org
  enabled_features LONGTEXT, -- JSON object: {feature_key: true/false}
  
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_method_id VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  cancelled_at TIMESTAMP NULL,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (addon_id) REFERENCES marketplace_addons(id),
  UNIQUE KEY unique_org_addon (organization_id, addon_id),
  INDEX idx_status (subscription_status),
  INDEX idx_renewal (next_renewal_date)
);
```

#### 3. **Module Features Registry**

```sql
CREATE TABLE IF NOT EXISTS organization_module_features (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  
  module_key VARCHAR(100) NOT NULL, -- 'hrms', 'payroll', 'recruitment', etc.
  feature_key VARCHAR(100) NOT NULL, -- 'salary_calculation', 'loans', 'bonus', etc.
  
  enabled BOOLEAN DEFAULT TRUE,
  
  -- Limits for this feature
  monthly_usage_limit INT,
  monthly_usage_current INT DEFAULT 0,
  
  -- When this feature was enabled/disabled
  enabled_at TIMESTAMP NULL,
  disabled_at TIMESTAMP NULL,
  
  reason_disabled VARCHAR(500),
  disabled_by_user_id CHAR(36),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  UNIQUE KEY unique_org_module_feature (organization_id, module_key, feature_key),
  INDEX idx_module (module_key),
  INDEX idx_enabled (enabled)
);
```

#### 4. **Addon Billing History**

```sql
CREATE TABLE IF NOT EXISTS addon_billing_history (
  id CHAR(36) PRIMARY KEY,
  organization_addon_subscription_id CHAR(36) NOT NULL,
  organization_id CHAR(36) NOT NULL,
  addon_id CHAR(36) NOT NULL,
  
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  
  amount_subtotal DECIMAL(10, 2),
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2),
  
  currency VARCHAR(3) DEFAULT 'USD',
  
  billing_period_start DATE,
  billing_period_end DATE,
  
  payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
  
  payment_method_type VARCHAR(50), -- 'card', 'upi', 'bank_transfer'
  payment_method_last4 VARCHAR(4),
  
  stripe_charge_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  
  paid_at TIMESTAMP NULL,
  due_date DATE,
  
  invoice_url VARCHAR(500),
  
  notes LONGTEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (organization_addon_subscription_id) REFERENCES organization_addon_subscriptions(id),
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (addon_id) REFERENCES marketplace_addons(id),
  INDEX idx_status (payment_status),
  INDEX idx_due_date (due_date)
);
```

#### 5. **Addon Trials Tracking**

```sql
CREATE TABLE IF NOT EXISTS addon_trials (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  addon_id CHAR(36) NOT NULL,
  
  trial_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  trial_ends_at TIMESTAMP NOT NULL,
  
  trial_status ENUM('active', 'converted', 'expired', 'cancelled') DEFAULT 'active',
  
  features_enabled LONGTEXT, -- JSON: which features enabled during trial
  
  conversion_decision VARCHAR(50), -- 'converted', 'declined', null
  conversion_reason VARCHAR(500),
  
  converted_at TIMESTAMP NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (addon_id) REFERENCES marketplace_addons(id),
  UNIQUE KEY unique_org_addon_trial (organization_id, addon_id),
  INDEX idx_status (trial_status),
  INDEX idx_ends_at (trial_ends_at)
);
```

#### 6. **Feature Audit Logs**

```sql
CREATE TABLE IF NOT EXISTS feature_access_logs (
  id CHAR(36) PRIMARY KEY,
  organization_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  
  module_key VARCHAR(100) NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  
  access_type ENUM('view', 'create', 'update', 'delete', 'export') DEFAULT 'view',
  
  granted BOOLEAN, -- true if access granted, false if denied
  reason_denied VARCHAR(255), -- 'not_licensed', 'trial_expired', 'quota_exceeded'
  
  request_path VARCHAR(500),
  ip_address VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_feature (module_key, feature_key),
  INDEX idx_granted (granted)
);
```

---

## 🏗️ **BACKEND IMPLEMENTATION**

### **Module 1: Marketplace Service**

#### **File**: `server/src/modules/marketplace/marketplace.types.ts`

```typescript
export interface Addon {
  id: string;
  key: string;
  name: string;
  description?: string;
  category: 'hrms' | 'payroll' | 'recruitment' | 'analytics' | 'integration' | 'ai' | 'other';
  icon_url?: string;
  
  pricing_model: 'fixed' | 'usage-based' | 'hybrid';
  base_price: number;
  currency: string;
  
  trial_enabled: boolean;
  trial_days: number;
  
  features: string[]; // List of feature keys included
  max_users_allowed?: number;
  max_api_calls?: number;
  
  status: 'active' | 'beta' | 'deprecated' | 'archived';
  published_at?: Date;
}

export interface OrganizationAddonSubscription {
  id: string;
  organization_id: string;
  addon_id: string;
  
  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  billing_cycle: 'monthly' | 'yearly';
  
  monthly_price: number;
  yearly_price: number;
  discount_percent: number;
  
  trial_started_at?: Date;
  trial_ends_at?: Date;
  
  subscription_started_at?: Date;
  next_renewal_date?: Date;
  
  api_calls_used: number;
  api_calls_limit?: number;
  
  users_added: number;
  users_limit?: number;
  
  enabled_features: Record<string, boolean>;
  
  auto_renew: boolean;
}

export interface CreateAddonInput {
  key: string;
  name: string;
  description?: string;
  category: string;
  base_price: number;
  currency?: string;
  trial_enabled?: boolean;
  trial_days?: number;
  features: string[];
}

export interface SubscribeToAddonInput {
  addon_id: string;
  billing_cycle: 'monthly' | 'yearly';
  start_trial?: boolean;
  coupon_code?: string;
}
```

#### **File**: `server/src/modules/marketplace/marketplace.service.ts`

```typescript
import { db } from '../../db/connection';
import type { TenantContext } from '../../db/types';
import { v4 as uuid } from 'uuid';
import type { Addon, CreateAddonInput, SubscribeToAddonInput } from './marketplace.types';

export class MarketplaceService {
  /**
   * Get all available addons
   */
  async getAvailableAddons() {
    const addons = await db('marketplace_addons')
      .where('status', 'active')
      .where('published_at', '<=', db.raw('NOW()'))
      .orderBy('name');
    
    return addons;
  }

  /**
   * Get organization's current subscriptions
   */
  async getOrgSubscriptions(ctx: TenantContext) {
    const subscriptions = await db('organization_addon_subscriptions')
      .where('organization_id', ctx.organizationId)
      .where('subscription_status', 'active')
      .join('marketplace_addons', 'marketplace_addons.id', 'organization_addon_subscriptions.addon_id')
      .select('organization_addon_subscriptions.*', 'marketplace_addons.name as addon_name');
    
    return subscriptions;
  }

  /**
   * Subscribe organization to addon
   */
  async subscribeToAddon(ctx: TenantContext, input: SubscribeToAddonInput) {
    const addon = await db('marketplace_addons').where('id', input.addon_id).first();
    
    if (!addon) {
      throw new Error('Addon not found');
    }

    // Check if already subscribed
    const existing = await db('organization_addon_subscriptions')
      .where('organization_id', ctx.organizationId)
      .where('addon_id', input.addon_id)
      .first();

    if (existing) {
      throw new Error('Already subscribed to this addon');
    }

    const id = uuid();
    const now = new Date();

    // Determine trial or direct subscription
    if (input.start_trial && addon.trial_enabled) {
      const trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + addon.trial_days);

      await db('organization_addon_subscriptions').insert({
        id,
        organization_id: ctx.organizationId,
        addon_id: input.addon_id,
        subscription_status: 'trial',
        billing_cycle: input.billing_cycle,
        monthly_price: addon.base_price,
        yearly_price: addon.base_price * 11, // Rough calculation
        trial_started_at: now,
        trial_ends_at: trialEndDate,
        enabled_features: addon.features.reduce((acc, f) => ({ ...acc, [f]: true }), {}),
        created_at: now,
      });

      // Track trial
      await db('addon_trials').insert({
        id: uuid(),
        organization_id: ctx.organizationId,
        addon_id: input.addon_id,
        trial_started_at: now,
        trial_ends_at: trialEndDate,
        trial_status: 'active',
        features_enabled: addon.features,
      });
    } else {
      // Direct paid subscription
      const renewalDate = new Date(now);
      renewalDate.setMonth(renewalDate.getMonth() + (input.billing_cycle === 'yearly' ? 12 : 1));

      await db('organization_addon_subscriptions').insert({
        id,
        organization_id: ctx.organizationId,
        addon_id: input.addon_id,
        subscription_status: 'active',
        billing_cycle: input.billing_cycle,
        monthly_price: addon.base_price,
        yearly_price: addon.base_price * 11,
        subscription_started_at: now,
        next_renewal_date: renewalDate,
        enabled_features: addon.features.reduce((acc, f) => ({ ...acc, [f]: true }), {}),
        auto_renew: true,
        created_at: now,
      });
    }

    return { id, subscription_status: input.start_trial ? 'trial' : 'active' };
  }

  /**
   * Upgrade/Downgrade subscription
   */
  async updateSubscription(ctx: TenantContext, subscriptionId: string, input: { billing_cycle?: string; auto_renew?: boolean }) {
    const subscription = await db('organization_addon_subscriptions')
      .where('id', subscriptionId)
      .where('organization_id', ctx.organizationId)
      .first();

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await db('organization_addon_subscriptions')
      .where('id', subscriptionId)
      .update({
        billing_cycle: input.billing_cycle || subscription.billing_cycle,
        auto_renew: input.auto_renew !== undefined ? input.auto_renew : subscription.auto_renew,
        updated_at: new Date(),
      });

    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(ctx: TenantContext, subscriptionId: string, reason?: string) {
    const subscription = await db('organization_addon_subscriptions')
      .where('id', subscriptionId)
      .where('organization_id', ctx.organizationId)
      .first();

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await db('organization_addon_subscriptions')
      .where('id', subscriptionId)
      .update({
        subscription_status: 'cancelled',
        cancelled_at: new Date(),
      });

    return subscription;
  }
}
```

### **Module 2: Feature Licensing Service**

#### **File**: `server/src/modules/licensing/licensing.service.ts`

```typescript
import { db } from '../../db/connection';
import type { TenantContext } from '../../db/types';
import { v4 as uuid } from 'uuid';

export class LicensingService {
  /**
   * Check if organization has access to a feature
   */
  async hasFeatureAccess(ctx: TenantContext, moduleKey: string, featureKey: string): Promise<boolean> {
    const feature = await db('organization_module_features')
      .where('organization_id', ctx.organizationId)
      .where('module_key', moduleKey)
      .where('feature_key', featureKey)
      .first();

    if (!feature) {
      // Not explicitly set - check addon subscriptions
      return this.checkAddonFeature(ctx, moduleKey, featureKey);
    }

    return feature.enabled;
  }

  /**
   * Check if addon subscription includes feature
   */
  private async checkAddonFeature(ctx: TenantContext, moduleKey: string, featureKey: string): Promise<boolean> {
    const addon = await db('organization_addon_subscriptions')
      .join('marketplace_addons', 'marketplace_addons.id', 'organization_addon_subscriptions.addon_id')
      .where('organization_addon_subscriptions.organization_id', ctx.organizationId)
      .where('organization_addon_subscriptions.subscription_status', 'active')
      .where('marketplace_addons.status', 'active')
      .first();

    if (!addon) return false;

    const features = JSON.parse(addon.enabled_features || '{}');
    return features[featureKey] !== false;
  }

  /**
   * Enable/Disable feature for organization
   */
  async setFeatureAccess(ctx: TenantContext, moduleKey: string, featureKey: string, enabled: boolean, reason?: string) {
    const existing = await db('organization_module_features')
      .where('organization_id', ctx.organizationId)
      .where('module_key', moduleKey)
      .where('feature_key', featureKey)
      .first();

    if (existing) {
      await db('organization_module_features')
        .where('id', existing.id)
        .update({
          enabled,
          disabled_at: !enabled ? new Date() : null,
          reason_disabled: !enabled ? reason : null,
          updated_at: new Date(),
        });
    } else {
      await db('organization_module_features').insert({
        id: uuid(),
        organization_id: ctx.organizationId,
        module_key: moduleKey,
        feature_key: featureKey,
        enabled,
        enabled_at: enabled ? new Date() : null,
        disabled_at: !enabled ? new Date() : null,
        reason_disabled: !enabled ? reason : null,
      });
    }
  }

  /**
   * Track feature access (for audit logs)
   */
  async trackFeatureAccess(ctx: TenantContext, moduleKey: string, featureKey: string, granted: boolean, reason?: string) {
    await db('feature_access_logs').insert({
      id: uuid(),
      organization_id: ctx.organizationId,
      user_id: ctx.userId,
      module_key: moduleKey,
      feature_key: featureKey,
      access_type: 'view',
      granted,
      reason_denied: reason,
      request_path: ctx.requestPath,
      ip_address: ctx.ipAddress,
      created_at: new Date(),
    });
  }

  /**
   * Get all features enabled for organization
   */
  async getOrgFeatures(ctx: TenantContext) {
    const features = await db('organization_module_features')
      .where('organization_id', ctx.organizationId)
      .select('module_key', 'feature_key', 'enabled');

    return features.reduce((acc, f) => ({
      ...acc,
      [f.module_key]: {
        ...acc[f.module_key],
        [f.feature_key]: f.enabled,
      },
    }), {});
  }
}
```

### **Middleware: License Check Middleware**

#### **File**: `server/src/common/middleware/licenseCheck.middleware.ts`

```typescript
import type { Request, Response, NextFunction } from 'express';
import { LicensingService } from '../../modules/licensing/licensing.service';

interface LicenseCheckOptions {
  moduleKey: string;
  featureKey: string;
}

const licensingService = new LicensingService();

export const licenseCheck = (options: LicenseCheckOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ctx = req.tenantContext;

    if (!ctx) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasAccess = await licensingService.hasFeatureAccess(
      ctx,
      options.moduleKey,
      options.featureKey
    );

    if (!hasAccess) {
      // Log access attempt
      await licensingService.trackFeatureAccess(ctx, options.moduleKey, options.featureKey, false, 'not_licensed');

      return res.status(403).json({
        error: 'Feature not licensed',
        feature: options.featureKey,
        module: options.moduleKey,
        message: 'Your organization does not have access to this feature. Please upgrade your subscription.',
      });
    }

    // Log successful access
    await licensingService.trackFeatureAccess(ctx, options.moduleKey, options.featureKey, true);

    next();
  };
};
```

---

## 🎨 **FRONTEND IMPLEMENTATION**

### **Context: Addon Context**

#### **File**: `client/src/features/marketplace/context/AddonContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/apiClient';

interface Addon {
  id: string;
  key: string;
  name: string;
  description: string;
  icon_url?: string;
  base_price: number;
  trial_enabled: boolean;
  trial_days: number;
}

interface OrgSubscription {
  id: string;
  addon_id: string;
  addon_name: string;
  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  billing_cycle: 'monthly' | 'yearly';
  next_renewal_date?: string;
  enabled_features: Record<string, boolean>;
}

interface AddonContextType {
  addons: Addon[];
  subscriptions: OrgSubscription[];
  isLoading: boolean;
  isSubscribed: (addonKey: string) => boolean;
  hasFeature: (addonKey: string, featureKey: string) => boolean;
}

const AddonContext = createContext<AddonContextType | undefined>(undefined);

export const AddonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: addons = [] } = useQuery({
    queryKey: ['marketplace/addons'],
    queryFn: () => apiClient.get('/marketplace/addons').then(r => r.data),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['marketplace/subscriptions'],
    queryFn: () => apiClient.get('/marketplace/subscriptions').then(r => r.data),
  });

  const isSubscribed = (addonKey: string) => {
    return subscriptions.some(s => s.addon_key === addonKey && s.subscription_status === 'active');
  };

  const hasFeature = (addonKey: string, featureKey: string) => {
    const sub = subscriptions.find(s => s.addon_key === addonKey && s.subscription_status === 'active');
    return sub ? sub.enabled_features[featureKey] !== false : false;
  };

  return (
    <AddonContext.Provider value={{ addons, subscriptions, isLoading: false, isSubscribed, hasFeature }}>
      {children}
    </AddonContext.Provider>
  );
};

export const useAddons = () => {
  const context = useContext(AddonContext);
  if (!context) throw new Error('useAddons must be used within AddonProvider');
  return context;
};
```

### **Component: Marketplace Page**

#### **File**: `client/src/features/marketplace/pages/MarketplacePage.tsx`

```typescript
import React from 'react';
import { useAddons } from '../context/AddonContext';
import { AddonCard } from '../components/AddonCard';
import { Button } from '../../../components/ui/button';

export const MarketplacePage: React.FC = () => {
  const { addons, subscriptions, isSubscribed } = useAddons();

  const categories = ['hrms', 'payroll', 'recruitment', 'analytics', 'integration', 'ai'];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
        <p className="text-gray-600">Extend your HRMS with powerful addons</p>
      </div>

      {categories.map(category => (
        <div key={category} className="mb-12">
          <h2 className="text-2xl font-bold mb-4 capitalize">{category}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {addons
              .filter(a => a.category === category)
              .map(addon => (
                <AddonCard
                  key={addon.id}
                  addon={addon}
                  isSubscribed={isSubscribed(addon.key)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### **Component: Addon Card**

#### **File**: `client/src/features/marketplace/components/AddonCard.tsx`

```typescript
import React, { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { useAddons } from '../context/AddonContext';
import { apiClient } from '../../../lib/apiClient';
import { useMutation } from '@tanstack/react-query';

interface AddonCardProps {
  addon: any;
  isSubscribed: boolean;
}

export const AddonCard: React.FC<AddonCardProps> = ({ addon, isSubscribed }) => {
  const [showTrialOptions, setShowTrialOptions] = useState(false);
  const { addons } = useAddons();

  const subscribeMutation = useMutation({
    mutationFn: (data) => apiClient.post('/marketplace/subscribe', data),
    onSuccess: () => {
      window.location.reload(); // Refresh to show new subscription
    },
  });

  const handleSubscribe = (billingCycle: 'monthly' | 'yearly', startTrial: boolean) => {
    subscribeMutation.mutate({
      addon_id: addon.id,
      billing_cycle: billingCycle,
      start_trial: startTrial,
    });
  };

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {addon.icon_url && (
            <img src={addon.icon_url} alt={addon.name} className="w-12 h-12 rounded" />
          )}
          <div>
            <h3 className="font-bold text-lg">{addon.name}</h3>
            {isSubscribed && <Badge variant="success">Subscribed</Badge>}
          </div>
        </div>
      </div>

      <p className="text-gray-600 text-sm mb-4">{addon.description}</p>

      <div className="mb-4">
        <div className="text-2xl font-bold">
          ${addon.base_price}
          <span className="text-sm font-normal text-gray-600">/month</span>
        </div>
      </div>

      {!isSubscribed && (
        <div>
          {!showTrialOptions ? (
            <div className="flex gap-2">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => setShowTrialOptions(true)}
              >
                Start Trial
              </Button>
              <Button variant="outline" className="flex-1">
                Buy Now
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => handleSubscribe('monthly', true)}
              >
                Start Free Trial
              </Button>
              <p className="text-xs text-gray-500 text-center">
                {addon.trial_days} days free, then ${addon.base_price}/month
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 🔌 **API ROUTES (Phase 1)**

### **File**: `server/src/modules/marketplace/marketplace.routes.ts`

```typescript
import express from 'express';
import { authenticate, resolveTenant } from '../../common/middleware';
import { MarketplaceController } from './marketplace.controller';

const router = express.Router();
const controller = new MarketplaceController();

/**
 * Public routes (no auth needed)
 */
router.get('/addons', controller.getAvailableAddons);
router.get('/addons/:id', controller.getAddonDetails);

/**
 * Organization subscription routes (auth required)
 */
router.use(authenticate, resolveTenant);

router.get('/subscriptions', controller.getOrgSubscriptions);
router.post('/subscribe', controller.subscribeToAddon);
router.patch('/subscriptions/:id', controller.updateSubscription);
router.delete('/subscriptions/:id', controller.cancelSubscription);

router.get('/trials', controller.getTrials);
router.post('/trials/:id/convert', controller.convertTrial);

router.get('/billing-history', controller.getBillingHistory);
router.get('/invoices/:id', controller.getInvoice);

export default router;
```

---

## 📦 **MIGRATION SCRIPT**

### **File**: `server/src/db/migrations/20260719_marketplace_and_licensing.ts`

```typescript
export async function up(knex) {
  // Create marketplace_addons table
  await knex.schema.createTable('marketplace_addons', (table) => {
    table.string('id', 36).primary();
    table.string('key', 100).unique().notNullable();
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('category', 50);
    table.string('icon_url', 500);

    table.enum('pricing_model', ['fixed', 'usage-based', 'hybrid']).defaultTo('fixed');
    table.decimal('base_price', 10, 2);
    table.string('currency', 3).defaultTo('USD');

    table.integer('trial_days').defaultTo(14);
    table.boolean('trial_enabled').defaultTo(true);

    table.longText('features');
    table.integer('max_users_allowed');
    table.integer('max_api_calls');

    table.enum('status', ['active', 'beta', 'deprecated', 'archived']).defaultTo('active');
    table.timestamp('published_at');
    table.timestamp('deprecated_at');

    table.string('support_url', 500);
    table.string('documentation_url', 500);
    table.string('changelog_url', 500);

    table.timestamps(true, true);
    table.timestamp('deleted_at');

    table.index(['key']);
    table.index(['category']);
    table.index(['status']);
  });

  // Create organization_addon_subscriptions table
  await knex.schema.createTable('organization_addon_subscriptions', (table) => {
    table.string('id', 36).primary();
    table.string('organization_id', 36).notNullable();
    table.string('addon_id', 36).notNullable();

    table.enum('subscription_status', ['trial', 'active', 'suspended', 'cancelled']).defaultTo('trial');

    table.enum('billing_cycle', ['monthly', 'yearly']).defaultTo('monthly');
    table.decimal('monthly_price', 10, 2);
    table.decimal('yearly_price', 10, 2);
    table.decimal('discount_percent', 5, 2).defaultTo(0);

    table.timestamp('trial_started_at');
    table.timestamp('trial_ends_at');
    table.boolean('trial_converted_to_paid').defaultTo(false);

    table.timestamp('subscription_started_at');
    table.timestamp('subscription_ends_at');
    table.timestamp('next_renewal_date');

    table.integer('api_calls_used').defaultTo(0);
    table.integer('api_calls_limit');
    table.integer('users_added').defaultTo(0);
    table.integer('users_limit');

    table.longText('enabled_features');

    table.boolean('auto_renew').defaultTo(true);
    table.string('payment_method_id', 100);

    table.timestamps(true, true);
    table.timestamp('cancelled_at');

    table.foreign('organization_id').references('organizations.id');
    table.foreign('addon_id').references('marketplace_addons.id');
    table.unique(['organization_id', 'addon_id']);
    table.index(['subscription_status']);
    table.index(['next_renewal_date']);
  });

  // Create organization_module_features table
  await knex.schema.createTable('organization_module_features', (table) => {
    table.string('id', 36).primary();
    table.string('organization_id', 36).notNullable();

    table.string('module_key', 100).notNullable();
    table.string('feature_key', 100).notNullable();

    table.boolean('enabled').defaultTo(true);

    table.integer('monthly_usage_limit');
    table.integer('monthly_usage_current').defaultTo(0);

    table.timestamp('enabled_at');
    table.timestamp('disabled_at');

    table.string('reason_disabled', 500);
    table.string('disabled_by_user_id', 36);

    table.timestamps(true, true);

    table.foreign('organization_id').references('organizations.id');
    table.unique(['organization_id', 'module_key', 'feature_key']);
    table.index(['module_key']);
    table.index(['enabled']);
  });

  // Create addon_billing_history table
  await knex.schema.createTable('addon_billing_history', (table) => {
    table.string('id', 36).primary();
    table.string('organization_addon_subscription_id', 36).notNullable();
    table.string('organization_id', 36).notNullable();
    table.string('addon_id', 36).notNullable();

    table.string('invoice_number', 50).unique().notNullable();

    table.decimal('amount_subtotal', 10, 2);
    table.decimal('discount_amount', 10, 2).defaultTo(0);
    table.decimal('tax_amount', 10, 2).defaultTo(0);
    table.decimal('total_amount', 10, 2);

    table.string('currency', 3).defaultTo('USD');

    table.date('billing_period_start');
    table.date('billing_period_end');

    table.enum('payment_status', ['pending', 'paid', 'failed', 'refunded']).defaultTo('pending');

    table.string('payment_method_type', 50);
    table.string('payment_method_last4', 4);

    table.string('stripe_charge_id', 100);
    table.string('razorpay_payment_id', 100);

    table.timestamp('paid_at');
    table.date('due_date');

    table.string('invoice_url', 500);
    table.text('notes');

    table.timestamps(true, true);

    table.foreign('organization_addon_subscription_id').references('organization_addon_subscriptions.id');
    table.foreign('organization_id').references('organizations.id');
    table.foreign('addon_id').references('marketplace_addons.id');
    table.index(['payment_status']);
    table.index(['due_date']);
  });

  // Create addon_trials table
  await knex.schema.createTable('addon_trials', (table) => {
    table.string('id', 36).primary();
    table.string('organization_id', 36).notNullable();
    table.string('addon_id', 36).notNullable();

    table.timestamp('trial_started_at').defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    table.timestamp('trial_ends_at').notNullable();

    table.enum('trial_status', ['active', 'converted', 'expired', 'cancelled']).defaultTo('active');

    table.longText('features_enabled');

    table.string('conversion_decision', 50);
    table.string('conversion_reason', 500);

    table.timestamp('converted_at');

    table.timestamps(true, true);

    table.foreign('organization_id').references('organizations.id');
    table.foreign('addon_id').references('marketplace_addons.id');
    table.unique(['organization_id', 'addon_id']);
    table.index(['trial_status']);
    table.index(['trial_ends_at']);
  });

  // Create feature_access_logs table
  await knex.schema.createTable('feature_access_logs', (table) => {
    table.string('id', 36).primary();
    table.string('organization_id', 36).notNullable();
    table.string('user_id', 36).notNullable();

    table.string('module_key', 100).notNullable();
    table.string('feature_key', 100).notNullable();

    table.enum('access_type', ['view', 'create', 'update', 'delete', 'export']).defaultTo('view');

    table.boolean('granted');
    table.string('reason_denied', 255);

    table.string('request_path', 500);
    table.string('ip_address', 50);

    table.timestamp('created_at').defaultTo(knex.raw('CURRENT_TIMESTAMP'));

    table.foreign('organization_id').references('organizations.id');
    table.foreign('user_id').references('users.id');
    table.index(['module_key', 'feature_key']);
    table.index(['granted']);
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('feature_access_logs');
  await knex.schema.dropTableIfExists('addon_trials');
  await knex.schema.dropTableIfExists('addon_billing_history');
  await knex.schema.dropTableIfExists('organization_module_features');
  await knex.schema.dropTableIfExists('organization_addon_subscriptions');
  await knex.schema.dropTableIfExists('marketplace_addons');
}
```

---

## ✅ **PHASE 1 TASKS**

### **Week 1 (Monday-Friday)**
- [ ] Database schema review & approval
- [ ] Create migration files
- [ ] Create TypeScript types & interfaces
- [ ] Setup marketplace module structure

### **Week 2 (Monday-Friday)**
- [ ] Marketplace service (getAddons, subscribe, manage subscriptions)
- [ ] Licensing service (checkFeature, trackAccess)
- [ ] License check middleware
- [ ] Marketplace controller & routes

### **Week 3 (Monday-Friday)**
- [ ] AddonProvider React context
- [ ] Marketplace page & components
- [ ] Addon card component
- [ ] Subscription management UI

### **Week 4 (Monday-Friday)**
- [ ] Integration tests (marketplace service)
- [ ] E2E tests (subscribe flow)
- [ ] Security audit (license checks)
- [ ] Performance testing

### **Week 5 (Monday-Friday)**
- [ ] Billing integration (Stripe/Razorpay webhooks)
- [ ] Trial management
- [ ] Auto-renewal job
- [ ] Invoice generation

### **Week 6 (Monday-Friday)**
- [ ] Documentation
- [ ] Admin dashboard for addon management
- [ ] Bug fixes & polish
- [ ] Final testing & deployment

---

## 🎯 **SUCCESS CRITERIA**

✅ Organizations can browse and subscribe to addons  
✅ Trial periods work correctly  
✅ Feature-level licensing enforced across all modules  
✅ Addon subscriptions auto-renew  
✅ Invoices generated correctly  
✅ 0 cross-org data leaks  
✅ <50ms licensing check latency  
✅ 95%+ test coverage  

---

**Status**: Ready for Phase 1 Implementation  
**Next**: Approval & team assignment

