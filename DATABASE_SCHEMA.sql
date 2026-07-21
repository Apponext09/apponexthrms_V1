-- ============================================================
-- ApponextHRMS SaaS Platform - Complete Database Schema
-- ============================================================
-- This schema supports a true multi-tenant SaaS platform
-- with complete data isolation, subscription management,
-- and module licensing.
-- ============================================================

-- ============================================================
-- PLATFORM CORE TABLES (Shared Database)
-- ============================================================

-- Organizations (Tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
  domain VARCHAR(255), -- custom domain (optional)
  custom_domain VARCHAR(255) UNIQUE, -- customer.com
  logo_url TEXT,
  favicon_url TEXT,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'archived')),
  trial_ends_at TIMESTAMP,
  subscription_plan_id UUID,
  owner_user_id UUID,
  owner_email VARCHAR(255),
  max_employees INTEGER,
  max_admins INTEGER DEFAULT 5,
  max_branches INTEGER DEFAULT 10,
  max_departments INTEGER DEFAULT 20,
  max_storage_gb INTEGER DEFAULT 100,
  current_employees INTEGER DEFAULT 0,
  current_storage_gb NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  deleted_at TIMESTAMP,
  metadata JSONB, -- Branding, theme, settings
  created_by UUID,
  updated_by UUID,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_slug (slug),
  INDEX idx_custom_domain (custom_domain)
);

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('starter', 'professional', 'business', 'enterprise', 'custom')),
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_annual DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',

  -- Limits
  max_employees INTEGER,
  max_admins INTEGER,
  max_branches INTEGER,
  max_departments INTEGER,
  max_storage_gb INTEGER,
  max_api_requests_monthly INTEGER,
  max_attendance_devices INTEGER,
  max_payroll_runs_monthly INTEGER,
  max_recruitment_jobs INTEGER,

  -- Features
  features JSONB, -- Array of feature flags included
  trial_days INTEGER DEFAULT 14,
  custom_branding BOOLEAN DEFAULT FALSE,
  custom_domain BOOLEAN DEFAULT FALSE,
  sso_enabled BOOLEAN DEFAULT FALSE,
  audit_logs BOOLEAN DEFAULT FALSE,
  webhooks BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,

  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_active (active)
);

-- Organization Subscriptions
CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_plan_id UUID NOT NULL REFERENCES subscription_plans(id),

  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'trial', 'paused', 'cancelled')),
  subscription_type VARCHAR(20) CHECK (subscription_type IN ('monthly', 'annual')),

  -- Dates
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  renews_at TIMESTAMP,
  trial_started_at TIMESTAMP,
  trial_ends_at TIMESTAMP,
  paused_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Billing
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_method VARCHAR(50) CHECK (payment_method IN ('stripe', 'razorpay', 'manual')),
  stripe_subscription_id VARCHAR(255),
  razorpay_subscription_id VARCHAR(255),

  current_cycle_start TIMESTAMP,
  current_cycle_end TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (organization_id),
  INDEX idx_status (status),
  INDEX idx_organization_id (organization_id),
  INDEX idx_expires_at (expires_at)
);

-- Organization Module Access
CREATE TABLE IF NOT EXISTS organization_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_name VARCHAR(100) NOT NULL,

  enabled BOOLEAN DEFAULT TRUE,
  license_tier VARCHAR(50) CHECK (license_tier IN ('basic', 'professional', 'enterprise')),
  license_expires_at TIMESTAMP,

  -- API Quotas
  api_quota_monthly INTEGER,
  api_quota_used INTEGER DEFAULT 0,
  api_quota_reset_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (organization_id, module_name),
  INDEX idx_organization_id (organization_id),
  INDEX idx_enabled (enabled)
);

