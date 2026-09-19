import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';
import type { Employee } from '@/types';
import {
  RotateCcw,
  Edit2,
  Save,
  X,
  Building2,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CreditCard,
  FileCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import { ProfileEditRequestModal } from './ProfileEditRequestModal';
import { useAuthStore } from '@/features/auth/store/authStore';

// ── Verification Status Types & Normalizer ──────────────────────────────────────────
export type VerificationStatus = 'not_verified' | 'pending' | 'in_progress' | 'verified' | 'rejected';

export function normalizeVerificationStatus(value: unknown): VerificationStatus {
  if (!value) return 'not_verified';
  const normalized = String(value).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['verified', 'approve', 'approved', 'true', '1'].includes(normalized)) return 'verified';
  if (['rejected', 'reject', 'failed'].includes(normalized)) return 'rejected';
  if (['in_progress', 'under_review', 'processing', 'in_verification'].includes(normalized)) return 'in_progress';
  if (['pending', 'requested', 'waiting', 'submitted'].includes(normalized)) return 'pending';
  return 'not_verified';
}

// ── Helper functions to mask sensitive statutory & banking fields ────────────────────
function maskAccountNumber(val: string): string {
  if (!val) return '';
  const clean = val.trim();
  if (clean.length <= 4) return clean;
  const visible = clean.slice(-4);
  const maskedCount = Math.max(clean.length - 4, 4);
  return '•'.repeat(maskedCount) + visible;
}

function maskIFSC(val: string): string {
  if (!val) return '';
  const clean = val.trim();
  if (clean.length <= 4) return clean;
  const visible = clean.slice(-4);
  const maskedCount = Math.max(clean.length - 4, 4);
  return '•'.repeat(maskedCount) + visible;
}

function maskPAN(val: string): string {
  if (!val) return '';
  const clean = val.trim();
  if (clean.length <= 4) return clean;
  const visible = clean.slice(-4);
  const maskedCount = Math.max(clean.length - 4, 4);
  return '•'.repeat(maskedCount) + visible;
}

function maskAadhaar(val: string): string {
  if (!val) return '';
  const clean = val.trim();
  if (clean.length <= 3) return clean;
  const visible = clean.slice(-3);
  const maskedCount = Math.max(clean.length - 3, 4);
  return '•'.repeat(maskedCount) + visible;
}

function maskPF(val: string): string {
  if (!val) return '';
  const clean = val.trim();
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length >= 2) {
      const prefix = `${parts[0]}/${parts[1]}`;
      const maskedSuffix = parts.slice(2).map(p => '•'.repeat(Math.max(p.length, 3))).join('/');
      return `${prefix}/${maskedSuffix}`;
    }
  }
  if (clean.length <= 6) return clean;
  return clean.slice(0, 6) + '/' + '•'.repeat(clean.length - 6);
}

function maskESIC(val: string): string {
  if (!val) return '';
  const clean = val.trim();
  if (clean.length <= 3) return clean;
  const visible = clean.slice(-3);
  const maskedCount = Math.max(clean.length - 3, 4);
  return '•'.repeat(maskedCount) + visible;
}

function maskUAN(val: string): string {
  if (!val) return '';
  const clean = val.trim();
  if (clean.length <= 3) return clean;
  const visible = clean.slice(-3);
  const maskedCount = Math.max(clean.length - 3, 4);
  return '•'.repeat(maskedCount) + visible;
}

