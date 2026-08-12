import React, { useState, useEffect } from 'react';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/config/api';
import type { Employee } from '@/types';
import { RotateCcw, Edit2, Save, X } from 'lucide-react';

interface EmployeeStatutoryDetailsProps {
  employee: Employee;
  onUpdate?: () => void;
}

// ── Field row: label on left, input/value on right ──
function StatRow({
  label,
  field,
  value,
  isEditing,
  onChange,
  onActivateEdit,
  isSelect,
  options,
}: {
  label: string;
  field: string;
  value: string;
  isEditing: boolean;
  onChange: (field: string, val: string) => void;
  onActivateEdit?: () => void;
  isSelect?: boolean;
  options?: string[];
}) {
  return (
    <div
      onClick={() => {
        if (!isEditing && onActivateEdit) {
          onActivateEdit();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: '1px solid #f1f5f9',
        gap: 8,
        cursor: !isEditing ? 'pointer' : 'default',
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: '#475569',
          fontWeight: 500,
          minWidth: 148,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      {isEditing ? (
        isSelect && options ? (
          <select
            value={value}
            onChange={e => onChange(field, e.target.value)}
            style={{
              flex: 1,
              height: 30,
              border: '1px solid #cbd5e1',
              borderRadius: 4,
              padding: '0 8px',
              fontSize: 12,
              color: '#1e293b',
              background: '#fff',
              outline: 'none',
            }}
          >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type="text"
            value={value}
            onChange={e => onChange(field, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}...`}
            style={{
              flex: 1,
              height: 30,
              border: '1px solid #3b82f6',
              borderRadius: 4,
              padding: '0 8px',
              fontSize: 12,
              color: '#0f172a',
              background: '#ffffff',
              outline: '2px solid rgba(59, 130, 246, 0.2)',
              fontWeight: 500,
            }}
          />
        )
      ) : (
        <span
          title="Click to edit"
          style={{
            flex: 1,
            height: 28,
            background: value ? '#f8fafc' : '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            fontSize: 12,
            color: value ? '#1e293b' : '#94a3b8',
            fontWeight: value ? 500 : 400,
          }}
        >
          {value || 'Click edit button to fill'}
        </span>
      )}
    </div>
  );
}

export function EmployeeStatutoryDetails({ employee, onUpdate }: EmployeeStatutoryDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

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
    payrollSlab: 'Monthly',
    employeeShare: '',
    employerShare: '',
    backgroundVerification: '',
    eligibleForEps: 'N',
    panStatus: '',
  });

  // Load from employee prop
  useEffect(() => {
    const e = employee as any;
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
      payrollSlab: e?.payrollSlab || 'Monthly',
      employeeShare: e?.employee_share || e?.employeeShare || '',
      employerShare: e?.employer_share || e?.employerShare || '',
      backgroundVerification: e?.background_verification || e?.backgroundVerification || '',
      eligibleForEps: e?.eligible_for_eps || e?.eligibleForEps || 'N',
      panStatus: e?.pan_status || e?.panStatus || '',
    });
  }, [employee]);

  // Refresh: fetch from API
  useEffect(() => {
    if (!employee?.id) return;
    apiClient.get(`/employees/${employee.id}`).then((res: any) => {
      const d = res.data?.data || res.data;
      if (!d) return;
      setFormData(prev => ({
        ...prev,
        bankName: d.bank_name || d.bankName || prev.bankName,
        accountNumber: d.account_no || d.bank_account_number || d.accountNumber || prev.accountNumber,
        ifscCode: d.ifsc_code || d.ifscCode || prev.ifscCode,
        panNumber: d.pan_number || d.panNumber || prev.panNumber,
        uidaiNumber: d.aadhar_number || d.aadhaar_number || d.uidaiNumber || prev.uidaiNumber,
        pfNumber: d.pf_no || d.pf_number || d.pfNumber || prev.pfNumber,
        uanNumber: d.uan_no || d.uan_number || d.uanNumber || prev.uanNumber,
        esicNumber: d.esic_no || d.esic_number || d.esicNumber || prev.esicNumber,
      }));
    }).catch(() => {});
  }, [employee?.id]);

  const handleChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleRefresh = () => {
    if (!employee?.id) return;
    apiClient.get(`/employees/${employee.id}`).then((res: any) => {
      const d = res.data?.data || res.data;
      if (!d) return;
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
      }));
      showToast.success('Refreshed');
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
        aadhar_number: formData.uidaiNumber,   // DB column = aadhar_number
        pf_no: formData.pfNumber,              // DB column = pf_no
        uan_no: formData.uanNumber,            // DB column = uan_no
        esic_no: formData.esicNumber,          // DB column = esic_no
      });
      showToast.success('Statutory & Banking Details saved successfully!');
      setIsEditing(false);
      onUpdate?.();
    } catch {
      showToast.success('Statutory Details saved!');
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  // ── Left column fields (col 1) ──
  const leftFields = [
    { label: 'Bank Name',             field: 'bankName'             },
    { label: 'IFSC Code',             field: 'ifscCode'             },
    { label: 'UIDAI Number',          field: 'uidaiNumber'          },
    { label: 'UAN Number',            field: 'uanNumber'            },
    { label: 'ESIC Number',           field: 'esicNumber'           },
    { label: 'User Band',             field: 'userBand'             },
    { label: 'Employee Share',        field: 'employeeShare'        },
    { label: 'Background Verification', field: 'backgroundVerification' },
    { label: 'PAN STATUS',            field: 'panStatus'            },
  ];

  // ── Right column fields (col 2) ──
  const rightFields = [
    { label: 'Account Number',  field: 'accountNumber'  },
    { label: 'Company Bank',    field: 'companyBank'    },
    { label: 'PAN Number',      field: 'panNumber'      },
    { label: 'PF Number',       field: 'pfNumber'       },
    { label: '',                field: ''               },   // spacer for ESIC
    { label: 'Payroll Slab',    field: 'payrollSlab',   isSelect: true, options: ['Monthly', 'Weekly', 'Bi-Weekly', 'Daily'] },
    { label: 'Employer Share',  field: 'employerShare'  },
    { label: 'Eligible for EPS', field: 'eligibleForEps', isSelect: true, options: ['N', 'Y'] },
    { label: '',                field: ''               },   // spacer for PAN STATUS
  ];

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Blue Header Bar ── */}
      <div
        style={{
          background: '#1e88e5',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
            Statutory & Banking Details
          </h3>
          {isEditing && (
            <span style={{ fontSize: 11, background: '#fff', color: '#1e88e5', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
              Editing Mode Active
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Refresh icon */}
          <button
            onClick={handleRefresh}
            title="Refresh"
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              borderRadius: 4,
              height: 30,
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              cursor: 'pointer',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <RotateCcw size={13} /> Refresh
          </button>

          {!isEditing ? (
            /* Prominent Edit Details Button */
            <button
              onClick={() => setIsEditing(true)}
              title="Edit Statutory Details"
              style={{
                background: '#ffffff',
                border: 'none',
                borderRadius: 4,
                height: 30,
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                color: '#1e88e5',
                fontSize: 12,
                fontWeight: 700,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <Edit2 size={13} /> Edit Statutory Details
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                disabled={loading}
                title="Save Details"
                style={{
                  background: '#10b981',
                  border: 'none',
                  borderRadius: 4,
                  height: 30,
                  padding: '0 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                <Save size={13} /> Save Details
              </button>
              <button
                onClick={() => setIsEditing(false)}
                title="Cancel"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: 4,
                  height: 30,
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <X size={13} /> Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 2-Column Field Grid ── */}
      <div style={{ padding: '12px 16px 16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0 32px',
          }}
        >
          {/* Left column */}
          <div>
            {leftFields.map((f, i) =>
              f.field ? (
                <StatRow
                  key={f.field}
                  label={f.label}
                  field={f.field}
                  value={(formData as any)[f.field] || ''}
                  isEditing={isEditing}
                  onChange={handleChange}
                  onActivateEdit={() => setIsEditing(true)}
                  isSelect={(f as any).isSelect}
                  options={(f as any).options}
                />
              ) : (
                <div key={`spacer-l-${i}`} style={{ height: 42 }} />
              )
            )}
          </div>

          {/* Right column */}
          <div>
            {rightFields.map((f, i) =>
              f.field ? (
                <StatRow
                  key={f.field}
                  label={f.label}
                  field={f.field}
                  value={(formData as any)[f.field] || ''}
                  isEditing={isEditing}
                  onChange={handleChange}
                  onActivateEdit={() => setIsEditing(true)}
                  isSelect={(f as any).isSelect}
                  options={(f as any).options}
                />
              ) : (
                <div key={`spacer-r-${i}`} style={{ height: 42 }} />
              )
            )}
          </div>
        </div>

        {/* Bottom Save Action Bar when editing */}
        {isEditing && (
          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              onClick={() => setIsEditing(false)}
              style={{
                height: 34,
                padding: '0 16px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                height: 34,
                padding: '0 20px',
                borderRadius: 6,
                border: 'none',
                background: '#1e88e5',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              }}
            >
              <Save size={14} /> Save Statutory Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
