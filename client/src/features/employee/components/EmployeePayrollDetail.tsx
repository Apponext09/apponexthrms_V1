import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  FileText,
  Edit2,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { Employee } from '@/types';

interface PayStructureRecord {
  id: string;
  slab: string;
  effectiveFrom: string;
  arrearPayMonth?: string;
  status: 'Active' | 'Deleted';
  addedBy: string;
  addedOn: string;
  updateBy?: string;
  updateOn?: string;

  // Calculation Mode
  calcMode: 'salary_input' | 'component_based';
  salaryInput: number;

  // Earnings
  basic: number;
  hra: number;
  standardAllowance: number;
  mealAllowance: number;
  communicationAllowance: number;
  childrenEduAllowance: number;
  lta: number;

  // Deductions
  esic: number;
  pt: number;
  pf: number;

  // Employer Contribution
  pfEmployer: number;

  // Totals
  gross: number;
  totalDeduction: number;
  netSalary: number;
  ctc: number;
  
  customComponents?: any;
}

interface ComponentDef {
  id: string;
  name: string;
  type: string;
  formula: string;
  amount: number;
}

interface ComponentGroup {
  id: string;
  name: string;
  category: string;
  isEditable: boolean;
  components: ComponentDef[];
}

interface EmployeePayrollDetailProps {
  employee: Employee;
}

