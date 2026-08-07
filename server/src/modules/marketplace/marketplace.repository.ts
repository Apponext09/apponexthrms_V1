import { getKnex } from '../../db/knex';
import type { TenantContext } from '../../db/types';

const db = getKnex();
import { v4 as uuid } from 'uuid';
import type {
  Addon,
  OrganizationAddonSubscription,
  AddonBillingHistory,
  AddonTrial,
} from './marketplace.types';

export class MarketplaceRepository {
  /**
   * Get all active addons (public)
   */
  async getAllAddons(): Promise<Addon[]> {
    const addons = await db('marketplace_addons')
      .where('status', 'active')
      .where('published_at', '<=', db.raw('NOW()'))
      .orderBy('name');

    return addons.map((addon) => this.parseAddon(addon));
  }

  /**
   * Get addon by ID
   */
  async getAddonById(id: string): Promise<Addon | null> {
    const addon = await db('marketplace_addons').where('id', id).first();
    return addon ? this.parseAddon(addon) : null;
  }

  /**
   * Get addon by key
   */
  async getAddonByKey(key: string): Promise<Addon | null> {
    const addon = await db('marketplace_addons').where('key', key).first();
    return addon ? this.parseAddon(addon) : null;
  }

  /**
   * Get organization's active subscriptions
   */
  async getOrgSubscriptions(ctx: TenantContext): Promise<(OrganizationAddonSubscription & { addon_name: string })[]> {
    const subscriptions = await db('organization_addon_subscriptions')
      .where('organization_addon_subscriptions.organization_id', ctx.organizationId)
      .where('organization_addon_subscriptions.subscription_status', 'active')
      .join('marketplace_addons', 'marketplace_addons.id', 'organization_addon_subscriptions.addon_id')
      .select(
        'organization_addon_subscriptions.*',
        db.raw('marketplace_addons.name as addon_name'),
        db.raw('marketplace_addons.key as addon_key'),
      );

    return subscriptions.map((sub) => this.parseSubscription(sub)) as any;
  }

  /**
   * Get specific subscription
   */
  async getSubscriptionById(ctx: TenantContext, subscriptionId: string): Promise<OrganizationAddonSubscription | null> {
    const subscription = await db('organization_addon_subscriptions')
      .where('id', subscriptionId)
      .where('organization_id', ctx.organizationId)
      .first();

    return subscription ? this.parseSubscription(subscription) : null;
  }

  /**
   * Check if org is already subscribed to addon
   */
  async isSubscribed(ctx: TenantContext, addonId: string): Promise<boolean> {
    const subscription = await db('organization_addon_subscriptions')
      .where('organization_id', ctx.organizationId)
      .where('addon_id', addonId)
      .where('subscription_status', 'active')
      .first();

    return !!subscription;
  }

  /**
   * Create new subscription
   */
  async createSubscription(
    ctx: TenantContext,
    addonId: string,
    data: {
      subscription_status: 'trial' | 'active';
      billing_cycle: 'monthly' | 'yearly';
      monthly_price: number;
      yearly_price: number;
      trial_started_at?: Date;
      trial_ends_at?: Date;
      subscription_started_at?: Date;
      next_renewal_date?: Date;
      enabled_features: Record<string, boolean>;
    },
  ): Promise<OrganizationAddonSubscription> {
    const id = uuid();
    const now = new Date();

    await db('organization_addon_subscriptions').insert({
      id,
      organization_id: ctx.organizationId,
      addon_id: addonId,
      subscription_status: data.subscription_status,
      billing_cycle: data.billing_cycle,
      monthly_price: data.monthly_price,
      yearly_price: data.yearly_price,
      trial_started_at: data.trial_started_at,
      trial_ends_at: data.trial_ends_at,
      subscription_started_at: data.subscription_started_at,
      next_renewal_date: data.next_renewal_date,
      enabled_features: JSON.stringify(data.enabled_features),
      auto_renew: true,
      created_at: now,
      updated_at: now,
    });

    const subscription = await db('organization_addon_subscriptions').where('id', id).first();
    return this.parseSubscription(subscription);
  }