-- Feature Flags (Global Platform Features)
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,

  enabled_for_all BOOLEAN DEFAULT FALSE,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),

  targeting_rules JSONB, -- Advanced targeting configuration

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- Organization Feature Flags
CREATE TABLE IF NOT EXISTS organization_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_flag_id UUID NOT NULL REFERENCES feature_flags(id),

  enabled BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (organization_id, feature_flag_id),
  INDEX idx_organization_id (organization_id)
);

-- Organization Resource Limits
CREATE TABLE IF NOT EXISTS organization_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Current usage
  max_employees INTEGER,
  current_employees INTEGER DEFAULT 0,

  max_storage_gb DECIMAL(10,2),
  used_storage_gb DECIMAL(10,2) DEFAULT 0,

  max_api_requests BIGINT,
  used_api_requests BIGINT DEFAULT 0,
  api_requests_reset_at TIMESTAMP,

  max_branches INTEGER,
  current_branches INTEGER DEFAULT 0,

  max_departments INTEGER,
  current_departments INTEGER DEFAULT 0,

  max_admins INTEGER,
  current_admins INTEGER DEFAULT 0,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (organization_id),
  INDEX idx_organization_id (organization_id)
);

-- ============================================================
-- BILLING TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  billing_email VARCHAR(255) NOT NULL,
  billing_address TEXT,
  billing_city VARCHAR(100),
  billing_state VARCHAR(100),
  billing_country VARCHAR(100),
  billing_zip VARCHAR(20),

  tax_id VARCHAR(50),
  gst_number VARCHAR(50),
  pan_number VARCHAR(50),

  payment_method VARCHAR(50),
  stripe_customer_id VARCHAR(255),
  razorpay_customer_id VARCHAR(255),

  auto_billing BOOLEAN DEFAULT TRUE,
  preferred_payment_day INTEGER CHECK (preferred_payment_day BETWEEN 1 AND 31),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (organization_id),
  INDEX idx_organization_id (organization_id)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES organization_subscriptions(id),

  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,

  amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),

  payment_date TIMESTAMP,
  payment_method VARCHAR(50),
  stripe_invoice_id VARCHAR(255),
  razorpay_invoice_id VARCHAR(255),

  items JSONB, -- Line items: [{description, quantity, rate, amount}, ...]
  notes TEXT,

  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_organization_id (organization_id),
  INDEX idx_status (status),
  INDEX idx_invoice_date (invoice_date),
  INDEX idx_due_date (due_date)
);

-- Coupons & Discounts
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,

  discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,

  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,

  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,

  applicable_plans JSONB, -- Plan IDs this coupon applies to

  created_by UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_code (code)
);

-- ============================================================
-- PLATFORM USER MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),

  first_name VARCHAR(100),
  last_name VARCHAR(100),

  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'platform_admin', 'support_engineer', 'billing_manager', 'sales_manager', 'customer_success')),

  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

  phone VARCHAR(20),
  avatar_url TEXT,

  -- Security
  two_fa_enabled BOOLEAN DEFAULT FALSE,
  two_fa_secret VARCHAR(255),

  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- ============================================================
-- API MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  secret_hash VARCHAR(255),

  permissions JSONB DEFAULT '[]', -- Array of permissions

  rate_limit_per_minute INTEGER DEFAULT 600,
  rate_limit_per_hour INTEGER DEFAULT 10000,

  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),

  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  INDEX idx_organization_id (organization_id),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS organization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  integration_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),

  api_key_hash VARCHAR(255),
  access_token_hash VARCHAR(255),

  webhook_url TEXT,
  webhook_secret VARCHAR(255),

  last_sync_at TIMESTAMP,
  next_sync_at TIMESTAMP,
  error_message TEXT,

  config JSONB, -- Integration-specific configuration

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (organization_id, integration_name),
  INDEX idx_organization_id (organization_id)
);

-- ============================================================
-- AUDIT & SECURITY
-- ============================================================

CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES platform_users(id),

  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  resource_name VARCHAR(255),

  changes JSONB, -- {old_value: ..., new_value: ...}

  ip_address INET,
  user_agent TEXT,

  status VARCHAR(50) CHECK (status IN ('success', 'failure')),
  error_message TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_organization_id (organization_id),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_action (action)
);