export function EmployeePayrollDetail({ employee }: EmployeePayrollDetailProps) {
  // Role-based permission check: Only Admin can create, edit, delete, or reassign salary structures. HR is Read-Only.
  const { user } = useAuthStore();
  const uAny = user as any;
  const userRole = (
    (Array.isArray(uAny?.roles) ? uAny.roles.join(' ') : uAny?.roles) ||
    uAny?.role?.code ||
    uAny?.role ||
    uAny?.accessRole ||
    ''
  ).toString().toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('super');
  const isHR = userRole.includes('hr') && !isAdmin;
  const canEditPayroll = isAdmin && !isHR;

  // Pay Structure records
  const [payStructures, setPayStructures] = useState<PayStructureRecord[]>([]);

  // Slab Info
  const [allSlabs, setAllSlabs] = useState<any[]>([]);
  const [activeSlabName, setActiveSlabName] = useState<string>('');
  const [activeSlabId, setActiveSlabId] = useState<string>('');
  const [activeCycleId, setActiveCycleId] = useState<string>('');
  const [slabPfRate, setSlabPfRate] = useState<number>(12);
  const [slabComponentIds, setSlabComponentIds] = useState<string[]>([]);

  // Master Data
  const [allGroups, setAllGroups] = useState<ComponentGroup[]>([]);

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayStructureRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<PayStructureRecord | null>(null);

  // Form Fields inside Modal
  const [salaryInput, setSalaryInput] = useState<string>('120000');
  const [effectiveFrom, setEffectiveFrom] = useState<string>('2026-08-08');
  const [arrearPayMonth, setArrearPayMonth] = useState<string>('2026-08-08');

  // Dynamic Component Values
  const [dynamicValues, setDynamicValues] = useState<Record<string, number>>({});

  // Legacy state for payload mapping (fallback for server schema)
  const [basic, setBasic] = useState('0');
  const [hra, setHra] = useState('0');
  const [pf, setPf] = useState('0');
  const [pfEmployer, setPfEmployer] = useState('0');
  const [pt, setPt] = useState('0');
  const [esic, setEsic] = useState('0');

  useEffect(() => {
    if (!employee?.id) return;

    // Fetch Master Component Data
    Promise.all([
      apiClient.get('/payroll/component-groups').catch(() => ({ data: { data: [] } })),
      apiClient.get('/payroll/component-definitions').catch(() => ({ data: { data: [] } }))
    ]).then(([groupsRes, compsRes]) => {
      const rawGroups = groupsRes.data?.data || groupsRes.data || [];
      const rawComps = compsRes.data?.data || compsRes.data || [];
      
      const mappedGroups: ComponentGroup[] = rawGroups.map((g: any) => {
        const groupComps = rawComps
          .filter((c: any) => String(c.groupId || c.group_id) === String(g.id))
          .map((c: any) => ({
            id: String(c.id),
            name: c.name || 'Component',
            type: c.componentType || c.component_type || 'Value',
            formula: c.formula || '',
            amount: Number(c.amount || 0)
          }));
        return {
          id: String(g.id),
          name: g.name || 'Group',
          category: g.category || 'Earning',
          isEditable: Boolean(g.isEditable ?? g.is_editable),
          components: groupComps
        };
      });
      setAllGroups(mappedGroups);
    });

    // 1. Load employee's assigned slab via salary_slab_id
    const empSlabId = (employee as any).salary_slab_id || (employee as any).salarySlabId;
    const fetchSlabData = async () => {
      try {
        const res: any = await apiClient.get('/payroll/slabs');
        const slabsData = res.data?.data || res.data || [];
        setAllSlabs(slabsData);
        let assignedSlab = null;
        if (empSlabId) {
          assignedSlab = slabsData.find((s: any) => String(s.id) === String(empSlabId));
        } else {
          const empDept = (employee.department || (employee as any).dept_name || '').toLowerCase();
          const empGrade = (employee.designation || (employee as any).grade || '').toLowerCase();
          assignedSlab = slabsData.find((s: any) => {
            let depts: string[] = []; try { depts = typeof s.departments === 'string' ? JSON.parse(s.departments) : (s.departments || []); } catch {}
            let grades: string[] = []; try { grades = typeof s.grades === 'string' ? JSON.parse(s.grades) : (s.grades || []); } catch {}
            const deptMatch = depts.length === 0 || depts.some(d => d.toLowerCase().includes(empDept) || empDept.includes(d.toLowerCase()));
            const gradeMatch = grades.length === 0 || grades.some(g => g.toLowerCase().includes(empGrade) || empGrade.includes(g.toLowerCase()));
            return deptMatch && gradeMatch;
          }) || slabsData[0];
        }

        if (assignedSlab) {
          setActiveSlabName(assignedSlab.name || 'Monthly');
          setActiveSlabId(String(assignedSlab.id));
          setActiveCycleId(assignedSlab.cycle_id ? String(assignedSlab.cycle_id) : '');
          setSlabPfRate(Number(assignedSlab.pf_rate_pct || 12));
          let comps = [];
          try {
            comps = typeof assignedSlab.selected_component_ids === 'string'
              ? JSON.parse(assignedSlab.selected_component_ids)
              : (assignedSlab.selected_component_ids || []);
          } catch {}
          setSlabComponentIds(comps.map(String));
        }
      } catch (err) {}
    };
    fetchSlabData();

    // 2. Fetch Employee Salary Structure Records
    apiClient.get(`/payroll/salary-structure?employee_id=${employee.id}`).then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const mappedRecords: PayStructureRecord[] = data.map((s: any) => {
          let customComps = {};
          try {
            customComps = typeof s.custom_components === 'string' ? JSON.parse(s.custom_components) : (s.custom_components || {});
          } catch {}
          
          return {
            id: String(s.id),
            slab: s.slab || s.slab_name || activeSlabName || 'Monthly',
            effectiveFrom: s.effectiveFrom || s.effective_from || new Date().toISOString().split('T')[0],
            arrearPayMonth: s.arrearPayMonth || s.arrear_pay_month || s.effective_from || '',
            status: s.status === 'Deleted' || s.is_active === false ? 'Deleted' : 'Active',
            addedBy: s.addedBy || s.added_by || 'hradmin',
            addedOn: s.addedOn || s.added_on || new Date().toISOString().replace('T', ' ').substring(0, 19),
            updateBy: s.updateBy || s.updated_by || '',
            updateOn: s.updateOn || s.updated_on || '',
            calcMode: s.calcMode || s.calculation_mode || 'salary_input',
            salaryInput: Number(s.salaryInput || s.salary_input || s.gross_monthly || 60000),
            basic: Number(s.basic || s.basic_monthly || 0),
            hra: Number(s.hra || s.hra_monthly || 0),
            standardAllowance: Number(s.standardAllowance || s.standard_allowance_monthly || 0),
            mealAllowance: Number(s.mealAllowance || s.meal_allowance_monthly || 0),
            communicationAllowance: Number(s.communicationAllowance || s.communication_allowance_monthly || 0),
            childrenEduAllowance: Number(s.childrenEduAllowance || s.children_edu_allowance_monthly || 0),
            lta: Number(s.lta || s.lta_monthly || 0),
            esic: Number(s.esic || s.esic_deduction || 0),
            pt: Number(s.pt || s.pt_deduction || 0),
            pf: Number(s.pf || s.pf_deduction || 0),
            pfEmployer: Number(s.pfEmployer || s.pf_employer || 0),
            gross: Number(s.gross || s.gross_monthly || 0),
            totalDeduction: Number(s.totalDeduction || s.total_deductions_monthly || 0),
            netSalary: Number(s.netSalary || s.net_salary_monthly || 0),
            ctc: Number(s.ctc || s.annual_ctc || 0),
            customComponents: customComps
          };
        });
        // Deduplicate records to prevent repeat rows
        const uniqueMap = new Map<string, PayStructureRecord>();
        mappedRecords.forEach(r => {
          const key = `${r.effectiveFrom}_${r.slab}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, r);
          }
        });
        setPayStructures(Array.from(uniqueMap.values()));
      }
    }).catch(() => {});
  }, [employee]);

  // Extract active slab's components grouped by category
  const activeEarnings = useMemo(() => {
    return allGroups
      .filter(g => g.category === 'Earning')
      .map(g => ({
        ...g,
        components: g.components.filter(c => slabComponentIds.includes(c.id))
      }))
      .filter(g => g.components.length > 0);
  }, [allGroups, slabComponentIds]);

  const activeDeductions = useMemo(() => {
    return allGroups
      .filter(g => g.category !== 'Earning')
      .map(g => ({
        ...g,
        components: g.components.filter(c => slabComponentIds.includes(c.id))
      }))
      .filter(g => g.components.length > 0);
  }, [allGroups, slabComponentIds]);

  // Recalculate dynamic values based on CTC input
  const recalculateFromCTC = (ctcStr: string) => {
    const ctcVal = Number(ctcStr) || 0;
    
    // Very simple evaluator context
    const context: any = {
      CTC: ctcVal,
      GROSS: ctcVal, // Rough fallback initially
      BASIC: 0
    };
    
    const newValues: Record<string, number> = { ...dynamicValues };
    
    // Pass 1: Try to evaluate everything
    const evaluateFormula = (formula: string) => {
      try {
        let parsed = formula.replace(/gross/gi, String(context.GROSS))
                            .replace(/ctc/gi, String(context.CTC))
                            .replace(/basic/gi, String(context.BASIC));
        return Number(Function('"use strict";return (' + parsed + ')')());
      } catch(e) {
        return 0;
      }
    };

    // Calculate Basic First (Special Case logic if Basic exists)
    let foundBasicId = null;
    let foundHraId = null;
    let foundPfId = null;
    let foundPtId = null;

    activeEarnings.forEach(g => {
      g.components.forEach(c => {
        if (c.name.toLowerCase().includes('basic')) foundBasicId = c.id;
        if (c.name.toLowerCase().includes('hra')) foundHraId = c.id;
        
        if (c.type === 'Derived' && c.formula) {
          newValues[c.id] = Math.round(evaluateFormula(c.formula));
        } else if (c.type === 'Value' && !newValues[c.id]) {
          newValues[c.id] = c.amount || 0;
        }
      });
    });

    if (foundBasicId && newValues[foundBasicId]) {
      context.BASIC = newValues[foundBasicId];
    } else {
      context.BASIC = Math.round(ctcVal * 0.5); // Fallback standard basic
    }
    
    // Re-evaluate with BASIC known
    activeEarnings.forEach(g => {
      g.components.forEach(c => {
        if (c.type === 'Derived' && c.formula) {
          newValues[c.id] = Math.round(evaluateFormula(c.formula));
        }
      });
    });

    activeDeductions.forEach(g => {
      g.components.forEach(c => {
        if (c.name.toLowerCase().includes('pf')) foundPfId = c.id;
        if (c.name.toLowerCase().includes('pt') || c.name.toLowerCase().includes('professional tax')) foundPtId = c.id;
        if (c.type === 'Derived' && c.formula) {
          newValues[c.id] = Math.round(evaluateFormula(c.formula));
        } else if (c.type === 'Value' && !newValues[c.id]) {
          newValues[c.id] = c.amount || 0;
        }
      });
    });

    // Update mapped legacy states for backend saving
    if (foundBasicId) setBasic(String(newValues[foundBasicId] || 0));
    if (foundHraId) setHra(String(newValues[foundHraId] || 0));
    if (foundPfId) {
       setPf(String(newValues[foundPfId] || 0));
       setPfEmployer(String(newValues[foundPfId] || 0)); // Assume same for now
    }
    if (foundPtId) setPt(String(newValues[foundPtId] || 0));

    setDynamicValues(newValues);
  };

  const handleSalaryInputChange = (val: string) => {
    setSalaryInput(val);
    recalculateFromCTC(val);
  };

  const handleDynamicValueChange = (compId: string, val: string) => {
    setDynamicValues(prev => ({ ...prev, [compId]: Number(val) || 0 }));
  };

  // Computed Totals
  const grossCalculated = activeEarnings.reduce((sum, g) => {
    return sum + g.components.reduce((gSum, c) => gSum + (dynamicValues[c.id] || 0), 0);
  }, 0);

  const totalDeductionCalculated = activeDeductions.reduce((sum, g) => {
    return sum + g.components.reduce((gSum, c) => gSum + (dynamicValues[c.id] || 0), 0);
  }, 0);

  const netSalaryCalculated = Math.max(0, grossCalculated - totalDeductionCalculated);
  const ctcCalculated = grossCalculated + Number(pfEmployer || 0); // Adding Employer PF to CTC

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setSalaryInput('60000'); // Default Gross/CTC
    recalculateFromCTC('60000');
    const today = new Date().toISOString().split('T')[0];
    setEffectiveFrom(today);
    setArrearPayMonth(today);
    setModalOpen(true);
  };

  const handleOpenEditModal = (rec: PayStructureRecord) => {
    setEditingRecord(rec);
    setSalaryInput(String(rec.salaryInput || rec.gross || rec.ctc || 60000));
    setEffectiveFrom(rec.effectiveFrom);
    setArrearPayMonth(rec.arrearPayMonth || rec.effectiveFrom);
    if (rec.customComponents) {
      setDynamicValues(rec.customComponents);
    } else {
      recalculateFromCTC(String(rec.salaryInput || rec.gross || rec.ctc || 60000));
    }
    setModalOpen(true);
  };

  const handleViewModal = (rec: PayStructureRecord) => {
    setViewRecord(rec);
    setViewModalOpen(true);
  };

  const handleDelete = async (rec: PayStructureRecord) => {
    if (!confirm('Are you sure you want to delete this Pay Structure?')) return;
    try {
      await apiClient.delete(`/payroll/salary-structure/${rec.id}`);
      setPayStructures(prev => prev.map(p => p.id === rec.id ? { ...p, status: 'Deleted' } : p));
      showToast.success('Structure deleted successfully');
    } catch (err) {
      console.error('Delete error', err);
    }
  };

  const handleSave = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Construct payload with legacy fields (for DB columns) AND custom_components (for dynamic UI)
    const payload = {
      employee_id: employee.id,
      slab: activeSlabName || 'Monthly',
      slab_id: activeSlabId || null,
      cycle_id: activeCycleId || null,
      pf_rate_pct: slabPfRate || 12,
      effective_from: effectiveFrom || todayStr,
      arrear_pay_month: arrearPayMonth || effectiveFrom || todayStr,
      calculation_mode: 'component_based', // Hardcoded as requested
      salary_input: Number(salaryInput) || 0,
      
      // Fallback schema mapping
      basic_monthly: Number(basic) || 0,
      hra_monthly: Number(hra) || 0,
      pf_deduction: Number(pf) || 0,
      pt_deduction: Number(pt) || 0,
      esic_deduction: Number(esic) || 0,
      pf_employer: Number(pfEmployer) || 0,
      
      gross_monthly: grossCalculated,
      total_deductions_monthly: totalDeductionCalculated,
      net_salary_monthly: netSalaryCalculated,
      annual_ctc: ctcCalculated,
      
      // Full Dynamic Payload mapped as JSON
      customComponents: JSON.stringify(dynamicValues)
    };

    try {
      if (editingRecord) {
        await apiClient.put(`/payroll/salary-structure/${editingRecord.id}`, payload).catch(() => {});
        showToast.success('Pay structure updated successfully');
      } else {
        await apiClient.post('/payroll/salary-structure', payload).catch(() => null);
        showToast.success('New pay structure saved successfully');
      }
      // Re-fetch after save
      const res = await apiClient.get(`/payroll/salary-structure?employee_id=${employee.id}`);
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data)) {
        setPayStructures(data.map((s: any) => ({
          ...s,
          id: String(s.id),
          customComponents: s.custom_components ? JSON.parse(s.custom_components) : {}
        })));
      }
    } catch (err) {
      console.error('Error saving pay structure:', err);
    }

    setModalOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ background: '#1e88e5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.2px' }}>Payroll Detail</h2>
        </div>

        <div style={{ padding: '14px 16px' }}>
          <div style={{ marginBottom: 14 }}>
            {canEditPayroll ? (
              <button
                onClick={handleOpenAddModal}
                style={{
                  background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4,
                  padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#1e293b',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>+</span> Add Pay Structure
              </button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Salary structure modification is restricted to Organization Admin only (Read-Only for HR).</span>
              </div>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 12px', width: 90 }}>Action</th>
                  <th style={{ padding: '10px 12px' }}>Slab</th>
                  <th style={{ padding: '10px 12px' }}>Effective From</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {payStructures.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No structure records found.</td></tr>
                )}
                {payStructures.map(rec => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => handleViewModal(rec)} title="View Breakdown" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e88e5' }}>
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        {canEditPayroll && (
                          <>
                            <button onClick={() => handleOpenEditModal(rec)} title="Edit Pay Structure" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981' }}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(rec)} title="Delete Pay Structure" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>{rec.slab}</td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>{rec.effectiveFrom}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {rec.status === 'Active' ? <span style={{ color: '#22c55e', background: '#dcfce7', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>Active</span> : <span style={{ color: '#94a3b8', background: '#f1f5f9', padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700 }}>Deleted</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-white text-slate-900 border-none shadow-2xl rounded-lg">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Payroll Structure</span>
            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>✕</button>
          </div>

          <div style={{ padding: '16px 24px 20px', maxHeight: '82vh', overflowY: 'auto' }}>
            <div style={{ paddingBottom: 10, borderBottom: '2px solid #00a8a8', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#991b1b', margin: 0 }}>
                Payroll Breakup <span style={{ color: '#b91c1c' }}>[Dynamic Structure]</span>
              </h3>
            </div>

            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>🏷️ Salary Slab:</span>
              <select
                value={activeSlabId}
                onChange={(e) => {
                  const val = e.target.value;
                  const chosen = allSlabs.find(s => String(s.id) === String(val));
                  if (chosen) {
                    setActiveSlabId(String(chosen.id));
                    setActiveSlabName(chosen.name || chosen.slab_name || 'Monthly');
                    setActiveCycleId(chosen.cycle_id ? String(chosen.cycle_id) : '');
                    setSlabPfRate(Number(chosen.pf_rate_pct || 12));
                    let comps = [];
                    try {
                      comps = typeof chosen.selected_component_ids === 'string'
                        ? JSON.parse(chosen.selected_component_ids)
                        : (chosen.selected_component_ids || []);
                    } catch {}
                    setSlabComponentIds(comps.map(String));
                  }
                }}
                style={{
                  height: 32, border: '1.5px solid #0284c7', borderRadius: 6, padding: '0 10px',
                  fontSize: 12, fontWeight: 700, background: !canEditPayroll ? '#f1f5f9' : '#ffffff', color: '#0c4a6e',
                  cursor: !canEditPayroll ? 'not-allowed' : 'pointer'
                }}
                disabled={!canEditPayroll}
              >
                {allSlabs.map(s => (
                  <option key={s.id} value={String(s.id)}>
                    🏷️ {s.name || s.slab_name} {s.min_ctc ? `(₹${(Number(s.min_ctc) / 100000).toFixed(1)}L - ₹${(Number(s.max_ctc || 10000000) / 100000).toFixed(1)}L CTC)` : ''}
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 11, color: '#0369a1', fontWeight: 600 }}>
                ({slabComponentIds.length} components assigned to this slab)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 16, alignItems: 'flex-start', background: '#f8fafc', padding: 14, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Monthly Gross / CTC Input :</label>
                <input
                  type="number"
                  value={salaryInput}
                  onChange={(e) => handleSalaryInputChange(e.target.value)}
                  readOnly={!canEditPayroll}
                  placeholder="Enter Gross Monthly Salary / CTC"
                  style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, fontWeight: 700, background: !canEditPayroll ? '#f1f5f9' : '#ffffff' }}
                />
                <p style={{ fontSize: 10, color: '#0369a1', fontStyle: 'italic', marginTop: 3, marginBottom: 0 }}>
                  * Modifying this will re-calculate dynamic derived components.
                </p>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Effective From :</label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#ffffff' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Arrear Pay Month :</label>
                <input
                  type="date"
                  value={arrearPayMonth}
                  onChange={(e) => setArrearPayMonth(e.target.value)}
                  style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#ffffff' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>
              {/* EARNINGS */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ borderTop: '3px solid #22c55e', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: 0 }}>Employee's Earning</h4>
                </div>
                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
                  {activeEarnings.map(group => (
                    <div key={group.id} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>{group.name}</div>
                      {group.components.map(comp => (
                        <div key={comp.id} style={{ marginBottom: 8 }}>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>{comp.name}</label>
                          <input
                            type="number"
                            value={dynamicValues[comp.id] || ''}
                            onChange={(e) => handleDynamicValueChange(comp.id, e.target.value)}
                            readOnly={!group.isEditable}
                            placeholder={comp.name}
                            style={{
                              width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4,
                              padding: '0 10px', fontSize: 12, fontWeight: 600,
                              background: !group.isEditable ? '#f1f5f9' : '#fff',
                              color: !group.isEditable ? '#64748b' : '#0f172a'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}
                  {activeEarnings.length === 0 && (
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>No earning components assigned to this slab.</p>
                  )}
                </div>
              </div>

              {/* DEDUCTIONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ borderTop: '3px solid #ef4444', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: 0 }}>Employee's Deduction</h4>
                  </div>
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
                    {activeDeductions.map(group => (
                      <div key={group.id} style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>{group.name}</div>
                        {group.components.map(comp => (
                          <div key={comp.id} style={{ marginBottom: 8 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>{comp.name}</label>
                            <input
                              type="number"
                              value={dynamicValues[comp.id] || ''}
                              onChange={(e) => handleDynamicValueChange(comp.id, e.target.value)}
                              readOnly={!group.isEditable}
                              placeholder={comp.name}
                              style={{
                                width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4,
                                padding: '0 10px', fontSize: 12, fontWeight: 600,
                                background: !group.isEditable ? '#f1f5f9' : '#fff',
                                color: !group.isEditable ? '#64748b' : '#0f172a'
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                    {activeDeductions.length === 0 && (
                      <p style={{ fontSize: 12, color: '#94a3b8' }}>No deduction components assigned to this slab.</p>
                    )}
                  </div>
                </div>

                {/* COMPUTED SUMMARY */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Total Gross Salary</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#22c55e' }}>₹{grossCalculated.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Total Deductions</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#ef4444' }}>₹{totalDeductionCalculated.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ borderTop: '1px dashed #cbd5e1', margin: '10px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Net Take Home</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#1e88e5' }}>₹{netSalaryCalculated.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <Button variant="outline" onClick={() => setModalOpen(false)} style={{ fontSize: 12, height: 36, fontWeight: 600 }}>
                {canEditPayroll ? 'Cancel' : 'Close'}
              </Button>
              {canEditPayroll && (
                <Button onClick={handleSave} style={{ fontSize: 12, height: 36, fontWeight: 600, background: '#1e88e5' }}>
                  {editingRecord ? 'Update Structure' : 'Save & Active'}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
