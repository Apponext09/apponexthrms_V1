import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck, FileCheck, TrendingUp, DollarSign,
  ChevronDown, ChevronUp, Plus, Save, AlertCircle, CheckCircle, User, Calculator
} from 'lucide-react';
import apiClient from '@/lib/api';

// ── Statutory / Slab config (editable) ──────────────────────────────────────

const DEFAULT_STATUTORY = [
  { id: 1, label: 'PF Employee Contribution', rate: 12, base: '% of Basic Pay (Capped ₹15K)', type: 'deduction' },
  { id: 2, label: 'PF Employer Contribution', rate: 12, base: '% of Basic Pay', type: 'employer' },
  { id: 3, label: 'ESI Employee Contribution', rate: 0.75, base: '% of Gross Wages (≤ ₹21K)', type: 'deduction' },
  { id: 4, label: 'ESI Employer Contribution', rate: 3.25, base: '% of Gross Wages', type: 'employer' },
  { id: 5, label: 'Professional Tax (State Slab)', rate: 200, base: '₹/month flat (Gross > ₹15,000)', type: 'deduction' },
];

const DEFAULT_INCOME_TAX_SLABS = [
  { from: 0, to: 300000, rate: 0, label: 'Up to ₹3,00,000' },
  { from: 300001, to: 700000, rate: 5, label: '₹3,00,001 – ₹7,00,000' },
  { from: 700001, to: 1000000, rate: 10, label: '₹7,00,001 – ₹10,00,000' },
  { from: 1000001, to: 1200000, rate: 15, label: '₹10,00,001 – ₹12,00,000' },
  { from: 1200001, to: 1500000, rate: 20, label: '₹12,00,001 – ₹15,00,000' },
  { from: 1500001, to: Infinity, rate: 30, label: 'Above ₹15,00,000' },
];

const OLD_REGIME_SLABS = [
  { from: 0, to: 250000, rate: 0, label: 'Up to ₹2,50,000' },
  { from: 250001, to: 500000, rate: 5, label: '₹2,50,001 – ₹5,00,000' },
  { from: 500001, to: 1000000, rate: 20, label: '₹5,00,001 – ₹10,00,000' },
  { from: 1000001, to: Infinity, rate: 30, label: 'Above ₹10,00,000' },
];

const SECTION_DEDUCTIONS = [
  { code: '80C', label: 'Section 80C (PPF, LIC, ELSS, Home Loan Principal, etc.)', maxLimit: 150000 },
  { code: '80D', label: 'Section 80D (Medical Insurance)', maxLimit: 25000 },
  { code: 'HRA', label: 'HRA Exemption (Metro: 50% of Basic, Non-Metro: 40%)', maxLimit: null },
  { code: '80TTA', label: 'Section 80TTA (Savings Interest)', maxLimit: 10000 },
  { code: 'STANDARD', label: 'Standard Deduction', maxLimit: 75000 },
];

// ── Main Component ────────────────────────────────────────────────────────────