// ── Statutory Form Field Validation Helper ──────────────────────────────────────────
export const validateStatutoryField = (field: string, value: string, currentData?: any): string => {
  const cleanVal = (value || '').trim();

  // If value is empty, check dependency rules
  if (!cleanVal) {
    if (field === 'panNumber' && currentData?.panStatus === 'verified') {
      return 'PAN Card Number is required when PAN Status is marked as Verified';
    }
    return '';
  }

  switch (field) {
    case 'bankName':
      if (cleanVal.length < 2) return 'Bank name must be at least 2 characters';
      if (cleanVal.length > 100) return 'Bank name cannot exceed 100 characters';
      if (!/^[a-zA-Z0-9\s.&',()/-]+$/.test(cleanVal)) {
        return 'Bank name contains invalid characters';
      }
      return '';

    case 'accountNumber': {
      const raw = cleanVal.replace(/\s+/g, '');
      if (!/^\d+$/.test(raw)) return 'Account number must contain numeric digits only';
      if (raw.length < 9 || raw.length > 18) return 'Account number must be between 9 and 18 digits';
      return '';
    }

    case 'ifscCode': {
      const upper = cleanVal.toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(upper)) {
        return 'IFSC code must be 11 characters (e.g. HDFC0001234: 4 letters, 0, then 6 alphanumeric)';
      }
      return '';
    }

    case 'companyBankBranch':
      if (cleanVal.length > 100) return 'Branch name cannot exceed 100 characters';
      return '';

    case 'panNumber': {
      const upper = cleanVal.toUpperCase();
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(upper)) {
        return 'Invalid PAN format. Must be 10 characters (5 letters + 4 digits + 1 letter, e.g. ABCDE1234F)';
      }
      return '';
    }

    case 'uidaiNumber': {
      const digits = cleanVal.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(digits)) return 'Aadhaar number must contain numeric digits only';
      if (digits.length !== 12) return 'Aadhaar number must be exactly 12 digits';
      return '';
    }

    case 'pfNumber': {
      const upper = cleanVal.toUpperCase();
      if (upper.length < 5 || upper.length > 35) return 'PF number must be 5 to 35 characters';
      if (!/^[A-Z0-9\/\-]+$/.test(upper)) return 'PF number contains invalid characters (letters, numbers, slashes allowed)';
      return '';
    }

    case 'uanNumber': {
      const digits = cleanVal.replace(/\s+/g, '');
      if (!/^\d+$/.test(digits)) return 'UAN must contain numeric digits only';
      if (digits.length !== 12) return 'UAN must be exactly 12 digits';
      return '';
    }

    case 'esicNumber': {
      const digits = cleanVal.replace(/\s+/g, '');
      if (!/^\d+$/.test(digits)) return 'ESIC number must contain numeric digits only';
      if (digits.length !== 17) return 'ESIC number must be exactly 17 digits';
      return '';
    }

    default:
      return '';
  }
};

interface EmployeeStatutoryDetailsProps {
  employee: Employee;
  onUpdate?: () => void;
  editUnlocked?: boolean;
  approvedRequestId?: number | null;
}

