import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';
import type { Employee } from '@/types';
import { RotateCcw, Edit2, Save, X, Building2, ShieldCheck, CreditCard, FileCheck, Lock, Eye, EyeOff } from 'lucide-react';
import { ProfileEditRequestModal } from './ProfileEditRequestModal';
import { useConsumeEditPermission } from '../hooks/useProfileEditPermission';
import { useAuthStore } from '@/features/auth/store/authStore';

// Helper functions to mask sensitive statutory & banking fields
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
  const { consumePermission } = useConsumeEditPermission();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [paySlabs, setPaySlabs] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    companyBank: '',
    uidaiNumber: '',
    panNumber: '',
    uanNumber: '',
    pfNumber: '',
    esicNumber: '',
    userBand: '',
    payrollSlab: '',
    employeeShare: '',
    employerShare: '',
    backgroundVerification: '',
    eligibleForEps: 'N',
    panStatus: '',
  });

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
      uidaiNumber: e?.aadharNumber || e?.aadhaarNumber || e?.aadhar_number || e?.aadhaar_number || e?.uidaiNumber || '',
      panNumber: e?.panNumber || e?.pan_number || e?.pan || '',
      uanNumber: e?.uanNo || e?.uan_no || e?.uan_number || e?.uanNumber || '',
      pfNumber: e?.pfNo || e?.pf_no || e?.pf_number || e?.pfNumber || '',
      esicNumber: e?.esicNo || e?.esic_no || e?.esic_number || e?.esicNumber || '',
      userBand: e?.userBand || e?.user_band || '',
      payrollSlab: initialSlab,
      employeeShare: e?.employeeShare || e?.employee_share || '',
      employerShare: e?.employerShare || e?.employer_share || '',
      backgroundVerification: e?.backgroundVerification || e?.background_verification || 'Verified',
      eligibleForEps: e?.eligibleForEps || e?.eligible_for_eps || 'N',
      panStatus: e?.panStatus || e?.pan_status || 'VERIFIED',
    });

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
            uidaiNumber: d.aadharNumber || d.aadhaarNumber || d.aadhar_number || d.aadhaar_number || d.uidaiNumber || '',
            panNumber: d.panNumber || d.pan_number || d.pan || '',
            uanNumber: d.uanNo || d.uan_no || d.uan_number || d.uanNumber || '',
            pfNumber: d.pfNo || d.pf_no || d.pf_number || d.pfNumber || '',
            esicNumber: d.esicNo || d.esic_no || d.esic_number || d.esicNumber || '',
            userBand: d.userBand || d.user_band || '',
            payrollSlab: sName || initialSlab,
            employeeShare: d.employeeShare || d.employee_share || '',
            employerShare: d.employerShare || d.employer_share || '',
            backgroundVerification: d.backgroundVerification || d.background_verification || 'Verified',
            eligibleForEps: d.eligibleForEps || d.eligible_for_eps || 'N',
            panStatus: d.panStatus || d.pan_status || 'VERIFIED',
          });
        } else if (sName) {
          setFormData(prev => ({ ...prev, payrollSlab: sName }));
        }
      }).catch(() => {});
    }
  }, [employee]);

  const handleChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

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
        panNumber: d.panNumber || d.pan_number || prev.panNumber,
        uidaiNumber: d.aadharNumber || d.aadhaarNumber || d.aadhar_number || d.aadhaar_number || prev.uidaiNumber,
        pfNumber: d.pfNo || d.pf_no || d.pf_number || prev.pfNumber,
        uanNumber: d.uanNo || d.uan_no || d.uan_number || prev.uanNumber,
        esicNumber: d.esicNo || d.esic_no || d.esic_number || prev.esicNumber,
        userBand: d.userBand || d.user_band || prev.userBand,
        eligibleForEps: d.eligibleForEps || d.eligible_for_eps || prev.eligibleForEps,
        backgroundVerification: d.backgroundVerification || d.background_verification || prev.backgroundVerification,
        panStatus: d.panStatus || d.pan_status || prev.panStatus,
        payrollSlab: sName || prev.payrollSlab,
      }));
      showToast.success('Refreshed statutory details');
    }).catch(() => {});
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await apiClient.put(`/employees/${employee.id}`, {
        bankName: formData.bankName,
        accountNo: formData.accountNumber,
        ifscCode: formData.ifscCode,
        companyBank: formData.companyBank,
        panNumber: formData.panNumber,
        aadharNumber: formData.uidaiNumber,
        pfNo: formData.pfNumber,
        uanNo: formData.uanNumber,
        esicNo: formData.esicNumber,
        userBand: formData.userBand,
        panStatus: formData.panStatus,
        eligibleForEps: formData.eligibleForEps,
        backgroundVerification: formData.backgroundVerification,
      });

      const updatedEmp = res.data?.data || res.data;
      if (updatedEmp) {
        setFormData({
          bankName: updatedEmp.bankName || updatedEmp.bank_name || formData.bankName,
          accountNumber: updatedEmp.accountNo || updatedEmp.account_no || updatedEmp.account_number || updatedEmp.accountNumber || formData.accountNumber,
          ifscCode: updatedEmp.ifscCode || updatedEmp.ifsc_code || formData.ifscCode,
          companyBank: updatedEmp.companyBank || updatedEmp.company_bank || formData.companyBank,
          uidaiNumber: updatedEmp.aadharNumber || updatedEmp.aadhaarNumber || updatedEmp.aadhar_number || updatedEmp.aadhaar_number || updatedEmp.uidaiNumber || formData.uidaiNumber,
          panNumber: updatedEmp.panNumber || updatedEmp.pan_number || formData.panNumber,
          uanNumber: updatedEmp.uanNo || updatedEmp.uan_no || updatedEmp.uan_number || updatedEmp.uanNumber || formData.uanNumber,
          pfNumber: updatedEmp.pfNo || updatedEmp.pf_no || updatedEmp.pf_number || updatedEmp.pfNumber || formData.pfNumber,
          esicNumber: updatedEmp.esicNo || updatedEmp.esic_no || updatedEmp.esic_number || updatedEmp.esicNumber || formData.esicNumber,
          userBand: updatedEmp.userBand || updatedEmp.user_band || formData.userBand,
          payrollSlab: formData.payrollSlab,
          employeeShare: updatedEmp.employeeShare || updatedEmp.employee_share || formData.employeeShare,
          employerShare: updatedEmp.employerShare || updatedEmp.employer_share || formData.employerShare,
          backgroundVerification: updatedEmp.backgroundVerification || updatedEmp.background_verification || formData.backgroundVerification,
          eligibleForEps: updatedEmp.eligibleForEps || updatedEmp.eligible_for_eps || formData.eligibleForEps,
          panStatus: updatedEmp.panStatus || updatedEmp.pan_status || formData.panStatus,
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
      // Consume the approved edit permission so employee can't edit again without another approval
      if (isEmployeePortal && approvedRequestId) {
        await consumePermission(approvedRequestId);
      }
      onUpdate?.();
    } catch (err: any) {
      showToast.error(err?.response?.data?.message || 'Failed to save statutory details');
    } finally {
      setLoading(false);
    }
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
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
            title={showSensitive ? "Mask sensitive details" : "Reveal full details"}
          >
            {showSensitive ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-primary" />}
            {showSensitive ? 'Mask Details' : 'Reveal Details'}
          </button>

          <button
            onClick={handleRefresh}
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
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
                onClick={() => setIsEditing(false)}
                className="h-8 px-3 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="h-8 px-4 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Save className="w-3.5 h-3.5" /> Save Details
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Organized Content Sections ── */}
      <div className="p-6 space-y-6">
        
        {/* Section 1: Banking Details */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 pb-1 border-b border-border/50">
            <CreditCard className="w-4 h-4 text-indigo-500" /> Banking Information
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldItem
              label="Bank Name"
              value={formData.bankName}
              placeholder="e.g. HDFC Bank, ICICI Bank"
              isEditing={isEditing}
              onChange={v => handleChange('bankName', v)}
            />
            <FieldItem
              label="Account Number"
              value={formData.accountNumber}
              displayValue={showSensitive ? formData.accountNumber : maskAccountNumber(formData.accountNumber)}
              placeholder="e.g. 50100234567890"
              isEditing={isEditing}
              onChange={v => handleChange('accountNumber', v)}
            />
            <FieldItem
              label="IFSC Code"
              value={formData.ifscCode}
              displayValue={showSensitive ? formData.ifscCode : maskIFSC(formData.ifscCode)}
              placeholder="e.g. HDFC0001234"
              isEditing={isEditing}
              onChange={v => handleChange('ifscCode', v)}
            />
            <FieldItem
              label="Company Bank Branch"
              value={formData.companyBank}
              placeholder="e.g. HDFC Main Branch"
              isEditing={isEditing}
              onChange={v => handleChange('companyBank', v)}
            />
          </div>
        </div>

        {/* Section 2: Statutory Identifiers */}
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 pb-1 border-b border-border/50">
            <FileCheck className="w-4 h-4 text-emerald-500" /> Statutory & Tax Identifiers
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldItem
              label="PAN Card Number"
              value={formData.panNumber}
              displayValue={showSensitive ? formData.panNumber : maskPAN(formData.panNumber)}
              placeholder="e.g. ABCDE1234F"
              isEditing={isEditing}
              onChange={v => handleChange('panNumber', v)}
            />
            <FieldItem
              label="Aadhaar / UIDAI Number"
              value={formData.uidaiNumber}
              displayValue={showSensitive ? formData.uidaiNumber : maskAadhaar(formData.uidaiNumber)}
              placeholder="e.g. 1234-5678-9012"
              isEditing={isEditing}
              onChange={v => handleChange('uidaiNumber', v)}
            />
            <FieldItem
              label="PF (Provident Fund) Number"
              value={formData.pfNumber}
              displayValue={showSensitive ? formData.pfNumber : maskPF(formData.pfNumber)}
              placeholder="e.g. MH/BAN/0012345/000/0000123"
              isEditing={isEditing}
              onChange={v => handleChange('pfNumber', v)}
            />
            <FieldItem
              label="UAN (Universal Account Number)"
              value={formData.uanNumber}
              displayValue={showSensitive ? formData.uanNumber : maskUAN(formData.uanNumber)}
              placeholder="e.g. 100987654321"
              isEditing={isEditing}
              onChange={v => handleChange('uanNumber', v)}
            />
            <FieldItem
              label="ESIC Number"
              value={formData.esicNumber}
              displayValue={showSensitive ? formData.esicNumber : maskESIC(formData.esicNumber)}
              placeholder="e.g. 31000123450000101"
              isEditing={isEditing}
              onChange={v => handleChange('esicNumber', v)}
            />
            <FieldItem
              label="PAN Status"
              value={formData.panStatus}
              placeholder="VERIFIED"
              isEditing={isEditing}
              onChange={v => handleChange('panStatus', v)}
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

            <FieldItem
              label="User Band / Grade Tier"
              value={formData.userBand}
              placeholder="e.g. Band-3 / Tier-A"
              isEditing={isEditing}
              onChange={v => handleChange('userBand', v)}
            />

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

            <FieldItem
              label="Background Verification Status"
              value={formData.backgroundVerification}
              placeholder="e.g. Verified / In Progress"
              isEditing={isEditing}
              onChange={v => handleChange('backgroundVerification', v)}
            />

          </div>
        </div>

        {/* Action footer in editing mode */}
        {isEditing && (
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              onClick={() => setIsEditing(false)}
              className="h-9 px-4 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="h-9 px-5 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 transition-colors shadow-sm"
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

// Helper reusable component for field items
function FieldItem({
  label,
  value,
  displayValue,
  placeholder,
  isEditing,
  onChange,
}: {
  label: string;
  value: string;
  displayValue?: string;
  placeholder: string;
  isEditing: boolean;
  onChange: (v: string) => void;
}) {
  const showVal = displayValue !== undefined ? displayValue : value;
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground mb-1">{label}</label>
      {isEditing ? (
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 px-3 border border-border rounded-lg text-xs bg-background focus:ring-2 focus:ring-primary text-foreground font-medium"
        />
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


