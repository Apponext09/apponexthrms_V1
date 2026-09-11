import React, { useEffect, useState } from 'react';
import { expenseApi, ExpenseClaim, ExpenseCategory, ExpenseItemInput } from '../api/expenseApi';
import { apiClient } from '@/config/api';
import { useAuthStore } from '../../auth/store/authStore';
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
  Building,
  Info,
  ChevronRight,
  FileCheck,
  Filter,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { useExpenseMoney } from '../utils/useExpenseMoney';
import { ExpensePolicy } from '../api/expenseApi';

export const MyExpensesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isManagement = ['manager', 'team_lead', 'hr', 'hr_manager', 'ceo', 'admin', 'super_admin', 'organization_admin', 'department_head'].includes((user?.role || '').toLowerCase());

  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<ExpenseClaim[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [policies, setPolicies] = useState<ExpensePolicy[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [departments, setDepartments] = useState<Array<{ id: string | number; name: string }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const money = useExpenseMoney();
  const [processingId, setProcessingId] = useState<number | string | null>(null);

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
      const [claimsRes, catRes, deptRes, polRes] = await Promise.all([
        expenseApi.getClaims({ mode: isManagement ? undefined : 'my_expenses' }).catch(() => []),
        expenseApi.getCategories().catch(() => []),
        apiClient.get('/settings/departments', { params: { pageSize: 200 } }).catch(() => ({ data: { data: [] } })),
        expenseApi.getPolicies().catch(() => [])
      ]);

      const fetchedClaims = claimsRes || [];
      setClaims(fetchedClaims);
      setCategories(catRes || []);
      setPolicies(polRes || []);

      const rawDepts = deptRes.data?.data || deptRes.data || [];
      const deptMap = new Map<string, string>();
      if (Array.isArray(rawDepts)) {
        rawDepts.forEach((d: any) => {
          if (d.name) deptMap.set(String(d.id || d.name), d.name);
        });
      }
      fetchedClaims.forEach((c: any) => {
        const dName = c.departmentName || c.department_name;
        if (dName && !Array.from(deptMap.values()).includes(dName)) {
          deptMap.set(dName, dName);
        }
      });
      setDepartments(Array.from(deptMap.entries()).map(([id, name]) => ({ id, name })));

      if (catRes && catRes.length > 0) {
        const defaultCatId = catRes[0].id;
        setFormCategoryId(defaultCatId);
        setItems((prevItems) =>
          prevItems.map((item) => ({
            ...item,
            categoryId: item.categoryId || defaultCatId
          }))
        );
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toast Notification State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; title?: string; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleQuickApprove = async (claim: any) => {
    try {
      setProcessingId(claim.id);
      if (claim.status === 'pending_finance') {
        await expenseApi.financeVerifyClaim(claim.id, { comments: 'Verified and approved by Finance' });
      } else {
        await expenseApi.managerApproveClaim(claim.id, 'Approved by Reporting Manager');
      }
      setToast({ type: 'success', title: 'Claim Approved', message: 'Expense claim approved successfully.' });
      fetchClaimsAndCategories();
    } catch (err: any) {
      setToast({ type: 'error', title: 'Approval Error', message: err.response?.data?.message || err.message || 'Failed to approve claim' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickReject = async (claim: any) => {
    const reason = prompt('Please enter reason for rejection:', 'Does not comply with expense policy');
    if (reason === null) return;
    try {
      setProcessingId(claim.id);
      await expenseApi.rejectClaim(claim.id, reason);
      setToast({ type: 'success', title: 'Claim Rejected', message: 'Expense claim rejected.' });
      fetchClaimsAndCategories();
    } catch (err: any) {
      setToast({ type: 'error', title: 'Rejection Error', message: err.response?.data?.message || err.message || 'Failed to reject claim' });
    } finally {
      setProcessingId(null);
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
    if (!amt || amt <= 0) return;
    try {
      const targetCatId = catId || formCategoryId || 0;
      const res = await expenseApi.validatePolicy(targetCatId, amt, Boolean(receipt));
      if (!res.isValid && res.violations && res.violations.length > 0) {
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

  // Helper to compute active policy limit for a category dynamically from Expense Policies
  const getPolicyLimitInfo = (catId?: number) => {
    const targetId = catId || formCategoryId;
    if (!targetId && targetId !== 0) return null;

    const applicablePols = policies.filter((p) => {
      if (p.isActive === false) return false;
      const pCatId = p.categoryId !== undefined && p.categoryId !== null ? Number(p.categoryId) : 0;
      return pCatId === 0 || pCatId === Number(targetId);
    });

    if (applicablePols.length === 0) return null;

    const catSpecificPols = applicablePols.filter((p) => {
      const pCatId = p.categoryId !== undefined && p.categoryId !== null ? Number(p.categoryId) : 0;
      return pCatId === Number(targetId);
    });
    const targetPols = catSpecificPols.length > 0 ? catSpecificPols : applicablePols;

    const unlimitedPol = targetPols.find((p) => Number(p.maxLimitPerClaim ?? (p as any).max_limit_per_claim ?? 0) === 0);
    if (unlimitedPol) {
      return {
        limit: 0,
        isUnlimited: true,
        policyName: unlimitedPol.policyName || (unlimitedPol as any).policy_name || 'Unlimited Policy'
      };
    }

    const numericLimits = targetPols
      .map((p) => Number(p.maxLimitPerClaim ?? (p as any).max_limit_per_claim ?? 0))
      .filter((lim) => lim > 0);

    if (numericLimits.length === 0) return null;

    const minLimit = Math.min(...numericLimits);
    const pol = targetPols.find((p) => Number(p.maxLimitPerClaim ?? (p as any).max_limit_per_claim ?? 0) === minLimit);
    const policyName = pol?.policyName || (pol as any)?.policy_name || 'Policy Limit';

    return {
      limit: minLimit,
      isUnlimited: false,
      policyName
    };
  };

  const handleAddItem = () => {
    const defaultCatId = formCategoryId || (categories.length > 0 ? categories[0].id : undefined);
    setItems([
      ...items,
      {
        categoryId: defaultCatId,
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
      setToast({ type: 'warning', title: 'Invalid File Format', message: 'Only JPG, PNG, and PDF receipt files are allowed.' });
      e.target.value = '';
      return;
    }

    // Size validation: max 10MB
    if (file.size > 10 * 1024 * 1024) {
      setToast({ type: 'warning', title: 'File Size Exceeded', message: 'Receipt file size exceeds maximum limit of 10MB.' });
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
      setToast({ type: 'warning', title: 'Title Required', message: 'Please enter a claim title.' });
      return;
    }
    if (!formCategoryId) {
      setToast({ type: 'warning', title: 'Category Required', message: 'Please select an expense category.' });
      return;
    }
    const normalizedItems = items.map((item) => ({
      ...item,
      categoryId: item.categoryId || formCategoryId
    }));
    const total = normalizedItems.reduce((sum, item) => sum + Number(item.claimedAmount || 0), 0);
    if (total <= 0) {
      setToast({ type: 'warning', title: 'Invalid Amount', message: 'Please enter valid expense item amounts greater than ₹0.' });
      return;
    }

    for (let i = 0; i < normalizedItems.length; i++) {
      const item = normalizedItems[i];
      const cat = categories.find((c) => c.id === item.categoryId);
      if (!item.categoryId) {
        setToast({ type: 'warning', title: 'Category Required', message: `Item #${i + 1} needs a category.` });
        return;
      }
      if (Number(item.claimedAmount || 0) <= 0) {
        setToast({ type: 'warning', title: 'Amount Required', message: `Item #${i + 1} needs an amount greater than ₹0.` });
        return;
      }
      if (
        !isDraft &&
        cat &&
        cat.isReceiptMandatory &&
        Number(item.claimedAmount) >= Number(cat.minAmountForReceipt || 0) &&
        !String(item.receiptUrl || '').trim()
      ) {
        setToast({
          type: 'warning',
          title: '📷 Receipt Mandatory',
          message: `${cat.name} requires a receipt for amounts over ${money(cat.minAmountForReceipt || 0)}. Please attach a receipt on Item #${i + 1} before submitting.`
        });
        return;
      }
    }

    if (!isDraft) {
      for (let i = 0; i < normalizedItems.length; i++) {
        const itemCatId = normalizedItems[i].categoryId;
        const limitInfo = getPolicyLimitInfo(itemCatId);
        const itemAmt = Number(normalizedItems[i].claimedAmount || 0);

        if (limitInfo && !limitInfo.isUnlimited && limitInfo.limit > 0 && itemAmt > limitInfo.limit) {
          const cat = categories.find((c) => c.id === itemCatId);
          const catName = cat?.name || `Item #${i + 1}`;
          setToast({
            type: 'warning',
            title: '⚠️ Policy Limit Exceeded',
            message: `Amount for '${catName}' (${money(itemAmt)}) exceeds the set policy limit of ${money(limitInfo.limit)}. Cannot submit above set policy limit.`
          });
          return;
        }

        if (policyWarnings[i] && policyWarnings[i].length > 0 && !normalizedItems[i].employeeJustification?.trim()) {
          const cat = categories.find((c) => c.id === itemCatId);
          const catName = cat?.name || `Item #${i + 1}`;
          setToast({
            type: 'warning',
            title: '⚠️ Policy Limit Exceeded',
            message: `Policy violation on '${catName}': ${policyWarnings[i].join('. ')}. Please enter an Employee Justification before submitting.`
          });
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
        setToast({ type: 'success', title: 'Claim Updated', message: 'Expense claim updated successfully.' });
      } else {
        await expenseApi.createClaim(payload);
        setToast({
          type: 'success',
          title: 'Claim Submitted',
          message: isDraft ? 'Expense claim saved as draft.' : 'Expense claim submitted and sent for approval.'
        });
      }

      setIsCreateModalOpen(false);
      fetchClaimsAndCategories();
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to save expense claim';
      setToast({ type: 'error', title: 'Submission Error', message: errMsg });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClaims = claims.filter((claim: any) => {
    if (selectedStatus === 'drafts' && claim.status !== 'draft') return false;
    if (selectedStatus === 'pending') {
      const isPendingWorkflow =
        ['submitted', 'pending_manager', 'pending_finance', 'pending'].includes(claim.status) ||
        /^pending_level_\d+$/.test(String(claim.status || ''));
      if (!isPendingWorkflow) return false;
    }
    if (selectedStatus === 'approved' && !['approved', 'payment_pending'].includes(claim.status)) return false;
    if (selectedStatus === 'returned' && claim.status !== 'returned') return false;
    if (selectedStatus === 'paid' && claim.status !== 'paid') return false;

    if (selectedDepartment) {
      const deptName = String(claim.departmentName || claim.department_name || '').toLowerCase();
      const deptId = String(claim.departmentId || claim.department_id || '');
      if (deptId !== selectedDepartment && !deptName.includes(selectedDepartment.toLowerCase())) {
        return false;
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const title = String(claim.title || '').toLowerCase();
      const claimNum = String(claim.claimNumber || claim.claim_number || '').toLowerCase();
      const fName = String(claim.firstName || claim.first_name || '').toLowerCase();
      const lName = String(claim.lastName || claim.last_name || '').toLowerCase();
      const empCode = String(claim.employeeCode || claim.employee_code || '').toLowerCase();
      const merchant = String(claim.merchantName || claim.merchant_name || '').toLowerCase();
      const dept = String(claim.departmentName || claim.department_name || '').toLowerCase();

      return (
        title.includes(q) ||
        claimNum.includes(q) ||
        fName.includes(q) ||
        lName.includes(q) ||
        empCode.includes(q) ||
        merchant.includes(q) ||
        dept.includes(q)
      );
    }
    return true;
  });

  const getStatusLabel = (status: string, currentApproverRole?: string): string => {
    if (status.startsWith('pending_level_') && currentApproverRole && currentApproverRole.trim()) {
      return `Pending ${currentApproverRole.trim()}`;
    }
    switch (status) {
      case 'draft': return 'Draft';
      case 'submitted':
      case 'pending': return 'Submitted – Pending Approval';
      case 'pending_manager': return 'Pending Manager Approval';
      case 'pending_level_1': return 'Pending Team Lead Approval';
      case 'pending_level_2': return 'Pending Manager Approval';
      case 'pending_level_3': return 'Pending HR / Admin Approval';
      case 'pending_finance': return 'Pending Finance Verification';
      case 'payment_pending': return 'Finance Approved – Payment Pending';
      case 'approved': return 'Approved';
      case 'returned': return 'Returned for Correction';
      case 'rejected': return 'Rejected';
      case 'paid': return 'Reimbursed / Paid';
      default: {
        // Handle dynamic pending_level_N (e.g. pending_level_4, pending_level_5)
        const lvlMatch = /^pending_level_(\d+)$/.exec(status);
        if (lvlMatch) return `Pending Level ${lvlMatch[1]} Approval`;
        return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }
  };

  const getStatusBadge = (status: string, currentApproverRole?: string) => {
    const base = 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap';
    const label = getStatusLabel(status, currentApproverRole);
    switch (status) {
      case 'draft':
        return <span className={`${base} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>{label}</span>;
      case 'submitted':
      case 'pending':
      case 'pending_manager':
      case 'pending_level_1':
        return <span className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300`}>{label}</span>;
      case 'pending_level_2':
      case 'pending_level_3':
        return <span className={`${base} bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300`}>{label}</span>;
      case 'pending_finance':
        return <span className={`${base} bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300`}>{label}</span>;
      case 'approved':
        return <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300`}>{label}</span>;
      case 'payment_pending':
        return <span className={`${base} bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300`}>{label}</span>;
      case 'returned':
        return <span className={`${base} bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300`}>{label}</span>;
      case 'rejected':
        return <span className={`${base} bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300`}>{label}</span>;
      case 'paid':
        return <span className={`${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300`}>{label}</span>;
      default: {
        const lvlMatch = /^pending_level_(\d+)$/.exec(status);
        if (lvlMatch) return <span className={`${base} bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300`}>{label}</span>;
        return <span className={`${base} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300`}>{label}</span>;
      }
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[200] flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs sm:text-sm font-medium transition-all max-w-md ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/90 dark:border-emerald-700 dark:text-emerald-300'
            : toast.type === 'warning'
            ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/90 dark:border-amber-700 dark:text-amber-300'
            : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/90 dark:border-rose-700 dark:text-rose-300'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
          ) : toast.type === 'warning' ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          )}
          <div className="flex-1">
            {toast.title && <div className="font-bold text-xs uppercase tracking-wide mb-0.5">{toast.title}</div>}
            <div>{toast.message}</div>
          </div>
          <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 p-0.5 rounded shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
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

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Department Filter Dropdown */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 dark:text-slate-300 min-w-[150px]"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee, title, claim #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
                : "No expense claims match the selected status, department, or search query."}
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
                  const fName = claim.firstName || claim.first_name || '';
                  const lName = claim.lastName || claim.last_name || '';
                  const empCode = claim.employeeCode || claim.employee_code || '';
                  const deptName = claim.departmentName || claim.department_name || '';
                  const applicantName = `${fName} ${lName}`.trim();

                  const formattedDate = cDate ? new Date(cDate).toLocaleDateString() : 'N/A';

                  return (
                    <tr key={claim.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{claim.title}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                          <span className="font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/50">
                            Applicant: {applicantName || 'Self / Employee'} {empCode ? `(${empCode})` : ''}
                          </span>
                          {deptName && (
                            <span className="text-slate-500 dark:text-slate-400 font-medium">• {deptName}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{cNum}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {catName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {formattedDate}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        {money(totClaimed)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                        {money(totApproved)}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(claim.status, claim.currentApproverRole || claim.current_approver_role)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isManagement && ['submitted', 'pending_manager', 'pending_finance', 'pending'].includes(claim.status) && (
                            <button
                              disabled={processingId === claim.id}
                              onClick={() => handleQuickApprove(claim)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                              title="Approve Claim Immediately"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              {processingId === claim.id ? 'Approving...' : claim.status === 'pending_finance' ? 'Approve (Finance)' : 'Approve'}
                            </button>
                          )}
                          {isManagement && ['submitted', 'pending_manager', 'pending_finance', 'pending'].includes(claim.status) && (
                            <button
                              disabled={processingId === claim.id}
                              onClick={() => handleQuickReject(claim)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Reject Claim"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          )}
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-3 sm:my-6 mx-auto">
            {/* Modal Header */}
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
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
            <div className="p-3 sm:p-4 space-y-3.5 max-h-[60vh] overflow-y-auto">
              {/* Claim Header Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Claim Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Client Visit Travel & Meals"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Claim Date *
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {/* <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Category
                  </label>
                  <select
                    value={formCategoryId || ''}
                    onChange={(e) => setFormCategoryId(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div> */}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="bank_transfer">Direct Bank Transfer</option>
                    <option value="manual">Manual Cash / Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Project / Cost Center
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PRJ-2026-HQ"
                    value={formProject}
                    onChange={(e) => setFormProject(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Travel Sourse
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Uber / Hotel Marriott"
                    value={formMerchant}
                    onChange={(e) => setFormMerchant(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Multiple Expense Items Section */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    Expense Line Items
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5 relative"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Item #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-rose-500 hover:text-rose-700 p-0.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Category
                        </label>
                        <select
                          value={item.categoryId || formCategoryId || (categories.length > 0 ? categories[0].id : '')}
                          onChange={(e) => handleItemChange(idx, 'categoryId', Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200"
                        >
                          <option value="">-- Select Category --</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.spendingLimit ? `(Limit: ₹${c.spendingLimit.toLocaleString()})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Amount (₹) *
                        </label>
                        {(() => {
                          const limitInfo = getPolicyLimitInfo(item.categoryId || formCategoryId);
                          const isExceeded = Boolean(limitInfo && !limitInfo.isUnlimited && limitInfo.limit > 0 && Number(item.claimedAmount || 0) > limitInfo.limit);

                          return (
                            <>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={item.claimedAmount || ''}
                                onChange={(e) => handleItemChange(idx, 'claimedAmount', Number(e.target.value))}
                                className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  isExceeded
                                    ? 'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500 text-rose-700 dark:text-rose-300 focus:ring-2 focus:ring-rose-500 focus:outline-none'
                                    : limitInfo?.isUnlimited
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
                                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                                }`}
                              />
                              {isExceeded && limitInfo && (
                                <p className="mt-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  Amount exceeds set policy limit of {money(limitInfo.limit)}! Cannot claim above set limit.
                                </p>
                              )}
                              {limitInfo?.isUnlimited && (
                                <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                                  Policy: Unlimited / No Cap Applies
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={item.expenseDate || formDate}
                          onChange={(e) => handleItemChange(idx, 'expenseDate', e.target.value)}
                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                          Receipt Upload (Max 10MB)
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div>
                            <button
                              type="button"
                              onClick={() => {
                                const inputEl = document.getElementById(`receipt-file-input-${idx}`);
                                if (inputEl) inputEl.click();
                              }}
                              className="cursor-pointer px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {item.receiptUrl ? 'Change Receipt' : 'Upload Receipt'}
                            </button>
                            <input
                              id={`receipt-file-input-${idx}`}
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,application/pdf"
                              onChange={(e) => handleFileUpload(idx, e)}
                              className="hidden"
                            />
                          </div>
                          {item.receiptUrl ? (
                            <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg text-[11px] font-medium min-w-0 max-w-full">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        placeholder="Item description / merchant details..."
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />

                      <input
                        type="text"
                        placeholder="Employee justification (required if policy limit exceeded)..."
                        value={item.employeeJustification || ''}
                        onChange={(e) => handleItemChange(idx, 'employeeJustification', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-amber-700 dark:text-amber-400"
                      />
                    </div>

                    {/* Policy Warning Box */}
                    {policyWarnings[idx] && policyWarnings[idx].length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 border-l-4 border-l-amber-500 shadow-xs">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-900 dark:text-amber-200">⚠️ Policy Limit Warning:</p>
                          <ul className="list-disc list-inside mt-1 space-y-0.5 font-medium">
                            {policyWarnings[idx].map((v, vIdx) => (
                              <li key={vIdx}>{v}</li>
                            ))}
                          </ul>
                          <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                            * Please enter an Employee Justification above before submitting.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Summary Banner */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-slate-400">Total Claimed Amount</span>
                  <div className="text-base sm:text-lg font-bold">{money(calculateTotal())}</div>
                </div>
                <div className="text-[11px] text-slate-400 text-right">
                  <span>Items: {items.length}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-wrap items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveClaim(true)}
                className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSaveClaim(false)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLAIM DETAILS DRAWER / MODAL */}
      {selectedClaimDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-end p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {selectedClaimDetails.title}
                </h2>
                <p className="text-[11px] text-slate-500 font-mono">{selectedClaimDetails.claimNumber}</p>
              </div>
              <button
                onClick={() => setSelectedClaimDetails(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg shrink-0 ml-2"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Amounts summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Claimed Amount</span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {money(Number(selectedClaimDetails.totalClaimedAmount))}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Approved Amount</span>
                  <span className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {money(Number(selectedClaimDetails.totalApprovedAmount || 0))}
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
                        <span className="font-bold">{money(it.claimedAmount)}</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white dark:bg-slate-900 max-w-3xl w-full rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl p-3 sm:p-4 flex flex-col items-center">
            <div className="w-full flex justify-end">
              <button
                onClick={() => {
                  setPreviewReceiptUrl(null);
                  setPreviewReceiptType(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 text-xs font-semibold"
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

export default MyExpensesPage;