export function EmployeeStatutoryDetails({ employee, onUpdate, editUnlocked = false, approvedRequestId }: EmployeeStatutoryDetailsProps) {
  const location = useLocation();
  const { user } = useAuthStore();
  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const singleRole = (user as any)?.role || (user as any)?.accessRole || '';
  const allUserRoles = [...userRoles, singleRole];
  const isAdminOrHR = allUserRoles.some(r =>
    ['organization_admin', 'hr_admin', 'hr', 'hr_manager', 'super_admin', 'support'].includes(r)
  );

  const isEmployeePortal = !isAdminOrHR;
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [paySlabs, setPaySlabs] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    companyBank: '',
    companyBankBranch: '',
    uidaiNumber: '',
    panNumber: '',
    uanNumber: '',
    pfNumber: '',
    esicNumber: '',
    payrollSlab: '',
    employeeShare: '',
    employerShare: '',
    backgroundVerification: 'not_verified' as VerificationStatus,
    eligibleForEps: 'N',
    panStatus: 'not_verified' as VerificationStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch real Pay Slabs list from API
  useEffect(() => {
    apiClient.get('/payroll/slabs').then((res: any) => {
      const list = res.data?.data || res.data || [];
      setPaySlabs(list);
    }).catch(() => {});
  }, []);

  // Load from employee prop and fetch active salary structure for accurate mapped slab
  useEffect(() => {
    const e = employee as any;
    const initialSlab = e?.salarySlabName || e?.salary_slab_name || e?.payroll_slab_name || e?.payrollSlab || e?.payroll_slab || e?.slab_name || '';

    setFormData({
      bankName: e?.bankName || e?.bank_name || '',
      accountNumber: e?.accountNo || e?.account_no || e?.account_number || e?.bank_account_number || e?.accountNumber || '',
      ifscCode: e?.ifscCode || e?.ifsc_code || '',
      companyBank: e?.companyBank || e?.company_bank || '',
      companyBankBranch: e?.branchName || e?.branch_name || e?.companyBankBranch || e?.company_bank_branch || '',
      uidaiNumber: e?.aadharNumber || e?.aadhaarNumber || e?.aadhar_number || e?.aadhaar_number || e?.uidaiNumber || '',
      panNumber: e?.panNumber || e?.pan_number || e?.pan || '',
      uanNumber: e?.uanNo || e?.uan_no || e?.uan_number || e?.uanNumber || '',
      pfNumber: e?.pfNo || e?.pf_no || e?.pf_number || e?.pfNumber || '',
      esicNumber: e?.esicNo || e?.esic_no || e?.esic_number || e?.esicNumber || '',
      payrollSlab: initialSlab,
      employeeShare: e?.employeeShare || e?.employee_share || '',
      employerShare: e?.employerShare || e?.employer_share || '',
      backgroundVerification: normalizeVerificationStatus(e?.backgroundVerification || e?.background_verification),
      eligibleForEps: e?.eligibleForEps || e?.eligible_for_eps || 'N',
      panStatus: normalizeVerificationStatus(e?.panStatus || e?.pan_status),
    });
    setErrors({});

    if (employee?.id) {
      Promise.all([
        apiClient.get(`/employees/${employee.id}`).catch(() => null),
        apiClient.get(`/payroll/salary-structure?employee_id=${employee.id}`).catch(() => ({ data: { data: [] } }))
      ]).then(([empRes, structRes]: any) => {
        const d = empRes?.data?.data || empRes?.data;
        const structs = structRes?.data?.data || structRes?.data || [];
        const active = structs.find((s: any) => s.slabName || s.slab_name || s.slabId || s.slab_id);
        const sName = active?.slabName || active?.slab_name || active?.structureName || active?.structure_name || (d ? (d.salarySlabName || d.salary_slab_name || d.payrollSlab) : '');

        if (d) {
          setFormData({
            bankName: d.bankName || d.bank_name || '',
            accountNumber: d.accountNo || d.account_no || d.account_number || d.bank_account_number || d.accountNumber || '',
            ifscCode: d.ifscCode || d.ifsc_code || '',
            companyBank: d.companyBank || d.company_bank || '',
            companyBankBranch: d.branchName || d.branch_name || d.companyBankBranch || d.company_bank_branch || '',
            uidaiNumber: d.aadharNumber || d.aadhaarNumber || d.aadhar_number || d.aadhaar_number || d.uidaiNumber || '',
            panNumber: d.panNumber || d.pan_number || d.pan || '',
            uanNumber: d.uanNo || d.uan_no || d.uan_number || d.uanNumber || '',
            pfNumber: d.pfNo || d.pf_no || d.pf_number || d.pfNumber || '',
            esicNumber: d.esicNo || d.esic_no || d.esic_number || d.esicNumber || '',
            payrollSlab: sName || initialSlab,
            employeeShare: d.employeeShare || d.employee_share || '',
            employerShare: d.employerShare || d.employer_share || '',
            backgroundVerification: normalizeVerificationStatus(d.backgroundVerification || d.background_verification),
            eligibleForEps: d.eligibleForEps || d.eligible_for_eps || 'N',
            panStatus: normalizeVerificationStatus(d.panStatus || d.pan_status),
          });
        } else if (sName) {
          setFormData(prev => ({ ...prev, payrollSlab: sName }));
        }
      }).catch(() => {});
    }
  }, [employee]);

  const handleChange = (field: string, rawValue: string) => {
    let val = rawValue;

    // Field-specific live sanitization
    if (field === 'panNumber') {
      val = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    } else if (field === 'ifscCode') {
      val = rawValue.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    } else if (field === 'accountNumber') {
      val = rawValue.replace(/\D/g, '').slice(0, 18);
    } else if (field === 'uidaiNumber') {
      val = rawValue.replace(/\D/g, '').slice(0, 12);
    } else if (field === 'uanNumber') {
      val = rawValue.replace(/\D/g, '').slice(0, 12);
    } else if (field === 'esicNumber') {
      val = rawValue.replace(/\D/g, '').slice(0, 17);
    } else if (field === 'pfNumber') {
      val = rawValue.toUpperCase().slice(0, 35);
    }

    const updatedFormData = { ...formData, [field]: val };
    setFormData(updatedFormData);

    // Live validation
    const err = validateStatutoryField(field, val, updatedFormData);
    setErrors(prev => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];

      if (field === 'panNumber' && updatedFormData.panStatus === 'verified') {
        const panErr = validateStatutoryField('panNumber', val, updatedFormData);
        if (panErr) {
          next['panNumber'] = panErr;
          next['panStatus'] = 'Cannot verify PAN without a valid PAN Card Number';
        } else {
          delete next['panStatus'];
        }
      }
      return next;
    });
  };

  const handleStatusChange = (field: 'panStatus' | 'backgroundVerification', status: VerificationStatus) => {
    const updatedFormData = { ...formData, [field]: status };
    setFormData(updatedFormData);

    setErrors(prev => {
      const next = { ...prev };
      if (field === 'panStatus' && status === 'verified') {
        const panVal = formData.panNumber.trim().toUpperCase();
        if (!panVal) {
          next['panNumber'] = 'PAN Card Number is required before marking PAN Status as Verified';
          next['panStatus'] = 'Cannot set status to Verified without entering a PAN Card Number';
        } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panVal)) {
          next['panNumber'] = 'Valid 10-character PAN number required (e.g. ABCDE1234F)';
          next['panStatus'] = 'Cannot set status to Verified with an invalid PAN format';
        } else {
          delete next['panStatus'];
          delete next['panNumber'];
        }
      } else if (field === 'panStatus') {
        delete next['panStatus'];
        // Revalidate panNumber alone
        const panErr = validateStatutoryField('panNumber', formData.panNumber, updatedFormData);
        if (panErr) next['panNumber'] = panErr;
        else delete next['panNumber'];
      }
      return next;
    });
  };

  const handleRefresh = () => {
    if (!employee?.id) return;
    Promise.all([
      apiClient.get(`/employees/${employee.id}`),
      apiClient.get(`/payroll/salary-structure?employee_id=${employee.id}`).catch(() => ({ data: { data: [] } }))
    ]).then(([empRes, structRes]: any) => {
      const d = empRes.data?.data || empRes.data;
      if (!d) return;

      const structs = structRes.data?.data || structRes.data || [];
      const active = structs.find((s: any) => s.slabName || s.slab_name || s.slabId || s.slab_id);
      const sName = active?.slabName || active?.slab_name || d.salarySlabName || d.salary_slab_name || d.payrollSlab || '';

      setFormData(prev => ({
        ...prev,
        bankName: d.bankName || d.bank_name || prev.bankName,
        accountNumber: d.accountNo || d.account_no || d.bank_account_number || prev.accountNumber,
        ifscCode: d.ifscCode || d.ifsc_code || prev.ifscCode,
        companyBank: d.companyBank || d.company_bank || prev.companyBank,
        companyBankBranch: d.branchName || d.branch_name || d.companyBankBranch || prev.companyBankBranch,
        panNumber: d.panNumber || d.pan_number || prev.panNumber,
        uidaiNumber: d.aadharNumber || d.aadhaarNumber || d.aadhar_number || d.aadhaar_number || prev.uidaiNumber,
        pfNumber: d.pfNo || d.pf_no || d.pf_number || prev.pfNumber,
        uanNumber: d.uanNo || d.uan_no || d.uan_number || prev.uanNumber,
        esicNumber: d.esicNo || d.esic_no || d.esic_number || prev.esicNumber,
        eligibleForEps: d.eligibleForEps || d.eligible_for_eps || prev.eligibleForEps,
        backgroundVerification: normalizeVerificationStatus(d.backgroundVerification || d.background_verification || prev.backgroundVerification),
        panStatus: normalizeVerificationStatus(d.panStatus || d.pan_status || prev.panStatus),
        payrollSlab: sName || prev.payrollSlab,
      }));
      setErrors({});
      showToast.success('Refreshed statutory details');
    }).catch(() => {});
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const [key, value] of Object.entries(formData)) {
      const err = validateStatutoryField(key, value as string, formData);
      if (err) newErrors[key] = err;
    }

    if (formData.panStatus === 'verified') {
      const panVal = formData.panNumber.trim().toUpperCase();
      if (!panVal) {
        newErrors.panNumber = 'PAN Card Number is required when PAN status is Verified';
        newErrors.panStatus = 'Cannot verify PAN without a valid PAN Card Number';
      } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panVal)) {
        newErrors.panNumber = 'Valid 10-character PAN number required (e.g. ABCDE1234F)';
        newErrors.panStatus = 'Cannot verify with invalid PAN format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateAll()) {
      showToast.error('Please fix all field validation errors before saving statutory details.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        bankName: formData.bankName,
        bank_name: formData.bankName,
        accountNo: formData.accountNumber,
        account_no: formData.accountNumber,
        ifscCode: formData.ifscCode,
        ifsc_code: formData.ifscCode,
        companyBank: formData.companyBank,
        company_bank: formData.companyBank,
        branchName: formData.companyBankBranch || formData.companyBank,
        branch_name: formData.companyBankBranch || formData.companyBank,
        panNumber: formData.panNumber,
        pan_number: formData.panNumber,
        aadharNumber: formData.uidaiNumber,
        aadhar_number: formData.uidaiNumber,
        pfNo: formData.pfNumber,
        pf_no: formData.pfNumber,
        uanNo: formData.uanNumber,
        uan_no: formData.uanNumber,
        esicNo: formData.esicNumber,
        esic_no: formData.esicNumber,
        panStatus: formData.panStatus,
        pan_status: formData.panStatus,
        eligibleForEps: formData.eligibleForEps,
        eligible_for_eps: formData.eligibleForEps,
        backgroundVerification: formData.backgroundVerification,
        background_verification: formData.backgroundVerification,
      };

      const res = await apiClient.patch(`/employees/${employee.id}`, payload);

      const updatedEmp = res.data?.data || res.data;
      if (updatedEmp) {
        setFormData({
          bankName: updatedEmp.bankName || updatedEmp.bank_name || formData.bankName,
          accountNumber: updatedEmp.accountNo || updatedEmp.account_no || updatedEmp.account_number || updatedEmp.accountNumber || formData.accountNumber,
          ifscCode: updatedEmp.ifscCode || updatedEmp.ifsc_code || formData.ifscCode,
          companyBank: updatedEmp.companyBank || updatedEmp.company_bank || formData.companyBank,
          companyBankBranch: updatedEmp.branchName || updatedEmp.branch_name || updatedEmp.companyBankBranch || formData.companyBankBranch,
          uidaiNumber: updatedEmp.aadharNumber || updatedEmp.aadhaarNumber || updatedEmp.aadhar_number || updatedEmp.aadhaar_number || updatedEmp.uidaiNumber || formData.uidaiNumber,
          panNumber: updatedEmp.panNumber || updatedEmp.pan_number || formData.panNumber,
          uanNumber: updatedEmp.uanNo || updatedEmp.uan_no || updatedEmp.uan_number || updatedEmp.uanNumber || formData.uanNumber,
          pfNumber: updatedEmp.pfNo || updatedEmp.pf_no || updatedEmp.pf_number || updatedEmp.pfNumber || formData.pfNumber,
          esicNumber: updatedEmp.esicNo || updatedEmp.esic_no || updatedEmp.esic_number || updatedEmp.esicNumber || formData.esicNumber,
          payrollSlab: formData.payrollSlab,
          employeeShare: updatedEmp.employeeShare || updatedEmp.employee_share || formData.employeeShare,
          employerShare: updatedEmp.employerShare || updatedEmp.employer_share || formData.employerShare,
          backgroundVerification: normalizeVerificationStatus(updatedEmp.backgroundVerification || updatedEmp.background_verification || formData.backgroundVerification),
          eligibleForEps: updatedEmp.eligibleForEps || updatedEmp.eligible_for_eps || formData.eligibleForEps,
          panStatus: normalizeVerificationStatus(updatedEmp.panStatus || updatedEmp.pan_status || formData.panStatus),
        });
      }

      // If a pay slab was selected in edit mode, synchronize it with the employee's salary structure
      if (formData.payrollSlab && paySlabs.length > 0) {
        const matchedSlab = paySlabs.find((s: any) => s.name === formData.payrollSlab || String(s.id) === formData.payrollSlab);
        if (matchedSlab) {
          await apiClient.post('/payroll/structures/assign', {
            employeeId: employee.id,
            slabId: matchedSlab.id,
            structureName: matchedSlab.name,
            effectiveFrom: new Date().toISOString().slice(0, 10),
          }).catch(() => {});
        }
      }

      showToast.success('Statutory & Banking Details saved successfully!');
      setIsEditing(false);
      setErrors({});
      onUpdate?.();
    } catch (err: any) {
      showToast.error(err?.response?.data?.message || 'Failed to save statutory details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setErrors({});
    handleRefresh();
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden text-foreground">
      {/* ── Modern Header ── */}
      <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Statutory & Banking Details</h3>
            <p className="text-xs text-muted-foreground">Manage employee bank accounts, PF, UAN, ESIC, and tax details</p>
          </div>
          {isEditing && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
              Editing Mode
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSensitive(prev => !prev)}
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
            title={showSensitive ? "Mask sensitive details" : "Reveal full details"}
          >
            {showSensitive ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-primary" />}
            {showSensitive ? 'Mask Details' : 'Reveal Details'}
          </button>

          <button
            onClick={handleRefresh}
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>

          {!isEditing ? (
            (!isEmployeePortal || editUnlocked) && (
              <button
                onClick={() => setIsEditing(true)}
                className="h-8 px-4 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Statutory Details
              </button>
            )
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="h-8 px-3 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="h-8 px-4 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> Save Details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Validation Error Alert Banner ── */}
      {isEditing && Object.keys(errors).length > 0 && (
        <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <div>
            <span className="font-bold">Please correct the following before saving:</span>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
              {Object.entries(errors).map(([k, err]) => (
                <li key={k}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Organized Content Sections ── */}
      <div className="p-6 space-y-6">
        
        {/* Section 1: Banking Details */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 pb-1 border-b border-border/50">
            <CreditCard className="w-4 h-4 text-indigo-500" /> Banking Information
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedFieldItem
              label="Bank Name"
              value={formData.bankName}
              placeholder="e.g. HDFC Bank, ICICI Bank"
              isEditing={isEditing}
              error={errors.bankName}
              onChange={v => handleChange('bankName', v)}
            />
            <ValidatedFieldItem
              label="Account Number"
              value={formData.accountNumber}
              displayValue={showSensitive ? formData.accountNumber : maskAccountNumber(formData.accountNumber)}
              placeholder="e.g. 50100234567890 (9-18 digits)"
              isEditing={isEditing}
              error={errors.accountNumber}
              onChange={v => handleChange('accountNumber', v)}
            />
            <ValidatedFieldItem
              label="IFSC Code"
              value={formData.ifscCode}
              displayValue={showSensitive ? formData.ifscCode : maskIFSC(formData.ifscCode)}
              placeholder="e.g. HDFC0001234 (11 chars)"
              isEditing={isEditing}
              error={errors.ifscCode}
              onChange={v => handleChange('ifscCode', v)}
            />
            <ValidatedFieldItem
              label="Company Bank Branch"
              value={formData.companyBankBranch}
              placeholder="e.g. HDFC Main Branch"
              isEditing={isEditing}
              error={errors.companyBankBranch}
              onChange={v => handleChange('companyBankBranch', v)}
            />
          </div>
        </div>

        {/* Section 2: Statutory Identifiers */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 pb-1 border-b border-border/50">
            <FileCheck className="w-4 h-4 text-emerald-500" /> Statutory & Tax Identifiers
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ValidatedFieldItem
              label="PAN Card Number"
              value={formData.panNumber}
              displayValue={showSensitive ? formData.panNumber : maskPAN(formData.panNumber)}
              placeholder="e.g. ABCDE1234F (10 chars)"
              isEditing={isEditing}
              error={errors.panNumber}
              onChange={v => handleChange('panNumber', v)}
            />
            <ValidatedFieldItem
              label="Aadhaar / UIDAI Number"
              value={formData.uidaiNumber}
              displayValue={showSensitive ? formData.uidaiNumber : maskAadhaar(formData.uidaiNumber)}
              placeholder="e.g. 123456789012 (12 digits)"
              isEditing={isEditing}
              error={errors.uidaiNumber}
              onChange={v => handleChange('uidaiNumber', v)}
            />
            <ValidatedFieldItem
              label="PF (Provident Fund) Number"
              value={formData.pfNumber}
              displayValue={showSensitive ? formData.pfNumber : maskPF(formData.pfNumber)}
              placeholder="e.g. MH/BAN/0012345/000/0000123"
              isEditing={isEditing}
              error={errors.pfNumber}
              onChange={v => handleChange('pfNumber', v)}
            />
            <ValidatedFieldItem
              label="UAN (Universal Account Number)"
              value={formData.uanNumber}
              displayValue={showSensitive ? formData.uanNumber : maskUAN(formData.uanNumber)}
              placeholder="e.g. 100987654321 (12 digits)"
              isEditing={isEditing}
              error={errors.uanNumber}
              onChange={v => handleChange('uanNumber', v)}
            />
            <ValidatedFieldItem
              label="ESIC Number"
              value={formData.esicNumber}
              displayValue={showSensitive ? formData.esicNumber : maskESIC(formData.esicNumber)}
              placeholder="e.g. 31000123450000101 (17 digits)"
              isEditing={isEditing}
              error={errors.esicNumber}
              onChange={v => handleChange('esicNumber', v)}
            />
            <StatusVerificationField
              label="PAN Status"
              value={formData.panStatus}
              isEditing={isEditing}
              error={errors.panStatus}
              options={[
                { value: 'not_verified', label: 'Not Verified' },
                { value: 'pending', label: 'Pending Verification' },
                { value: 'verified', label: 'Verified' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              onChange={v => handleStatusChange('panStatus', v)}
            />
          </div>
        </div>

        {/* Section 3: Payroll & Compliance Settings */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 pb-1 border-b border-border/50">
            <Building2 className="w-4 h-4 text-sky-500" /> Payroll & Compliance Settings
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Pay Slab Selection */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Assigned Pay Slab</label>
              {isEditing ? (
                <select
                  value={formData.payrollSlab}
                  onChange={e => handleChange('payrollSlab', e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-lg text-xs bg-background focus:ring-2 focus:ring-primary text-foreground font-medium"
                >
                  <option value="">-- Select Pay Slab --</option>
                  {paySlabs.map((s: any) => (
                    <option key={s.id} value={s.name || s.slab_name}>
                      {s.name || s.slab_name} {s.min_ctc ? `(₹${s.min_ctc} - ₹${s.max_ctc})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-9 px-3 border border-border rounded-lg bg-muted/20 flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  <span>{formData.payrollSlab || 'Not Assigned'}</span>
                  <span className="text-[10px] font-normal text-muted-foreground">{formData.payrollSlab ? 'Mapped' : 'Unassigned'}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Eligible for EPS (Pension Scheme)</label>
              {isEditing ? (
                <select
                  value={formData.eligibleForEps}
                  onChange={e => handleChange('eligibleForEps', e.target.value)}
                  className="w-full h-9 px-3 border border-border rounded-lg text-xs bg-background focus:ring-2 focus:ring-primary text-foreground font-medium"
                >
                  <option value="N">No (N)</option>
                  <option value="Y">Yes (Y)</option>
                </select>
              ) : (
                <div className="h-9 px-3 border border-border rounded-lg bg-muted/20 flex items-center text-xs font-medium text-foreground">
                  {formData.eligibleForEps === 'Y' ? 'Yes (Enrolled in EPS)' : 'No'}
                </div>
              )}
            </div>

            <StatusVerificationField
              label="Background Verification Status"
              value={formData.backgroundVerification}
              isEditing={isEditing}
              options={[
                { value: 'not_verified', label: 'Not Verified' },
                { value: 'pending', label: 'Pending Verification' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'verified', label: 'Verified' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              onChange={v => handleStatusChange('backgroundVerification', v)}
            />

          </div>
        </div>

        {/* Action footer in editing mode */}
        {isEditing && (
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              onClick={handleCancel}
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="h-9 px-5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Save Statutory Details
            </button>
          </div>
        )}

      </div>
      <ProfileEditRequestModal
        open={isRequestModalOpen}
        onOpenChange={setIsRequestModalOpen}
        employee={employee}
      />
    </div>
  );
}

// ── Reusable validated field input component ──────────────────────────────────────────
function ValidatedFieldItem({
  label,
  value,
  displayValue,
  placeholder,
  isEditing,
  error,
  onChange,
}: {
  label: string;
  value: string;
  displayValue?: string;
  placeholder: string;
  isEditing: boolean;
  error?: string;
  onChange: (v: string) => void;
}) {
  const showVal = displayValue !== undefined ? displayValue : value;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-muted-foreground">{label}</label>
      </div>
      {isEditing ? (
        <div>
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full h-9 px-3 border rounded-lg text-xs bg-background text-foreground font-medium transition-colors ${
              error
                ? 'border-rose-500 ring-1 ring-rose-500/20 focus:ring-2 focus:ring-rose-500'
                : 'border-border focus:ring-2 focus:ring-primary'
            }`}
          />
          {error && (
            <div className="flex items-center gap-1 text-[11px] text-rose-500 font-medium mt-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-9 px-3 border border-border rounded-lg bg-muted/20 flex items-center text-xs font-medium">
          {showVal ? (
            <span className="text-foreground font-mono text-[12px]">{showVal}</span>
          ) : (
            <span className="text-muted-foreground/60 italic text-[11px]">Not specified</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reusable Status Field with Badges & Verification styling ─────────────────────────
function StatusVerificationField({
  label,
  value,
  isEditing,
  error,
  options,
  onChange,
}: {
  label: string;
  value: VerificationStatus;
  isEditing: boolean;
  error?: string;
  options: Array<{ value: VerificationStatus; label: string }>;
  onChange: (value: VerificationStatus) => void;
}) {
  const normalizedValue = normalizeVerificationStatus(value);

  const getBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
          label: 'Verified',
          cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 font-bold',
        };
      case 'pending':
        return {
          icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
          label: 'Pending Verification',
          cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 font-medium',
        };
      case 'in_progress':
        return {
          icon: <RotateCcw className="w-3.5 h-3.5 text-blue-500" />,
          label: 'In Progress',
          cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 font-medium',
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
          label: 'Rejected',
          cls: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400 font-medium',
        };
      case 'not_verified':
      default:
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />,
          label: 'Not Verified',
          cls: 'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400 font-medium',
        };
    }
  };

  const badge = getBadge(normalizedValue);

  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
      {isEditing ? (
        <div>
          <select
            value={normalizedValue}
            onChange={(event) => onChange(event.target.value as VerificationStatus)}
            className={`w-full h-9 px-3 border rounded-lg text-xs bg-background text-foreground font-medium ${
              error
                ? 'border-rose-500 ring-1 ring-rose-500/20 focus:ring-2 focus:ring-rose-500'
                : 'border-border focus:ring-2 focus:ring-primary'
            }`}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && (
            <div className="flex items-center gap-1 text-[11px] text-rose-500 font-medium mt-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="h-9 px-3 border border-border rounded-lg bg-muted/20 flex items-center justify-between text-xs">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs ${badge.cls}`}>
            {badge.icon}
            <span>{badge.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
