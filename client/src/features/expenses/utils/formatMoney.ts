/**
 * Frontend money formatter driven by Expense settings.
 * Defaults to ₹ / en-IN so existing rendering is unchanged until an admin
 * changes the stored currency config. `settings` can come from
 * `expenseApi.getSettings()`.
 */
export interface MoneyFormatConfig {
  currencySymbol?: string;
  currencyLocale?: string;
}

export function formatMoney(
  amount: number | string | null | undefined,
  cfg?: MoneyFormatConfig | null
): string {
  const num = Number(amount || 0);
  const symbol = cfg?.currencySymbol || '₹';
  const locale = cfg?.currencyLocale || 'en-IN';
  try {
    return `${symbol}${num.toLocaleString(locale)}`;
  } catch {
    return `${symbol}${num.toLocaleString('en-IN')}`;
  }
}