import React, { useState } from 'react';
import { apiClient } from '@/config/api';
import { expenseError, expenseUi as ui } from './ExpenseWorkflowUi';

export function LegacyWorkflowNotice({ rows, prefix = '', onComplete }: { rows: any[]; prefix?: string; onComplete: () => void }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const legacy = rows.filter(r => r.needsWorkflowMigration);
  if (!legacy.length) return null;
  const submit = async (row: any) => {
    if (!confirm('Resubmit this existing request? Approval restarts at step 1 of the matching published workflow. Previous history is retained.')) return;
    setBusy(true); setError('');
    try { await apiClient.post(`/expenses/claims/${prefix}${row.id}/resubmit-workflow`); onComplete(); }
    catch (e: any) { setError(expenseError(e, 'Unable to resubmit. Contact your workflow administrator.')); }
    finally { setBusy(false); }
  };
  return <section className="border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 rounded-xl p-4 space-y-3"><h2 className="text-sm font-semibold text-balance">Older requests need workflow resubmission</h2><p className="text-xs text-pretty">These requests have no saved workflow execution. Only the original claimant can restart approval; no role can approve them directly.</p>{legacy.map(r => <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-amber-200 dark:border-amber-900 pt-3"><span className="text-xs font-medium">{r.claimNumber || r.requestNumber || r.advanceNumber || `Mileage ${r.id}`}</span><button disabled={busy} onClick={() => submit(r)} className={ui.secondary}>Resubmit into workflow</button></div>)}{error && <p role="alert" className={ui.error}>{error}</p>}</section>;
}
