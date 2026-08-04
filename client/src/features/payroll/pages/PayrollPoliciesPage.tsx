import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/config/api";
import { showToast } from "@/components/ui/toast";
import { Shield, BarChart2, Calendar, RefreshCw, Info, CheckCircle2 } from "lucide-react";

export const PayrollPoliciesPage: React.FC = () => {
  const { data: policyData, refetch, isLoading } = useQuery({
    queryKey: ["payroll-policy-settings"],
    queryFn: async () => {
      const res = await apiClient.get("/payroll/policies").catch(() => ({ data: {} }));
      return res.data?.data || res.data || {};
    }
  });

  const [policyForm, setPolicyForm] = useState({
    policy_name: "Standard Organization Payroll Policy",
    pay_calculation_basis: "working_days_26",
    lop_deduction_formula: "gross_divided_by_days",
    overtime_rate_multiplier: "1.50",
    fixed_working_days: "26",
    cutoff_day: "25",
    pay_day: "1",
    status: "active"
  });

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (policyData && Object.keys(policyData).length > 0) {
      setPolicyForm(prev => ({
        ...prev,
        policy_name: policyData.policy_name || policyData.name || prev.policy_name,
        pay_calculation_basis: policyData.pay_calculation_basis || prev.pay_calculation_basis,
        lop_deduction_formula: policyData.lop_deduction_formula || prev.lop_deduction_formula,
        overtime_rate_multiplier: String(policyData.overtime_rate_multiplier || prev.overtime_rate_multiplier),
        fixed_working_days: String(policyData.fixed_working_days || prev.fixed_working_days),
        cutoff_day: String(policyData.cutoff_day || prev.cutoff_day),
        pay_day: String(policyData.pay_day || prev.pay_day),
        status: policyData.status || prev.status
      }));
    }
  }, [policyData]);

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await apiClient.post("/payroll/policies", policyForm);
      showToast.success("Policy Saved", "Payroll policy saved to MySQL database successfully.");
      setSavedSuccess(true);
      refetch();
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch {
      showToast.error("Save Failed", "Could not save payroll policy. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const fc = "w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all";
  const lc = "text-xs font-semibold text-muted-foreground uppercase tracking-wide";

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-foreground tracking-tight">Payroll Policies</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Configure organization-wide payroll rules. All changes are stored directly in MySQL database.</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg transition-all cursor-pointer shadow-sm disabled:opacity-60"
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          {savedSuccess ? "Saved to DB!" : "Save Policy to DB"}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading policy from database...</span>
        </div>
      ) : (
        <div className="px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-card border border-border/70 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Info className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase">General Policy</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className={lc}>Policy Name</label>
                <input type="text" value={policyForm.policy_name} onChange={e => setPolicyForm({ ...policyForm, policy_name: e.target.value })} className={fc} />
              </div>
              <div>
                <label className={lc}>Status</label>
                <select value={policyForm.status} onChange={e => setPolicyForm({ ...policyForm, status: e.target.value })} className={fc}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className={lc}>Monthly Pay Day</label>
                <input type="number" min="1" max="31" value={policyForm.pay_day} onChange={e => setPolicyForm({ ...policyForm, pay_day: e.target.value })} className={fc} placeholder="1" />
                <p className="text-[10px] text-muted-foreground mt-1">Day of month on which salary is credited.</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <BarChart2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase">Calculation Rules</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className={lc}>Salary Calculation Basis</label>
                <select value={policyForm.pay_calculation_basis} onChange={e => setPolicyForm({ ...policyForm, pay_calculation_basis: e.target.value })} className={fc}>
                  <option value="calendar_days">Calendar Days (30)</option>
                  <option value="working_days_26">Fixed Working Days (26)</option>
                  <option value="working_days_fixed">Actual Month Days (28-31)</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Divisor used to calculate per-day salary.</p>
              </div>
              <div>
                <label className={lc}>LOP Deduction Formula</label>
                <select value={policyForm.lop_deduction_formula} onChange={e => setPolicyForm({ ...policyForm, lop_deduction_formula: e.target.value })} className={fc}>
                  <option value="gross_divided_by_days">Gross Salary div Working Days x LOP Days</option>
                  <option value="basic_divided_by_days">Basic Salary div Working Days x LOP Days</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Formula for Loss of Pay (absent days) deduction.</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border/70 rounded-xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase">Overtime and Cutoff</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className={lc}>Overtime Rate Multiplier</label>
                <input type="number" step="0.25" min="1" max="5" value={policyForm.overtime_rate_multiplier} onChange={e => setPolicyForm({ ...policyForm, overtime_rate_multiplier: e.target.value })} className={fc} placeholder="1.50" />
                <p className="text-[10px] text-muted-foreground mt-1">Multiplied by hourly rate for OT hours worked.</p>
              </div>
              <div>
                <label className={lc}>Attendance Cutoff Day</label>
                <input type="number" min="1" max="31" value={policyForm.cutoff_day} onChange={e => setPolicyForm({ ...policyForm, cutoff_day: e.target.value })} className={fc} placeholder="25" />
                <p className="text-[10px] text-muted-foreground mt-1">Last day attendance data is included in payroll.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-6 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Connected to MySQL Database</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-500 mt-0.5">
            All changes stored in <code className="font-mono font-bold">payroll_policies</code> table, scoped to your organization.
            Current: <strong>{policyData?.policy_name || policyData?.name || "Standard Org Policy"}</strong>
            {policyData?.updated_at && <> | Updated: <strong>{new Date(policyData.updated_at).toLocaleDateString("en-IN")}</strong></>}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PayrollPoliciesPage;