  /**
   * Update subscription
   */
  async updateSubscription(
    ctx: TenantContext,
    subscriptionId: string,
    data: {
      billing_cycle?: string;
      auto_renew?: boolean;
      subscription_status?: string;
      next_renewal_date?: Date;
    },
  ): Promise<OrganizationAddonSubscription> {
    const updateData: any = {
      updated_at: new Date(),
    };

    if (data.billing_cycle) updateData.billing_cycle = data.billing_cycle;
    if (data.auto_renew !== undefined) updateData.auto_renew = data.auto_renew;
    if (data.subscription_status) updateData.subscription_status = data.subscription_status;
    if (data.next_renewal_date) updateData.next_renewal_date = data.next_renewal_date;

    await db('organization_addon_subscriptions')
      .where('id', subscriptionId)
      .where('organization_id', ctx.organizationId)
      .update(updateData);

    const subscription = await db('organization_addon_subscriptions')
      .where('id', subscriptionId)
      .first();

    return this.parseSubscription(subscription);
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(ctx: TenantContext, subscriptionId: string): Promise<void> {
    await db('organization_addon_subscriptions')
      .where('id', subscriptionId)
      .where('organization_id', ctx.organizationId)
      .update({
        subscription_status: 'cancelled',
        cancelled_at: new Date(),
        updated_at: new Date(),
      });
  }

  /**
   * Get billing history for organization
   */
  async getBillingHistory(ctx: TenantContext): Promise<AddonBillingHistory[]> {
    const history = await db('addon_billing_history')
      .where('organization_id', ctx.organizationId)
      .orderBy('created_at', 'desc');

    return history.map((h) => this.parseBillingHistory(h));
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(ctx: TenantContext, invoiceId: string): Promise<AddonBillingHistory | null> {
    const invoice = await db('addon_billing_history')
      .where('id', invoiceId)
      .where('organization_id', ctx.organizationId)
      .first();

    return invoice ? this.parseBillingHistory(invoice) : null;
  }

  /**
   * Create invoice
   */
  async createInvoice(data: {
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
    due_date: Date;
  }): Promise<AddonBillingHistory> {
    const id = uuid();
    const now = new Date();

    await db('addon_billing_history').insert({
      id,
      ...data,
      payment_status: 'pending',
      created_at: now,
      updated_at: now,
    });

    const invoice = await db('addon_billing_history').where('id', id).first();
    return this.parseBillingHistory(invoice);
  }

  /**
   * Create trial
   */
  async createTrial(
    ctx: TenantContext,
    addonId: string,
    trialEndDate: Date,
    features: string[],
  ): Promise<AddonTrial> {
    const id = uuid();
    const now = new Date();

    await db('addon_trials').insert({
      id,
      organization_id: ctx.organizationId,
      addon_id: addonId,
      trial_started_at: now,
      trial_ends_at: trialEndDate,
      trial_status: 'active',
      features_enabled: JSON.stringify(features),
      created_at: now,
      updated_at: now,
    });

    const trial = await db('addon_trials').where('id', id).first();
    return this.parseTrial(trial);
  }

  /**
   * Get active trial
   */
  async getActiveTrial(ctx: TenantContext, addonId: string): Promise<AddonTrial | null> {
    const trial = await db('addon_trials')
      .where('organization_id', ctx.organizationId)
      .where('addon_id', addonId)
      .where('trial_status', 'active')
      .first();

    return trial ? this.parseTrial(trial) : null;
  }

  /**
   * Update trial status
   */
  async updateTrialStatus(
    ctx: TenantContext,
    trialId: string,
    status: 'converted' | 'expired' | 'cancelled',
    decision?: string,
    reason?: string,
  ): Promise<void> {
    const updateData: any = {
      trial_status: status,
      updated_at: new Date(),
    };

    if (status === 'converted') {
      updateData.conversion_decision = decision || 'converted';
      updateData.converted_at = new Date();
    } else if (status === 'cancelled' || status === 'expired') {
      updateData.conversion_decision = 'declined';
      updateData.conversion_reason = reason;
      updateData.converted_at = new Date();
    }

    await db('addon_trials')
      .where('id', trialId)
      .where('organization_id', ctx.organizationId)
      .update(updateData);
  }

  /**
   * Generate next invoice number
   */
  async generateInvoiceNumber(): Promise<string> {
    const count = await db('addon_billing_history').count('* as count').first();
    const nextNumber = Number(count?.count || 0) + 1;
    return `INV-${Date.now()}-${String(nextNumber).padStart(5, '0')}`;
  }

  /**
   * Parse addon from database record
   */
  private parseAddon(record: any): Addon {
    return {
      ...record,
      features: typeof record.features === 'string' ? JSON.parse(record.features) : record.features || [],
    };
  }

  /**
   * Parse subscription from database record
   */
  private parseSubscription(record: any): OrganizationAddonSubscription {
    return {
      ...record,
      enabled_features:
        typeof record.enabled_features === 'string' ? JSON.parse(record.enabled_features) : record.enabled_features || {},
    };
  }

  /**
   * Parse billing history record
   */
  private parseBillingHistory(record: any): AddonBillingHistory {
    return record;
  }

  /**
   * Parse trial record
   */
  private parseTrial(record: any): AddonTrial {
    return {
      ...record,
      features_enabled: typeof record.features_enabled === 'string' ? JSON.parse(record.features_enabled) : [],
    };
  }
}
