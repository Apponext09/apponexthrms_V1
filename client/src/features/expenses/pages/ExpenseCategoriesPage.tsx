import React, { useEffect, useState } from 'react';
import { expenseApi, ExpenseCategory } from '../api/expenseApi';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  FileCheck,
  ShieldAlert
} from 'lucide-react';

import { useExpenseMoney } from '../utils/useExpenseMoney';

export const ExpenseCategoriesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const money = useExpenseMoney();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [spendingLimit, setSpendingLimit] = useState<number>(0);
  const [isReceiptMandatory, setIsReceiptMandatory] = useState(true);
  const [minAmountForReceipt, setMinAmountForReceipt] = useState<number>(500);
  const [autoApprovalThreshold, setAutoApprovalThreshold] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showInactive, setShowInactive] = useState(true);

  const fetchCategories = async (includeInactive = showInactive) => {
    try {
      setLoading(true);
      const res = await expenseApi.getCategories(includeInactive);
      setCategories(res || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories(showInactive);
  }, [showInactive]);

  const openModal = (cat?: ExpenseCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setName(cat.name);
      setCode(cat.code);
      setDescription(cat.description || '');
      setSpendingLimit(cat.spendingLimit);
      setIsReceiptMandatory(cat.isReceiptMandatory);
      setMinAmountForReceipt(cat.minAmountForReceipt);
      setAutoApprovalThreshold(Number(cat.autoApprovalThreshold ?? (cat as any).auto_approval_threshold ?? 0));
      setIsActive(cat.isActive);
    } else {
      setEditingCategory(null);
      setName('');
      setCode('');
      setDescription('');
      setSpendingLimit(10000);
      setIsReceiptMandatory(true);
      setMinAmountForReceipt(500);
      setAutoApprovalThreshold(0);
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleDeleteCategory = async (cat: ExpenseCategory) => {
    if (!window.confirm(`Are you sure you want to delete "${cat.name}"? This category will be permanently deleted.`)) {
      return;
    }
    try {
      const res = await expenseApi.deleteCategory(cat.id);
      alert(res?.message || 'Category deleted successfully');
      fetchCategories(showInactive);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
    }
  };

  const handleSaveCategory = async () => {
    if (!name.trim()) {
      alert('Please enter a category name.');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        name,
        code: code || name.toUpperCase().replace(/\s+/g, '_'),
        description,
        spendingLimit,
        isReceiptMandatory,
        minAmountForReceipt,
        autoApprovalThreshold,
        isActive
      };

      if (editingCategory) {
        await expenseApi.updateCategory(editingCategory.id, payload);
      } else {
        await expenseApi.createCategory(payload);
      }

      setIsModalOpen(false);
      fetchCategories(showInactive);
    } catch (err: any) {
      alert(err.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (cat: ExpenseCategory) => {
    try {
      await expenseApi.updateCategory(cat.id, { isActive: !cat.isActive });
      fetchCategories(showInactive);
    } catch (err: any) {
      alert(err.message || 'Failed to update category status');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-blue-600" />
            Expense Categories & Rules
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Configure spending limits, receipt mandatory thresholds, and category activation rules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Show Inactive
          </label>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Expense Category
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-sm text-slate-500">Loading categories...</div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className={`p-5 rounded-2xl border transition-all ${cat.isActive
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-60'
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{cat.name}</h3>
                    <span className="text-[11px] font-mono text-slate-400">{cat.code}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openModal(cat)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-500 min-h-[32px] line-clamp-2">{cat.description || 'No description provided'}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Spending Limit:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {cat.spendingLimit > 0 ? money(Number(cat.spendingLimit)) : 'No Limit'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt Required:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {cat.isReceiptMandatory ? `Above ${money(cat.minAmountForReceipt)}` : 'Optional'}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => handleToggleActive(cat)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${cat.isActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                >
                  {cat.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingCategory ? 'Edit Expense Category' : 'Add Expense Category'}
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Client Entertainment"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category Code</label>
                <input
                  type="text"
                  placeholder="e.g. ENTERTAINMENT"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Spending Limit per Claim (₹)</label>
                <input
                  type="number"
                  placeholder="0 for unlimited"
                  value={spendingLimit || ''}
                  onChange={(e) => setSpendingLimit(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Auto-approve up to (₹)</label>
                <input
                  type="number"
                  min={0}
                  placeholder="0 = always need manager approval"
                  value={autoApprovalThreshold || ''}
                  onChange={(e) => setAutoApprovalThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">At or below this amount, manager approval is skipped. 0 disables auto-approval.</p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="receiptMandatory"
                  checked={isReceiptMandatory}
                  onChange={(e) => setIsReceiptMandatory(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="receiptMandatory" className="font-semibold text-slate-700 dark:text-slate-300">
                  Require Receipt Upload
                </label>
              </div>

              {isReceiptMandatory && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mandatory Receipt Threshold Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={minAmountForReceipt}
                    onChange={(e) => setMinAmountForReceipt(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="State guidelines for this expense category..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                />
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
                onClick={handleSaveCategory}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {submitting ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
