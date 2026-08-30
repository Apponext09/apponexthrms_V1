import React, { useEffect, useState } from 'react';
import { expenseApi, ExpensePolicy, ExpenseCategory } from '../api/expenseApi';
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

export const ExpensePoliciesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
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
  const [maxLimitPerClaim, setMaxLimitPerClaim] = useState<number>(25000);
  const [maxLimitPerMonth, setMaxLimitPerMonth] = useState<number>(75000);
  const [requireReceiptAbove, setRequireReceiptAbove] = useState<number>(500);
  const [allowException, setAllowException] = useState(true);
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
  }, []);

  const openModal = (pol?: ExpensePolicy) => {
    if (pol) {
      setEditingPolicy(pol);
      setPolicyName(pol.policyName);
      setCategoryId(pol.categoryId);
      setGrade(pol.grade || 'All');
      setDesignation(pol.designation || 'All');
      setLocation(pol.location || 'All');
      setMaxLimitPerClaim(pol.maxLimitPerClaim);
      setMaxLimitPerMonth(pol.maxLimitPerMonth);
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
      setMaxLimitPerClaim(25000);
      setMaxLimitPerMonth(75000);
      setRequireReceiptAbove(500);
      setAllowException(true);
      setIsActive(true);
    }
    setIsModalOpen(true);
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
        maxLimitPerClaim,
        maxLimitPerMonth,
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
                        ₹{maxClaim.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ₹{maxMonth.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                        ₹{reqReceipt.toLocaleString('en-IN')}
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

      {/* CREATE MODAL */}
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
                    onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
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
                  <input
                    type="text"
                    placeholder="All / L1 / L2 / Executive"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="All / Manager / VP"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="All / Mumbai / Onsite"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
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

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Receipt Above (₹)</label>
                  <input
                    type="number"
                    value={requireReceiptAbove}
                    onChange={(e) => setRequireReceiptAbove(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allowException"
                  checked={allowException}
                  onChange={(e) => setAllowException(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="allowException" className="font-semibold text-slate-700 dark:text-slate-300">
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