CREATE TABLE IF NOT EXISTS failed_logins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email VARCHAR(255),
  user_id UUID,

  reason VARCHAR(255),
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_email (email),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,

  reason VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  blocked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_ip_address (ip_address)
);

CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,

  token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,

  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_expires_at (expires_at)
);

-- ============================================================
-- MONITORING & SYSTEM HEALTH
-- ============================================================

CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC(10,2),

  cpu_usage NUMERIC(5,2),
  memory_usage NUMERIC(5,2),
  disk_usage NUMERIC(5,2),

  database_connections INTEGER,
  active_requests INTEGER,
  queue_length INTEGER,
  failed_jobs_count INTEGER,

  api_response_time_ms INTEGER,
  error_rate NUMERIC(5,2),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_metric_name (metric_name),
  INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  year_month DATE NOT NULL,

  requests_count BIGINT DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2),

  average_response_time_ms INTEGER,

  endpoints JSONB, -- Top endpoints usage

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (organization_id, year_month),
  INDEX idx_organization_id (organization_id)
);

-- ============================================================
-- SUPPORT & TICKETING
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  ticket_number VARCHAR(50) UNIQUE NOT NULL,

  created_by_user_id UUID REFERENCES platform_users(id),
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,

  priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category VARCHAR(100),

  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),

  assigned_to_user_id UUID REFERENCES platform_users(id),

  attachments JSONB, -- File URLs

  resolved_at TIMESTAMP,
  closed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_organization_id (organization_id),
  INDEX idx_status (status),
  INDEX idx_priority (priority)
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,

  comment_by_user_id UUID NOT NULL REFERENCES platform_users(id),
  comment_text TEXT NOT NULL,

  is_internal BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_ticket_id (ticket_id)
);

-- ============================================================
-- DOMAIN MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  domain VARCHAR(255) UNIQUE NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,

  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,

  dns_cname_record VARCHAR(255),
  dns_verification_token VARCHAR(255),

  ssl_certificate_id VARCHAR(255),
  ssl_expires_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_organization_id (organization_id),
  INDEX idx_domain (domain)
);

-- ============================================================
-- BRANDING CUSTOMIZATION
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  accent_color VARCHAR(7),

  logo_url TEXT,
  favicon_url TEXT,
  banner_url TEXT,

  font_family VARCHAR(100),

  custom_css TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (organization_id),
  INDEX idx_organization_id (organization_id)
);

-- ============================================================
-- SYSTEM SETTINGS (Global Configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) CHECK (setting_type IN ('string', 'integer', 'boolean', 'json')),

  is_encrypted BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_setting_key (setting_key)
);

-- ============================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_org_status_created ON organizations(status, created_at);
CREATE INDEX IF NOT EXISTS idx_subscription_expires ON organization_subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_invoice_org_status ON invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_org_user ON platform_audit_logs(organization_id, user_id);

-- ============================================================
-- SAMPLE DATA SEED (Optional)
-- ============================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, type, description, price_monthly, price_annual, max_employees, max_admins, max_branches, max_storage_gb, max_api_requests_monthly, features)
VALUES
  ('Starter', 'starter', 'For small teams', 99.00, 990.00, 50, 2, 1, 10, 10000, '["dashboard", "employees", "attendance"]'),
  ('Professional', 'professional', 'For growing businesses', 299.00, 2990.00, 500, 5, 5, 100, 100000, '["dashboard", "employees", "attendance", "leaves", "payroll", "recruitment"]'),
  ('Business', 'business', 'For established companies', 699.00, 6990.00, 2000, 20, 20, 500, 500000, '["dashboard", "employees", "attendance", "leaves", "payroll", "recruitment", "performance", "assets"]'),
  ('Enterprise', 'enterprise', 'Custom solution', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '["all"]')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
