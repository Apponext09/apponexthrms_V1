import React, { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Sliders,
  Plus,
  Building,
  CheckCircle,
  Clock,
  Send,
  DollarSign,
  Calculator,
  UserCheck,
  Edit,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Percent,
  Layers,
  Save,
  User,
  Trash2,
  AlertCircle,
  X
} from 'lucide-react';
import { TaxDeclaration } from './TaxDeclaration';
import { apiClient } from '@/config/api';

interface SalaryStructureItem {
  id: number;
  empId?: number;
  empName?: string;
  empCode?: string;
  assignedEmpName?: string;
  assignedEmpCode?: string;
  gradeCode?: string;

  structureName: string;
  annualCtc: number;
  basicMonthly: number;
  hraMonthly: number;
  specialAllowanceMonthly: number;
  grossMonthly: number;
  pfDeduction: number;
  esiDeduction: number;
  tdsDeduction: number;
  netTakeHome: number;
  status: string;
}

export const SalaryStructureManagement: React.FC = () => {
  const { user } = useAuthStore();
  const isDemoAdmin = user?.email === 'kot@gmail.com';

  // ── Scope localStorage key per org so structures never bleed across orgs ──
  const orgKey = `salary_structures_${user?.organizationId || user?.id || user?.email || 'unknown'}`;

  const [activeTab, setActiveTab] = useState<'present' | 'assign' | 'mapping' | 'tax'>('present');

  const [assignedEmployees, setAssignedEmployees] = useState<any[]>([]);

  const DEMO_STRUCTURES: SalaryStructureItem[] = [];

  const [structuresList, setStructuresList] = useState<SalaryStructureItem[]>([]);

  const [customTemplates, setCustomTemplates] = useState<string[]>([]);

  // Dynamically derive available templates from saved structures + custom templates for this organization
  const availableTemplates = Array.from(
    new Set([
      ...structuresList.map(s => s.structureName),
      ...customTemplates
    ].filter(Boolean))
  );

  const [selectedTemplate, setSelectedTemplate] = useState<string>(isDemoAdmin ? 'Senior Software Engineer CTC Grade-A' : '');
  const [newTemplateInput, setNewTemplateInput] = useState<string>('');
  const [showNewTemplateCard, setShowNewTemplateCard] = useState<boolean>(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [structureName, setStructureName] = useState('');
  const [structureCode, setStructureCode] = useState<string>('');
  const [inputCtc, setInputCtc] = useState<string>('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);


  // ── Editable component rates ───────────────────────────────────────────────
  const [basicPct, setBasicPct] = useState<string>('50');          // % of Gross
  const [hraPct, setHraPct] = useState<string>('40');              // % of Basic
  const [specialPct, setSpecialPct] = useState<string>('20');      // % of Basic
  const [conveyanceFlat, setConveyanceFlat] = useState<string>('1600');
  const [medicalFlat, setMedicalFlat] = useState<string>('1250');
  // Deductions
  const [pfPct, setPfPct] = useState<string>('12');                // % of Basic (max ₹15,000 basic)
  const [pfCapped, setPfCapped] = useState<boolean>(true);         // cap at ₹15,000 basic
  const [esiPct, setEsiPct] = useState<string>('0.75');            // % of Gross (applicable ≤ 21000)
  const [esiApplicable, setEsiApplicable] = useState<boolean>(true);
  const [healthInsuranceFlat, setHealthInsuranceFlat] = useState<string>('500');
  const [professionalTaxFlat, setProfessionalTaxFlat] = useState<string>('200');
  const [tdsPct, setTdsPct] = useState<string>('5');               // % of Gross (estimated)
  const [tdsApplicable, setTdsApplicable] = useState<boolean>(true);

  const [selectedFormDept, setSelectedFormDept] = useState<string>('all');
  const [dbEmployees, setDbEmployees] = useState<any[]>([]);

  const [dbDepartments, setDbDepartments] = useState<string[]>([]);

  // ── One-time migration of old legacy key into org-scoped key on mount ──
  React.useEffect(() => {
    try {
      const oldSaved = localStorage.getItem('salary_structures');
      if (oldSaved) {
        const oldParsed = JSON.parse(oldSaved);
        if (Array.isArray(oldParsed) && oldParsed.length > 0) {
          const currentOrgSaved = localStorage.getItem(orgKey);
          const currentOrgParsed = currentOrgSaved ? JSON.parse(currentOrgSaved) : [];
          
          const merged = [...currentOrgParsed];
          for (const item of oldParsed) {
            if (!merged.some((m: any) => m.structureName === item.structureName)) {
              merged.push(item);
            }
          }
          localStorage.setItem(orgKey, JSON.stringify(merged));
          setStructuresList(merged);
        }
        localStorage.removeItem('salary_structures');
      }
    } catch {}
  }, [orgKey]);

  React.useEffect(() => {
    // Purge local browser storage to guarantee UI strictly reflects clean database state
    try {
      localStorage.removeItem(orgKey);
      localStorage.removeItem(`${orgKey}_custom_templates`);
      localStorage.removeItem(`${orgKey}_assigned_employees`);
    } catch {}

    // 1. Fetch live employees
    apiClient.get('/employees', { params: { pageSize: 500 } }).then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((e: any) => ({
          id: e.id,
          name: `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.name || e.email || `Employee #${e.id}`,
          code: e.employee_code || e.employeeCode || `EMP-${e.id}`,
          department: e.department_name || e.department?.name || (typeof e.department === 'string' ? e.department : '') || 'General'
        }));
        setDbEmployees(formatted);
      }
    }).catch(() => {});

    // 2. Fetch live departments
    apiClient.get('/settings/departments').then((res: any) => {
      const depts = res.data?.data || res.data || [];
      if (Array.isArray(depts) && depts.length > 0) {
        const names = depts.map((d: any) => d.name || d.department_name).filter(Boolean);
        setDbDepartments(names);
      }
    }).catch(() => {});

    // 3. Fetch live salary structures from database table
    apiClient.get('/payroll/structures').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted: SalaryStructureItem[] = list.map((s: any) => ({
          id: s.id,
          empId: s.employee_id || s.employeeId,
          empName: s.employee_name || s.employeeName,
          empCode: s.employee_code || s.employeeCode,
          assignedEmpName: s.assigned_first_name ? `${s.assigned_first_name} ${s.assigned_last_name || ''}`.trim() : (s.employee_name || s.employeeName),
          assignedEmpCode: s.assigned_employee_code || s.employee_code || s.employeeCode,
          gradeCode: s.grade_code || s.structure_code || `GRADE-${(s.structure_name || s.structureName || 'STD').slice(0, 3).toUpperCase()}`,
          structureName: s.structure_name || s.structureName || 'Structure',
          annualCtc: Number(s.annual_ctc ?? s.annualCtc ?? 0),
          basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
          grossMonthly: Number(s.gross_monthly ?? s.grossMonthly ?? 0),
          pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
          esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
          tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
          netTakeHome: Number(s.net_take_home ?? s.netTakeHome ?? 0),
          status: s.status || 'active'
        }));
        setStructuresList(formatted);
      } else {
        setStructuresList([]);
      }
    }).catch(() => {
      setStructuresList([]);
    });

    // 4. Fetch live assigned employee mappings from employee_salary_structures table
    apiClient.get('/payroll/structures/mappings').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((m: any) => ({
          id: m.empId || m.emp_id || m.id,
          code: m.employee_code || m.employeeCode || `EMP-${m.empId || m.id}`,
          name: `${m.first_name || m.firstName || ''} ${m.last_name || m.lastName || ''}`.trim() || m.name || 'Employee',
          structure: m.structureName || m.structure_name || 'Standard Structure',
          gross: (m.grossMonthly || m.gross_monthly) ? `₹${Number(m.grossMonthly || m.gross_monthly).toLocaleString('en-IN')}/mo` : '₹0/mo'
        }));
        setAssignedEmployees(formatted);
        try {
          localStorage.setItem(`${orgKey}_assigned_employees`, JSON.stringify(formatted));
        } catch {}
      }
    }).catch(() => {});
  }, []);




  const uniqueDepartments = Array.from(
    new Set([
      ...dbDepartments,
      ...dbEmployees.map((e: any) => e.department).filter(Boolean)
    ])
  ).sort();

  const employees = dbEmployees;

  // ── Live calculation using editable rates ─────────────────────────────────
  const annualCtcVal = parseFloat(inputCtc) || 0;
  const grossMonthly = Math.round(annualCtcVal / 12);
  const basicMonthly = Math.round(grossMonthly * ((parseFloat(basicPct) || 50) / 100));
  const hraMonthly = Math.round(basicMonthly * ((parseFloat(hraPct) || 40) / 100));
  const specialAllowanceMonthly = Math.round(basicMonthly * ((parseFloat(specialPct) || 20) / 100));
  const conveyance = parseInt(conveyanceFlat) || 0;
  const medical = parseInt(medicalFlat) || 0;
  const effectiveGross = basicMonthly + hraMonthly + specialAllowanceMonthly + conveyance + medical;

  // Deductions
  const pfBase = pfCapped ? Math.min(basicMonthly, 15000) : basicMonthly;
  const pfDeduction = Math.round(pfBase * ((parseFloat(pfPct) || 12) / 100));
  const esiDeduction = (esiApplicable && effectiveGross <= 21000) ? Math.round(effectiveGross * ((parseFloat(esiPct) || 0.75) / 100)) : 0;
  const healthIns = parseInt(healthInsuranceFlat) || 0;
  const profTax = parseInt(professionalTaxFlat) || 0;
  const tdsDeduction = tdsApplicable ? Math.round(effectiveGross * ((parseFloat(tdsPct) || 5) / 100)) : 0;
  const totalDeductions = pfDeduction + esiDeduction + healthIns + profTax + tdsDeduction;
  const netTakeHome = Math.max(0, effectiveGross - totalDeductions);

  const handleSaveStructure = async () => {
    const selectedEmp = employees.find(e => e.id === parseInt(selectedEmpId)) || employees[0] || { id: 1, name: 'Employee', code: 'EMP001' };

    let nextList: SalaryStructureItem[];
    if (editingId) {
      nextList = structuresList.map(item => item.id === editingId ? {
        ...item,
        empId: selectedEmp.id,
        empName: selectedEmp.name,
        empCode: selectedEmp.code,
        structureName,
        annualCtc: annualCtcVal,
        basicMonthly,
        hraMonthly,
        specialAllowanceMonthly,
        grossMonthly: effectiveGross,
        pfDeduction,
        esiDeduction,
        tdsDeduction,
        netTakeHome
      } : item);
      setSuccessMsg(`Salary structure updated successfully!`);
    } else {
      const newItem: SalaryStructureItem = {
        id: Date.now(),
        gradeCode: `GRADE-${structureName.slice(0, 3).toUpperCase()}`,
        structureName,
        annualCtc: annualCtcVal,
        basicMonthly,
        hraMonthly,
        specialAllowanceMonthly,
        grossMonthly: effectiveGross,
        pfDeduction,
        esiDeduction,
        tdsDeduction,
        netTakeHome,
        status: 'active'
      };
      nextList = [newItem, ...structuresList];
      setSuccessMsg(`New salary structure template "${structureName}" saved successfully!`);
    }

    setStructuresList(nextList);
    try {
      localStorage.setItem(orgKey, JSON.stringify(nextList));
    } catch {}

    // setStructuresList(nextList) automatically updates availableTemplates

    try {
      const payload = {
        employeeId: selectedEmp.id,
        structureName,
        structureCode,
        gradeCode: structureCode,
        baseSalary: basicMonthly,
        grossSalary: effectiveGross,
        netSalary: netTakeHome,
        annualCtc: annualCtcVal,
        hraMonthly,
        specialAllowanceMonthly,
        pfDeduction,
        esiDeduction,
        tdsDeduction
      };


      const isRealDbId = typeof editingId === 'number' && editingId > 0 && editingId < 1000000000;
      if (editingId && isRealDbId) {
        await apiClient.put(`/payroll/structures/${editingId}`, payload);
      } else {
        await apiClient.post('/payroll/structures', payload);
      }
    } catch (e) {}


    // Live re-fetch from database API after save/update
    apiClient.get('/payroll/structures').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted: SalaryStructureItem[] = list.map((s: any) => ({
          id: s.id,
          empId: s.employee_id || s.employeeId,
          empName: s.employee_name || s.employeeName,
          empCode: s.employee_code || s.employeeCode,
          gradeCode: s.grade_code || s.structure_code || `GRADE-${(s.structure_name || s.structureName || 'STD').slice(0, 3).toUpperCase()}`,
          structureName: s.structure_name || s.structureName || 'Structure',
          annualCtc: Number(s.annual_ctc ?? s.annualCtc ?? 0),
          basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
          grossMonthly: Number(s.gross_monthly ?? s.grossMonthly ?? 0),
          pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
          esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
          tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
          netTakeHome: Number(s.net_take_home ?? s.netTakeHome ?? 0),
          status: s.status || 'active'
        }));
        setStructuresList(formatted);
      }
    }).catch(() => {});

    setShowForm(false);
    setEditingId(null);
    setActiveTab('present');
    setTimeout(() => setSuccessMsg(null), 4000);
  };


  const handleAddNewTemplate = async () => {
    const tplName = newTemplateInput.trim();
    if (!tplName) return;
    
    if (!customTemplates.includes(tplName)) {
      const nextCustom = [tplName, ...customTemplates];
      setCustomTemplates(nextCustom);
      try {
        localStorage.setItem(`${orgKey}_custom_templates`, JSON.stringify(nextCustom));
      } catch {}
    }

    // Persist template into database table salary_structures immediately
    try {
      await apiClient.post('/payroll/structures', {
        structureName: tplName,
        annualCtc: annualCtcVal || 0,
        baseSalary: basicMonthly || 0,
        grossSalary: effectiveGross || 0,
        netSalary: netTakeHome || 0
      });
    } catch (e) {}

    setStructureName(tplName);
    setSelectedTemplate(tplName);
    setAssignTemplateName(tplName);
    setNewTemplateInput('');
    setShowNewTemplateCard(false);
    setActiveTab('present');
    setSuccessMsg(`New salary structure template "${tplName}" created and saved to database!`);

    // Live re-fetch from database API after new template creation
    apiClient.get('/payroll/structures').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted: SalaryStructureItem[] = list.map((s: any) => ({
          id: s.id,
          empId: s.employee_id || s.employeeId,
          empName: s.employee_name || s.employeeName,
          empCode: s.employee_code || s.employeeCode,
          gradeCode: s.grade_code || s.structure_code || `GRADE-${(s.structure_name || s.structureName || 'STD').slice(0, 3).toUpperCase()}`,
          structureName: s.structure_name || s.structureName || 'Structure',
          annualCtc: Number(s.annual_ctc ?? s.annualCtc ?? 0),
          basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
          grossMonthly: Number(s.gross_monthly ?? s.grossMonthly ?? 0),
          pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
          esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
          tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
          netTakeHome: Number(s.net_take_home ?? s.netTakeHome ?? 0),
          status: s.status || 'active'
        }));
        setStructuresList(formatted);
      }
    }).catch(() => {});

    setTimeout(() => setSuccessMsg(null), 4000);
  };


  const [assignEmpId, setAssignEmpId] = useState<string>('');
  const [assignTemplateName, setAssignTemplateName] = useState<string>('');
  const [assignFormDept, setAssignFormDept] = useState<string>('all');

  React.useEffect(() => {
    if (availableTemplates.length > 0 && (!assignTemplateName || !availableTemplates.includes(assignTemplateName))) {
      setAssignTemplateName(availableTemplates[0]);
    }
  }, [availableTemplates]);

  const handleAssignToEmployee = async () => {
    const emp = employees.find(e => String(e.id) === assignEmpId);
    if (!emp) {
      alert('Please select an employee to assign the salary structure.');
      return;
    }

    const targetTemplate = structuresList.find(s => s.structureName === assignTemplateName);
    const grossVal = targetTemplate?.grossMonthly || (targetTemplate?.annualCtc ? Math.round(targetTemplate.annualCtc / 12) : (grossMonthly > 0 ? grossMonthly : 0));
    const basicVal = targetTemplate?.basicMonthly || (grossVal ? Math.round(grossVal * 0.50) : 0);
    const ctcVal = targetTemplate?.annualCtc || (grossVal * 12);
    const netVal = targetTemplate?.netTakeHome || (grossVal ? Math.round(grossVal * 0.90) : 0);
    const grossDisplayStr = grossVal > 0 ? `₹${Number(grossVal).toLocaleString('en-IN')}/mo` : '₹0/mo';

    try {
      await apiClient.post('/payroll/structures/assign', {
        employeeId: emp.id,
        structureName: assignTemplateName,
        grossSalary: grossVal,
        grossMonthly: grossVal,
        baseSalary: basicVal,
        annualCtc: ctcVal,
        netSalary: netVal
      });
    } catch (e) {}

    // Optimistically update assignedEmployees state immediately with exact template gross
    const updatedAssignments = [
      {
        id: emp.id,
        code: emp.code,
        name: emp.name,
        structure: assignTemplateName,
        gross: grossDisplayStr
      },
      ...assignedEmployees.filter(p => String(p.id) !== String(emp.id))
    ];
    setAssignedEmployees(updatedAssignments);
    setActiveTab('mapping');
    try {
      localStorage.setItem(`${orgKey}_assigned_employees`, JSON.stringify(updatedAssignments));
    } catch {}

    apiClient.get('/payroll/structures/mappings').then((res: any) => {
      const list = res.data?.data || res.data || [];
      if (Array.isArray(list) && list.length > 0) {
        const formatted = list.map((m: any) => {
          const matchedItem = structuresList.find(s => s.structureName === (m.structureName || m.structure_name));
          const mGross = m.grossMonthly || m.gross_monthly || matchedItem?.grossMonthly || grossVal;
          return {
            id: m.empId || m.emp_id || m.id,
            code: m.employee_code || m.employeeCode || `EMP-${m.empId || m.id}`,
            name: `${m.first_name || m.firstName || ''} ${m.last_name || m.lastName || ''}`.trim() || m.name || 'Employee',
            structure: m.structureName || m.structure_name || assignTemplateName,
            gross: mGross > 0 ? `₹${Number(mGross).toLocaleString('en-IN')}/mo` : grossDisplayStr
          };
        });
        setAssignedEmployees(formatted);
        try {
          localStorage.setItem(`${orgKey}_assigned_employees`, JSON.stringify(formatted));
        } catch {}
      }
    }).catch(() => {});

    setSuccessMsg(`Salary Structure "${assignTemplateName}" (${grossDisplayStr}) successfully assigned to ${emp.name} (${emp.code}) in database!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };


  const handleEdit = (item: SalaryStructureItem) => {
    setEditingId(item.id);
    if (item.empId) setSelectedEmpId(String(item.empId));
    setStructureName(item.structureName);
    setStructureCode(item.gradeCode || (item as any).structureCode || (item as any).structure_code || '');
    setSelectedTemplate(item.structureName);
    setInputCtc(String(item.annualCtc));
    setShowForm(true);
    setActiveTab('present');
  };


  const handleQuickTaxEdit = (item: SalaryStructureItem) => {
    handleEdit(item);
    setActiveTab('present');
  };

  const handleDeleteStructure = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this salary structure template?')) {
      try {
        await apiClient.delete(`/payroll/structures/${id}`);
      } catch (e) {}

      setStructuresList(prev => prev.filter(item => item.id !== id));
      setSuccessMsg('Salary structure deleted successfully from database.');

      apiClient.get('/payroll/structures').then((res: any) => {
        const list = res.data?.data || res.data || [];
        const formatted: SalaryStructureItem[] = list.map((s: any) => ({
          id: s.id,
          empId: s.employee_id || s.employeeId,
          empName: s.employee_name || s.employeeName,
          empCode: s.employee_code || s.employeeCode,
          gradeCode: s.grade_code || s.structure_code || `GRADE-${(s.structure_name || s.structureName || 'STD').slice(0, 3).toUpperCase()}`,
          structureName: s.structure_name || s.structureName || 'Structure',
          annualCtc: Number(s.annual_ctc ?? s.annualCtc ?? 0),
          basicMonthly: Number(s.basic_monthly ?? s.basicMonthly ?? 0),
          hraMonthly: Number(s.hra_monthly ?? s.hraMonthly ?? 0),
          specialAllowanceMonthly: Number(s.special_allowance_monthly ?? s.specialAllowanceMonthly ?? 0),
          grossMonthly: Number(s.gross_monthly ?? s.grossMonthly ?? 0),
          pfDeduction: Number(s.pf_deduction ?? s.pfDeduction ?? 0),
          esiDeduction: Number(s.esi_deduction ?? s.esiDeduction ?? 0),
          tdsDeduction: Number(s.tds_deduction ?? s.tdsDeduction ?? 0),
          netTakeHome: Number(s.net_take_home ?? s.netTakeHome ?? 0),
          status: s.status || 'active'
        }));
        setStructuresList(formatted);
      }).catch(() => {});

      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };


  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Calculator className="w-4 h-4" /> Component Engine
          </div>
          <h2 className="text-2xl font-extrabold">Salary Structure & CTC Configurator</h2>
          <p className="text-slate-300 text-sm mt-1">
            Define formula-based earnings, statutory PF/ESI deductions, and assign CTC structures to employees.
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setStructureName('');
            setInputCtc('');
            setActiveTab('present');
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-md shrink-0 font-bold"
        >
          <Plus className="w-4 h-4" />
          Create New Structure Template
        </Button>
      </div>

      {/* 3 Sub-Tabs Navigation Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2 overflow-x-auto bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border">
        <button
          onClick={() => setActiveTab('present')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'present'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Building className="w-4 h-4" /> 1. Present Salary Structures
        </button>
        <button
          onClick={() => setActiveTab('assign')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'assign'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4 text-amber-300" /> 2. Assign Structure to Employee
        </button>
        <button
          onClick={() => setActiveTab('mapping')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'mapping'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" /> 3. Employee Structure Mapping
        </button>
      </div>

      {successMsg ? (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 animate-fade-in font-medium text-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      ) : null}




      {/* TAB 2: Assign Salary Structure to Employee Only */}
      {activeTab === 'assign' && (


        <Card className="border border-indigo-200 dark:border-indigo-900 shadow-xl bg-white dark:bg-slate-900">
          <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-950 dark:text-slate-100">
              <UserCheck className="w-5 h-5 text-indigo-600" /> Assign Salary Structure to Employee
            </CardTitle>
            <CardDescription>Select department, select employee, and choose an active salary structure template from dropdown to assign instantly.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. Department Filter */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5 text-indigo-600" /> Filter Department
                </label>
                <select
                  value={assignFormDept}
                  onChange={(e) => {
                    setAssignFormDept(e.target.value);
                    setAssignEmpId('');
                  }}
                  className="w-full h-10 px-3 border rounded-lg text-sm bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="all">All Departments</option>
                  {uniqueDepartments.map((dept, idx) => (
                    <option key={idx} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Employee Selection */}
              <div>
                <label className="block text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-600" /> Select Employee *
                </label>
                <select
                  value={assignEmpId}
                  onChange={(e) => setAssignEmpId(e.target.value)}
                  className="w-full h-10 px-3 border-2 border-indigo-500 rounded-lg text-sm bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="">— Select Employee —</option>
                  {employees
                    .filter(e => assignFormDept === 'all' || (e.department && e.department.toLowerCase().includes(assignFormDept.toLowerCase())))
                    .map(e => (
                      <option key={e.id} value={String(e.id)}>
                        {e.name} ({e.code}) — {e.department || 'General'}
                      </option>
                    ))}
                </select>
              </div>

              {/* 3. Structure Template Dropdown */}
              <div>
                <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Select Salary Structure Template *
                </label>
                <select
                  value={assignTemplateName}
                  onChange={(e) => setAssignTemplateName(e.target.value)}
                  className="w-full h-10 px-3 border-2 border-indigo-400 rounded-lg text-sm bg-white dark:bg-slate-800 font-bold text-indigo-900 dark:text-indigo-200 cursor-pointer shadow-xs"
                >
                  {availableTemplates.length === 0 ? (
                    <option value="">— No Salary Structures Created Yet —</option>
                  ) : (
                    availableTemplates.map((tpl, i) => (
                      <option key={i} value={tpl}>
                        {tpl}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button onClick={handleAssignToEmployee} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 h-10 flex items-center gap-2 shadow-md">
                <UserCheck className="w-4 h-4" /> Assign Salary Structure to Employee
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {/* TAB 3: Employee Salary Structure Mapping */}
      {activeTab === 'mapping' && (


        <Card className="shadow border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" /> Employee Salary Structure Mapping
              </CardTitle>
              <CardDescription className="text-xs">Active assigned CTC templates for organization database employees.</CardDescription>
            </div>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-800 font-bold border-indigo-200">
              {assignedEmployees.length} Employees Mapped
            </Badge>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-600 uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Emp Code</th>
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3">Assigned CTC Structure</th>
                    <th className="px-4 py-3">Monthly Gross Pay</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assignedEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-slate-600">{emp.code}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{emp.name}</td>
                      <td className="px-4 py-3 font-semibold text-indigo-600 dark:text-indigo-400">{emp.structure}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{emp.gross}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-800 font-bold">Assigned</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}


      {/* TAB 1: Present Salary Structures List & Builder Form */}
      {activeTab === 'present' && (
        <div className="space-y-4">
          {showForm && (
            <Card className="border border-indigo-200 dark:border-indigo-900 shadow-xl bg-slate-50/50 dark:bg-slate-900 mb-6">

          <CardHeader className="border-b bg-white dark:bg-slate-800 py-3 px-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-indigo-950 dark:text-slate-100">
                <Sliders className="w-4 h-4 text-indigo-600" />
                {editingId ? 'Edit Salary Structure Template' : 'Create & Build New Salary Structure Template'}
              </CardTitle>
              <CardDescription className="text-xs">Enter template name, annual CTC, and component percentages to calculate real-time earnings and deductions.</CardDescription>
            </div>
            <button
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition font-bold"
              title="Close Form"
            >
              <X className="w-5 h-5" />
            </button>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

              {/* Structure Template Name Text Input */}
              <div>
                <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" /> Structure Template Name *
                </label>
                <Input
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  placeholder="e.g. Senior Software Engineer Grade-A"
                  className="h-9 text-xs font-bold bg-white dark:bg-slate-800 border-indigo-300 text-indigo-950 dark:text-indigo-100"
                />
              </div>

              {/* Structure Code / Grade Code Input */}
              <div>
                <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" /> Salary Structure Code / Grade Code
                </label>
                <Input
                  value={structureCode}
                  onChange={(e) => setStructureCode(e.target.value)}
                  placeholder="e.g. STR-ENG-01 or GRADE-A"
                  className="h-9 text-xs font-bold bg-white dark:bg-slate-800 border-indigo-300 text-indigo-950 dark:text-indigo-100"
                />
              </div>

              {/* 4. Annual CTC */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Annual Cost to Company (CTC INR) *
                </label>
                <Input
                  type="number"
                  value={inputCtc}
                  onChange={(e) => setInputCtc(e.target.value)}
                  placeholder="e.g. 900000"
                  className="h-9 text-xs font-bold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400"
                />
              </div>
            </div>


            {/* ── Section 2: Earnings Configuration ──────────────────────── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 border-b pb-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Earnings Configuration
                <span className="ml-auto text-[11px] font-normal text-slate-500">All percentages apply to the calculated base</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                {/* Basic % */}
                <div className="bg-indigo-50/80 dark:bg-slate-800/60 rounded-lg border border-indigo-100 dark:border-slate-700 p-2.5 space-y-1">
                  <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-300">Basic Salary</label>
                  <div className="flex items-center gap-1">
                    <Input type="number" value={basicPct} onChange={e => setBasicPct(e.target.value)}
                      className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-14" min="1" max="100" />
                    <span className="text-[10px] font-bold text-slate-500">% of Monthly CTC</span>
                  </div>
                  <div className="text-sm font-extrabold text-indigo-700 dark:text-indigo-300">₹{basicMonthly.toLocaleString('en-IN')}</div>
                </div>

                {/* HRA % */}
                <div className="bg-blue-50/80 dark:bg-slate-800/60 rounded-lg border border-blue-100 dark:border-slate-700 p-2.5 space-y-1">
                  <label className="block text-[11px] font-bold text-blue-700 dark:text-blue-300">HRA</label>
                  <div className="flex items-center gap-1">
                    <Input type="number" value={hraPct} onChange={e => setHraPct(e.target.value)}
                      className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-14" min="0" max="100" />
                    <span className="text-[10px] font-bold text-slate-500">% of Basic</span>
                  </div>
                  <div className="text-sm font-extrabold text-blue-700 dark:text-blue-300">₹{hraMonthly.toLocaleString('en-IN')}</div>
                </div>

                {/* Special Allowance % */}
                <div className="bg-purple-50/80 dark:bg-slate-800/60 rounded-lg border border-purple-100 dark:border-slate-700 p-2.5 space-y-1">
                  <label className="block text-[11px] font-bold text-purple-700 dark:text-purple-300">Special Allow.</label>
                  <div className="flex items-center gap-1">
                    <Input type="number" value={specialPct} onChange={e => setSpecialPct(e.target.value)}
                      className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-14" min="0" max="100" />
                    <span className="text-[10px] font-bold text-slate-500">% of Basic</span>
                  </div>
                  <div className="text-sm font-extrabold text-purple-700 dark:text-purple-300">₹{specialAllowanceMonthly.toLocaleString('en-IN')}</div>
                </div>

                {/* Conveyance flat */}
                <div className="bg-amber-50/80 dark:bg-slate-800/60 rounded-lg border border-amber-100 dark:border-slate-700 p-2.5 space-y-1">
                  <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-300">Conveyance</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-500">₹</span>
                    <Input type="number" value={conveyanceFlat} onChange={e => setConveyanceFlat(e.target.value)}
                      className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900" min="0" />
                  </div>
                  <div className="text-xs font-bold text-amber-700 dark:text-amber-300">Fixed / month</div>
                </div>

                {/* Medical flat */}
                <div className="bg-rose-50/80 dark:bg-slate-800/60 rounded-lg border border-rose-100 dark:border-slate-700 p-2.5 space-y-1">
                  <label className="block text-[11px] font-bold text-rose-700 dark:text-rose-300">Medical Allow.</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-500">₹</span>
                    <Input type="number" value={medicalFlat} onChange={e => setMedicalFlat(e.target.value)}
                      className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900" min="0" />
                  </div>
                  <div className="text-xs font-bold text-rose-700 dark:text-rose-300">Fixed / month</div>
                </div>
              </div>

              {/* Earnings live summary bar */}
              <div className="flex flex-wrap items-center gap-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-lg px-3.5 py-2 text-xs font-bold">
                <span className="text-slate-500 font-normal text-[11px]">Live Total →</span>
                <span className="text-indigo-700">Basic: ₹{basicMonthly.toLocaleString('en-IN')}</span>
                <span className="text-slate-400">+</span>
                <span className="text-blue-700">HRA: ₹{hraMonthly.toLocaleString('en-IN')}</span>
                <span className="text-slate-400">+</span>
                <span className="text-purple-700">SA: ₹{specialAllowanceMonthly.toLocaleString('en-IN')}</span>
                <span className="text-slate-400">+</span>
                <span className="text-amber-700">Conv: ₹{conveyance.toLocaleString('en-IN')}</span>
                <span className="text-slate-400">+</span>
                <span className="text-rose-700">Med: ₹{medical.toLocaleString('en-IN')}</span>
                <span className="ml-auto text-emerald-700 text-sm font-extrabold">= Gross ₹{effectiveGross.toLocaleString('en-IN')}/mo</span>
              </div>
            </div>

            {/* ── Section 3: Tax & Compliance Configuration ───────────────── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 border-b pb-1.5">
                <Percent className="w-3.5 h-3.5 text-rose-600" />
                Configure Tax &amp; Compliance Deductions
                <span className="ml-auto text-[11px] font-normal text-slate-500">Toggle ON/OFF per employee. All values are editable.</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">

                {/* PF */}
                <div className={`rounded-lg border p-2.5 space-y-1 transition ${pfCapped ? 'bg-orange-50/80 dark:bg-orange-950/20 border-orange-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-orange-800 dark:text-orange-300">PF (Provident Fund)</label>
                    <button onClick={() => setPfCapped(!pfCapped)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${pfCapped ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {pfCapped ? 'Capped ₹15K' : 'Uncapped'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input type="number" value={pfPct} onChange={e => setPfPct(e.target.value)}
                      className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-12" min="0" max="100" step="0.1" />
                    <span className="text-[10px] text-slate-500">% of Basic</span>
                  </div>
                  <div className="text-sm font-extrabold text-orange-700 dark:text-orange-300">
                    −₹{pfDeduction.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">Base: ₹{Math.min(basicMonthly, pfCapped ? 15000 : basicMonthly).toLocaleString('en-IN')}</div>
                </div>

                {/* ESI */}
                <div className={`rounded-lg border p-2.5 space-y-1 transition ${esiApplicable ? 'bg-yellow-50/80 dark:bg-yellow-950/20 border-yellow-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-yellow-800 dark:text-yellow-300">ESI</label>
                    <button onClick={() => setEsiApplicable(!esiApplicable)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${esiApplicable ? 'bg-yellow-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {esiApplicable ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input type="number" value={esiPct} onChange={e => setEsiPct(e.target.value)}
                      className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-12" min="0" max="100" step="0.01" disabled={!esiApplicable} />
                    <span className="text-[10px] text-slate-500">% Gross</span>
                  </div>
                  <div className="text-sm font-extrabold text-yellow-700 dark:text-yellow-300">
                    −₹{esiDeduction.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">{effectiveGross > 21000 ? '⚠ Gross > ₹21K — exempt' : 'Applicable'}</div>
                </div>

                {/* Health Insurance */}
                <div className="bg-pink-50/80 dark:bg-pink-950/20 rounded-lg border border-pink-200 p-2.5 space-y-1">
                  <label className="block text-[11px] font-bold text-pink-800 dark:text-pink-300">Health Insurance</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">₹</span>
                    <Input type="number" value={healthInsuranceFlat} onChange={e => setHealthInsuranceFlat(e.target.value)}
                      className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900" min="0" />
                  </div>
                  <div className="text-sm font-extrabold text-pink-700 dark:text-pink-300">
                    −₹{healthIns.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">Fixed premium / mo</div>
                </div>

                {/* Professional Tax */}
                <div className="bg-violet-50/80 dark:bg-violet-950/20 rounded-lg border border-violet-200 p-2.5 space-y-1">
                  <label className="block text-[11px] font-bold text-violet-800 dark:text-violet-300">Professional Tax</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500">₹</span>
                    <Input type="number" value={professionalTaxFlat} onChange={e => setProfessionalTaxFlat(e.target.value)}
                      className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900" min="0" max="2500" />
                  </div>
                  <div className="text-sm font-extrabold text-violet-700 dark:text-violet-300">
                    −₹{profTax.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">State slab / mo</div>
                </div>

                {/* TDS */}
                <div className={`rounded-lg border p-2.5 space-y-1 transition ${tdsApplicable ? 'bg-red-50/80 dark:bg-red-950/20 border-red-200' : 'bg-slate-50 dark:bg-slate-800 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-red-800 dark:text-red-300">TDS / Income Tax</label>
                    <button onClick={() => setTdsApplicable(!tdsApplicable)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tdsApplicable ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {tdsApplicable ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Input type="number" value={tdsPct} onChange={e => setTdsPct(e.target.value)}
                      className="h-7 text-xs font-bold text-center bg-white dark:bg-slate-900 w-12" min="0" max="100" step="0.5" disabled={!tdsApplicable} />
                    <span className="text-[10px] text-slate-500">% Gross</span>
                  </div>
                  <div className="text-sm font-extrabold text-red-700 dark:text-red-300">
                    −₹{tdsDeduction.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-400">Estimated monthly TDS</div>
                </div>
              </div>
            </div>


              {/* Net take-home summary */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-900 dark:bg-slate-950 rounded-lg px-4 py-2.5 text-white">
                <div className="flex-1 min-w-[140px]">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Gross Monthly</div>
                  <div className="text-base font-extrabold text-white">₹{effectiveGross.toLocaleString('en-IN')}</div>
                </div>
                <div className="text-slate-600 text-xl font-thin">−</div>
                <div className="flex-1 min-w-[160px]">
                  <div className="text-[10px] text-rose-400 font-semibold uppercase tracking-wide">Total Deductions</div>
                  <div className="text-base font-extrabold text-rose-400">₹{totalDeductions.toLocaleString('en-IN')}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    PF ₹{pfDeduction} + ESI ₹{esiDeduction} + HI ₹{healthIns} + PT ₹{profTax} + TDS ₹{tdsDeduction}
                  </div>
                </div>
                <div className="text-slate-600 text-xl font-thin">=</div>
                <div className="flex-1 min-w-[140px]">
                  <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wide">Net Take-Home</div>
                  <div className="text-lg font-extrabold text-emerald-400">₹{netTakeHome.toLocaleString('en-IN')}</div>
                </div>
              </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8 text-xs font-bold">Cancel</Button>
              <Button onClick={handleSaveStructure} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md h-8 text-xs font-bold">
                <Save className="w-3.5 h-3.5" /> {editingId ? 'Update Structure' : 'Save & Assign Structure'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


          {showNewTemplateCard && (
            <Card className="border-2 border-indigo-500 shadow-xl bg-indigo-50/60 dark:bg-slate-900 p-4 rounded-2xl animate-fade-in">
              <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 space-y-1.5 w-full">
                  <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Create New Salary Structure Template (Added to Dropdown List)
                  </label>
                  <Input
                    placeholder="e.g. Senior Software Engineer Grade-A (₹9.00 LPA)"
                    value={newTemplateInput}
                    onChange={(e) => setNewTemplateInput(e.target.value)}
                    className="h-10 text-sm font-bold bg-white dark:bg-slate-800 border-indigo-300"
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={handleAddNewTemplate} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-4 shadow-md">
                    <Plus className="w-4 h-4 mr-1" /> Save &amp; Add to Dropdown
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowNewTemplateCard(false)} className="text-slate-600 h-10">
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}




        <Card className="shadow border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b pb-4">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" /> Present Salary Structures &amp; CTC Allocations
              </CardTitle>
              <CardDescription>Manage active CTC allocations and monthly component breakdowns for real employees.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-600 uppercase border-b">
                  <tr>
                    <th className="px-6 py-3">Structure Template Name</th>
                    <th className="px-6 py-3">Pay Grade Code</th>
                    <th className="px-6 py-3">Assigned Employee</th>
                    <th className="px-6 py-3">Annual CTC</th>
                    <th className="px-6 py-3">Gross Monthly</th>
                    <th className="px-6 py-3">Net Take-Home</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {structuresList.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4 font-extrabold text-slate-900 dark:text-white">
                          {item.structureName}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                          <Badge variant="outline" className="font-bold bg-indigo-50 text-indigo-700 border-indigo-200 uppercase">
                            {item.gradeCode || 'GRADE-STD'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold">
                          {item.assignedEmpName ? (
                            <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200 font-bold">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>{item.assignedEmpName}</span>
                              {item.assignedEmpCode ? <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">{item.assignedEmpCode}</span> : null}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal italic">Unassigned</span>
                          )}
                        </td>

                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                          ₹{(item.annualCtc / 100000).toFixed(2)} Lakhs / yr
                        </td>
                        <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">
                          ₹{item.grossMonthly.toLocaleString('en-IN')}/mo
                        </td>
                        <td className="px-6 py-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                          ₹{item.netTakeHome.toLocaleString('en-IN')}/mo
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            Active Template
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                            className="text-xs text-indigo-600 hover:bg-indigo-50 font-bold"
                          >
                            {expandedId === item.id ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
                            {expandedId === item.id ? 'Hide' : 'Breakdown'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                            className="text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" /> Edit Structure
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickTaxEdit(item)}
                            className="text-xs font-bold border-violet-200 text-violet-700 hover:bg-violet-50"
                          >
                            <Percent className="w-3.5 h-3.5 mr-1" /> Tax Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteStructure(item.id)}
                            className="text-xs font-bold text-rose-600 hover:bg-rose-50"
                            title="Delete Structure"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>

                      {/* Expandable Component & Tax Breakdown Drawer */}
                      {expandedId === item.id && (
                        <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-y">
                          <td colSpan={8} className="p-4">
                            <div className="space-y-3">
                              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-indigo-600">
                                  <Calculator className="w-4 h-4" /> Component &amp; Statutory Tax Breakdown: {item.structureName}
                                </span>
                                <span className="text-slate-500 font-bold font-mono">Grade: {item.gradeCode || 'GRADE-STD'}</span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border">
                                  <span className="text-slate-400 font-semibold block text-[10px]">Basic Pay (50%)</span>
                                  <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">₹{item.basicMonthly.toLocaleString('en-IN')}</div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border">
                                  <span className="text-slate-400 font-semibold block text-[10px]">HRA (40%)</span>
                                  <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">₹{item.hraMonthly.toLocaleString('en-IN')}</div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border">
                                  <span className="text-slate-400 font-semibold block text-[10px]">Special Allowance</span>
                                  <div className="font-extrabold text-slate-900 dark:text-white mt-0.5">₹{item.specialAllowanceMonthly.toLocaleString('en-IN')}</div>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900">
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold block text-[10px]">Provident Fund (PF 12%)</span>
                                  <div className="font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">−₹{item.pfDeduction.toLocaleString('en-IN')}</div>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900">
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold block text-[10px]">ESI Contribution</span>
                                  <div className="font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                                    {item.esiDeduction > 0 ? `−₹${item.esiDeduction.toLocaleString('en-IN')}` : 'Exempt (Above 21K)'}
                                  </div>
                                </div>
                                <div className="bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900">
                                  <span className="text-rose-600 dark:text-rose-400 font-semibold block text-[10px]">Estimated TDS Tax</span>
                                  <div className="font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">−₹{item.tdsDeduction.toLocaleString('en-IN')}</div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    )}
    </div>
  );
};

export default SalaryStructureManagement;





