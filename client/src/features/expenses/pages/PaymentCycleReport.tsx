import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Download, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { apiClient } from '@/config/api';
import { expenseApi } from '../api/expenseApi';
import { useExpenseMoney } from '../utils/useExpenseMoney';
import { expenseError, expenseUi as ui, ExpenseWorkflowDialog } from './ExpenseWorkflowUi';

export function PaymentCycleReport() {
  const [rows, setRows] = useState<any[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(''), [endDate, setEndDate] = useState(''), [status, setStatus] = useState('');
  const [selected, setSelected] = useState<any>(null), [reference, setReference] = useState(''), [method, setMethod] = useState('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10)), [saving, setSaving] = useState(false);
  const money = useExpenseMoney();
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await apiClient.get('/expenses/payment-cycle', { params: { startDate: startDate || undefined, endDate: endDate || undefined, status: status || undefined } }); setRows(response.data.data); }
    catch (e: any) { setError(expenseError(e, 'Unable to load payment records')); setRows([]); }
    finally { setLoading(false); }
  }, [startDate, endDate, status]);
  useEffect(() => { load(); }, [load]);
  const pay = async () => {
    if (!selected || !reference.trim() || saving) return;
    setSaving(true); setError('');
    try { await expenseApi.processReimbursement(selected.requestId, { paymentDate, paidAmount: selected.payableAmount, paymentMethod: method, paymentReference: reference.trim() }); setSelected(null); setReference(''); await load(); }
    catch (e: any) { setError(expenseError(e, 'Payment failed')); }
    finally { setSaving(false); }
  };
  const download = () => {
    const fields = ['requestNumber', 'entityType', 'employeeName', 'workflowName', 'workflowVersion', 'approvedAmount', 'advanceApplied', 'payableAmount', 'paidAmount', 'paymentDate', 'paymentMethod', 'paymentReference', 'paidBy', 'status'];
    const cell = (value: any) => '"' + String(value ?? '').replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""') + '"';
    const csv = [fields.join(','), ...rows.map(r => fields.map(f => cell(r[f])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'expense-payment-cycle.csv'; a.click(); URL.revokeObjectURL(url);
  };
  return <div className={ui.page}>
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h1 className="text-xl sm:text-2xl font-bold text-balance flex items-center gap-2"><FileSpreadsheet className="size-6 text-blue-600" />Payment Cycle Reports</h1><p className="text-xs text-slate-500 dark:text-slate-400 text-pretty mt-0.5">Approved requests, advance settlements, and disbursement records.</p></div><button onClick={download} disabled={!rows.length} className={ui.primary}><Download className="size-4" />Export CSV</button></header>
    <p className={ui.info}>CEO, HR, and Finance can inspect payment records. Viewing reports does not grant approval authority. Only Finance can record disbursement after all workflow approvals.</p>
    <section className={ui.card + ' p-4 grid gap-3 sm:grid-cols-4 items-end'}>
      <label className={ui.label}>Paid from<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={ui.input} /></label>
      <label className={ui.label}>Paid until<input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={ui.input} /></label>
      <label className={ui.label}>Payment status<select value={status} onChange={e => setStatus(e.target.value)} className={ui.input}><option value="">All payment cycles</option><option value="payment_pending">Awaiting payment</option><option value="paid">Disbursed</option></select></label>
      <button onClick={load} disabled={loading} className={ui.secondary}><RefreshCw className="size-4" />Refresh</button>
    </section>
    {error && !selected && <p role="alert" className={ui.error}>{error}</p>}
    <section className={ui.card + ' overflow-hidden'}>
      {loading ? <p role="status" className="p-10 text-sm text-slate-500 text-center">Loading payment records…</p> : !rows.length ? <div className="p-12 text-center"><CreditCard className="size-10 text-blue-500 mx-auto mb-3" /><h2 className="font-semibold text-balance">No matching payment records</h2><p className="text-xs text-slate-500 mt-2 mb-4">Requests appear after the final workflow approval.</p><button onClick={() => { setStartDate(''); setEndDate(''); setStatus(''); load(); }} className={ui.secondary}>Refresh records</button></div> :
      <div className="overflow-x-auto"><table className={ui.table}><thead className={ui.head}><tr>{['Request', 'Employee', 'Workflow', 'Approved / net payable', 'Paid', 'Payment details', 'Disbursed by', 'Status'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map(r => <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30"><td><p className="font-semibold whitespace-nowrap">{r.requestNumber}</p><p className="text-slate-500 mt-1">{r.entityType.replace(/_/g, ' ')}</p></td><td className="font-medium">{r.employeeName || 'Claimant unavailable'}</td><td><p>{r.workflowName}</p>{r.workflowVersion != null && <p className="text-slate-500 mt-1">Version {r.workflowVersion}</p>}</td><td className="whitespace-nowrap"><p className="font-semibold">{money(r.approvedAmount)}</p>{!r.legacy && <><p className="text-slate-500 mt-1">Advance: {money(r.advanceApplied || 0)}</p><p className="text-blue-600 dark:text-blue-400 mt-1">Net: {money(r.payableAmount)}</p></>}</td><td className="font-semibold whitespace-nowrap">{money(r.paidAmount)}</td><td><p>{r.paymentDate || 'Not paid'}</p><p className="text-slate-500 mt-1">{r.paymentMethod?.replace(/_/g, ' ') || '—'}</p><p className="font-mono mt-1">{r.paymentReference}</p></td><td>{r.paidBy || '—'}</td><td><span className="inline-flex rounded-full px-2.5 py-1 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 font-semibold whitespace-nowrap">{r.status === 'paid' ? 'Disbursed' : 'Awaiting payment'}</span>{r.canDisburse && <button onClick={() => { setSelected(r); setReference(''); setError(''); }} className={ui.primary + ' mt-2'}>Record payment</button>}</td></tr>)}</tbody></table></div>}
      <footer className="px-4 py-3 text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800 tabular-nums">{rows.length} records · Payment references and legacy history are retained</footer>
    </section>
    <ExpenseWorkflowDialog open={Boolean(selected)} onClose={() => { if (!saving) setSelected(null); }} title={selected ? 'Record payment · ' + selected.requestNumber : 'Record payment'} description="Record a completed bank, cash, payroll, or online payment. This does not initiate a bank transfer." compact alert>
      {selected && <><div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-4 space-y-2 text-xs tabular-nums"><p className="font-semibold">{selected.employeeName}</p><p>Approved: {money(selected.approvedAmount)}</p><p>Advance applied: {money(selected.advanceApplied || 0)}</p><p className="font-bold text-blue-600 dark:text-blue-400">Net payment: {money(selected.payableAmount)}</p></div>
      <label className={ui.label}>Payment date<input type="date" max={new Date().toISOString().slice(0, 10)} value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={ui.input} /></label>
      <label className={ui.label}>Payment method<select value={method} onChange={e => setMethod(e.target.value)} className={ui.input}><option value="bank_transfer">Bank transfer</option><option value="online">Online</option><option value="payroll">Payroll</option><option value="cash">Cash</option></select></label>
      <label className={ui.label}>UTR / payment / settlement reference<input maxLength={100} value={reference} onChange={e => setReference(e.target.value)} className={ui.input} placeholder="Required for the payment audit trail" /></label>
      {error && <p role="alert" className={ui.error}>{error}</p>}<div className="flex gap-2 justify-end border-t border-slate-200 dark:border-slate-800 pt-4"><button disabled={saving} onClick={() => setSelected(null)} className={ui.secondary}>Cancel</button><button disabled={saving || !reference.trim()} onClick={pay} className={ui.primary}>{saving ? 'Saving…' : selected.payableAmount === 0 ? 'Record settlement' : 'Record disbursement'}</button></div></>}
    </ExpenseWorkflowDialog>
  </div>;
}
