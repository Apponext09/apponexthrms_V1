import { getKnex } from '../../../db/knex';

/**
 * Central source of truth for Expense-module configuration that used to be
 * hardcoded. All values are read from the database, with fallback defaults that
 * are identical to the previous hardcoded literals — so runtime behaviour is
 * unchanged until an admin edits the stored values.
 */
export interface ExpenseConfig {
  currencySymbol: string;
  currencyCode: string;
  currencyLocale: string;
  claimNumberPrefix: string;
  travelRequestNumberPrefix: string;
  travelAdvanceNumberPrefix: string;
  defaultPaymentMethod: string;
  defaultAdvanceStatus: string;
  workflowFallbackMaxAmount: number;
  numberSequenceDigits: number;
  mileageRateCar: number;
  mileageRateBike: number;
  labels: Record<string, string>;
}

export class ExpenseConfigService {
  static async load(organizationId: number, db = getKnex()): Promise<ExpenseConfig> {
    const settings = await db('expense_settings')
      .where('organization_id', organizationId)
      .first()
      .catch(() => null);

    const labels: Record<string, string> = {};
    const labelRows = await db('expense_config_labels')
      .where('organization_id', organizationId)
      .select('label_key', 'label_value')
      .catch(() => []);
    for (const r of labelRows || []) {
      labels[r.labelKey ?? r.label_key] = r.labelValue ?? r.label_value;
    }

    const car = Number((settings?.mileageRateCar ?? settings?.mileage_rate_car) ?? settings?.mileageRateCar);
    const bike = Number((settings?.mileageRateBike ?? settings?.mileage_rate_bike) ?? settings?.mileageRateBike);

    return {
      currencySymbol: (settings?.currencySymbol ?? settings?.currency_symbol) || '₹',
      currencyCode: (settings?.currencyCode ?? settings?.currency_code) || 'INR',
      currencyLocale: (settings?.currencyLocale ?? settings?.currency_locale) || 'en-IN',
      claimNumberPrefix: (settings?.claimNumberPrefix ?? settings?.claim_number_prefix) || 'EXP',
      travelRequestNumberPrefix: (settings?.travelRequestNumberPrefix ?? settings?.travel_request_number_prefix) || 'TRV',
      travelAdvanceNumberPrefix: (settings?.travelAdvanceNumberPrefix ?? settings?.travel_advance_number_prefix) || 'ADV',
      defaultPaymentMethod: (settings?.defaultPaymentMethod ?? settings?.default_payment_method) || 'bank_transfer',
      defaultAdvanceStatus: (settings?.defaultAdvanceStatus ?? settings?.default_advance_status) || 'pending_finance',
      workflowFallbackMaxAmount: Number((settings?.workflowFallbackMaxAmount ?? settings?.workflow_fallback_max_amount) || 10000000),
      numberSequenceDigits: Number((settings?.numberSequenceDigits ?? settings?.number_sequence_digits) || 6),
      mileageRateCar: Number.isFinite(car) ? car : 12,
      mileageRateBike: Number.isFinite(bike) ? bike : 6,
      labels,
    };
  }

  static label(config: ExpenseConfig, key: string, fallback: string): string {
    return config.labels[key] || fallback;
  }

  /**
   * Atomically increments a per-org, per-key sequence and returns a formatted
   * number like "EXP-000001". Falls back to a timestamp-based number if the
   * sequences table is unavailable (e.g. non-MySQL engine) so creation never breaks.
   */
  static async nextNumber(
    organizationId: number,
    seqKey: string,
    prefix: string,
    digits: number,
    db = getKnex()
  ): Promise<string> {
    const safeDigits = Number.isFinite(digits) && digits > 0 ? digits : 6;
    try {
      const nextVal = await db.transaction(async (trx: any) => {
        const row = await trx('expense_number_sequences')
          .where({ organization_id: organizationId, seq_key: seqKey })
          .first()
          .forUpdate();
        let val: number;
        if (!row) {
          await trx('expense_number_sequences').insert({
            organization_id: organizationId,
            seq_key: seqKey,
            prefix,
            current_value: 1,
            created_at: new Date(),
            updated_at: new Date(),
          });
          val = 1;
        } else {
          const rawVal = row.current_value !== undefined ? row.current_value : row.currentValue;
          const rawNum = Number(rawVal);
          val = Number.isFinite(rawNum) && rawNum >= 0 ? rawNum + 1 : 1;
          await trx('expense_number_sequences')
            .where({ organization_id: organizationId, seq_key: seqKey })
            .update({ current_value: val, prefix, updated_at: new Date() });
        }
        return val;
      });
      return `${prefix}-${String(nextVal).padStart(safeDigits, '0')}`;
    } catch (err) {
      console.error('ExpenseConfigService.nextNumber failed, using timestamp fallback:', err);
      return `${prefix}-${Date.now().toString().slice(-safeDigits)}`;
    }
  }

  static formatAmount(amount: number, config: ExpenseConfig): string {
    const num = Number(amount || 0);
    try {
      return `${config.currencySymbol}${num.toLocaleString(config.currencyLocale)}`;
    } catch {
      return `${config.currencySymbol}${num.toLocaleString('en-IN')}`;
    }
  }
}
