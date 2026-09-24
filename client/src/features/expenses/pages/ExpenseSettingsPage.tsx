import { ExpenseWorkflowDesigner } from './ExpenseWorkflowDesigner';
import React, { useEffect, useState } from 'react';
import { expenseApi, ExpenseWorkflow, ExpenseWorkflowLevel, MileageDesignationRate } from '../api/expenseApi';
import { apiClient } from '@/config/api';
import { formatMoney } from '../utils/formatMoney';
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
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [currencyLocale, setCurrencyLocale] = useState('en-IN');
  const [claimNumberPrefix, setClaimNumberPrefix] = useState('EXP');
  const [travelRequestNumberPrefix, setTravelRequestNumberPrefix] = useState('TRV');
  const [travelAdvanceNumberPrefix, setTravelAdvanceNumberPrefix] = useState('ADV');
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState('bank_transfer');
  const [defaultAdvanceStatus, setDefaultAdvanceStatus] = useState('pending_finance');
  const [workflowFallbackMaxAmount, setWorkflowFallbackMaxAmount] = useState(10000000);
  const [numberSequenceDigits, setNumberSequenceDigits] = useState(6);
  const money = (n: number | string | null | undefined) => formatMoney(n, { currencySymbol, currencyLocale });

  // Workflows state
  const [workflows, setWorkflows] = useState<ExpenseWorkflow[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: number; name: string }>>([]);
  const [isWfModalOpen, setIsWfModalOpen] = useState(false);
  const [editingWfId, setEditingWfId] = useState<number | null>(null);
  const [wfName, setWfName] = useState('');
  const [wfTargetRole, setWfTargetRole] = useState<string>('all');
  const [wfDescription, setWfDescription] = useState('');
  const [wfDepartmentId, setWfDepartmentId] = useState<number | ''>('');
  const [wfMinAmount, setWfMinAmount] = useState<number>(0);
  const [wfMaxAmount, setWfMaxAmount] = useState<number>(100000);
  const [wfLevels, setWfLevels] = useState<ExpenseWorkflowLevel[]>([
    { levelOrder: 1, approverType: 'reporting_manager', approverRole: 'Reporting Manager', stepName: 'Manager Approval', isMandatory: true },
    { levelOrder: 2, approverType: 'hr_admin', approverRole: 'HR Admin', stepName: 'Finance Verification', isMandatory: true }
  ]);

  // Dynamic roles fetched from DB
  const [orgRoles, setOrgRoles] = useState<Array<{ id: number; name: string; code: string }>>([
    { id: 0, name: 'Reporting Manager (Org Hierarchy)', code: 'reporting_manager' },
    { id: -1, name: 'CEO / Executive Admin', code: 'ceo' },
    { id: -2, name: 'HR Admin / HR Manager', code: 'hr_admin' },
    { id: -3, name: 'Finance Verification / Payout', code: 'finance' }
  ]);

  const fetchSettingsAndWorkflows = async () => {
    try {
      setLoading(true);
      const [settingsRes, wfRes, catRes, rolesRes, deptRes] = await Promise.all([
        expenseApi.getSettings(),
        expenseApi.getWorkflows(),
        expenseApi.getCategories(),
        apiClient.get('/rbac/roles').catch(() => ({ data: { data: { items: [] } } })),
        apiClient.get('/settings/departments', { params: { pageSize: 200 } }).catch(() => ({ data: [] }))
      ]);

      // Parse departments
      const rawDepts = deptRes?.data?.data || deptRes?.data || [];
      if (Array.isArray(rawDepts)) {
        setDepartments(rawDepts.map((d: any) => ({ id: Number(d.id), name: d.name || String(d.id) })).filter((d) => d.id));
      }

      // Parse roles from RBAC API
      const rolesData = rolesRes?.data?.data;
      const rawRoles: Array<{ id: number; name: string; code: string }> = Array.isArray(rolesData)
        ? rolesData
        : Array.isArray(rolesData?.items)
          ? rolesData.items
          : [];
      // Build approver role options: special entries + all DB roles (excluding employee/intern/client etc.)
      const specialEntries = [
        { id: 0, name: 'Reporting Manager (Org Hierarchy)', code: 'reporting_manager' },
        { id: -1, name: 'CEO / Executive Admin', code: 'ceo' },
        { id: -2, name: 'HR Admin / HR Manager', code: 'hr_admin' },
        { id: -3, name: 'Finance Verification / Payout', code: 'finance' }
      ];
      const filteredRoles = rawRoles
        .filter((r) => !['super_admin', 'employee', 'intern', 'client', 'consultant'].includes(r.code))
        .map((r) => ({ id: r.id, name: r.name, code: r.code }));
      const mergedRoles = [...specialEntries];
      for (const fr of filteredRoles) {
        if (!mergedRoles.some(m => m.code === fr.code)) {
          mergedRoles.push(fr);
        }
      }
      setOrgRoles(mergedRoles);
      if (settingsRes) {
        setAutoApprovalThreshold(settingsRes.autoApprovalThreshold || 500);
        setMileageRateCar(settingsRes.mileageRateCar || 12.00);
        setMileageRateBike(settingsRes.mileageRateBike || 6.00);
        setMileageRatesByDesignation(
<<<<<<< HEAD
          (settingsRes.mileageRatesByDesignation || []).reduce((acc: MileageDesignationRate[], row: any) => {
=======
          (settingsRes.mileageRatesByDesignation || []).reduce((acc: MileageDesignationRate[], row: MileageDesignationRate) => {
>>>>>>> b13431884f6e3fb77d4463ab4da204cadac8faca
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
        setCurrencySymbol(settingsRes.currencySymbol || '₹');
        setCurrencyCode(settingsRes.currencyCode || 'INR');
        setCurrencyLocale(settingsRes.currencyLocale || 'en-IN');
        setClaimNumberPrefix(settingsRes.claimNumberPrefix || 'EXP');
        setTravelRequestNumberPrefix(settingsRes.travelRequestNumberPrefix || 'TRV');
        setTravelAdvanceNumberPrefix(settingsRes.travelAdvanceNumberPrefix || 'ADV');
        setDefaultPaymentMethod(settingsRes.defaultPaymentMethod || 'bank_transfer');
        setDefaultAdvanceStatus(settingsRes.defaultAdvanceStatus || 'pending_finance');
        setWorkflowFallbackMaxAmount(Number(settingsRes.workflowFallbackMaxAmount ?? 10000000));
        setNumberSequenceDigits(Number(settingsRes.numberSequenceDigits ?? 6));
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
        enableMileageModule,
        currencySymbol,
        currencyCode,
        currencyLocale,
        claimNumberPrefix,
        travelRequestNumberPrefix,
        travelAdvanceNumberPrefix,
        defaultPaymentMethod,
        defaultAdvanceStatus,
        workflowFallbackMaxAmount,
        numberSequenceDigits
      });
      window.appAlert('Expense module settings updated successfully!');
      fetchSettingsAndWorkflows();
    } catch (err: any) {
      window.appAlert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const openWorkflowModal = (wf?: ExpenseWorkflow) => {
    if (wf) {
      setEditingWfId(wf.id);
      setWfName(wf.name);
      setWfTargetRole(wf.targetRole || (wf as any).target_role || 'all');
      setWfDescription(wf.description || '');
      setWfDepartmentId(wf.departmentId || wf.department_id || '');
      setWfMinAmount(wf.minAmount || 0);
      setWfMaxAmount(wf.maxAmount || 100000);
      setWfLevels(
        wf.levels && wf.levels.length > 0
          ? wf.levels
          : [
            { levelOrder: 1, approverType: 'reporting_manager', approverRole: 'Reporting Manager', stepName: 'Manager Approval', isMandatory: true },
            { levelOrder: 2, approverType: 'hr_admin', approverRole: 'Hr Admin', stepName: 'Finance Verification', isMandatory: true }
          ]
      );
    } else {
      setEditingWfId(null);
      setWfName('');
      setWfTargetRole('all');
      setWfDescription('');
      setWfDepartmentId('');
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
    // Default to first available role that isn't already used
    const usedCodes = wfLevels.map((l) => l.approverType);
    const nextRole = orgRoles.find((r) => !usedCodes.includes(r.code)) || orgRoles[0];
    setWfLevels([
      ...wfLevels,
      {
        levelOrder: wfLevels.length + 1,
        approverType: nextRole?.code || 'reporting_manager',
        approverRole: nextRole?.name || 'Reporting Manager',
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
      window.appAlert('Please enter a workflow name');
      return;
    }
    try {
      const payload = {
        name: wfName,
        targetRole: wfTargetRole,
        description: wfDescription,
        departmentId: wfDepartmentId ? Number(wfDepartmentId) : null,
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
      window.appAlert(err.message || 'Failed to save workflow');
    }
  };

  const handleDeleteWorkflow = async (id: number) => {
    if (!await window.appConfirm('Are you sure you want to delete this approval workflow?')) return;
    try {
      await expenseApi.deleteWorkflow(id);
      fetchSettingsAndWorkflows();
    } catch (err: any) {
      window.appAlert(err.message || 'Failed to delete workflow');
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
            Configure mileage rates, sub-module features, and mandatory approval workflows
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'general'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
          >
            General & Rates
          </button>
          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeTab === 'workflows'
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
          <p className="text-sm text-blue-700">Every submission requires a published workflow. Category limits never skip approval.</p>
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
                            value={row.rateCar || ''}
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
                            value={row.rateBike || ''}
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

          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Formatting &amp; Numbering</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Currency Symbol</span>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Currency Code</span>
                <input
                  type="text"
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Currency Locale</span>
                <input
                  type="text"
                  value={currencyLocale}
                  onChange={(e) => setCurrencyLocale(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Claim Number Prefix</span>
                <input
                  type="text"
                  value={claimNumberPrefix}
                  onChange={(e) => setClaimNumberPrefix(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Travel Request Number Prefix</span>
                <input
                  type="text"
                  value={travelRequestNumberPrefix}
                  onChange={(e) => setTravelRequestNumberPrefix(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Travel Advance Number Prefix</span>
                <input
                  type="text"
                  value={travelAdvanceNumberPrefix}
                  onChange={(e) => setTravelAdvanceNumberPrefix(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Default Payment Method</span>
                <input
                  type="text"
                  value={defaultPaymentMethod}
                  onChange={(e) => setDefaultPaymentMethod(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Number Sequence Digits</span>
                <input
                  type="number"
                  min={1}
                  value={numberSequenceDigits}
                  onChange={(e) => setNumberSequenceDigits(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm"
                />
              </label>
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
        <ExpenseWorkflowDesigner />
      )}
    </div>
  );
};
