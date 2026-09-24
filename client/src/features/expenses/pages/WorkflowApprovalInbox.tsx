import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileCheck, Filter, RefreshCw, Search, Paperclip, Users } from 'lucide-react';
import { expenseApi } from '../api/expenseApi';
import { useExpenseMoney } from '../utils/useExpenseMoney';
import { expenseError, expenseUi as ui, ExpenseWorkflowDialog } from './ExpenseWorkflowUi';

type WorkflowApprovalInboxProps = {
  defaultStatusFilter?: string;
  allowedStatuses?: string[];
  portalLabel?: string;
  portalDescription?: string;
};

export function WorkflowApprovalInbox({
  portalLabel = 'Expense Approvals',
  portalDescription = 'Only requests assigned to you by the current workflow step appear here.',
}: WorkflowApprovalInboxProps) {
  const [rows, setRows] = useState<any[]>([]), [selected, setSelected] = useState<any>(null);
  const [comments, setComments] = useState(''), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(''), [type, setType] = useState('');
  const [selectedIds, setSelectedIds] = useState<Array<number | string>>([]), [bulkOpen, setBulkOpen] = useState(false);
  const money = useExpenseMoney();
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await expenseApi.getClaims({ mode: 'approvals', status: 'pending_approvals' })); setSelectedIds([]); setError(''); }
    catch (e: any) { setError(expenseError(e, 'Unable to load assigned approvals')); setRows([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const visible = rows.filter(r => (!type || r.entityType === type) && [r.claimNumber, r.firstName, r.lastName, r.departmentName, r.title].join(' ').toLowerCase().includes(search.toLowerCase()));
  const open = async (row: any) => {
    setError(''); setComments('');
    try { const details = await expenseApi.getClaimById(row.id); setSelected({ ...row, ...details }); }
    catch (e: any) { setError(expenseError(e, 'Unable to open request')); }
  };
  const act = async (action: string) => {
    if (!selected || busy) return;
    if ((action !== 'approve' || selected.requiresAbsenceReason) && !comments.trim()) { setError('Enter a reason for this action.'); return; }
    setBusy(true); setError('');
    try {
      const result = action === 'approve' ? await expenseApi.financeVerifyClaim(selected.id, {
        comments,
        ...(selected.currentStepFinance && selected.entityType === 'expense_claim' ? { items: (selected.items || []).map((it: any) => ({ id: it.id, approvedAmount: it.reviewAmount ?? it.claimedAmount, adjustmentReason: it.reviewReason })) } : {}),
        ...(selected.currentStepFinance && selected.entityType === 'travel_advance' ? { approvedAmount: selected.reviewAmount ?? selected.totalClaimedAmount } : {}),
      }) : action === 'reject' ? await expenseApi.rejectClaim(selected.id, comments) : await expenseApi.returnClaim(selected.id, comments);
      setMessage(result?.message || 'Workflow action recorded'); setSelected(null); await load();
    } catch (e: any) { setError(expenseError(e, 'Approval failed')); }
    finally { setBusy(false); }
  };
  const bulk = async () => {
    if (busy) return;
    if (rows.some(r => selectedIds.includes(r.id) && r.requiresAbsenceReason) && !comments.trim()) { setError('A reason is required for an absence-fallback approval.'); return; }
    setBusy(true);
    try {
      const result = await expenseApi.bulkApproveClaims(selectedIds, comments);
      setMessage(result.approved.length + ' approvals recorded. ' + result.failed.map((f: any) => '#' + f.id + ': ' + f.message).join(' '));
      setBulkOpen(false); await load();
    } catch (e: any) { setError(expenseError(e, 'Bulk approval failed')); }
    finally { setBusy(false); }
  };
  return <div className={ui.page}>
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div><h1 className="text-xl sm:text-2xl font-bold text-balance flex items-center gap-2"><FileCheck className="size-6 text-blue-600" />{portalLabel}</h1><p className="text-xs text-slate-500 dark:text-slate-400 text-pretty mt-0.5">{portalDescription}</p></div>
      <div className="flex gap-2">{selectedIds.length > 0 && <button onClick={() => { setComments(''); setError(''); setBulkOpen(true); }} className={ui.primary}>Approve selected ({selectedIds.length})</button>}<button onClick={load} disabled={loading} className={ui.secondary}><RefreshCw className="size-4" />Refresh</button></div>
    </header>
    {error && !selected && !bulkOpen && <p role="alert" className={ui.error}>{error}</p>}
    {message && <p role="status" className={ui.info}>{message}</p>}
    <section className={ui.card + ' p-4 space-y-3'}>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Filter className="size-4" />Filter your assigned requests <span className="ml-auto tabular-nums">{visible.length} requests</span></div>
      <div className="grid gap-3 sm:grid-cols-3"><label className="relative sm:col-span-2"><span className="sr-only">Search assigned requests</span><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><input className={ui.input + ' pl-9'} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employee, department or request number" /></label><label><span className="sr-only">Request type</span><select className={ui.input} value={type} onChange={e => setType(e.target.value)}><option value="">All request types</option>{['expense_claim', 'travel_request', 'travel_advance', 'mileage_claim'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></label></div>
    </section>
    <section className={ui.card + ' overflow-hidden'}>
      {loading ? <div role="status" className="p-10 text-center text-sm text-slate-500">Loading assigned approvals…</div> : !visible.length ? <div className="p-12 text-center"><CheckCircle2 className="size-10 text-blue-500 mx-auto mb-3" /><h2 className="font-semibold text-balance">No assigned requests</h2><p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-4">Other teams’ approvals are not included in your queue.</p><button onClick={() => { setSearch(''); setType(''); load(); }} className={ui.secondary}>Refresh approvals</button></div> :
      <div className="overflow-x-auto"><table className={ui.table}><thead className={ui.head}><tr><th><input aria-label="Select all visible approvals" type="checkbox" checked={visible.length > 0 && visible.every(r => selectedIds.includes(r.id))} onChange={e => setSelectedIds(e.target.checked ? visible.map(r => r.id) : [])} /></th>{['Employee', 'Request details', 'Amount', 'Workflow stage', 'Action'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{visible.map(r => <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"><td><input aria-label={'Select ' + r.claimNumber} type="checkbox" checked={selectedIds.includes(r.id)} onChange={e => setSelectedIds(ids => e.target.checked ? [...ids, r.id] : ids.filter(id => id !== r.id))} /></td><td><div className="flex items-center gap-2"><div className="rounded-full bg-blue-50 dark:bg-blue-950/40 p-2 text-blue-600"><Users className="size-4" /></div><div><p className="font-semibold">{r.firstName} {r.lastName}</p><p className="text-slate-500 mt-1">{r.departmentName || 'Unassigned department'}</p></div></div></td><td><p className="font-semibold">{r.claimNumber}</p><p className="text-slate-500 mt-1">{r.entityType?.replace(/_/g, ' ')}</p><p className="max-w-xs truncate mt-1">{r.title}</p></td><td className="font-bold whitespace-nowrap">{money(r.totalClaimedAmount)}</td><td><span className="inline-flex px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold">{r.currentApproverRole}</span><p className="text-slate-500 mt-2">{r.workflowName} · v{r.workflowVersion}</p>{r.requiresAbsenceReason && <p className="text-amber-700 dark:text-amber-400 mt-1">Configured absence fallback</p>}</td><td><button className={ui.primary} onClick={() => open(r)}>Review request</button></td></tr>)}</tbody></table></div>}
    </section>
    <ExpenseWorkflowDialog open={Boolean(selected)} onClose={() => { if (!busy) setSelected(null); }} title={selected ? selected.claimNumber + ' · ' + selected.currentApproverRole : 'Review request'} description="This action completes only your assigned workflow step. Final approval and disbursement are separate.">
      {selected && <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 text-xs"><div><p className="text-slate-500">Claimant</p><p className="font-semibold mt-1">{selected.firstName} {selected.lastName}</p></div><div><p className="text-slate-500">Claimed amount</p><p className="font-bold tabular-nums mt-1">{money(selected.totalClaimedAmount)}</p></div><div className="col-span-2"><p className="text-slate-500">Purpose / details</p><p className="mt-1">{selected.title || selected.purpose}</p>{selected.fromLocation && <p className="mt-1">{selected.fromLocation} → {selected.toLocation} · {String(selected.tripDate || selected.startDate || '').slice(0, 10)}{selected.endDate ? ' – ' + String(selected.endDate).slice(0, 10) : ''}</p>}</div></div>
        {selected.requiresAbsenceReason && <p className={ui.info}>The primary approver has approved full-day leave. The workflow assigns this step to you as their reporting manager. Record a reason; subsequent steps still apply.</p>}
        {(selected.items || []).map((it: any, idx: number) => <div key={it.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 text-xs"><div className="flex justify-between gap-3"><p className="font-semibold">{it.description || it.merchantName || 'Expense item'}</p><span className="font-bold tabular-nums">{money(it.claimedAmount)}</span></div>{it.policyViolations && <p className="text-amber-700 dark:text-amber-400">{it.policyViolations} · {it.employeeJustification}</p>}{it.receiptUrl && /^(https?:|data:image\/|data:application\/pdf|\/)/i.test(it.receiptUrl) && <a href={it.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 underline"><Paperclip className="size-3.5" />View receipt</a>}{selected.currentStepFinance && <div className="grid grid-cols-3 gap-3"><label className={ui.label}>Approved amount<input type="number" min={0} max={it.claimedAmount} step="0.01" value={it.reviewAmount ?? it.claimedAmount} onChange={e => setSelected({ ...selected, items: selected.items.map((x: any, i: number) => i === idx ? { ...x, reviewAmount: e.target.value } : x) })} className={ui.input} /></label><label className={ui.label + ' col-span-2'}>Adjustment reason<input value={it.reviewReason || ''} onChange={e => setSelected({ ...selected, items: selected.items.map((x: any, i: number) => i === idx ? { ...x, reviewReason: e.target.value } : x) })} className={ui.input} placeholder="Required when reducing an amount" /></label></div>}</div>)}
        {selected.currentStepFinance && selected.entityType === 'travel_advance' && <label className={ui.label}>Approved advance amount<input className={ui.input} type="number" min={0} max={selected.totalClaimedAmount} step="0.01" value={selected.reviewAmount ?? selected.totalClaimedAmount} onChange={e => setSelected({ ...selected, reviewAmount: e.target.value })} /></label>}
        <details className="text-xs rounded-xl border border-slate-200 dark:border-slate-800 p-3"><summary className="cursor-pointer font-semibold">Approval history</summary>{(selected.timeline || []).map((event: any) => <p key={event.id} className="py-2 text-slate-600 dark:text-slate-400">{new Date(event.createdAt).toLocaleString()} · Step {event.stepNumber} · {event.approverName} · {event.action} · {event.comments}</p>)}</details>
        <label className={ui.label}>Comments / reason<textarea rows={3} value={comments} onChange={e => setComments(e.target.value)} className={ui.input} placeholder="Required for rejection, return, or absence fallback" /></label>
        {error && <p role="alert" className={ui.error}>{error}</p>}
        <div className="flex flex-wrap gap-2 justify-end border-t border-slate-200 dark:border-slate-800 pt-4"><button disabled={busy} onClick={() => setSelected(null)} className={ui.secondary}>Cancel</button>{selected.canReturn && ['expense_claim', 'travel_request'].includes(selected.entityType) && <button disabled={busy} onClick={() => act('return')} className={ui.secondary}>Return for correction</button>}<button disabled={busy || !selected.canReject} onClick={() => act('reject')} className={ui.danger}>Reject request</button><button disabled={busy || !selected.canApprove} onClick={() => act('approve')} className={ui.primary}>{busy ? 'Saving…' : 'Approve this step'}</button></div>
      </div>}
    </ExpenseWorkflowDialog>
    <ExpenseWorkflowDialog open={bulkOpen} onClose={() => { if (!busy) setBulkOpen(false); }} title="Confirm selected approvals" description="Each request is checked independently against your current workflow assignment. Finance amounts will be approved as submitted; review individual requests to adjust amounts." compact alert>
      <p className="text-sm">{selectedIds.length} requests selected.</p><label className={ui.label}>Approval comments<textarea className={ui.input} value={comments} onChange={e => setComments(e.target.value)} /></label>{error && <p role="alert" className={ui.error}>{error}</p>}<div className="flex justify-end gap-2"><button onClick={() => setBulkOpen(false)} disabled={busy} className={ui.secondary}>Cancel</button><button onClick={bulk} disabled={busy} className={ui.primary}>{busy ? 'Saving…' : 'Confirm approvals'}</button></div>
    </ExpenseWorkflowDialog>
  </div>;
}
