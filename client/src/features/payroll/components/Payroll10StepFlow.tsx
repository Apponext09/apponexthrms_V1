import React, { useState, useEffect } from 'react';
import { CheckCircle, RefreshCw, Lock, FileText, ArrowRight, AlertTriangle, Info, Users, IndianRupee } from 'lucide-react';
import { PayslipViewer } from '../pages/PayslipViewer';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';

const fmt = (n: number) => '₹' + Math.round(n || 0).toLocaleString('en-IN');

type Step = 1 | 2 | 3;

export const Payroll10StepFlow: React.FC = () => {
  // State
  const [step, setStep] = useState<Step>(1);
  const [cycles, setCycles] = useState<any[]>([]);
  const [cycleId, setCycleId] = useState('');
  const [runId, setRunId] = useState<number | null>(null);
  const [runStatus, setRunStatus] = useState('');
  const [totals, setTotals] = useState({ gross: 0, deductions: 0, net: 0, employees: 0 });
  const [error, setError] = useState('');

  // Button loading states
  const [calculating, setCalculating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Step completion flags
  const [done1, setDone1] = useState(false);
  const [done2, setDone2] = useState(false);
  const [done3, setDone3] = useState(false);

  // Load cycles
  useEffect(() => {
    apiClient.get('/payroll/cycles').then((res: any) => {
      const list: any[] = res?.data?.data || res?.data || [];
      setCycles(list);
      const open = list.find((c: any) => c.status === 'open') || list[0];
      if (open) setCycleId(String(open.id));
    }).catch(() => {});
  }, []);

  // Load totals from the process register for a given run
  const loadTotals = async (_id: number) => {
    try {
      const res: any = await apiClient.get('/payroll/process-register');
      const emps: any[] = res?.data?.data || [];
      const gross = emps.reduce((s: number, e: any) => s + Number(e.gross_earned || e.gross_monthly || 0), 0);
      const ded = emps.reduce((s: number, e: any) => s + Number(e.total_deductions || 0), 0);
      setTotals({ gross, deductions: ded, net: gross - ded, employees: emps.length });
    } catch { /* silent */ }
  };

  // Check if a run already exists for this cycle
  useEffect(() => {
    if (!cycleId) return;
    setRunId(null); setRunStatus(''); setDone1(false); setDone2(false); setDone3(false); setStep(1);
    setTotals({ gross: 0, deductions: 0, net: 0, employees: 0 });
    apiClient.get('/payroll', { params: { cycleId } }).then((res: any) => {
      const runs: any[] = res?.data?.data || res?.data || [];
      if (runs.length > 0) {
        const r = runs[0];
        setRunId(r.id); setRunStatus(r.status);
        if (['processed','approved','locked','published'].includes(r.status)) {
          setDone1(true); setStep(2);
          loadTotals(r.id);   // ← reload totals for resumed run
        }
        if (['approved','locked','published'].includes(r.status)) { setDone2(true); setStep(3); }
        if (r.status === 'published') { setDone3(true); }
      }
    }).catch(() => {});
  }, [cycleId]);


  const handleCalculate = async () => {
    if (!cycleId) { showToast.error('Select Cycle', 'Choose a pay cycle first.'); return; }
    setCalculating(true); setError('');
    try {
      const gen: any = await apiClient.post('/payroll/generate', { payrollCycleId: Number(cycleId) });
      const id = gen?.data?.data?.id || gen?.data?.id;
      if (!id) throw new Error('Could not create payroll run');
      setRunId(id);
      await apiClient.post(`/payroll/${id}/process`);
      await loadTotals(id);
      setRunStatus('processed'); setDone1(true);
      showToast.success('Done ✅', 'Salaries calculated for all employees.');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Calculation failed';
      setError(msg); showToast.error('Failed', msg);
    } finally { setCalculating(false); }
  };

  // Step 2 — Approve
  const handleApprove = async () => {
    if (!runId) return;
    setApproving(true); setError('');
    try {
      await apiClient.post(`/payroll/${runId}/approve`);
      setRunStatus('approved'); setDone2(true);
      showToast.success('Approved ✅', 'Payroll approved.');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Approval failed';
      setError(msg); showToast.error('Failed', msg);
    } finally { setApproving(false); }
  };

  // Step 3a — Lock
  const handleLock = async () => {
    if (!runId) return;
    setLocking(true); setError('');
    try {
      await apiClient.post(`/payroll/${runId}/lock`);
      setRunStatus('locked');
      showToast.success('Locked 🔒', 'Payroll period locked.');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Lock failed';
      setError(msg); showToast.error('Failed', msg);
    } finally { setLocking(false); }
  };

  // Step 3b — Publish
  const handlePublish = async () => {
    if (!runId) return;
    setPublishing(true); setError('');
    try {
      await apiClient.post(`/payroll/${runId}/publish`);
      setRunStatus('published'); setDone3(true);
      showToast.success('Published 🎉', 'Payslips are now visible to all employees.');
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Publish failed';
      setError(msg); showToast.error('Failed', msg);
    } finally { setPublishing(false); }
  };

  const selectedCycle = cycles.find(c => String(c.id) === cycleId);

  return (
    <div className="space-y-4">
      {/* Cycle Selector + Status */}
      <div className="flex flex-wrap items-center gap-3 p-3 border border-border rounded-xl bg-muted/30">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Pay Cycle:</label>
          <select
            value={cycleId}
            onChange={e => setCycleId(e.target.value)}
            className="h-8 px-3 border border-border rounded-lg text-xs bg-background font-medium text-foreground"
          >
            <option value="">Select Cycle</option>
            {cycles.map(c => <option key={c.id} value={String(c.id)}>{c.cycle_name || c.name} ({c.status})</option>)}
          </select>
        </div>
        {runStatus && (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            runStatus === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            runStatus === 'locked'    ? 'bg-rose-50 text-rose-700 border-rose-200' :
            runStatus === 'approved'  ? 'bg-blue-50 text-blue-700 border-blue-200' :
            runStatus === 'processed' ? 'bg-primary/10 text-primary border-primary/20' :
            'bg-muted text-muted-foreground border-border'
          }`}>Run #{runId} — {runStatus.toUpperCase()}</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {typeof error === 'string' ? error : (error as any)?.message || 'An error occurred'}
        </div>
      )}

      {/* Step Navigator */}
      <div className="flex items-center gap-0">
        {[
          { num: 1, label: 'Calculate', done: done1 },
          { num: 2, label: 'Approve',   done: done2 },
          { num: 3, label: 'Publish',   done: done3 },
        ].map((s, i) => (
          <React.Fragment key={s.num}>
            <button
              onClick={() => setStep(s.num as Step)}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border rounded-lg transition-colors ${
                step === s.num
                  ? 'border-primary bg-primary text-primary-foreground'
                  : s.done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.done
                ? <CheckCircle className="w-3.5 h-3.5" />
                : <span className="w-4 h-4 flex items-center justify-center rounded-full border text-[10px] font-bold border-current">{s.num}</span>
              }
              {s.label}
            </button>
            {i < 2 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mx-1 shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      {/* ─── Step 1: Calculate ─── */}
      {step === 1 && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-bold text-foreground">Step 1 — Calculate Salaries</h2>
            <p className="text-xs text-muted-foreground">Process gross-to-net salary for all active employees in this cycle.</p>
          </div>
          <div className="p-4 space-y-4">
            {selectedCycle && (
              <div className="flex flex-wrap gap-4 text-xs">
                <div><span className="text-muted-foreground">Cycle:</span> <strong>{selectedCycle.cycle_name || selectedCycle.name}</strong></div>
                <div><span className="text-muted-foreground">Frequency:</span> <strong>{selectedCycle.frequency || 'Monthly'}</strong></div>
                <div><span className="text-muted-foreground">Status:</span> <strong>{selectedCycle.status}</strong></div>
              </div>
            )}
            {!done1 ? (
              <button
                onClick={handleCalculate}
                disabled={calculating || !cycleId}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                {calculating ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Calculating...</> : 'Run Salary Calculation'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                  <CheckCircle className="w-4 h-4" /> Calculation complete — Run #{runId}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Employees', val: String(totals.employees || '—'), icon: Users },
                    { label: 'Total Gross', val: fmt(totals.gross), icon: IndianRupee },
                    { label: 'Net Disbursal', val: fmt(totals.net), icon: IndianRupee },
                  ].map(({ label, val, icon: Icon }) => (
                    <div key={label} className="border border-border rounded-lg p-3 bg-muted/20">
                      <div className="text-[10px] text-muted-foreground font-semibold uppercase">{label}</div>
                      <div className="text-sm font-black text-foreground mt-0.5">{val}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  Go to Step 2 — Approve <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Step 2: Approve ─── */}
      {step === 2 && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="text-sm font-bold text-foreground">Step 2 — Review & Approve</h2>
            <p className="text-xs text-muted-foreground">Verify the totals and approve the payroll run.</p>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Employees', val: String(totals.employees || '—') },
                { label: 'Total Gross', val: fmt(totals.gross) },
                { label: 'Deductions', val: fmt(totals.deductions) },
                { label: 'Net Disbursal', val: fmt(totals.net) },
              ].map(({ label, val }) => (
                <div key={label} className="border border-border rounded-lg p-3">
                  <div className="text-[10px] text-muted-foreground font-semibold uppercase">{label}</div>
                  <div className="text-sm font-black text-foreground mt-0.5">{val}</div>
                </div>
              ))}
            </div>
            {!done1 && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Info className="w-3.5 h-3.5 shrink-0" /> Complete Step 1 first.
              </div>
            )}
            {done1 && !done2 && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                {approving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Approving...</> : '✓ Approve Payroll Run'}
              </button>
            )}
            {done2 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                  <CheckCircle className="w-4 h-4" /> Payroll approved successfully
                </div>
                <button onClick={() => setStep(3)} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  Go to Step 3 — Lock & Publish <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Step 3: Lock & Publish ─── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="text-sm font-bold text-foreground">Step 3 — Lock & Publish Payslips</h2>
              <p className="text-xs text-muted-foreground">Lock salary figures then publish payslips to employee portals.</p>
            </div>
            <div className="p-4 space-y-3">
              {!done2 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <Info className="w-3.5 h-3.5 shrink-0" /> Approve payroll first (Step 2).
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {/* Lock */}
                {runStatus !== 'locked' && runStatus !== 'published' ? (
                  <button
                    onClick={handleLock}
                    disabled={locking || !done2}
                    className="flex items-center gap-2 border border-border hover:bg-muted/40 text-foreground text-xs font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {locking ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Locking...</> : <><Lock className="w-3.5 h-3.5" /> Lock Payroll Figures</>}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-rose-700 font-semibold border border-rose-200 bg-rose-50 px-4 py-2.5 rounded-lg">
                    <Lock className="w-3.5 h-3.5" /> Period Locked
                  </div>
                )}

                {/* Publish */}
                {!done3 ? (
                  <button
                    onClick={handlePublish}
                    disabled={publishing || !['locked','approved'].includes(runStatus)}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
                  >
                    {publishing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Publishing...</> : <><FileText className="w-3.5 h-3.5" /> Publish All Payslips</>}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold border border-emerald-200 bg-emerald-50 px-4 py-2.5 rounded-lg">
                    <CheckCircle className="w-3.5 h-3.5" /> All Payslips Published
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payslip Hub */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> Payslip Preview — All Employees
              </h2>
            </div>
            <div className="p-4">
              <PayslipViewer />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
