import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Calculator,
  Calendar,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';
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
  // Sample initial records
  const [payStructures, setPayStructures] = useState<PayStructureRecord[]>([
    {
      id: '1',
      slab: 'Monthly',
      effectiveFrom: '2026-08-07',
      arrearPayMonth: '2026-08',
      status: 'Active',
      addedBy: 'hradmin',
      addedOn: '2026-08-07 16:53:30',
      updateBy: '',
      updateOn: '',
      calcMode: 'salary_input',
      salaryInput: 60000,
      basic: 30000,
      hra: 12000,
      standardAllowance: 4167,
      mealAllowance: 2200,
      communicationAllowance: 1500,
      childrenEduAllowance: 800,
      lta: 9333,
      esic: 0,
      pt: 200,
      pf: 1800,
      pfEmployer: 1800,
      gross: 60000,
      totalDeduction: 2000,
      netSalary: 58000,
      ctc: 61800,
    },
    {
      id: '2',
      slab: 'Monthly',
      effectiveFrom: '2025-01-01',
      arrearPayMonth: '2025-01',
      status: 'Deleted',
      addedBy: 'Surinder Kumar',
      addedOn: '2025-04-15 11:08:58',
      updateBy: 'Surinder Kumar',
      updateOn: '2026-08-07 16:53:41',
      calcMode: 'salary_input',
      salaryInput: 50000,
      basic: 25000,
      hra: 10000,
      standardAllowance: 4167,
      mealAllowance: 2200,
      communicationAllowance: 1500,
      childrenEduAllowance: 800,
      lta: 6333,
      esic: 0,
      pt: 200,
      pf: 1800,
      pfEmployer: 1800,
      gross: 50000,
      totalDeduction: 2000,
      netSalary: 48000,
      ctc: 51800,
    },
  ]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayStructureRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<PayStructureRecord | null>(null);

  // Form Fields State inside Modal
  const [calcMode, setCalcMode] = useState<'salary_input' | 'component_based'>('salary_input');
  const [salaryInput, setSalaryInput] = useState<string>('60000');
  const [effectiveFrom, setEffectiveFrom] = useState<string>('2026-08-07');
  const [arrearPayMonth, setArrearPayMonth] = useState<string>('');

  // Earning Fields
  const [basic, setBasic] = useState<string>('30000');
  const [hra, setHra] = useState<string>('12000');
  const [standardAllowance, setStandardAllowance] = useState<string>('4167');
  const [mealAllowance, setMealAllowance] = useState<string>('2200');
  const [communicationAllowance, setCommunicationAllowance] = useState<string>('1500');
  const [childrenEduAllowance, setChildrenEduAllowance] = useState<string>('800');
  const [lta, setLta] = useState<string>('9333');

  // Deduction Fields
  const [esic, setEsic] = useState<string>('0');
  const [pt, setPt] = useState<string>('200');
  const [pf, setPf] = useState<string>('1800');

  // Employer Contribution
  const [pfEmployer, setPfEmployer] = useState<string>('1800');

  // Live Auto-Calculation Helper
  const recalculateFromSalaryInput = (inputVal: number) => {
    if (isNaN(inputVal) || inputVal <= 0) return;
    const b = Math.round(inputVal * 0.5);
    const h = Math.round(b * 0.4);
    const sa = 4167;
    const ma = 2200;
    const ca = 1500;
    const cea = 800;
    const l = Math.max(0, inputVal - (b + h + sa + ma + ca + cea));

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

  const handleSalaryInputChange = (val: string) => {
    setSalaryInput(val);
    if (calcMode === 'salary_input') {
      recalculateFromSalaryInput(Number(val));
    }
  };

  const handleModeChange = (mode: 'salary_input' | 'component_based') => {
    setCalcMode(mode);
    if (mode === 'salary_input') {
      recalculateFromSalaryInput(Number(salaryInput));
    }
  };

  // Computations
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

  // Active Record
  const activeRecord = payStructures.find((r) => r.status === 'Active') || payStructures[0];

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingRecord(null);
    setCalcMode('salary_input');
    setSalaryInput('60000');
    recalculateFromSalaryInput(60000);
    const today = new Date().toISOString().split('T')[0];
    setEffectiveFrom(today);
    setArrearPayMonth('');
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (rec: PayStructureRecord) => {
    setEditingRecord(rec);
    setCalcMode(rec.calcMode);
    setSalaryInput(String(rec.salaryInput));
    setEffectiveFrom(rec.effectiveFrom);
    setArrearPayMonth(rec.arrearPayMonth || '');

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

  // Delete Action
  const handleDeleteRecord = (id: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    setPayStructures((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: 'Deleted', updateBy: 'hradmin', updateOn: nowStr }
          : item
      )
    );
    showToast.success('Pay structure record marked as Deleted');
  };

  // Save Modal Action
  const handleSaveModal = () => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const todayStr = new Date().toISOString().split('T')[0];

    const recordData: PayStructureRecord = {
      id: editingRecord ? editingRecord.id : String(Date.now()),
      slab: 'Monthly',
      effectiveFrom: effectiveFrom || todayStr,
      arrearPayMonth,
      status: 'Active',
      addedBy: editingRecord ? editingRecord.addedBy : 'hradmin',
      addedOn: editingRecord ? editingRecord.addedOn : nowStr,
      updateBy: editingRecord ? 'hradmin' : '',
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

    if (editingRecord) {
      setPayStructures((prev) => prev.map((item) => (item.id === editingRecord.id ? recordData : item)));
      showToast.success('Pay structure updated successfully');
    } else {
      setPayStructures((prev) => [recordData, ...prev.map((r) => ({ ...r, status: 'Deleted' as const }))]);
      showToast.success('New pay structure added & activated');
    }

    setModalOpen(false);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Main Pay Structure Table Card */}
      <Card className="border border-border/80 shadow-2xs rounded-xl bg-card">
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Payroll Details & Pay Structure
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Manage monthly salary slabs, component breakup, earnings, deductions, and history for {employee.firstName}.
              </CardDescription>
            </div>

            <Button
              onClick={handleOpenAddModal}
              className="h-9 text-xs font-semibold gap-1.5 px-4 rounded-lg bg-primary text-primary-foreground shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> Add Pay Structure
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/70 text-muted-foreground font-semibold">
                  <th className="p-3 text-center w-24">Action</th>
                  <th className="p-3">Slab</th>
                  <th className="p-3">Effective From</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Added By</th>
                  <th className="p-3">Added On</th>
                  <th className="p-3">Update By</th>
                  <th className="p-3">Update On</th>
                </tr>
              </thead>
              <tbody>
                {payStructures.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                      No pay structure records found. Click "+ Add Pay Structure" to configure.
                    </td>
                  </tr>
                ) : (
                  payStructures.map((rec) => (
                    <tr
                      key={rec.id}
                      className="border-b border-border/50 hover:bg-muted/30 text-xs transition-colors"
                    >
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {rec.status === 'Active' && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleOpenEditModal(rec)}
                                title="Edit Pay Structure"
                                className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteRecord(rec.id)}
                                title="Delete Pay Structure"
                                className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setViewRecord(rec);
                              setViewModalOpen(true);
                            }}
                            title="View Structure Breakdown"
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>

                      <td className="p-3 font-medium text-foreground">{rec.slab}</td>
                      <td className="p-3 font-mono text-foreground">{rec.effectiveFrom}</td>
                      <td className="p-3">
                        {rec.status === 'Active' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30">
                            Deleted
                          </Badge>
                        )}
                      </td>
                      <td className="p-3 text-foreground">{rec.addedBy}</td>
                      <td className="p-3 font-mono text-muted-foreground text-[11px]">{rec.addedOn}</td>
                      <td className="p-3 text-foreground">{rec.updateBy || '-'}</td>
                      <td className="p-3 font-mono text-muted-foreground text-[11px]">{rec.updateOn || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── MODAL DIALOG: PAYROLL STRUCTURE BREAKUP ─── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 overflow-hidden bg-card text-card-foreground border-border/80 shadow-2xl rounded-2xl">
          <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  {editingRecord ? 'Edit Payroll Structure' : 'Configure Payroll Structure'}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Monthly salary breakup, component allocation, and statutory deduction settings.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
            {/* Calculation Mode Selection Card */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3 text-xs">
              <Label className="text-xs font-bold text-foreground block">Calculation Mode</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => handleModeChange('salary_input')}
                  className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${
                    calcMode === 'salary_input'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border/60 bg-background text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="radio"
                    checked={calcMode === 'salary_input'}
                    onChange={() => {}}
                    className="accent-primary"
                  />
                  <span>Calculate Payroll based on Salary Input</span>
                </label>

                <label
                  onClick={() => handleModeChange('component_based')}
                  className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${
                    calcMode === 'component_based'
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'border-border/60 bg-background text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="radio"
                    checked={calcMode === 'component_based'}
                    onChange={() => {}}
                    className="accent-primary"
                  />
                  <span>Calculate CTC based on Payroll Component</span>
                </label>
              </div>

              {/* Salary Input Field */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Salary Input (Monthly Gross)</Label>
                  <Input
                    type="number"
                    value={salaryInput}
                    onChange={(e) => handleSalaryInputChange(e.target.value)}
                    disabled={calcMode !== 'salary_input'}
                    className="h-9 text-xs font-semibold bg-background"
                  />
                  {calcMode === 'salary_input' && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      Enter gross salary to auto-calculate components below.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Effective From</Label>
                  <Input
                    type="date"
                    value={effectiveFrom}
                    onChange={(e) => setEffectiveFrom(e.target.value)}
                    className="h-9 text-xs font-semibold bg-background"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-foreground">Arrear Pay Month</Label>
                  <Input
                    type="month"
                    value={arrearPayMonth}
                    onChange={(e) => setArrearPayMonth(e.target.value)}
                    className="h-9 text-xs font-semibold bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Middle Section: Earnings & Deductions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Employee's Earnings Box */}
              <Card className="border border-emerald-500/30 rounded-xl overflow-hidden bg-card">
                <div className="px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Employee's Earnings</span>
                  <Badge variant="outline" className="text-[10px] bg-background border-emerald-500/30 text-emerald-700">
                    Gross: ₹{grossCalculated.toLocaleString()}
                  </Badge>
                </div>

                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs text-foreground">Basic</Label>
                    <Input type="number" value={basic} onChange={(e) => setBasic(e.target.value)} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-foreground">HRA</Label>
                    <Input type="number" value={hra} onChange={(e) => setHra(e.target.value)} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-foreground">Standard Allowance</Label>
                    <Input type="number" value={standardAllowance} onChange={(e) => setStandardAllowance(e.target.value)} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-foreground">Meal Allowance</Label>
                    <Input type="number" value={mealAllowance} onChange={(e) => setMealAllowance(e.target.value)} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-foreground">Communication Allowance</Label>
                    <Input type="number" value={communicationAllowance} onChange={(e) => setCommunicationAllowance(e.target.value)} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-foreground">Children Education Allowance</Label>
                    <Input type="number" value={childrenEduAllowance} onChange={(e) => setChildrenEduAllowance(e.target.value)} className="h-8 text-xs bg-background" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-foreground">LTA</Label>
                    <Input type="number" value={lta} onChange={(e) => setLta(e.target.value)} className="h-8 text-xs bg-background" />
                  </div>
                </CardContent>
              </Card>

              {/* Employee's Deductions & Employer Contribution */}
              <div className="space-y-5">
                {/* Deductions Box */}
                <Card className="border border-rose-500/30 rounded-xl overflow-hidden bg-card">
                  <div className="px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Employee's Deductions</span>
                    <Badge variant="outline" className="text-[10px] bg-background border-rose-500/30 text-rose-700">
                      Total: ₹{totalDeductionCalculated.toLocaleString()}
                    </Badge>
                  </div>

                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="space-y-1">
                      <Label className="text-xs text-foreground">ESIC</Label>
                      <Input type="number" value={esic} onChange={(e) => setEsic(e.target.value)} className="h-8 text-xs bg-background" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-foreground">PT (Professional Tax)</Label>
                      <Input type="number" value={pt} onChange={(e) => setPt(e.target.value)} className="h-8 text-xs bg-background" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-foreground">PF (Provident Fund)</Label>
                      <Input type="number" value={pf} onChange={(e) => setPf(e.target.value)} className="h-8 text-xs bg-background" />
                    </div>
                  </CardContent>
                </Card>

                {/* Employer Contribution */}
                <Card className="border border-amber-500/30 rounded-xl overflow-hidden bg-card">
                  <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Employer's Contribution</span>
                  </div>

                  <CardContent className="p-4 space-y-3 text-xs">
                    <div className="space-y-1">
                      <Label className="text-xs text-foreground">PF Employer</Label>
                      <Input type="number" value={pfEmployer} onChange={(e) => setPfEmployer(e.target.value)} className="h-8 text-xs bg-background" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Salary Summary Grid */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground block">Monthly Gross</span>
                <span className="text-base font-black text-foreground">₹{grossCalculated.toLocaleString()}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground block">Total Deductions</span>
                <span className="text-base font-black text-rose-600 dark:text-rose-400">₹{totalDeductionCalculated.toLocaleString()}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground block">Net Take-Home</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{netSalaryCalculated.toLocaleString()}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[11px] text-muted-foreground block">Annual CTC</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">₹{ctcCalculated.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveModal} className="text-xs font-semibold gap-1.5 px-5 bg-primary text-primary-foreground">
              Save Pay Structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL DIALOG: VIEW BREAKDOWN ─── */}
      {viewRecord && (
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-2xl w-[90vw] p-0 overflow-hidden bg-card text-card-foreground border-border/80 shadow-2xl rounded-2xl">
            <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Pay Structure Breakdown ({viewRecord.effectiveFrom})
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Slab</span>
                  <span className="font-bold text-foreground">{viewRecord.slab}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Effective Date</span>
                  <span className="font-bold font-mono text-foreground">{viewRecord.effectiveFrom}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">Status</span>
                  <Badge className={viewRecord.status === 'Active' ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' : 'bg-rose-500/10 text-rose-700'}>
                    {viewRecord.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-1.5">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block border-b pb-1 border-emerald-500/20">
                    Earnings Breakdown
                  </span>
                  <div className="flex justify-between"><span>Basic:</span> <span className="font-semibold">₹{viewRecord.basic.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>HRA:</span> <span className="font-semibold">₹{viewRecord.hra.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Standard Allowance:</span> <span className="font-semibold">₹{viewRecord.standardAllowance.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Meal Allowance:</span> <span className="font-semibold">₹{viewRecord.mealAllowance.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Communication:</span> <span className="font-semibold">₹{viewRecord.communicationAllowance.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Children Edu:</span> <span className="font-semibold">₹{viewRecord.childrenEduAllowance.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>LTA:</span> <span className="font-semibold">₹{viewRecord.lta.toLocaleString()}</span></div>
                  <div className="flex justify-between pt-1 border-t border-emerald-500/20 font-black text-foreground"><span>Gross Salary:</span> <span>₹{viewRecord.gross.toLocaleString()}</span></div>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1.5">
                  <span className="font-bold text-rose-700 dark:text-rose-400 block border-b pb-1 border-rose-500/20">
                    Deductions & Totals
                  </span>
                  <div className="flex justify-between"><span>PF:</span> <span className="font-semibold">₹{viewRecord.pf.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>PT:</span> <span className="font-semibold">₹{viewRecord.pt.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>ESIC:</span> <span className="font-semibold">₹{viewRecord.esic.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>PF Employer:</span> <span className="font-semibold">₹{viewRecord.pfEmployer.toLocaleString()}</span></div>
                  <div className="flex justify-between pt-1 border-t border-rose-500/20 font-bold text-rose-600"><span>Total Deductions:</span> <span>₹{viewRecord.totalDeduction.toLocaleString()}</span></div>
                  <div className="flex justify-between font-black text-emerald-600"><span>Net Take-Home:</span> <span>₹{viewRecord.netSalary.toLocaleString()}</span></div>
                  <div className="flex justify-between font-black text-indigo-600"><span>Annual CTC:</span> <span>₹{viewRecord.ctc.toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-border/60 bg-muted/20">
              <Button size="sm" variant="outline" onClick={() => setViewModalOpen(false)} className="text-xs font-semibold">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
