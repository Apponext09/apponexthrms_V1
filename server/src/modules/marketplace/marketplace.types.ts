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

  features: string[]; // Feature keys included in this addon
  max_users_allowed?: number;
  max_api_calls?: number;

  status: 'active' | 'beta' | 'deprecated' | 'archived';
  published_at?: Date;

  support_url?: string;
  documentation_url?: string;
  changelog_url?: string;

  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
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
  trial_converted_to_paid: boolean;

  subscription_started_at?: Date;
  subscription_ends_at?: Date;
  next_renewal_date?: Date;

  api_calls_used: number;
  api_calls_limit?: number;

  users_added: number;
  users_limit?: number;

  enabled_features: Record<string, boolean>;

  auto_renew: boolean;
  payment_method_id?: string;

  created_at: Date;
  updated_at: Date;
  cancelled_at?: Date;
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
  icon_url?: string;
  status?: 'active' | 'beta' | 'deprecated' | 'archived';
}

export interface SubscribeToAddonInput {
  addon_id: string;
  billing_cycle: 'monthly' | 'yearly';
  start_trial?: boolean;
  coupon_code?: string;
}

export interface UpdateSubscriptionInput {
  billing_cycle?: 'monthly' | 'yearly';
  auto_renew?: boolean;
  discount_percent?: number;
}

export interface AddonBillingHistory {
  id: string;
  organization_addon_subscription_id: string;
  organization_id: string;
  addon_id: string;

  invoice_number: string;

  amount_subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;

  currency: string;

  billing_period_start: Date;
  billing_period_end: Date;

  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';

  payment_method_type?: string;
  payment_method_last4?: string;

  stripe_charge_id?: string;
  razorpay_payment_id?: string;

  paid_at?: Date;
  due_date: Date;

  invoice_url?: string;
  notes?: string;

  created_at: Date;
  updated_at: Date;
}

export interface AddonTrial {
  id: string;
  organization_id: string;
  addon_id: string;

  trial_started_at: Date;
  trial_ends_at: Date;

  trial_status: 'active' | 'converted' | 'expired' | 'cancelled';

  features_enabled: string[];

  conversion_decision?: 'converted' | 'declined';
  conversion_reason?: string;

  converted_at?: Date;

  created_at: Date;
  updated_at: Date;
}
