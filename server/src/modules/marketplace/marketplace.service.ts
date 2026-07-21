import { getKnex } from '../../db/knex';
import type { TenantContext } from '../../db/types';

const db = getKnex();
import { MarketplaceRepository } from './marketplace.repository';
import type { SubscribeToAddonInput, UpdateSubscriptionInput, Addon } from './marketplace.types';
import { AuditService } from '../audit/audit.service';

export class MarketplaceService {
  private repo: MarketplaceRepository;
  private auditService: AuditService;

  constructor() {
    this.repo = new MarketplaceRepository();
    this.auditService = new AuditService();
  }

  /**
   * Get all available addons for marketplace
   */
  async getAvailableAddons(): Promise<Addon[]> {
    const addons = await this.repo.getAllAddons();
    return addons.filter((addon) => addon.status === 'active');
  }

  /**
   * Get addon details
   */
  async getAddonDetails(addonId: string): Promise<Addon | null> {
    const addon = await this.repo.getAddonById(addonId);
    if (!addon || addon.status !== 'active') {
      return null;
    }
    return addon;
  }

  /**
   * Get organization's current addon subscriptions
   */
  async getOrgSubscriptions(ctx: TenantContext) {
    const subscriptions = await this.repo.getOrgSubscriptions(ctx);
    return subscriptions.map((sub) => ({
      id: sub.id,
      addon_id: sub.addon_id,
      addon_name: sub.addon_name,
      subscription_status: sub.subscription_status,
      billing_cycle: sub.billing_cycle,
      monthly_price: sub.monthly_price,
      yearly_price: sub.yearly_price,
      next_renewal_date: sub.next_renewal_date,
      enabled_features: sub.enabled_features,
    }));
  }

