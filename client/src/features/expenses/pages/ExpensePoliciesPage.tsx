import React, { useEffect, useState } from 'react';
import { expenseApi, ExpensePolicy, ExpenseCategory } from '../api/expenseApi';
import { apiClient } from '@/config/api';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Building,
  UserCheck,
  MapPin
} from 'lucide-react';

import { useExpenseMoney } from '../utils/useExpenseMoney';

export const ExpensePoliciesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const money = useExpenseMoney();
  const [policies, setPolicies] = useState<ExpensePolicy[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<ExpensePolicy | null>(null);

  // Form
  const [policyName, setPolicyName] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [grade, setGrade] = useState('All');
  const [designation, setDesignation] = useState('All');
  const [location, setLocation] = useState('All');
  const [orgLocations, setOrgLocations] = useState<Array<{ id: number | string; name: string }>>([]);
  const [orgDesignations, setOrgDesignations] = useState<Array<{ id: number | string; name: string }>>([]);
  const [orgGrades, setOrgGrades] = useState<Array<{ id: number | string; name: string }>>([]);
  const [maxLimitPerClaim, setMaxLimitPerClaim] = useState<number>(1000);
  const [maxLimitPerMonth, setMaxLimitPerMonth] = useState<number>(5000);
  const [requireReceiptAbove, setRequireReceiptAbove] = useState<number>(500);
  const [allowException, setAllowException] = useState(true);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPoliciesAndCategories = async () => {
    try {
      setLoading(true);
      const [pRes, cRes] = await Promise.all([
        expenseApi.getPolicies(),
        expenseApi.getCategories()
      ]);
      setPolicies(pRes || []);
      setCategories(cRes || []);
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoliciesAndCategories();
    apiClient.get('/settings/scope-masters')
      .then((res: any) => {
        const d = res?.data?.data || {};
        const locs = Array.isArray(d.locations) ? d.locations : [];
        const desigs = Array.isArray(d.designations) ? d.designations : [];
        const grds = Array.isArray(d.grades) ? d.grades : [];
        setOrgLocations(locs);
        setOrgDesignations(desigs);
        setOrgGrades(grds);
      })
      .catch(() => {
        Promise.all([
          apiClient.get('/settings/locations', { params: { pageSize: 200 } }).catch(() => ({ data: [] })),
          apiClient.get('/settings/designations', { params: { pageSize: 200 } }).catch(() => ({ data: [] })),
          apiClient.get('/settings/grades', { params: { pageSize: 200 } }).catch(() => ({ data: [] }))
        ]).then(([locRes, desRes, grdRes]) => {
          const lRaw = locRes?.data?.data || locRes?.data || [];
          const dRaw = desRes?.data?.data || desRes?.data || [];
          const gRaw = grdRes?.data?.data || grdRes?.data || [];
          setOrgLocations((Array.isArray(lRaw) ? lRaw : []).map((x: any) => ({ id: x.id, name: x.name || x.location_name || String(x.id) })));
          setOrgDesignations((Array.isArray(dRaw) ? dRaw : []).map((x: any) => ({ id: x.id, name: x.name || x.designation_name || String(x.id) })));
          setOrgGrades((Array.isArray(gRaw) ? gRaw : []).map((x: any) => ({ id: x.id, name: x.name || x.grade_name || String(x.id) })));
        });
      });
  }, []);

  const openModal = (pol?: ExpensePolicy) => {
    if (pol) {
      setEditingPolicy(pol);
      setPolicyName(pol.policyName);
      setCategoryId(pol.categoryId);
      setGrade(pol.grade || 'All');
      setDesignation(pol.designation || 'All');
      setLocation(pol.location || 'All');
      const maxClaim = Number(pol.maxLimitPerClaim ?? (pol as any).max_limit_per_claim ?? 0);
      const maxMonth = Number(pol.maxLimitPerMonth ?? (pol as any).max_limit_per_month ?? 0);
      const unl = maxClaim === 0 && maxMonth === 0;
      setIsUnlimited(unl);
      setMaxLimitPerClaim(maxClaim > 0 ? maxClaim : 1000);
      setMaxLimitPerMonth(maxMonth > 0 ? maxMonth : 5000);
      setRequireReceiptAbove(pol.requireReceiptAbove);
      setAllowException(pol.allowException);
      setIsActive(pol.isActive);
    } else {
      setEditingPolicy(null);
      setPolicyName('');
      setCategoryId(undefined);
      setGrade('All');
      setDesignation('All');
      setLocation('All');
      setIsUnlimited(false);
      setMaxLimitPerClaim(1000);
      setMaxLimitPerMonth(5000);
      setRequireReceiptAbove(500);
      setAllowException(true);
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleCategorySelect = (cId: number | undefined) => {
    setCategoryId(cId);
    if (cId) {
      const selectedCat = categories.find((c) => c.id === cId);
      if (selectedCat && selectedCat.name.toLowerCase().includes('travel')) {
        setIsUnlimited(true);
      }
    }
  };

  const handleSavePolicy = async () => {
    if (!policyName.trim()) {
      alert('Please enter a policy name.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        policyName,
        categoryId,
        grade,
        designation,
        location,
        maxLimitPerClaim: isUnlimited ? 0 : maxLimitPerClaim,
        maxLimitPerMonth: isUnlimited ? 0 : maxLimitPerMonth,
        requireReceiptAbove,
        allowException,
        isActive
      };

      if (editingPolicy) {
        await expenseApi.updatePolicy(editingPolicy.id, payload);
      } else {
        await expenseApi.createPolicy(payload);
      }

      setIsModalOpen(false);
      fetchPoliciesAndCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to save policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePolicy = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense policy?')) return;
    try {
      await expenseApi.deletePolicy(id);
      fetchPoliciesAndCategories();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-600" />
            Expense Policy Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Define grade, designation, department, location, and amount-based claim eligibility rules
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Expense Policy
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading expense policies...</div>
        ) : policies.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <ShieldCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Custom Policies Defined</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Create specific expense policy rules for employee grades, designations, or locations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Policy Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Grade / Designation</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Max Limit / Claim</th>
                  <th className="py-3.5 px-4">Max Limit / Month</th>
                  <th className="py-3.5 px-4">Receipt Mandatory Above</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {policies.map((rawPol) => {
                  const pol = rawPol as any;
                  const name = pol.policyName || pol.policy_name || 'Policy';
                  const catName = pol.categoryName || pol.category_name || 'All Categories';
                  const maxClaim = Number(pol.maxLimitPerClaim ?? pol.max_limit_per_claim ?? 0);
                  const maxMonth = Number(pol.maxLimitPerMonth ?? pol.max_limit_per_month ?? 0);
                  const reqReceipt = Number(pol.requireReceiptAbove ?? pol.require_receipt_above ?? 0);

                  return (
                    <tr key={pol.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {name}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {catName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {pol.grade || 'All'} / {pol.designation || 'All'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {pol.location || 'All'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {maxClaim > 0 ? (
                          money(maxClaim)
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            No Limit
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {maxMonth > 0 ? (
                          money(maxMonth)
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            No Limit
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                        {money(reqReceipt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openModal(pol)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(pol.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingPolicy ? 'Edit Expense Policy' : 'Create Expense Policy'}
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Policy Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Leadership Travel & Lodging Policy"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={categoryId || ''}
                    onChange={(e) => handleCategorySelect(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Employee Grade</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                  >
                    <option value="All">All Grades</option>
                    {orgGrades.map((g) => (
                      <option key={g.id || g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                  >
                    <option value="All">All Designations</option>
                    {orgDesignations.map((d) => (
                      <option key={d.id || d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                  >
                    <option value="All">All Locations</option>
                    {orgLocations.map((l) => (
                      <option key={l.id || l.name} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* UNLIMITED / NO SPENDING LIMIT OPTION */}
              <div className="p-2.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isUnlimited"
                    checked={isUnlimited}
                    onChange={(e) => setIsUnlimited(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="isUnlimited" className="font-semibold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                    No Spending Limit / Unlimited (Remove Threshold Cap)
                  </label>
                </div>
                {isUnlimited && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    Unlimited Active
                  </span>
                )}
              </div>

              {/* DYNAMIC LIMIT INPUTS vs UNLIMITED BANNER */}
              {isUnlimited ? (
                <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-bold">No Spending Limit Applied</p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Employees claiming under this policy (e.g. Travel) will not be restricted by per-claim or monthly maximum spending limits.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Max / Claim (₹)</label>
                    <input
                      type="number"
                      value={maxLimitPerClaim}
                      onChange={(e) => setMaxLimitPerClaim(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Max / Month (₹)</label>
                    <input
                      type="number"
                      value={maxLimitPerMonth}
                      onChange={(e) => setMaxLimitPerMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Receipt Mandatory Above (₹)</label>
                <input
                  type="number"
                  value={requireReceiptAbove}
                  onChange={(e) => setRequireReceiptAbove(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allowException"
                  checked={allowException}
                  onChange={(e) => setAllowException(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="allowException" className="font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  Allow Employee Exception Justification
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={handleSavePolicy}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {submitting ? 'Saving...' : 'Save Policy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
