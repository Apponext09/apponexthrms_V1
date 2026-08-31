import React, { useEffect, useState } from 'react';
import { expenseApi, ExpenseWorkflow, ExpenseWorkflowLevel, MileageDesignationRate } from '../api/expenseApi';
import {
  Sliders,
  Car,
  Save,
  ShieldAlert,
  Zap,
  GitBranch,
  Plus,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Check,
  Layers,
  Compass
} from 'lucide-react';

export const ExpenseSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'workflows'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [autoApprovalThreshold, setAutoApprovalThreshold] = useState<number>(500);
  const [categoryThresholds, setCategoryThresholds] = useState<Array<{ id: number; name: string; code?: string; autoApprovalThreshold: number }>>([]);
  const [mileageRateCar, setMileageRateCar] = useState<number>(12.00);
  const [mileageRateBike, setMileageRateBike] = useState<number>(6.00);
  const [mileageRatesByDesignation, setMileageRatesByDesignation] = useState<MileageDesignationRate[]>([]);
  const [requireManagerApproval, setRequireManagerApproval] = useState(true);
  const [requireFinanceApproval, setRequireFinanceApproval] = useState(true);
  const [multiLevelApproval, setMultiLevelApproval] = useState(true);
  const [enableTravelModule, setEnableTravelModule] = useState(true);
  const [enableMileageModule, setEnableMileageModule] = useState(true);

  // Workflows state
  const [workflows, setWorkflows] = useState<ExpenseWorkflow[]>([]);
  const [isWfModalOpen, setIsWfModalOpen] = useState(false);
  const [editingWfId, setEditingWfId] = useState<number | null>(null);
  const [wfName, setWfName] = useState('');
  const [wfDescription, setWfDescription] = useState('');
  const [wfMinAmount, setWfMinAmount] = useState<number>(0);
  const [wfMaxAmount, setWfMaxAmount] = useState<number>(100000);
  const [wfLevels, setWfLevels] = useState<ExpenseWorkflowLevel[]>([
    { levelOrder: 1, approverType: 'reporting_manager', approverRole: 'Reporting Manager', stepName: 'Manager Approval', isMandatory: true },
    { levelOrder: 2, approverType: 'hr', approverRole: 'Finance / HR Officer', stepName: 'Finance Verification', isMandatory: true }
  ]);

  const fetchSettingsAndWorkflows = async () => {
    try {
      setLoading(true);
      const [settingsRes, wfRes, catRes] = await Promise.all([
        expenseApi.getSettings(),
        expenseApi.getWorkflows(),
        expenseApi.getCategories()
      ]);
      if (settingsRes) {
        setAutoApprovalThreshold(settingsRes.autoApprovalThreshold || 500);
        setMileageRateCar(settingsRes.mileageRateCar || 12.00);
        setMileageRateBike(settingsRes.mileageRateBike || 6.00);
        setMileageRatesByDesignation(
          (settingsRes.mileageRatesByDesignation || []).reduce((acc: MileageDesignationRate[], row) => {
            const key = String(row.designationName || '').trim().toLowerCase();
            if (!key) return acc;
            const existing = acc.find((r) => r.designationName.trim().toLowerCase() === key);
            const extraIds = [
              ...(row.designationIds || []),
              row.designationId,
            ].filter((id): id is number => Boolean(id));
            if (existing) {
              existing.designationIds = Array.from(new Set([...(existing.designationIds || [existing.designationId]), ...extraIds]));
              if (row.hasCustomRate && !existing.hasCustomRate) {
                existing.rateCar = row.rateCar;
                existing.rateBike = row.rateBike;
                existing.hasCustomRate = true;
              }
              return acc;
            }
            acc.push({
              ...row,
              designationIds: Array.from(new Set(extraIds)),
            });
            return acc;
          }, [])
        );
        setRequireManagerApproval(settingsRes.requireManagerApproval !== undefined ? Boolean(settingsRes.requireManagerApproval) : true);
        setRequireFinanceApproval(settingsRes.requireFinanceApproval !== undefined ? Boolean(settingsRes.requireFinanceApproval) : true);
        setMultiLevelApproval(settingsRes.multiLevelApproval !== undefined ? Boolean(settingsRes.multiLevelApproval) : true);
        setEnableTravelModule(settingsRes.enableTravelModule !== undefined ? Boolean(settingsRes.enableTravelModule) : true);
        setEnableMileageModule(settingsRes.enableMileageModule !== undefined ? Boolean(settingsRes.enableMileageModule) : true);
      }
      setCategoryThresholds(
        (catRes || [])
          .filter((c: any) => c.isActive !== false && c.is_active !== false)
          .reduce((acc: Array<{ id: number; name: string; code?: string; autoApprovalThreshold: number }>, c: any) => {
            const code = String(c.code || c.name || c.id).trim().toUpperCase();
            if (acc.some((row) => String(row.code || '').toUpperCase() === code)) return acc;
            acc.push({
              id: c.id,
              name: c.name,
              code: c.code,
              autoApprovalThreshold: Number(c.autoApprovalThreshold ?? c.auto_approval_threshold ?? 0),
            });
            return acc;
          }, [])
      );
      setWorkflows(wfRes || []);
    } catch (err) {
      console.error('Failed to load expense settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettingsAndWorkflows();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await expenseApi.updateSettings({
        autoApprovalThreshold,
        categoryThresholds,
        mileageRateCar,
        mileageRateBike,
        mileageRatesByDesignation,
        requireManagerApproval,
        requireFinanceApproval,
        multiLevelApproval,
        enableTravelModule,
        enableMileageModule
      });
      alert('Expense module settings updated successfully!');
      fetchSettingsAndWorkflows();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const openWorkflowModal = (wf?: ExpenseWorkflow) => {
    if (wf) {
      setEditingWfId(wf.id);
      setWfName(wf.name);
      setWfDescription(wf.description || '');
      setWfMinAmount(wf.minAmount || 0);
      setWfMaxAmount(wf.maxAmount || 100000);
      setWfLevels(
        wf.levels && wf.levels.length > 0
          ? wf.levels
          : [
              { levelOrder: 1, approverType: 'reporting_manager', approverRole: 'Reporting Manager', stepName: 'Manager Approval', isMandatory: true },
              { levelOrder: 2, approverType: 'hr', approverRole: 'Finance / HR Officer', stepName: 'Finance Verification', isMandatory: true }
            ]
      );
    } else {
      setEditingWfId(null);
      setWfName('');
      setWfDescription('');
      setWfMinAmount(0);
      setWfMaxAmount(100000);
      setWfLevels([
        { levelOrder: 1, approverType: 'reporting_manager', approverRole: 'Reporting Manager', stepName: 'Manager Approval', isMandatory: true },
        { levelOrder: 2, approverType: 'hr', approverRole: 'Finance / HR Officer', stepName: 'Finance Verification', isMandatory: true }
      ]);
    }
    setIsWfModalOpen(true);
  };

  const handleAddWfLevel = () => {
    setWfLevels([
      ...wfLevels,
      {
        levelOrder: wfLevels.length + 1,
        approverType: 'department_head',
        approverRole: 'Department Head',
        stepName: `Level ${wfLevels.length + 1} Review`,
        isMandatory: true
      }
    ]);
  };

  const handleRemoveWfLevel = (idx: number) => {
    if (wfLevels.length <= 1) return;
    setWfLevels(wfLevels.filter((_, i) => i !== idx).map((l, i) => ({ ...l, levelOrder: i + 1 })));
  };

  const handleSaveWorkflow = async () => {
    if (!wfName.trim()) {
      alert('Please enter a workflow name');
      return;
    }
    try {
      const payload = {
        name: wfName,
        description: wfDescription,
        minAmount: wfMinAmount,
        maxAmount: wfMaxAmount,
        isActive: true,
        levels: wfLevels
      };
      if (editingWfId) {
        await expenseApi.updateWorkflow(editingWfId, payload);
      } else {
        await expenseApi.createWorkflow(payload);
      }
      setIsWfModalOpen(false);
      fetchSettingsAndWorkflows();
    } catch (err: any) {
      alert(err.message || 'Failed to save workflow');
    }
  };

  const handleDeleteWorkflow = async (id: number) => {
    if (!confirm('Are you sure you want to delete this approval workflow?')) return;
    try {
      await expenseApi.deleteWorkflow(id);
      fetchSettingsAndWorkflows();
    } catch (err: any) {
      alert(err.message || 'Failed to delete workflow');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading module settings...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-6 h-6 text-blue-600" />
            Expense Module Settings & Workflows
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure auto-approval limits, mileage rates, sub-module features, and dynamic multi-level approval workflows
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'general'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            General & Rates
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'workflows'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Approval Workflows ({workflows.length})
          </button>
        </div>
      </div>

      {activeTab === 'general' ? (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          {/* Auto Approval Threshold per category */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Auto-Approval Threshold by Category
            </h3>
            <p className="text-xs text-slate-500">
              Claims in a category at or below this amount, with no policy violations, skip manager approval. Set 0 to always require manager approval for that category.
            </p>
            {categoryThresholds.length === 0 ? (
              <p className="text-xs text-slate-400">No expense categories found. Create categories first, then set thresholds here.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3 w-48">Auto-approve up to (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {categoryThresholds.map((cat, idx) => (
                      <tr key={cat.id}>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{cat.name}</td>
                        <td className="py-2 px-3 text-slate-500 font-mono">{cat.code || '—'}</td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min={0}
                            value={cat.autoApprovalThreshold}
                            onChange={(e) => {
                              const next = [...categoryThresholds];
                              next[idx] = { ...next[idx], autoApprovalThreshold: Number(e.target.value) };
                              setCategoryThresholds(next);
                            }}
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Mileage Per-KM Rates by Designation */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Car className="w-4 h-4 text-blue-500" />
              Mileage Per-Kilometer Rates
            </h3>
            <p className="text-xs text-slate-500">
              Set car and bike rates for each designation. Employees see and claim only the rates assigned to their designation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default 4-Wheeler / Car Rate (₹ / km)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={mileageRateCar}
                  onChange={(e) => setMileageRateCar(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default 2-Wheeler / Motorcycle Rate (₹ / km)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={mileageRateBike}
                  onChange={(e) => setMileageRateBike(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-blue-600"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Default rates apply when a designation has no row below, or when an employee has no designation.
            </p>

            {mileageRatesByDesignation.length === 0 ? (
              <p className="text-xs text-slate-400">
                No designations found. Create designations in Settings first, then assign mileage rates here.
              </p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Designation</th>
                      <th className="py-2.5 px-3 w-44">4-Wheeler (₹ / km)</th>
                      <th className="py-2.5 px-3 w-44">2-Wheeler (₹ / km)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {mileageRatesByDesignation.map((row, idx) => (
                      <tr key={row.designationName.toLowerCase()}>
                        <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {row.designationName}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={row.rateCar}
                            onChange={(e) => {
                              const next = [...mileageRatesByDesignation];
                              next[idx] = { ...next[idx], rateCar: Number(e.target.value) };
                              setMileageRatesByDesignation(next);
                            }}
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-amber-600"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="number"
                            min={0}
                            step="0.5"
                            value={row.rateBike}
                            onChange={(e) => {
                              const next = [...mileageRatesByDesignation];
                              next[idx] = { ...next[idx], rateBike: Number(e.target.value) };
                              setMileageRatesByDesignation(next);
                            }}
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-blue-600"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Module Customization */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-500" />
              Module Customization Settings
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enableTravel"
                  checked={enableTravelModule}
                  onChange={(e) => setEnableTravelModule(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enableTravel" className="font-medium text-slate-800 dark:text-slate-200">
                  Enable Travel Requests & Travel Advances Sub-module
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enableMileage"
                  checked={enableMileageModule}
                  onChange={(e) => setEnableMileageModule(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="enableMileage" className="font-medium text-slate-800 dark:text-slate-200">
                  Enable Mileage Expense Claims Sub-module
                </label>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Approval Workflow Rules */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-500" />
              Workflow Rules & Escalations
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="reqMgr"
                  checked={requireManagerApproval}
                  onChange={(e) => setRequireManagerApproval(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="reqMgr" className="font-medium text-slate-800 dark:text-slate-200">
                  Require Reporting Manager Review & Approval
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="reqFin"
                  checked={requireFinanceApproval}
                  onChange={(e) => setRequireFinanceApproval(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="reqFin" className="font-medium text-slate-800 dark:text-slate-200">
                  Require Finance / Accounts Verification & Partial Approval
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="multiLvl"
                  checked={multiLevelApproval}
                  onChange={(e) => setMultiLevelApproval(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="multiLvl" className="font-medium text-slate-800 dark:text-slate-200">
                  Enable Multi-Level Amount-Based Dynamic Escalation
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              disabled={saving}
              onClick={handleSaveSettings}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save General Settings'}
            </button>
          </div>
        </div>
      ) : (
        /* Workflows Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-indigo-500" />
              Configurable Dynamic Approval Workflows
            </h2>
            <button
              onClick={() => openWorkflowModal()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create New Workflow
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{wf.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Active
                      </span>
                    </div>
                    {wf.description && <p className="text-xs text-slate-500 mt-1">{wf.description}</p>}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Amount Threshold: ₹{wf.minAmount.toLocaleString()} to ₹{wf.maxAmount.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openWorkflowModal(wf)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg"
                      title="Edit Workflow"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteWorkflow(wf.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg"
                      title="Delete Workflow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Level progression steps */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-2">
                    Approval Progression Steps:
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {wf.levels && wf.levels.length > 0 ? (
                      wf.levels.map((lvl, idx) => (
                        <React.Fragment key={idx}>
                          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                              {lvl.levelOrder}
                            </span>
                            <span className="text-slate-900 dark:text-white font-semibold">{lvl.stepName}</span>
                            <span className="text-[10px] text-slate-400">({lvl.approverType.replace('_', ' ')})</span>
                          </div>
                          {idx < (wf.levels?.length || 0) - 1 && (
                            <span className="text-slate-400 font-bold">→</span>
                          )}
                        </React.Fragment>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Default Manager → Finance flow</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow Create/Edit Modal */}
      {isWfModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingWfId ? 'Edit Workflow Configuration' : 'Create Approval Workflow'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Senior Executive Expense Workflow"
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Optional workflow description..."
                  value={wfDescription}
                  onChange={(e) => setWfDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={wfMinAmount}
                    onChange={(e) => setWfMinAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={wfMaxAmount}
                    onChange={(e) => setWfMaxAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Approval Levels */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Approval Level Sequence</span>
                  <button
                    type="button"
                    onClick={handleAddWfLevel}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Level
                  </button>
                </div>

                {wfLevels.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-3"
                  >
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    <input
                      type="text"
                      placeholder="Step Name (e.g. Manager Review)"
                      value={lvl.stepName}
                      onChange={(e) => {
                        const next = [...wfLevels];
                        next[idx].stepName = e.target.value;
                        setWfLevels(next);
                      }}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs flex-1"
                    />

                    <select
                      value={lvl.approverType}
                      onChange={(e) => {
                        const next = [...wfLevels];
                        next[idx].approverType = e.target.value as any;
                        setWfLevels(next);
                      }}
                      className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="reporting_manager">Reporting Manager (Org Hierarchy)</option>
                      <option value="department_head">Department Head</option>
                      <option value="hr">HR & Finance Officer</option>
                      <option value="ceo">CEO / Executive Admin</option>
                    </select>

                    {wfLevels.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWfLevel(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsWfModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveWorkflow}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"
              >
                Save Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