  /**
   * Subscribe organization to addon
   * Handles both trial and paid subscriptions
   */
  async subscribeToAddon(ctx: TenantContext, input: SubscribeToAddonInput) {
    // Get addon details
    const addon = await this.repo.getAddonById(input.addon_id);
    if (!addon) {
      throw new Error('Addon not found');
    }

    if (addon.status !== 'active') {
      throw new Error('Addon is not available');
    }

    // Check if already subscribed
    const isAlreadySubscribed = await this.repo.isSubscribed(ctx, input.addon_id);
    if (isAlreadySubscribed) {
      throw new Error('Organization already subscribed to this addon');
    }

    const now = new Date();
    let subscriptionStatus: 'trial' | 'active' = 'active';
    let trialStartedAt: Date | undefined;
    let trialEndsAt: Date | undefined;
    let subscriptionStartedAt: Date | undefined;
    let nextRenewalDate: Date | undefined;

    // Determine if starting trial or direct subscription
    if (input.start_trial && addon.trial_enabled) {
      subscriptionStatus = 'trial';
      trialStartedAt = now;
      trialEndsAt = new Date(now);
      trialEndsAt.setDate(trialEndsAt.getDate() + addon.trial_days);

      // Create trial record
      await this.repo.createTrial(ctx, input.addon_id, trialEndsAt, addon.features);
    } else {
      // Direct paid subscription
      subscriptionStartedAt = now;
      nextRenewalDate = this.calculateNextRenewalDate(now, input.billing_cycle);
    }

    // Create subscription
    const enabledFeatures = addon.features.reduce(
      (acc, feature) => ({
        ...acc,
        [feature]: true,
      }),
      {},
    );

    const subscription = await this.repo.createSubscription(ctx, input.addon_id, {
      subscription_status: subscriptionStatus,
      billing_cycle: input.billing_cycle,
      monthly_price: addon.base_price,
      yearly_price: addon.base_price * 11, // Simplified: usually yearly = 11 months
      trial_started_at: trialStartedAt,
      trial_ends_at: trialEndsAt,
      subscription_started_at: subscriptionStartedAt,
      next_renewal_date: nextRenewalDate,
      enabled_features: enabledFeatures,
    });

    // Audit log
    await this.auditService.log(ctx, {
      action: 'CREATE',
      entityType: 'ADDON_SUBSCRIPTION',
      entityId: subscription.id,
      description: `Subscribed to ${addon.name} addon (${subscriptionStatus})`,
      metadata: {
        addon_id: input.addon_id,
        addon_name: addon.name,
        subscription_status: subscriptionStatus,
        billing_cycle: input.billing_cycle,
      },
    });

    return {
      id: subscription.id,
      subscription_status: subscriptionStatus,
      addon_name: addon.name,
      trial_ends_at: trialEndsAt,
    };
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  async updateSubscription(ctx: TenantContext, subscriptionId: string, input: UpdateSubscriptionInput) {
    const subscription = await this.repo.getSubscriptionById(ctx, subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const updateData: any = {};

    if (input.billing_cycle && input.billing_cycle !== subscription.billing_cycle) {
      updateData.billing_cycle = input.billing_cycle;
      updateData.next_renewal_date = this.calculateNextRenewalDate(new Date(), input.billing_cycle);
    }

    if (input.auto_renew !== undefined) {
      updateData.auto_renew = input.auto_renew;
    }

    const updated = await this.repo.updateSubscription(ctx, subscriptionId, updateData);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'ADDON_SUBSCRIPTION',
      entityId: subscriptionId,
      description: `Updated addon subscription settings`,
      beforeState: {
        billing_cycle: subscription.billing_cycle,
        auto_renew: subscription.auto_renew,
      },
      afterState: updateData,
    });

    return updated;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(ctx: TenantContext, subscriptionId: string, reason?: string) {
    const subscription = await this.repo.getSubscriptionById(ctx, subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    await this.repo.cancelSubscription(ctx, subscriptionId);

    // Audit log
    await this.auditService.log(ctx, {
      action: 'DELETE',
      entityType: 'ADDON_SUBSCRIPTION',
      entityId: subscriptionId,
      description: `Cancelled addon subscription`,
      metadata: {
        reason: reason || 'User requested cancellation',
      },
    });
  }

  /**
   * Get organization's trial offers
   */
  async getTrials(ctx: TenantContext) {
    const trials = await db('addon_trials')
      .where('organization_id', ctx.organizationId)
      .where('trial_status', 'active')
      .join('marketplace_addons', 'marketplace_addons.id', 'addon_trials.addon_id')
      .select(
        'addon_trials.*',
        'marketplace_addons.name as addon_name',
        'marketplace_addons.key as addon_key',
        'marketplace_addons.description as addon_description',
      );

    return trials.map((trial) => ({
      id: trial.id,
      addon_id: trial.addon_id,
      addon_name: trial.addon_name,
      addon_key: trial.addon_key,
      addon_description: trial.addon_description,
      trial_started_at: trial.trial_started_at,
      trial_ends_at: trial.trial_ends_at,
      days_remaining: this.calculateDaysRemaining(trial.trial_ends_at),
    }));
  }

  /**
   * Convert trial to paid subscription
   */
  async convertTrial(ctx: TenantContext, trialId: string, billing_cycle: 'monthly' | 'yearly') {
    const trial = await db('addon_trials')
      .where('id', trialId)
      .where('organization_id', ctx.organizationId)
      .first();

    if (!trial) {
      throw new Error('Trial not found');
    }

    if (trial.trial_status !== 'active') {
      throw new Error('Trial is not active');
    }

    const addon = await this.repo.getAddonById(trial.addon_id);
    if (!addon) {
      throw new Error('Addon not found');
    }

    const now = new Date();
    const nextRenewalDate = this.calculateNextRenewalDate(now, billing_cycle);

    // Create subscription record
    const enabledFeatures = addon.features.reduce(
      (acc, feature) => ({
        ...acc,
        [feature]: true,
      }),
      {},
    );

    const subscription = await this.repo.createSubscription(ctx, trial.addon_id, {
      subscription_status: 'active',
      billing_cycle,
      monthly_price: addon.base_price,
      yearly_price: addon.base_price * 11,
      subscription_started_at: now,
      next_renewal_date: nextRenewalDate,
      enabled_features: enabledFeatures,
    });

    // Update trial status
    await this.repo.updateTrialStatus(ctx, trialId, 'converted', 'converted');

    // Audit log
    await this.auditService.log(ctx, {
      action: 'UPDATE',
      entityType: 'ADDON_TRIAL',
      entityId: trialId,
      description: `Converted trial to paid subscription for ${addon.name}`,
      metadata: {
        subscription_id: subscription.id,
        billing_cycle,
      },
    });

    return subscription;
  }

  /**
   * Get billing history for organization
   */
  async getBillingHistory(ctx: TenantContext) {
    const history = await this.repo.getBillingHistory(ctx);
    return history.map((invoice) => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      total_amount: invoice.total_amount,
      currency: invoice.currency,
      payment_status: invoice.payment_status,
      billing_period_start: invoice.billing_period_start,
      billing_period_end: invoice.billing_period_end,
      due_date: invoice.due_date,
      paid_at: invoice.paid_at,
      created_at: invoice.created_at,
    }));
  }

  /**
   * Get invoice details
   */
  async getInvoice(ctx: TenantContext, invoiceId: string) {
    const invoice = await this.repo.getInvoiceById(ctx, invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const subscription = await db('organization_addon_subscriptions')
      .where('id', invoice.organization_addon_subscription_id)
      .first();

    const addon = await db('marketplace_addons').where('id', invoice.addon_id).first();

    return {
      ...invoice,
      addon_name: addon?.name,
      subscription_id: subscription?.id,
    };
  }

  /**
   * Helper: Calculate next renewal date
   */
  private calculateNextRenewalDate(fromDate: Date, billingCycle: 'monthly' | 'yearly'): Date {
    const nextDate = new Date(fromDate);
    if (billingCycle === 'monthly') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    }
    return nextDate;
  }

  /**
   * Helper: Calculate days remaining in trial
   */
  private calculateDaysRemaining(trialEndsAt: Date): number {
    const now = new Date();
    const diffTime = trialEndsAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
}
