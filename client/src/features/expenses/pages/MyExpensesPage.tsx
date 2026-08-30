import React, { useEffect, useState } from 'react';
import { expenseApi, ExpenseClaim, ExpenseCategory, ExpenseItemInput } from '../api/expenseApi';
import {
  Plus,
  Search,
  FileText,
  Paperclip,
  CheckCircle,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  AlertCircle,
  Eye,
  Edit2,
  Trash2,
  Upload,
  Calendar,
  DollarSign,
  Building,
  Info,
  ChevronRight,
  FileCheck
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export const MyExpensesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Drawer state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClaimDetails, setSelectedClaimDetails] = useState<ExpenseClaim | null>(null);
  const [editingClaimId, setEditingClaimId] = useState<number | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formCategoryId, setFormCategoryId] = useState<number | undefined>(undefined);
  const [formPaymentMethod, setFormPaymentMethod] = useState('bank_transfer');
  const [formMerchant, setFormMerchant] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formProject, setFormProject] = useState('');
  const [items, setItems] = useState<ExpenseItemInput[]>([
    {
      categoryId: undefined,
      expenseDate: new Date().toISOString().slice(0, 10),
      claimedAmount: 0,
      merchantName: '',
      description: '',
      receiptUrl: '',
      employeeJustification: ''
    }
  ]);

  // Policy validation results for items
  const [policyWarnings, setPolicyWarnings] = useState<Record<number, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  // Receipt Preview Modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
  const [previewReceiptType, setPreviewReceiptType] = useState<string | null>(null);

  const fetchClaimsAndCategories = async () => {
    try {
      setLoading(true);
      const [claimsRes, catRes] = await Promise.all([
        expenseApi.getClaims({ mode: 'my_expenses' }),
        expenseApi.getCategories()
      ]);
      setClaims(claimsRes || []);
      setCategories(catRes || []);
      if (catRes && catRes.length > 0) {
        setFormCategoryId(catRes[0].id);
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaimsAndCategories();
    if (searchParams.get('create') === 'true') {
      setIsCreateModalOpen(true);
      searchParams.delete('create');
      setSearchParams(searchParams);
    }
  }, []);

  // Validate policy for item
  const checkItemPolicy = async (index: number, catId?: number, amt?: number, receipt?: string) => {
    if (!catId || !amt || amt <= 0) return;
    try {
      const res = await expenseApi.validatePolicy(catId, amt, Boolean(receipt));
      if (!res.isValid && res.violations) {
        setPolicyWarnings((prev) => ({ ...prev, [index]: res.violations }));
      } else {
        setPolicyWarnings((prev) => {
          const next = { ...prev };
          delete next[index];
          return next;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        categoryId: formCategoryId,
        expenseDate: formDate,
        claimedAmount: 0,
        merchantName: '',
        description: '',
        receiptUrl: '',
        employeeJustification: ''
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    const next = items.filter((_, i) => i !== index);
    setItems(next);
  };

  const handleItemChange = (index: number, field: keyof ExpenseItemInput, val: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    setItems(next);

    const updatedItem = next[index];
    checkItemPolicy(index, updatedItem.categoryId || formCategoryId, updatedItem.claimedAmount, updatedItem.receiptUrl);
  };

  // Real File Upload with Base64 Conversion, Size and Type Validation
  const handleFileUpload = (index: number | null, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Type validation: PNG, JPG, JPEG, PDF
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type! Only JPG, PNG, and PDF receipts are allowed.');
      e.target.value = '';
      return;
    }

    // Size validation: max 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds maximum limit of 10MB!');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (index !== null) {
        setItems((prev) => {
          const next = [...prev];
          if (next[index]) {
            next[index] = {
              ...next[index],
              receiptUrl: dataUrl,
              receiptFileName: file.name,
              receiptFileType: file.type,
              receiptFileSize: file.size
            };
          }
          return next;
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const calculateTotal = () => {
    return items.reduce((acc, curr) => acc + (Number(curr.claimedAmount) || 0), 0);
  };

  const openCreateModal = (claimToEdit?: ExpenseClaim) => {
    if (claimToEdit) {
      setEditingClaimId(claimToEdit.id);
      setFormTitle(claimToEdit.title);
      setFormDate(claimToEdit.claimDate ? claimToEdit.claimDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
      setFormCategoryId(claimToEdit.categoryId || categories[0]?.id);
      setFormPaymentMethod(claimToEdit.paymentMethod === 'payroll' ? 'bank_transfer' : (claimToEdit.paymentMethod || 'bank_transfer'));
      setFormMerchant(claimToEdit.merchantName || '');
      setFormDescription(claimToEdit.description || '');
      setFormProject(claimToEdit.projectCostCenter || '');

      if (claimToEdit.items && claimToEdit.items.length > 0) {
        setItems(
          claimToEdit.items.map((it) => ({
            categoryId: it.categoryId || claimToEdit.categoryId,
            expenseDate: it.expenseDate ? it.expenseDate.slice(0, 10) : claimToEdit.claimDate.slice(0, 10),
            claimedAmount: it.claimedAmount,
            merchantName: it.merchantName || '',
            description: it.description || '',
            receiptUrl: it.receiptUrl || '',
            receiptFileName: it.receiptFileName || '',
            employeeJustification: it.employeeJustification || ''
          }))
        );
      }
    } else {
      setEditingClaimId(null);
      setFormTitle('');
      setFormDate(new Date().toISOString().slice(0, 10));
      setFormCategoryId(categories[0]?.id);
      setFormPaymentMethod('bank_transfer');
      setFormMerchant('');
      setFormDescription('');
      setFormProject('');
      setItems([
        {
          categoryId: categories[0]?.id,
          expenseDate: new Date().toISOString().slice(0, 10),
          claimedAmount: 0,
          merchantName: '',
          description: '',
          receiptUrl: '',
          employeeJustification: ''
        }
      ]);
    }
    setPolicyWarnings({});
    setIsCreateModalOpen(true);
  };

  const handleSaveClaim = async (isDraft: boolean) => {
    if (!formTitle.trim()) {
      alert('Please enter a claim title.');
      return;
    }
    if (!formCategoryId) {
      alert('Please select an expense category.');
      return;
    }
    const normalizedItems = items.map((item) => ({
      ...item,
      categoryId: item.categoryId || formCategoryId
    }));
    const total = normalizedItems.reduce((sum, item) => sum + Number(item.claimedAmount || 0), 0);
    if (total <= 0) {
      alert('Please enter valid expense item amounts.');
      return;
    }

    for (let i = 0; i < normalizedItems.length; i++) {
      const item = normalizedItems[i];
      const cat = categories.find((c) => c.id === item.categoryId);
      if (!item.categoryId) {
        alert(`Item #${i + 1} needs a category.`);
        return;
      }
      if (Number(item.claimedAmount || 0) <= 0) {
        alert(`Item #${i + 1} needs an amount greater than 0.`);
        return;
      }
      if (
        !isDraft &&
        cat &&
        cat.isReceiptMandatory &&
        Number(item.claimedAmount) >= Number(cat.minAmountForReceipt || 0) &&
        !String(item.receiptUrl || '').trim()
      ) {
        alert(`${cat.name} requires a receipt for this amount. Attach a receipt on item #${i + 1} before submitting.`);
        return;
      }
    }

    if (!isDraft) {
      for (let i = 0; i < normalizedItems.length; i++) {
        if (policyWarnings[i] && policyWarnings[i].length > 0 && !normalizedItems[i].employeeJustification?.trim()) {
          alert(`Item #${i + 1} triggers policy violation rules (${policyWarnings[i].join(', ')}). Please provide an employee justification before submitting for approval.`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        title: formTitle,
        claimDate: formDate,
        categoryId: formCategoryId,
        paymentMethod: formPaymentMethod,
        merchantName: formMerchant,
        description: formDescription,
        projectCostCenter: formProject,
        isDraft,
        items: normalizedItems
      };

      if (editingClaimId) {
        await expenseApi.updateClaim(editingClaimId, payload);
      } else {
        await expenseApi.createClaim(payload);
      }

      setIsCreateModalOpen(false);
      fetchClaimsAndCategories();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to save expense claim';
      alert(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClaims = claims.filter((claim) => {
    if (selectedStatus === 'drafts' && claim.status !== 'draft') return false;
    if (selectedStatus === 'pending' && !['submitted', 'pending_manager', 'pending_finance'].includes(claim.status)) return false;
    if (selectedStatus === 'approved' && !['approved', 'payment_pending'].includes(claim.status)) return false;
    if (selectedStatus === 'returned' && claim.status !== 'returned') return false;
    if (selectedStatus === 'paid' && claim.status !== 'paid') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        claim.title.toLowerCase().includes(q) ||
        claim.claimNumber.toLowerCase().includes(q) ||
        (claim.merchantName && claim.merchantName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    const base = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap';
    switch (status) {
      case 'draft':
        return <span className={`${base} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>Draft</span>;
      case 'submitted':
      case 'pending_manager':
        return <span className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300`}>Pending manager</span>;
      case 'pending_finance':
        return <span className={`${base} bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300`}>Pending finance</span>;
      case 'approved':
      case 'payment_pending':
        return <span className={`${base} bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300`}>Payment pending</span>;
      case 'returned':
        return <span className={`${base} bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300`}>Returned</span>;
      case 'rejected':
        return <span className={`${base} bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300`}>Rejected</span>;
      case 'paid':
        return <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300`}>Paid</span>;
      default:
        return <span className={`${base} bg-slate-100 text-slate-700`}>{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Expenses & Claims</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Submit, track, and manage your official business reimbursements
          </p>
        </div>
        <button
          onClick={() => openCreateModal()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Expense Claim
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Claims' },
            { id: 'drafts', label: 'Drafts' },
            { id: 'pending', label: 'Pending Approval' },
            { id: 'approved', label: 'Payment Pending' },
            { id: 'returned', label: 'Returned' },
            { id: 'paid', label: 'Paid' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${selectedStatus === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, claim #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Claims List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading claims...</div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Expense Claims Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {categories.length === 0
                ? 'No expense categories are set up for this organization yet. Ask HR/admin to open Expense Settings once so default categories (Travel, Food, Hotel) are created.'
                : "You haven't submitted any expense claims matching the selected filters."}
            </p>
            <button
              onClick={() => openCreateModal()}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
            >
              Create New Claim
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-3.5 px-4">Claim Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Total Amount</th>
                  <th className="py-3.5 px-4">Approved Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredClaims.map((rawClaim) => {
                  const claim = rawClaim as any;
                  const cNum = claim.claimNumber || claim.claim_number || `EXP-${claim.id}`;
                  const catName = claim.categoryName || claim.category_name || 'Multiple Items';
                  const cDate = claim.claimDate || claim.claim_date;
                  const totClaimed = Number(claim.totalClaimedAmount ?? claim.total_claimed_amount ?? 0);
                  const totApproved = Number(claim.totalApprovedAmount ?? claim.total_approved_amount ?? 0);

                  const formattedDate = cDate ? new Date(cDate).toLocaleDateString() : 'N/A';

                  return (
                    <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{claim.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{cNum}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {catName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ₹{totClaimed.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{totApproved.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(claim.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={async () => {
                            const full = await expenseApi.getClaimById(claim.id);
                            setSelectedClaimDetails(full);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(claim.status === 'draft' || claim.status === 'returned') && (
                          <button
                            onClick={() => openCreateModal(claim)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                            title="Edit & Resubmit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
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

      {/* CREATE / EDIT CLAIM MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
          <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[92dvh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {editingClaimId ? 'Edit / Resubmit Expense Claim' : 'Create New Expense Claim'}
              </h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg shrink-0 ml-2"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
              {/* Claim Header Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Claim Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Client Visit Travel & Meals"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Claim Date *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Category
                  </label>
                  <select
                    value={formCategoryId || ''}
                    onChange={(e) => setFormCategoryId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="bank_transfer">Direct Bank Transfer</option>
                    <option value="manual">Manual Cash / Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Project / Cost Center
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PRJ-2026-HQ"
                    value={formProject}
                    onChange={(e) => setFormProject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Merchant / Vendor
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Uber / Hotel Marriott"
                    value={formMerchant}
                    onChange={(e) => setFormMerchant(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Multiple Expense Items Section */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-blue-500 shrink-0" />
                    Expense Line Items
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Category
                        </label>
                        <select
                          value={item.categoryId || formCategoryId || ''}
                          onChange={(e) => handleItemChange(idx, 'categoryId', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Amount (₹) *
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={item.claimedAmount || ''}
                          onChange={(e) => handleItemChange(idx, 'claimedAmount', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={item.expenseDate || formDate}
                          onChange={(e) => handleItemChange(idx, 'expenseDate', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Receipt Upload (Max 10MB)
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const inputEl = document.getElementById(`receipt-file-input-${idx}`);
                              if (inputEl) inputEl.click();
                            }}
                            className="cursor-pointer px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            {item.receiptUrl ? 'Change' : 'Upload'}
                          </button>
                          <input
                            id={`receipt-file-input-${idx}`}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,application/pdf"
                            onChange={(e) => handleFileUpload(idx, e)}
                            className="hidden"
                          />
                          {item.receiptUrl ? (
                            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded-lg text-[11px] font-medium min-w-0 max-w-full">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                              <span className="truncate max-w-[80px] sm:max-w-[100px]" title={item.receiptFileName || 'Receipt Attached'}>
                                {item.receiptFileName || 'Uploaded'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewReceiptUrl(item.receiptUrl!);
                                  setPreviewReceiptType(item.receiptFileType || 'image/jpeg');
                                }}
                                className="p-0.5 text-emerald-600 hover:text-emerald-900 rounded shrink-0"
                                title="Preview Receipt"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleItemChange(idx, 'receiptUrl', '');
                                  handleItemChange(idx, 'receiptFileName', '');
                                }}
                                className="p-0.5 text-rose-500 hover:text-rose-700 rounded shrink-0"
                                title="Remove Receipt"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Description & Justification */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Item description / merchant details..."
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />

                      <input
                        type="text"
                        placeholder="Employee justification (required if policy limit exceeded)..."
                        value={item.employeeJustification || ''}
                        onChange={(e) => handleItemChange(idx, 'employeeJustification', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-amber-700 dark:text-amber-400"
                      />
                    </div>

                    {/* Policy Warning Box */}
                    {policyWarnings[idx] && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">Policy Violation Warning:</p>
                          <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                            {policyWarnings[idx].map((v, vIdx) => (
                              <li key={vIdx}>{v}</li>
                            ))}
                          </ul>
                          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                            * Please ensure you provide a clear employee justification above for approval exception.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Summary Banner */}
              <div className="p-3.5 sm:p-4 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-400">Total Claimed Amount</span>
                  <div className="text-lg sm:text-xl font-bold">₹{calculateTotal().toLocaleString('en-IN')}</div>
                </div>
                <div className="text-xs text-slate-400 text-right">
                  <span>Items: {items.length}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-wrap items-center justify-end gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveClaim(true)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveClaim(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLAIM DETAILS DRAWER / MODAL */}
      {selectedClaimDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedClaimDetails.title}
                </h2>
                <p className="text-xs text-slate-500 font-mono">{selectedClaimDetails.claimNumber}</p>
              </div>
              <button
                onClick={() => setSelectedClaimDetails(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Amounts summary */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Claimed Amount</span>
                  <span className="text-base font-bold text-slate-900 dark:text-white">
                    ₹{Number(selectedClaimDetails.totalClaimedAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Approved Amount</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(selectedClaimDetails.totalApprovedAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <div className="mt-1">{getStatusBadge(selectedClaimDetails.status)}</div>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2">Claim Items</h4>
                <div className="space-y-2">
                  {selectedClaimDetails.items?.map((it, i) => (
                    <div key={i} className="p-3 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>{it.categoryName || 'Expense Item'}</span>
                        <span className="font-bold">₹{Number(it.claimedAmount).toLocaleString('en-IN')}</span>
                      </div>
                      <p className="text-slate-500">{it.description || 'No description provided'}</p>
                      {it.receiptUrl && (
                        <button
                          onClick={() => {
                            setPreviewReceiptUrl(it.receiptUrl!);
                            setPreviewReceiptType(it.receiptFileType || 'application/pdf');
                          }}
                          className="text-blue-600 hover:underline flex items-center gap-1 mt-1 font-medium"
                        >
                          <Paperclip className="w-3 h-3" /> View Receipt
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval Timeline */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-3">Approval History & Timeline</h4>
                <div className="space-y-4 border-l-2 border-slate-200 dark:border-slate-800 pl-4 ml-2">
                  {selectedClaimDetails.timeline?.map((log, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-0 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white dark:border-slate-900" />
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {log.action} — <span className="text-slate-500">{log.approverName} ({log.approverRole})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{new Date(log.createdAt).toLocaleString()}</div>
                      {log.comments && <p className="text-slate-600 dark:text-slate-300 mt-1 italic">"{log.comments}"</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT PREVIEW MODAL */}
      {previewReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col">
            <div className="w-full flex justify-end mb-2">
              <button
                onClick={() => {
                  setPreviewReceiptUrl(null);
                  setPreviewReceiptType(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 max-h-[75vh] overflow-auto flex items-center justify-center">
              {previewReceiptType === 'application/pdf' ? (
                <embed
                  src={previewReceiptUrl}
                  type="application/pdf"
                  width="100%"
                  height="600px"
                  className="rounded-lg shadow"
                />
              ) : (
                <img
                  src={previewReceiptUrl}
                  alt="Receipt Preview"
                  className="max-w-full max-h-full h-auto rounded-lg shadow object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
