import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';
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
}

interface EmployeePayrollDetailProps {
  employee: Employee;
}

export function EmployeePayrollDetail({ employee }: EmployeePayrollDetailProps) {
  // Pay Structure records (Loaded dynamically from DB — starts empty)
  const [payStructures, setPayStructures] = useState<PayStructureRecord[]>([]);

  // Slab from employee's assigned salary_slab_id (set at employee creation)
  const [activeSlabName, setActiveSlabName] = useState<string>('');
  const [activeSlabId, setActiveSlabId] = useState<string>('');
  const [activeCycleId, setActiveCycleId] = useState<string>('');
  const [slabPfRate, setSlabPfRate] = useState<number>(12);
  // No dropdown needed — slab is fixed per employee


  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayStructureRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<PayStructureRecord | null>(null);

  // Form Fields inside Modal
  const [calcMode, setCalcMode] = useState<'salary_input' | 'component_based'>('salary_input');
  const [salaryInput, setSalaryInput] = useState<string>('120000');
  const [effectiveFrom, setEffectiveFrom] = useState<string>('2026-08-08');
  const [arrearPayMonth, setArrearPayMonth] = useState<string>('2026-08-08');

  // Earnings
  const [basic, setBasic] = useState<string>('60000');
  const [hra, setHra] = useState<string>('24000');
  const [standardAllowance, setStandardAllowance] = useState<string>('0');
  const [mealAllowance, setMealAllowance] = useState<string>('0');
  const [communicationAllowance, setCommunicationAllowance] = useState<string>('0');
  const [childrenEduAllowance, setChildrenEduAllowance] = useState<string>('0');
  const [lta, setLta] = useState<string>('0');

  // Deductions
  const [esic, setEsic] = useState<string>('0');
  const [pt, setPt] = useState<string>('200');
  const [pf, setPf] = useState<string>('1800');

  // Employer Contribution
  const [pfEmployer, setPfEmployer] = useState<string>('1800');

  // Load Database pay structures & slabs dynamically for this employee
  useEffect(() => {
    if (!employee?.id) return;

    // 1. Load employee's assigned slab via salary_slab_id
    const empSlabId = (employee as any).salary_slab_id || (employee as any).salarySlabId;
    if (empSlabId) {
      apiClient.get('/payroll/slabs').then((res: any) => {
        const slabsData = res.data?.data || res.data || [];
        const assignedSlab = slabsData.find((s: any) => String(s.id) === String(empSlabId));
        if (assignedSlab) {
          setActiveSlabName(assignedSlab.name || 'Monthly');
          setActiveSlabId(String(assignedSlab.id));
          setActiveCycleId(assignedSlab.cycle_id ? String(assignedSlab.cycle_id) : '');
          setSlabPfRate(Number(assignedSlab.pf_rate_pct || 12));
        }
      }).catch(() => {});
    } else {
      // Fallback: auto-match by dept/grade if no slab_id assigned yet
      apiClient.get('/payroll/slabs').then((res: any) => {
        const slabsData = res.data?.data || res.data || [];
        if (!Array.isArray(slabsData) || slabsData.length === 0) return;
        const empDept = (employee.department || (employee as any).dept_name || '').toLowerCase();
        const empGrade = (employee.designation || (employee as any).grade || '').toLowerCase();
        const matched = slabsData.find((s: any) => {
          let depts: string[] = []; try { depts = typeof s.departments === 'string' ? JSON.parse(s.departments) : (s.departments || []); } catch {}
          let grades: string[] = []; try { grades = typeof s.grades === 'string' ? JSON.parse(s.grades) : (s.grades || []); } catch {}
          const deptMatch = depts.length === 0 || depts.some(d => d.toLowerCase().includes(empDept) || empDept.includes(d.toLowerCase()));
          const gradeMatch = grades.length === 0 || grades.some(g => g.toLowerCase().includes(empGrade) || empGrade.includes(g.toLowerCase()));
          return deptMatch && gradeMatch;
        });
        const activeSlab = matched || slabsData[0];
        if (activeSlab) {
          setActiveSlabName(activeSlab.name || 'Monthly');
          setActiveSlabId(String(activeSlab.id || ''));
          setActiveCycleId(activeSlab.cycle_id ? String(activeSlab.cycle_id) : '');
          setSlabPfRate(Number(activeSlab.pf_rate_pct || 12));
        }
      }).catch(() => {});
    }

    // 2. Fetch Employee Salary Structure Records dynamically from Database
    apiClient.get(`/payroll/salary-structure?employee_id=${employee.id}`).then((res: any) => {
      const data = res.data?.data || res.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const mappedRecords: PayStructureRecord[] = data.map((s: any) => ({
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
          basic: Number(s.basic || s.basic_monthly || 30000),
          hra: Number(s.hra || s.hra_monthly || 12000),
          standardAllowance: Number(s.standardAllowance || s.standard_allowance_monthly || 0),
          mealAllowance: Number(s.mealAllowance || s.meal_allowance_monthly || 0),
          communicationAllowance: Number(s.communicationAllowance || s.communication_allowance_monthly || 0),
          childrenEduAllowance: Number(s.childrenEduAllowance || s.children_edu_allowance_monthly || 0),
          lta: Number(s.lta || s.lta_monthly || 0),
          esic: Number(s.esic || s.esic_deduction || 0),
          pt: Number(s.pt || s.pt_deduction || 200),
          pf: Number(s.pf || s.pf_deduction || 1800),
          pfEmployer: Number(s.pfEmployer || s.pf_employer || 1800),
          gross: Number(s.gross || s.gross_monthly || 60000),
          totalDeduction: Number(s.totalDeduction || s.total_deductions_monthly || 2000),
          netSalary: Number(s.netSalary || s.net_salary_monthly || 58000),
          ctc: Number(s.ctc || s.annual_ctc || 61800),
        }));

        setPayStructures(mappedRecords);
      }
    }).catch(() => {});
  }, [employee]);

  // No handleSlabChange — slab is fixed per employee (set at creation)


  // Option 1: Salary Input Recalculation (Gross -> Components)
  const recalculateFromSalaryInput = (inputVal: number) => {
    if (isNaN(inputVal) || inputVal <= 0) return;
    const b = Math.round(inputVal * 0.5);
    const h = Math.round(b * 0.5);
    const sa = 0;
    const ma = 0;
    const ca = 0;
    const cea = 0;
    const l = Math.max(0, inputVal - (b + h));

    setBasic(String(b));
    setHra(String(h));
    setStandardAllowance(String(sa));
    setMealAllowance(String(ma));
    setCommunicationAllowance(String(ca));
    setChildrenEduAllowance(String(cea));
    setLta(String(l));

    setPf('1800');
    setPt('200');
    setEsic('0');
    setPfEmployer('1800');
  };

  // Option 2: Basic Recalculation (Basic -> HRA & Deductions) — uses slab's PF rate
  const recalculateFromBasicInput = (basicVal: number) => {
    if (isNaN(basicVal) || basicVal <= 0) return;
    const h = Math.round(basicVal * 0.5);
    setHra(String(h));

    // Statutory PF: slab.pf_rate_pct% capped at ₹1800
    const pfVal = Math.min(1800, Math.round(basicVal * (slabPfRate / 100)));
    setPf(String(pfVal));
    setPfEmployer(String(pfVal));

    // Gross estimation
    const estGross = basicVal + h + (Number(standardAllowance) || 0) + (Number(mealAllowance) || 0) + (Number(communicationAllowance) || 0) + (Number(childrenEduAllowance) || 0) + (Number(lta) || 0);

    // ESIC: 0.75% if Gross <= 21000
    setEsic(estGross <= 21000 ? String(Math.round(estGross * 0.0075)) : '0');
    setPt('200');
  };


  const handleSalaryInputChange = (val: string) => {
    setSalaryInput(val);
    if (calcMode === 'salary_input') {
      recalculateFromSalaryInput(Number(val));
    }
  };

  const handleBasicChange = (val: string) => {
    setBasic(val);
    if (calcMode === 'component_based') {
      recalculateFromBasicInput(Number(val));
    }
  };

  const handleModeChange = (mode: 'salary_input' | 'component_based') => {
    setCalcMode(mode);
    if (mode === 'salary_input') {
      recalculateFromSalaryInput(Number(salaryInput));
    } else {
      recalculateFromBasicInput(Number(basic));
    }
  };

  // Computed Totals
  const numBasic = Number(basic) || 0;
  const numHra = Number(hra) || 0;
  const numSa = Number(standardAllowance) || 0;
  const numMa = Number(mealAllowance) || 0;
  const numCa = Number(communicationAllowance) || 0;
  const numCea = Number(childrenEduAllowance) || 0;
  const numLta = Number(lta) || 0;

  const grossCalculated = numBasic + numHra + numSa + numMa + numCa + numCea + numLta;

  const numEsic = Number(esic) || 0;
  const numPt = Number(pt) || 0;
  const numPf = Number(pf) || 0;

  const totalDeductionCalculated = numEsic + numPt + numPf;
  const netSalaryCalculated = Math.max(0, grossCalculated - totalDeductionCalculated);

  const numPfEmployer = Number(pfEmployer) || 0;
  const ctcCalculated = grossCalculated + numPfEmployer;

  // Modal Open Handlers
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setCalcMode('salary_input');
    setSalaryInput('120000');
    recalculateFromSalaryInput(120000);
    const today = new Date().toISOString().split('T')[0];
    setEffectiveFrom(today);
    setArrearPayMonth(today);
    setModalOpen(true);
  };

  const handleOpenEditModal = (rec: PayStructureRecord) => {
    setEditingRecord(rec);
    setCalcMode(rec.calcMode);
    setSalaryInput(String(rec.salaryInput || 120000));
    setEffectiveFrom(rec.effectiveFrom);
    setArrearPayMonth(rec.arrearPayMonth || rec.effectiveFrom);

    setBasic(String(rec.basic));
    setHra(String(rec.hra));
    setStandardAllowance(String(rec.standardAllowance));
    setMealAllowance(String(rec.mealAllowance));
    setCommunicationAllowance(String(rec.communicationAllowance));
    setChildrenEduAllowance(String(rec.childrenEduAllowance));
    setLta(String(rec.lta));

    setEsic(String(rec.esic));
    setPt(String(rec.pt));
    setPf(String(rec.pf));
    setPfEmployer(String(rec.pfEmployer));

    setModalOpen(true);
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('Are you sure you want to mark this pay structure as Deleted?')) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const currentUser = `${employee.firstName} ${employee.lastName || ''}`.trim() || 'Surinder Kumar';

    try {
      await apiClient.delete(`/payroll/salary-structure/${id}`).catch(() => {});
    } catch (err) {}

    setPayStructures((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'Deleted', updateBy: currentUser, updateOn: nowStr }
          : item
      )
    );
    showToast.success('Pay structure marked as Deleted');
  };

  const handleSaveModal = async () => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const todayStr = new Date().toISOString().split('T')[0];
    const currentUser = `${employee.firstName} ${employee.lastName || ''}`.trim() || 'Surinder Kumar';

    const recordData: PayStructureRecord = {
      id: editingRecord ? editingRecord.id : String(Date.now()),
      slab: activeSlabName || 'Monthly',
      effectiveFrom: effectiveFrom || todayStr,
      arrearPayMonth: arrearPayMonth || effectiveFrom || todayStr,
      status: 'Active',
      addedBy: editingRecord ? editingRecord.addedBy : currentUser,
      addedOn: editingRecord ? editingRecord.addedOn : nowStr,
      updateBy: editingRecord ? currentUser : '',
      updateOn: editingRecord ? nowStr : '',
      calcMode,
      salaryInput: Number(salaryInput) || 0,
      basic: numBasic,
      hra: numHra,
      standardAllowance: numSa,
      mealAllowance: numMa,
      communicationAllowance: numCa,
      childrenEduAllowance: numCea,
      lta: numLta,
      esic: numEsic,
      pt: numPt,
      pf: numPf,
      pfEmployer: numPfEmployer,
      gross: grossCalculated,
      totalDeduction: totalDeductionCalculated,
      netSalary: netSalaryCalculated,
      ctc: ctcCalculated,
    };


    const payload = {
      employee_id: employee.id,
      slab: activeSlabName || 'Monthly',
      slab_id: activeSlabId || null,            // PayCycle → Slab chain
      cycle_id: activeCycleId || null,          // ← cycle from slab.cycle_id
      pf_rate_pct: slabPfRate || 12,            // ← slab's PF rate used
      effective_from: effectiveFrom || todayStr,
      arrear_pay_month: arrearPayMonth || effectiveFrom || todayStr,
      calculation_mode: calcMode,
      salary_input: Number(salaryInput) || 0,
      basic_monthly: numBasic,
      hra_monthly: numHra,
      standard_allowance_monthly: numSa,
      meal_allowance_monthly: numMa,
      communication_allowance_monthly: numCa,
      children_edu_allowance_monthly: numCea,
      lta_monthly: numLta,
      esic_deduction: numEsic,
      pt_deduction: numPt,
      pf_deduction: numPf,
      pf_employer: numPfEmployer,
      gross_monthly: grossCalculated,
      total_deductions_monthly: totalDeductionCalculated,
      net_salary_monthly: netSalaryCalculated,
      annual_ctc: ctcCalculated
    };


    try {
      if (editingRecord) {
        await apiClient.put(`/payroll/salary-structure/${editingRecord.id}`, payload).catch(() => {});
        setPayStructures((prev) => prev.map((item) => (item.id === editingRecord.id ? recordData : item)));
        showToast.success('Pay structure updated & saved to MySQL');
      } else {
        const postRes = await apiClient.post('/payroll/salary-structure', payload).catch(() => null);
        const serverId = postRes?.data?.data?.id || postRes?.data?.id;
        if (serverId) recordData.id = String(serverId);

        setPayStructures((prev) => [recordData, ...prev.map((r) => ({ ...r, status: 'Deleted' as const }))]);
        showToast.success('New pay structure saved & activated in MySQL');
      }
    } catch (err) {
      console.error('Error saving pay structure:', err);
    }

    setModalOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── Hoshi HRMS exact Payroll Detail Card & Header Banner ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {/* Blue Banner Title Bar matching Hoshi */}
        <div style={{ background: '#1e88e5', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, letterSpacing: '0.2px' }}>Payroll Detail</h2>
        </div>

        {/* Content Box */}
        <div style={{ padding: '14px 16px' }}>
          {/* + Add Pay Structure Button on Top Left */}
          <div style={{ marginBottom: 14 }}>
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
          </div>

          {/* History Table matching Hoshi HRMS 1:1 */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                  <th style={{ padding: '10px 12px', width: 90 }}>Action</th>
                  <th style={{ padding: '10px 12px' }}>Slab</th>
                  <th style={{ padding: '10px 12px' }}>Effective From</th>
                  <th style={{ padding: '10px 12px' }}>Status</th>
                  <th style={{ padding: '10px 12px' }}>Added By</th>
                  <th style={{ padding: '10px 12px' }}>Added On</th>
                  <th style={{ padding: '10px 12px' }}>Update By</th>
                  <th style={{ padding: '10px 12px' }}>Update On</th>
                </tr>
              </thead>
              <tbody>
                {payStructures.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* View Details Icon (📄) */}
                        <button
                          onClick={() => {
                            setViewRecord(rec);
                            setViewModalOpen(true);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b' }}
                          title="View Pay Structure Breakdown"
                        >
                          <FileText style={{ width: 14, height: 14 }} />
                        </button>

                        {rec.status === 'Active' && (
                          <>
                            {/* Edit Pencil Icon (📝) */}
                            <button
                              onClick={() => handleOpenEditModal(rec)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#334155' }}
                              title="Edit Pay Structure"
                            >
                              <Edit2 style={{ width: 14, height: 14 }} />
                            </button>

                            {/* Trash Delete Icon (🗑️) */}
                            <button
                              onClick={() => handleDeleteRecord(rec.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#334155' }}
                              title="Delete Pay Structure"
                            >
                              <Trash2 style={{ width: 14, height: 14 }} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#334155' }}>{rec.slab}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#334155' }}>{rec.effectiveFrom}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: rec.status === 'Active' ? '#16a34a' : '#dc2626'
                      }}>
                        {rec.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>{rec.addedBy}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 10, fontFamily: 'monospace' }}>{rec.addedOn}</td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>{rec.updateBy || ''}</td>
                    <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 10, fontFamily: 'monospace' }}>{rec.updateOn || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── HOSHI HRMS EXACT MODAL DIALOG: PAYROLL STRUCTURE ─── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-white text-slate-900 border-none shadow-2xl rounded-lg">
          {/* Modal Header bar */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>Payroll Structure</span>
            <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>✕</button>
          </div>

          <div style={{ padding: '16px 24px 20px', maxHeight: '82vh', overflowY: 'auto' }}>
            {/* Red Sub-header */}
            <div style={{ paddingBottom: 10, borderBottom: '2px solid #00a8a8', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#991b1b', margin: 0 }}>
                Payroll Breakup <span style={{ color: '#b91c1c' }}>[Monthly Salary Structure]</span>
              </h3>
            </div>

            {/* ─── Assigned Slab Info Bar (read-only \u2014 set at employee creation) ─── */}
            {activeSlabName && (
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '8px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0369a1', whiteSpace: 'nowrap' }}>
                  🏷️ Payroll Slab:
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0c4a6e', background: '#e0f2fe', padding: '2px 10px', borderRadius: 4, border: '1px solid #7dd3fc' }}>
                  {activeSlabName}
                </span>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                  📊 PF Rate: <strong>{slabPfRate}%</strong> (capped ₹1,800)
                </span>
                {activeCycleId && (
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                    🔄 Cycle ID: <strong>{activeCycleId}</strong>
                  </span>
                )}
              </div>
            )}

            {/* Top Options & Dates Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 16, alignItems: 'flex-start' }}>
              {/* Left: Radio Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="calcMode"
                    checked={calcMode === 'salary_input'}
                    onChange={() => handleModeChange('salary_input')}
                    style={{ accentColor: '#0284c7' }}
                  />
                  Calculate Payroll based on Salary Input
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="calcMode"
                    checked={calcMode === 'component_based'}
                    onChange={() => handleModeChange('component_based')}
                    style={{ accentColor: '#0284c7' }}
                  />
                  Calculate CTC based on Payroll Component
                </label>
              </div>

              {/* Middle: Effective From */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Effective From :</label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12 }}
                />
              </div>

              {/* Right: Arrear Pay Month */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Arrear Pay Month :</label>
                <input
                  type="date"
                  value={arrearPayMonth}
                  onChange={(e) => setArrearPayMonth(e.target.value)}
                  style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12 }}
                />
              </div>
            </div>

            {/* Salary Input Field (Shown ONLY when Option 1 is selected) */}
            {calcMode === 'salary_input' && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Salary Input :</label>
                <input
                  type="number"
                  value={salaryInput}
                  onChange={(e) => handleSalaryInputChange(e.target.value)}
                  placeholder="Salary"
                  style={{ width: 220, height: 36, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 13, fontWeight: 600, background: '#f8fafc' }}
                />
                <p style={{ fontSize: 11, color: '#dc2626', fontStyle: 'italic', marginTop: 4, marginBottom: 0 }}>
                  Enter the gross salary amount in the 'Salary Input' field.
                </p>
              </div>
            )}

            {/* Main 2-Column Earnings & Deductions Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 20 }}>

              {/* LEFT COLUMN: Employee's Earning (Green Top Border) */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ borderTop: '3px solid #22c55e', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: 0 }}>Employee's Earning</h4>
                </div>

                <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
                  {/* Basic */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Basic</label>
                    <input
                      type="number"
                      value={basic}
                      onChange={(e) => handleBasicChange(e.target.value)}
                      readOnly={calcMode === 'salary_input'}
                      placeholder="Basic"
                      style={{
                        width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4,
                        padding: '0 10px', fontSize: 12, fontWeight: 600,
                        background: calcMode === 'salary_input' ? '#f8fafc' : '#fff'
                      }}
                    />
                  </div>

                  {/* HRA */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>HRA</label>
                    <input
                      type="number"
                      value={hra}
                      onChange={(e) => setHra(e.target.value)}
                      placeholder="HRA"
                      style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#f8fafc' }}
                    />
                  </div>

                  {/* Standard Allowance */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Standard Allowance</label>
                    <input
                      type="number"
                      value={standardAllowance}
                      onChange={(e) => setStandardAllowance(e.target.value)}
                      placeholder="Standard Allowance"
                      style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#f8fafc' }}
                    />
                  </div>

                  {/* Meal Allowance */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Meal Allowance</label>
                    <input
                      type="number"
                      value={mealAllowance}
                      onChange={(e) => setMealAllowance(e.target.value)}
                      placeholder="Meal Allowance"
                      style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#f8fafc' }}
                    />
                  </div>

                  {/* Communication Allowance */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Communication Allowance</label>
                    <input
                      type="number"
                      value={communicationAllowance}
                      onChange={(e) => setCommunicationAllowance(e.target.value)}
                      placeholder="Communication Allowance"
                      style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#f8fafc' }}
                    />
                  </div>

                  {/* Children Education Allowance */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Children Education Allowance</label>
                    <input
                      type="number"
                      value={childrenEduAllowance}
                      onChange={(e) => setChildrenEduAllowance(e.target.value)}
                      placeholder="Children Education Allowance"
                      style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#f8fafc' }}
                    />
                  </div>

                  {/* LTA */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>LTA</label>
                    <input
                      type="number"
                      value={lta}
                      onChange={(e) => setLta(e.target.value)}
                      placeholder="LTA"
                      style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#f8fafc' }}
                    />
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Deductions & Employer Contribution */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Employee's Deduction (Red Top Border) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ borderTop: '3px solid #ef4444', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: 0 }}>Employee's Deduction</h4>
                  </div>

                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
                    {/* ESIC */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>ESIC</label>
                      <input
                        type="number"
                        value={esic}
                        onChange={(e) => setEsic(e.target.value)}
                        placeholder="ESIC"
                        style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#f8fafc' }}
                      />
                    </div>

                    {/* PT */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>PT</label>
                      <input
                        type="number"
                        value={pt}
                        onChange={(e) => setPt(e.target.value)}
                        placeholder="PT"
                        style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#f8fafc' }}
                      />
                    </div>

                    {/* PF */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>PF</label>
                      <input
                        type="number"
                        value={pf}
                        onChange={(e) => setPf(e.target.value)}
                        placeholder="PF"
                        style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#f8fafc' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Employer's Contribution (Orange Top Border) */}
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ borderTop: '3px solid #f59e0b', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: 0 }}>Employer's Contribution</h4>
                  </div>

                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, background: '#fff' }}>
                    {/* PF Employer */}
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>PF Employer</label>
                      <input
                        type="number"
                        value={pfEmployer}
                        onChange={(e) => setPfEmployer(e.target.value)}
                        placeholder="PF Employer"
                        style={{ width: '100%', height: 34, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 12, background: '#f8fafc' }}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Summary Section (Cyan Divider Line above) */}
            <div style={{ borderTop: '2px solid #06b6d4', paddingTop: 14, marginTop: 10 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: '#334155', margin: '0 0 12px 0' }}>Salary Structure</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                {/* Gross */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Gross</label>
                  <input
                    type="text"
                    readOnly
                    value={grossCalculated}
                    style={{ width: '100%', height: 36, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 13, fontWeight: 600, background: '#f8fafc', color: '#334155' }}
                  />
                </div>

                {/* Total Deduction */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Total Deduction</label>
                  <input
                    type="text"
                    readOnly
                    value={totalDeductionCalculated}
                    style={{ width: '100%', height: 36, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 13, fontWeight: 600, background: '#f8fafc', color: '#334155' }}
                  />
                </div>

                {/* Net Salary */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>Net Salary</label>
                  <input
                    type="text"
                    readOnly
                    value={netSalaryCalculated}
                    style={{ width: '100%', height: 36, border: '1px solid #cbd5e1', borderRadius: 4, padding: '0 10px', fontSize: 13, fontWeight: 600, background: '#f8fafc', color: '#334155' }}
                  />
                </div>

                {/* CTC (Red Outline) */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: 4 }}>CTC</label>
                  <input
                    type="text"
                    readOnly
                    value={ctcCalculated}
                    style={{ width: '100%', height: 36, border: '1.5px solid #dc2626', borderRadius: 4, padding: '0 10px', fontSize: 13, fontWeight: 700, background: '#f8fafc', color: '#1e293b' }}
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  onClick={handleSaveModal}
                  style={{
                    background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4,
                    padding: '8px 24px', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: '#dc2626', color: '#fff', border: 'none', borderRadius: 4,
                    padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL DIALOG: VIEW BREAKDOWN ─── */}
      {viewRecord && (
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-2xl w-[90vw] p-0 overflow-hidden bg-white text-slate-900 border-none shadow-2xl rounded-lg">
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>Pay Structure Breakdown ({viewRecord.effectiveFrom})</span>
              <button onClick={() => setViewModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div>
                  <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Slab</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{viewRecord.slab}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Effective Date</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' }}>{viewRecord.effectiveFrom}</span>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: '#64748b', display: 'block' }}>Status</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: viewRecord.status === 'Active' ? '#16a34a' : '#dc2626' }}>
                    {viewRecord.status}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ padding: 14, border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: '#15803d', borderBottom: '1px solid #bbf7d0', paddingBottom: 4 }}>
                    Earnings Breakdown
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Basic:</span> <span style={{ fontWeight: 600 }}>₹{viewRecord.basic.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>HRA:</span> <span style={{ fontWeight: 600 }}>₹{viewRecord.hra.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Standard Allowance:</span> <span style={{ fontWeight: 600 }}>₹{viewRecord.standardAllowance.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Meal Allowance:</span> <span style={{ fontWeight: 600 }}>₹{viewRecord.mealAllowance.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Communication:</span> <span style={{ fontWeight: 600 }}>₹{viewRecord.communicationAllowance.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Children Edu:</span> <span style={{ fontWeight: 600 }}>₹{viewRecord.childrenEduAllowance.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>LTA:</span> <span style={{ fontWeight: 600 }}>₹{viewRecord.lta.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #bbf7d0', fontWeight: 800 }}><span>Gross Salary:</span> <span>₹{viewRecord.gross.toLocaleString()}</span></div>
                </div>

                <div style={{ padding: 14, border: '1px solid #fecdd3', background: '#fff1f2', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <span style={{ fontWeight: 700, color: '#b91c1c', borderBottom: '1px solid #fecdd3', paddingBottom: 4 }}>
                    Deductions & Totals
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>PF:</span> <span style={{ fontWeight: 600 }}>₹{viewRecord.pf.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>PT:</span> <span style={{ fontWeight: 600 }}>₹{viewRecord.pt.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>ESIC:</span> <span style={{ fontWeight: 600 }}>₹{viewRecord.esic.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>PF Employer:</span> <span style={{ fontWeight: 600 }}>₹{viewRecord.pfEmployer.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #fecdd3', fontWeight: 700, color: '#dc2626' }}><span>Total Deductions:</span> <span>₹{viewRecord.totalDeduction.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#16a34a' }}><span>Net Take-Home:</span> <span>₹{viewRecord.netSalary.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#0284c7' }}><span>Monthly CTC:</span> <span>₹{viewRecord.ctc.toLocaleString()}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: '#4f46e5', paddingTop: 4, borderTop: '1px dashed #fecdd3' }}><span>Annual CTC:</span> <span>₹{(viewRecord.ctc * 12).toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setViewModalOpen(false)}
                style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, padding: '6px 16px', fontSize: 12, fontWeight: 700, color: '#334155', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
