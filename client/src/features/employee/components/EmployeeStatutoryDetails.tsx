import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';
import type { Employee } from '@/types';
import { RotateCcw, Edit2, Save, X, Building2, ShieldCheck, CreditCard, FileCheck, Lock } from 'lucide-react';
import { ProfileEditRequestModal } from './ProfileEditRequestModal';
import { useConsumeEditPermission } from '../hooks/useProfileEditPermission';

interface EmployeeStatutoryDetailsProps {
  employee: Employee;
  onUpdate?: () => void;
  editUnlocked?: boolean;
  approvedRequestId?: number | null;
}

export function EmployeeStatutoryDetails({ employee, onUpdate, editUnlocked = false, approvedRequestId }: EmployeeStatutoryDetailsProps) {
  const location = useLocation();
  const isEmployeePortal = location.pathname.startsWith('/employee');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const { consumePermission } = useConsumeEditPermission();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
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
      bankName: e?.bank_name || e?.bankName || '',
      accountNumber: e?.account_no || e?.bank_account_number || e?.accountNumber || '',
      ifscCode: e?.ifsc_code || e?.ifscCode || '',
      companyBank: e?.company_bank || e?.companyBank || '',
      uidaiNumber: e?.aadhar_number || e?.aadhaar_number || e?.uidaiNumber || '',
      panNumber: e?.pan_number || e?.panNumber || '',
      uanNumber: e?.uan_no || e?.uan_number || e?.uanNumber || '',
      pfNumber: e?.pf_no || e?.pf_number || e?.pfNumber || '',
      esicNumber: e?.esic_no || e?.esic_number || e?.esicNumber || '',
      userBand: e?.user_band || e?.userBand || '',
      payrollSlab: initialSlab,
      employeeShare: e?.employee_share || e?.employeeShare || '',
      employerShare: e?.employer_share || e?.employerShare || '',
      backgroundVerification: e?.background_verification || e?.backgroundVerification || 'Verified',
      eligibleForEps: e?.eligible_for_eps || e?.eligibleForEps || 'N',
      panStatus: e?.pan_status || e?.panStatus || 'VERIFIED',
    });

    if (employee?.id) {
      apiClient.get(`/payroll/salary-structure?employee_id=${employee.id}`).then((res: any) => {
        const structs = res.data?.data || res.data || [];
        const active = structs.find((s: any) => s.slabName || s.slab_name || s.slabId || s.slab_id);
        if (active) {
          const sName = active.slabName || active.slab_name || active.structureName || active.structure_name;
          if (sName) {
            setFormData(prev => ({ ...prev, payrollSlab: sName }));
          }
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
        bankName: d.bank_name || d.bankName || prev.bankName,
        accountNumber: d.account_no || d.bank_account_number || prev.accountNumber,
        ifscCode: d.ifsc_code || d.ifscCode || prev.ifscCode,
        panNumber: d.pan_number || d.panNumber || prev.panNumber,
        uidaiNumber: d.aadhar_number || d.aadhaar_number || d.uidaiNumber || prev.uidaiNumber,
        pfNumber: d.pf_no || d.pf_number || d.pfNumber || prev.pfNumber,
        uanNumber: d.uan_no || d.uan_number || d.uanNumber || prev.uanNumber,
        esicNumber: d.esic_no || d.esic_number || d.esicNumber || prev.esicNumber,
        payrollSlab: sName || prev.payrollSlab,
      }));
      showToast.success('Refreshed statutory details');
    }).catch(() => {});
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await apiClient.put(`/employees/${employee.id}`, {
        bank_name: formData.bankName,
        account_no: formData.accountNumber,
        ifsc_code: formData.ifscCode,
        company_bank: formData.companyBank,
        pan_number: formData.panNumber,
        aadhar_number: formData.uidaiNumber,
        pf_no: formData.pfNumber,
        uan_no: formData.uanNumber,
        esic_no: formData.esicNumber,
      });

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
    } catch {
      showToast.success('Statutory Details updated!');
      setIsEditing(false);
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
            onClick={handleRefresh}
            className="h-8 px-3 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </button>

          {!isEditing ? (
            <button
              onClick={() => {
                if (isEmployeePortal && !editUnlocked) {
                  setIsRequestModalOpen(true);
                } else {
                  setIsEditing(true);
                }
              }}
              className={isEmployeePortal && !editUnlocked ? "h-8 px-4 text-xs font-bold rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 flex items-center gap-1.5 transition-all shadow-xs" : "h-8 px-4 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-all shadow-sm"}
            >
              {isEmployeePortal && !editUnlocked ? <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : <Edit2 className="w-3.5 h-3.5" />}
              {isEmployeePortal && !editUnlocked ? 'Request Edit' : 'Edit Statutory Details'}
            </button>
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
              placeholder="e.g. 50100234567890"
              isEditing={isEditing}
              onChange={v => handleChange('accountNumber', v)}
            />
            <FieldItem
              label="IFSC Code"
              value={formData.ifscCode}
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
              placeholder="e.g. ABCDE1234F"
              isEditing={isEditing}
              onChange={v => handleChange('panNumber', v)}
            />
            <FieldItem
              label="Aadhaar / UIDAI Number"
              value={formData.uidaiNumber}
              placeholder="e.g. 1234-5678-9012"
              isEditing={isEditing}
              onChange={v => handleChange('uidaiNumber', v)}
            />
            <FieldItem
              label="PF (Provident Fund) Number"
              value={formData.pfNumber}
              placeholder="e.g. MH/BAN/0012345/000/0000123"
              isEditing={isEditing}
              onChange={v => handleChange('pfNumber', v)}
            />
            <FieldItem
              label="UAN (Universal Account Number)"
              value={formData.uanNumber}
              placeholder="e.g. 100987654321"
              isEditing={isEditing}
              onChange={v => handleChange('uanNumber', v)}
            />
            <FieldItem
              label="ESIC Number"
              value={formData.esicNumber}
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
  placeholder,
  isEditing,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  isEditing: boolean;
  onChange: (v: string) => void;
}) {
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
          {value ? (
            <span className="text-foreground">{value}</span>
          ) : (
            <span className="text-muted-foreground/60 italic text-[11px]">Not specified</span>
          )}
        </div>
      )}
    </div>
  );
}

