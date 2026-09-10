import { useEffect, useState } from 'react';
import { expenseApi } from '../api/expenseApi';
import { formatMoney, type MoneyFormatConfig } from './formatMoney';

/**
 * Loads Expense settings (currency symbol/locale) once per page and returns a
 * `money(n)` formatter. Before settings load it returns the default ₹/en-IN
 * rendering — identical to the previous hardcoded output — so there's no visual
 * flash or behaviour change; it just becomes config-driven once loaded.
 */
export function useExpenseMoney() {
  const [cfg, setCfg] = useState<MoneyFormatConfig | null>(null);

  useEffect(() => {
    let active = true;
    expenseApi
      .getSettings()
      .then((s: any) => {
        if (!active) return;
        setCfg({
          currencySymbol: s?.currencySymbol || undefined,
          currencyLocale: s?.currencyLocale || undefined,
        });
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      active = false;
    };
  }, []);

  const money = (amount: number | string | null | undefined) => formatMoney(amount, cfg);
  return money;
}