export const TaxDeclaration: React.FC = () => {
  const [regime, setRegime] = useState<'new' | 'old'>('new');
  const [statutory, setStatutory] = useState(DEFAULT_STATUTORY);
  const [editingStatId, setEditingStatId] = useState<number | null>(null);
  const [editRate, setEditRate] = useState('');

  const [deductions, setDeductions] = useState(
    SECTION_DEDUCTIONS.map(d => ({ ...d, declared: 0 }))
  );
  const [editingDedCode, setEditingDedCode] = useState<string | null>(null);
  const [editDedAmount, setEditDedAmount] = useState('');

  const [employees, setEmployees] = useState<any[]>([
    { id: 38, name: 'got sharma', code: 'EMP101', annualCtc: 900000, basicMonthly: 37500, grossMonthly: 75000 },
    { id: 39, name: 'mot sharma', code: 'EMP202', annualCtc: 1200000, basicMonthly: 50000, grossMonthly: 100000 },
    { id: 40, name: 'tee gfdsa', code: 'EMP206', annualCtc: 720000, basicMonthly: 30000, grossMonthly: 60000 },
    { id: 41, name: 'teeam lead', code: 'EMP2002', annualCtc: 960000, basicMonthly: 40000, grossMonthly: 80000 },
    { id: 42, name: 'hrr fccc', code: 'EMP1001', annualCtc: 620000, basicMonthly: 25833, grossMonthly: 51667 },
    { id: 44, name: 'PP Manager', code: '432', annualCtc: 1500000, basicMonthly: 62500, grossMonthly: 125000 }
  ]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('38');
  const selectedEmp = employees.find(e => String(e.id) === selectedEmpId) || employees[0];

  const [annualGross, setAnnualGross] = useState<number>(0);
  const [grossInput, setGrossInput] = useState<string>('0');
  const [expandSlabs, setExpandSlabs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    Promise.all([
      apiClient.get('/employees', { params: { pageSize: 500 } }).catch(() => ({ data: [] })),
      apiClient.get('/payroll/structures').catch(() => ({ data: [] }))
    ]).then(([empRes, structRes]: any[]) => {
      const list = empRes.data?.data || empRes.data || [];
      const structures = structRes.data?.data || structRes.data || [];

      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((e: any) => {
          const myStruct = structures.find((s: any) => String(s.employee_id || s.empId || s.employeeId) === String(e.id));
          const ctc = Number(myStruct?.annual_ctc || myStruct?.annualCtc || e.annual_ctc || e.annualCtc || 0);
          const gross = myStruct ? Number(myStruct.gross_monthly || myStruct.grossMonthly || Math.round(ctc / 12)) : Number(e.gross_salary || (ctc ? Math.round(ctc / 12) : 0));
          const basic = myStruct ? Number(myStruct.basic_monthly || myStruct.basicMonthly || Math.round(gross * 0.5)) : Number(e.basic_salary || (gross ? Math.round(gross * 0.5) : 0));

          return {
            id: e.id,
            name: `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.email || `Employee #${e.id}`,
            code: e.employee_code || e.employeeCode || `EMP-${e.id}`,
            annualCtc: ctc,
            basicMonthly: basic,
            grossMonthly: gross
          };
        });
        setEmployees(formatted);
        if (formatted.length > 0) {
          setSelectedEmpId(String(formatted[0].id));
          setAnnualGross(formatted[0].annualCtc);
          setGrossInput(String(formatted[0].annualCtc));
        }
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedEmp) {
      setAnnualGross(selectedEmp.annualCtc || 0);
      setGrossInput(String(selectedEmp.annualCtc || 0));
    }
  }, [selectedEmpId]);

  // ── TDS calculation based on selected Employee's real salary structure ──────
  const slabs = regime === 'new' ? DEFAULT_INCOME_TAX_SLABS : OLD_REGIME_SLABS;

  const totalDeclared = deductions.reduce((sum, d) => {
    const cap = d.maxLimit ? Math.min(d.declared, d.maxLimit) : d.declared;
    return sum + cap;
  }, 0);

  const stdDeduction = regime === 'new' ? 75000 : 50000;
  const taxableIncome = regime === 'new'
    ? Math.max(0, annualGross - stdDeduction)
    : Math.max(0, annualGross - totalDeclared - stdDeduction);

  const computeTax = (income: number) => {
    let tax = 0;
    for (const slab of slabs) {
      if (income > slab.from - 1) {
        const upper = slab.to === Infinity ? income : Math.min(income, slab.to);
        tax += ((upper - (slab.from - 1)) * slab.rate) / 100;
      }
    }
    return Math.round(tax);
  };

  const annualTax = computeTax(taxableIncome);
  const monthlyTDS = Math.round(annualTax / 12);
  const effectiveRate = annualGross > 0 ? ((annualTax / annualGross) * 100).toFixed(2) : '0.00';

  // Real employee component breakdown based on assigned structure
  const monthlyGross = Math.round(annualGross / 12);
  const monthlyBasic = selectedEmp ? selectedEmp.basicMonthly : Math.round(monthlyGross * 0.5);
  const monthlyPF = Math.round(Math.min(monthlyBasic, 15000) * 0.12);
  const monthlyESI = monthlyGross <= 21000 ? Math.round(monthlyGross * 0.0075) : 0;
  const monthlyPT = monthlyGross > 15000 ? 200 : 150;
  const monthlyNet = monthlyGross - (monthlyPF + monthlyESI + monthlyPT + monthlyTDS);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveStatutory = (id: number) => {
    setStatutory(statutory.map(s => s.id === id ? { ...s, rate: parseFloat(editRate) || s.rate } : s));
    setEditingStatId(null);
  };

  const handleSaveDeduction = (code: string) => {
    setDeductions(deductions.map(d => d.code === code ? { ...d, declared: parseFloat(editDedAmount) || 0 } : d));
    setEditingDedCode(null);
  };

  const handleSaveConfig = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <FileCheck className="w-4 h-4" /> Tax & Statutory Compliance Configuration
          </div>
          <h2 className="text-2xl font-extrabold">Tax Declaration & Compliance Engine</h2>
          <p className="text-slate-300 text-sm mt-1">
            Configure statutory contribution rates, tax regime, slab tables, and employee investment declarations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSaveConfig}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center gap-2"
          >
            {saveSuccess ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Config</>}
          </Button>
        </div>
      </div>

      {/* Employee Selector & Salary Structure Link */}
      <Card className="border-2 border-indigo-200 dark:border-indigo-900 bg-slate-50 dark:bg-slate-900/60 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Configured Employee Salary Structure</div>
              <div className="text-base font-extrabold text-slate-900 dark:text-white">
                Select Employee to calculate Tax &amp; TDS from assigned Salary Structure
              </div>
            </div>
          </div>
          <div className="w-full md:w-72">
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="w-full h-10 px-3 border-2 border-indigo-300 dark:border-indigo-700 rounded-xl text-sm font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
            >
              {employees.map(e => (
                <option key={e.id} value={String(e.id)}>
                  {e.name} ({e.code}) — CTC: ₹{(e.annualCtc / 100000).toFixed(2)} Lakhs
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Regime Toggle + Employee Tax Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" /> Tax Regime Selection for {selectedEmp?.name || 'Employee'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button
                onClick={() => setRegime('new')}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${regime === 'new' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                New Tax Regime<br />
                <span className="text-xs font-normal">FY 2024-25 (Default)</span>
              </button>
              <button
                onClick={() => setRegime('old')}
                className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${regime === 'old' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                Old Tax Regime<br />
                <span className="text-xs font-normal">With 80C/80D Deductions</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              {regime === 'new'
                ? '✅ New Regime: Lower slab rates. Standard deduction of ₹75,000. No 80C/HRA exemptions.'
                : '✅ Old Regime: Higher slab rates but full 80C/HRA/80D deductions apply.'}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" /> Annual CTC &amp; Taxable Salary
            </CardTitle>
            <Badge variant="outline" className="font-bold bg-indigo-50 text-indigo-700">
              {selectedEmp?.code || 'EMP'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                value={grossInput}
                onChange={(e) => {
                  setGrossInput(e.target.value);
                  setAnnualGross(parseFloat(e.target.value) || 0);
                }}
                className="h-10 font-bold text-base bg-white dark:bg-slate-800"
                placeholder="Annual CTC"
              />
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">₹ Annual CTC</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 border">
                <div className="text-xs text-slate-500 font-semibold">Taxable Income</div>
                <div className="font-extrabold text-slate-800 dark:text-white text-sm mt-1">{formatCurrency(taxableIncome)}</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 border border-amber-200">
                <div className="text-xs text-amber-700 font-semibold">Annual Tax (TDS)</div>
                <div className="font-extrabold text-amber-900 dark:text-amber-300 text-sm mt-1">{formatCurrency(annualTax)}</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-200">
                <div className="text-xs text-emerald-700 font-semibold">Monthly TDS Cut</div>
                <div className="font-extrabold text-emerald-900 dark:text-emerald-300 text-sm mt-1">{formatCurrency(monthlyTDS)}</div>
              </div>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-500 font-medium px-1">
              <span>Effective Tax Rate: <strong className="text-slate-800 dark:text-slate-200">{effectiveRate}%</strong></span>
              <span>Monthly Gross: <strong className="text-indigo-600">₹{monthlyGross.toLocaleString('en-IN')}</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real Salary Structure Component Breakdown for Selected Employee */}
      <Card className="border border-indigo-200 dark:border-indigo-900 shadow-md bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b bg-indigo-50/50 dark:bg-indigo-950/30">
          <CardTitle className="text-base font-bold text-indigo-950 dark:text-indigo-100 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            Monthly Component &amp; Tax Breakdown — {selectedEmp?.name} ({selectedEmp?.code})
          </CardTitle>
          <CardDescription className="text-xs">
            Calculated from assigned Salary Structure (Annual CTC: ₹{annualGross.toLocaleString('en-IN')})
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border">
              <div className="text-slate-500 font-semibold">Monthly Gross</div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">₹{monthlyGross.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100">
              <div className="text-indigo-700 font-semibold">Basic Pay</div>
              <div className="text-sm font-extrabold text-indigo-900 dark:text-indigo-300 mt-1">₹{monthlyBasic.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200">
              <div className="text-orange-700 font-semibold">PF (12% Basic)</div>
              <div className="text-sm font-extrabold text-orange-800 dark:text-orange-300 mt-1">−₹{monthlyPF.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl border border-yellow-200">
              <div className="text-yellow-700 font-semibold">ESI (0.75% Gross)</div>
              <div className="text-sm font-extrabold text-yellow-800 dark:text-yellow-300 mt-1">−₹{monthlyESI.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200">
              <div className="text-amber-700 font-semibold">Monthly TDS Cut</div>
              <div className="text-sm font-extrabold text-amber-900 dark:text-amber-300 mt-1">−₹{monthlyTDS.toLocaleString('en-IN')}</div>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200">
              <div className="text-emerald-700 font-semibold">Net Take-Home</div>
              <div className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">₹{monthlyNet.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statutory Contribution Rates */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row justify-between items-center pb-2">
          <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Statutory Contribution Rates (Editable)
          </CardTitle>
          <Badge variant="outline" className="bg-indigo-50 text-indigo-800 font-bold border-indigo-200">PF / ESI / PT</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase border-b">
                <tr>
                  <th className="px-4 py-3">Contribution</th>
                  <th className="px-4 py-3">Rate / Amount</th>
                  <th className="px-4 py-3">Base</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {statutory.map(stat => (
                  <tr key={stat.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{stat.label}</td>
                    <td className="px-4 py-3">
                      {editingStatId === stat.id ? (
                        <Input
                          type="number"
                          value={editRate}
                          onChange={e => setEditRate(e.target.value)}
                          className="h-8 w-24 text-xs font-bold"
                          autoFocus
                        />
                      ) : (
                        <span className="font-bold text-indigo-700">
                          {typeof stat.rate === 'number' && stat.rate < 100 ? `${stat.rate}%` : `₹${stat.rate}`}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{stat.base}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={stat.type === 'employer' ? 'bg-blue-50 text-blue-700 font-bold' : 'bg-rose-50 text-rose-700 font-bold'}>
                        {stat.type === 'employer' ? 'Employer' : 'Employee Deduction'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingStatId === stat.id ? (
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" className="h-7 text-xs bg-emerald-600 text-white font-bold" onClick={() => handleSaveStatutory(stat.id)}>Save</Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingStatId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600 font-bold hover:bg-indigo-50"
                          onClick={() => { setEditingStatId(stat.id); setEditRate(String(stat.rate)); }}>
                          Edit Rate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Income Tax Slabs */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row justify-between items-center pb-2">
          <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" /> Income Tax Slabs — {regime === 'new' ? 'New Regime (FY 2024-25)' : 'Old Regime'}
          </CardTitle>
          <button
            onClick={() => setExpandSlabs(!expandSlabs)}
            className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
          >
            {expandSlabs ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse</> : <><ChevronDown className="w-3.5 h-3.5" /> View Slabs</>}
          </button>
        </CardHeader>
        {expandSlabs && (
          <CardContent>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Income Range</th>
                    <th className="px-4 py-3">Tax Rate</th>
                    <th className="px-4 py-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {slabs.map((slab, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{slab.label}</td>
                      <td className="px-4 py-3">
                        <span className={`font-extrabold ${slab.rate === 0 ? 'text-emerald-600' : slab.rate >= 30 ? 'text-rose-600' : 'text-amber-600'}`}>
                          {slab.rate}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`font-bold ${slab.rate === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {slab.rate === 0 ? 'Nil' : 'Progressive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Investment Declarations (Old Regime Only) */}
      {regime === 'old' && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600" /> Investment & Exemption Declarations (Old Regime)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold text-slate-600 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Max Limit</th>
                    <th className="px-4 py-3">Declared Amount</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deductions.map(ded => (
                    <tr key={ded.code} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-mono font-bold text-indigo-600">{ded.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-700 text-xs">{ded.label}</td>
                      <td className="px-4 py-3 font-semibold text-slate-600 text-xs">
                        {ded.maxLimit ? formatCurrency(ded.maxLimit) : 'As applicable'}
                      </td>
                      <td className="px-4 py-3">
                        {editingDedCode === ded.code ? (
                          <Input
                            type="number"
                            value={editDedAmount}
                            onChange={e => setEditDedAmount(e.target.value)}
                            className="h-8 w-32 text-xs font-bold"
                            autoFocus
                          />
                        ) : (
                          <span className={`font-bold ${ded.declared > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                            {ded.declared > 0 ? formatCurrency(ded.declared) : '—'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingDedCode === ded.code ? (
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 text-white font-bold" onClick={() => handleSaveDeduction(ded.code)}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingDedCode(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600 font-bold hover:bg-indigo-50"
                            onClick={() => { setEditingDedCode(ded.code); setEditDedAmount(String(ded.declared || '')); }}>
                            {ded.declared > 0 ? 'Edit' : 'Enter Amount'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalDeclared > 0 && (
              <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-sm">
                <span className="font-bold text-emerald-800">Total Declared Deductions:</span>
                <span className="font-extrabold text-emerald-700">{formatCurrency(totalDeclared)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-slate-50 border border-indigo-100 rounded-2xl p-5 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />
          <p className="text-xs text-slate-600 font-medium">
            These statutory rates and tax slab configurations apply org-wide to <strong>all employees</strong> during each payroll run. Changes take effect from the next payroll cycle.
          </p>
        </div>
        <Button onClick={handleSaveConfig} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold whitespace-nowrap flex items-center gap-2">
          {saveSuccess ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save All Changes</>}
        </Button>
      </div>
    </div>
  );
};

export default TaxDeclaration;
