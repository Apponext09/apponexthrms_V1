import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Users,
  Layers,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Check,
  FileText,
  History,
  Search,
  Calendar,
  IndianRupee,
  Filter,
  Mail,
  UserCheck,
  Building2,
  Tag,
  ChevronRight,
  X,
  FileCheck,
  Hash,
  Sliders,
  Plus,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';

interface ParsedRow {
  employeeId?: number;
  employeeCode: string;
  email: string;
  slabInput: string;
  annualCtc: number;
  effectiveFrom: string;
  matchedEmpName?: string;
  matchedSlabName?: string;
  matchedSlabId?: string;
  status: 'valid' | 'invalid';
  error?: string;
}

interface UploadLog {
  id: number;
  fileName: string;
  slabName: string;
  totalRows: number;
  uploadedAt: string;
  uploadedBy: string;
  status: string;
}

export function MassSalaryStructureUploadPage() {
  const [slabs, setSlabs] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Mass Assign UI State
  const [selectedSlabId, setSelectedSlabId] = useState<string>('');
  const [defaultCtc, setDefaultCtc] = useState<string>('600000');
  const [defaultEffectiveFrom, setDefaultEffectiveFrom] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [selectedAssignmentStatus, setSelectedAssignmentStatus] = useState<string>('ALL');
  const [selectedEmpIds, setSelectedEmpIds] = useState<number[]>([]);
  const [customCtcMap, setCustomCtcMap] = useState<Record<number, string>>({});
  const [customSlabMap, setCustomSlabMap] = useState<Record<number, string>>({});
  const [customEffectiveDateMap, setCustomEffectiveDateMap] = useState<Record<number, string>>({});

  // Upload State
  const [downloadBasis, setDownloadBasis] = useState<'empCode' | 'email'>('empCode');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch Master Slabs, Cycles & Employees
  useEffect(() => {
    fetchMasterData();
    fetchUploadLogs();
  }, []);

  const fetchUploadLogs = async () => {
    try {
      const res = await apiClient.get('/payroll/structures/mass-upload-log');
      const rows: any[] = res.data?.data || [];
      setUploadLogs(
        rows.map((r) => ({
          id: r.id,
          fileName: r.fileName || r.file_name,
          slabName: r.slabName || r.slab_name || '—',
          totalRows: Number(r.totalRows ?? r.total_rows ?? 0),
          uploadedAt: r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '',
          uploadedBy: r.uploadedByName || r.uploaded_by_name || 'HR Admin',
          status:
            Number(r.failCount ?? r.fail_count ?? 0) > 0
              ? `Completed (${r.failCount ?? r.fail_count} failed)`
              : 'Completed'
        }))
      );
    } catch (e) {
      console.error('Failed to load upload logs:', e);
    }
  };

  const fetchMasterData = async () => {
    setLoading(true);
    let slabsFailed = false;
    let empsFailed = false;
    try {
      const [slabsRes, cyclesRes, empsRes, deptsRes, gradesRes, locsRes, mappingsRes] = await Promise.all([
        apiClient.get('/payroll/slabs').catch(() => {
          slabsFailed = true;
          return { data: [] };
        }),
        apiClient.get('/payroll/cycles').catch(() => ({ data: [] })),
        apiClient.get('/employees?pageSize=1000').catch(() => {
          empsFailed = true;
          return { data: [] };
        }),
        apiClient.get('/settings/departments').catch(() => ({ data: [] })),
        apiClient.get('/settings/grades').catch(() => apiClient.get('/settings/pay-grades')).catch(() => ({ data: [] })),
        apiClient.get('/settings/locations').catch(() => ({ data: [] })),
        apiClient.get('/payroll/structures/mappings').catch(() => ({ data: [] })),
      ]);

      const slabList = slabsRes.data?.data || slabsRes.data || [];
      const cycleList = cyclesRes.data?.data || cyclesRes.data || [];
      const empList = empsRes.data?.data || empsRes.data?.items || empsRes.data || [];
      const deptList = deptsRes.data?.data || deptsRes.data || [];
      const gradeList = gradesRes.data?.data || gradesRes.data || [];
      const locList = locsRes.data?.data || locsRes.data || [];
      const mappingsList = mappingsRes.data?.data || mappingsRes.data || [];

      const validSlabs = Array.isArray(slabList) ? slabList : [];
      const validCycles = Array.isArray(cycleList) ? cycleList : [];

      setCycles(validCycles);
      setSlabs(validSlabs);
      setDepartments(Array.isArray(deptList) ? deptList : []);
      setGrades(Array.isArray(gradeList) ? gradeList : []);
      setLocations(Array.isArray(locList) ? locList : []);

      if (validSlabs.length > 0 && !selectedSlabId) {
        setSelectedSlabId(String(validSlabs[0].id));
        const minCtc = validSlabs[0].min_ctc || validSlabs[0].minCtc;
        if (minCtc) setDefaultCtc(String(minCtc));
      }

      // Map salary structure details to each employee by ID, Employee Code, and Email
      const structMapById = new Map<number, any>();
      const structMapByCode = new Map<string, any>();
      const structMapByEmail = new Map<string, any>();

      if (Array.isArray(mappingsList)) {
        mappingsList.forEach((m: any) => {
          const empId = Number(m.empId ?? m.employee_id ?? m.id);
          const code = String(m.employeeCode || m.employee_code || '').trim().toLowerCase();
          const email = String(m.email || '').trim().toLowerCase();

          if (empId) structMapById.set(empId, m);
          if (code) structMapByCode.set(code, m);
          if (email) structMapByEmail.set(email, m);
        });
      }

      const mergedEmployees = (Array.isArray(empList) ? empList : []).map((emp: any) => {
        const empId = Number(emp.id);
        const empCode = String(emp.employeeCode || emp.employee_code || emp.code || '').trim().toLowerCase();
        const empEmail = String(emp.email || '').trim().toLowerCase();

        const m = structMapById.get(empId) || (empCode ? structMapByCode.get(empCode) : null) || (empEmail ? structMapByEmail.get(empEmail) : null);

        const matchedSlabName = m?.slabName || m?.slab_name || m?.structureName || m?.structure_name || emp.slab_name || null;
        const matchedSlabId = m?.slabId || m?.slab_id || emp.slab_id || null;
        const matchedCtc = m?.annualCtc ?? m?.annual_ctc ?? emp.annual_ctc ?? (m?.grossMonthly ? Number(m.grossMonthly) * 12 : null);
        const matchedEff = m?.effectiveFrom || m?.effective_from || emp.effective_from || null;

        return {
          ...emp,
          slab_name: matchedSlabName,
          slab_id: matchedSlabId ? String(matchedSlabId) : null,
          annual_ctc: matchedCtc ? Number(matchedCtc) : null,
          effective_from: matchedEff
        };
      });

      setEmployees(mergedEmployees);

      if (slabsFailed || empsFailed) {
        toast.error(
          `Failed to load ${[slabsFailed && 'salary slabs', empsFailed && 'employees']
            .filter(Boolean)
            .join(' and ')} — retry before uploading.`
        );
      }
    } catch (e) {
      console.error('Failed to load master data:', e);
      toast.error('Failed to load master data — retry before uploading.');
    } finally {
      setLoading(false);
    }
  };

  // ── FILTERING EMPLOYEES FOR GRID ──
  const filteredEmployees = employees.filter((emp: any) => {
    const name = `${emp.firstName || emp.first_name || emp.name || ''} ${emp.lastName || emp.last_name || ''}`.toLowerCase();
    const code = String(emp.employeeCode || emp.employee_code || emp.code || '').toLowerCase();
    const dept = (emp.department || emp.department_name || emp.dept_name || '').toLowerCase();
    const grade = (emp.grade || emp.grade_name || emp.designation || '').toLowerCase();
    const loc = (emp.location || emp.location_name || emp.branch || '').toLowerCase();
    const hasSlab = !!(emp.salary_slab_id || emp.salarySlabId || emp.slab_name || emp.slab || emp.slab_id);

    const matchesSearch =
      name.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase());
    const matchesDept = selectedDept === 'ALL' || dept.includes(selectedDept.toLowerCase());
    const matchesGrade = selectedGrade === 'ALL' || grade.includes(selectedGrade.toLowerCase());
    const matchesLoc = selectedLocation === 'ALL' || loc.includes(selectedLocation.toLowerCase());
    const matchesStatus =
      selectedAssignmentStatus === 'ALL' ||
      (selectedAssignmentStatus === 'UNASSIGNED' && !hasSlab) ||
      (selectedAssignmentStatus === 'ASSIGNED' && hasSlab);

    return matchesSearch && matchesDept && matchesGrade && matchesLoc && matchesStatus;
  });

  const isAllSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e: any) => selectedEmpIds.includes(Number(e.id)));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      const filteredIds = new Set(filteredEmployees.map((e: any) => Number(e.id)));
      setSelectedEmpIds(selectedEmpIds.filter((id) => !filteredIds.has(id)));
    } else {
      const allFilteredIds = filteredEmployees.map((e: any) => Number(e.id));
      setSelectedEmpIds([...new Set([...selectedEmpIds, ...allFilteredIds])]);
    }
  };

  const handleToggleSelectEmp = (id: number) => {
    if (selectedEmpIds.includes(id)) {
      setSelectedEmpIds(selectedEmpIds.filter((i) => i !== id));
    } else {
      setSelectedEmpIds([...selectedEmpIds, id]);
    }
  };

  // ── INTERACTIVE BULK ASSIGN HANDLER ──
  const handleBulkAssign = async () => {
    if (selectedEmpIds.length === 0) {
      toast.error('Please select at least one employee from the list to assign.');
      return;
    }
    if (!selectedSlabId) {
      toast.error('Please select a Target Salary Slab to assign.');
      return;
    }

    setIsSubmitting(true);
    try {
      const assignments = selectedEmpIds.map((empId) => {
        const emp = employees.find((e: any) => Number(e.id) === empId);
        const slabToAssign = customSlabMap[empId] || emp?.slab_id || selectedSlabId;
        const ctcToAssign = customCtcMap[empId] || (emp?.annual_ctc ? String(emp.annual_ctc) : defaultCtc) || '600000';
        const effDate = customEffectiveDateMap[empId] || (emp?.effective_from ? String(emp.effective_from).slice(0, 10) : defaultEffectiveFrom);

        return {
          employeeId: empId,
          employeeCode: emp?.employeeCode || emp?.employee_code || emp?.code,
          email: emp?.email,
          slabId: slabToAssign,
          annualCtc: Number(ctcToAssign),
          effectiveFrom: effDate,
        };
      });

      const res: any = await apiClient.post('/payroll/slabs/bulk-assign', { assignments });
      const summary = res.data?.summary || {};
      toast.success(
        `Successfully assigned salary slab to ${summary.successCount || selectedEmpIds.length} employees with dynamic formula recalculations!`
      );
      setSelectedEmpIds([]);
      fetchMasterData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not assign slabs');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSingleAssign = async (emp: any) => {
    const empId = Number(emp.id);
    const slabToAssign = customSlabMap[empId] || emp.slab_id || selectedSlabId;
    const ctcToAssign = customCtcMap[empId] || (emp.annual_ctc ? String(emp.annual_ctc) : defaultCtc) || '600000';
    const effDate = customEffectiveDateMap[empId] || (emp.effective_from ? String(emp.effective_from).slice(0, 10) : defaultEffectiveFrom);

    if (!slabToAssign) {
      toast.error('Please choose a salary slab for this employee.');
      return;
    }

    try {
      await apiClient.post('/payroll/slabs/bulk-assign', {
        assignments: [
          {
            employeeId: empId,
            employeeCode: emp.employeeCode || emp.employee_code || emp.code,
            email: emp.email,
            slabId: slabToAssign,
            annualCtc: Number(ctcToAssign),
            effectiveFrom: effDate,
          },
        ],
      });
      toast.success(`Updated salary structure for ${emp.firstName || emp.first_name || 'employee'}!`);
      fetchMasterData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update employee salary slab.');
    }
  };

  // ── CSV FILE PARSING & DRAG-AND-DROP ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processUploadedFile(file);
  };

  const processUploadedFile = (file: File) => {
    if (!file.name.match(/\.(csv|txt|xlsx)$/i)) {
      toast.error('Please upload a valid CSV or spreadsheet file (.csv, .xlsx).');
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) parseCsvContent(text);
    };
    reader.readAsText(file);
  };

  const parseCsvContent = (csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length <= 1) {
      toast.error('The uploaded CSV is empty or only contains headers.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));
    const codeIdx = headers.findIndex((h) => h.includes('code') || h.includes('emp'));
    const emailIdx = headers.findIndex((h) => h.includes('email') || h.includes('mail'));
    const slabIdx = headers.findIndex((h) => h.includes('slab') || h.includes('structure') || h.includes('grade'));
    const ctcIdx = headers.findIndex((h) => h.includes('ctc') || h.includes('annual') || h.includes('salary'));
    const effIdx = headers.findIndex((h) => h.includes('effect') || h.includes('date') || h.includes('from'));

    const parsed: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim().replace(/['"]/g, ''));
      if (cols.length < 2) continue;

      const codeVal = codeIdx !== -1 ? cols[codeIdx] : cols[0] || '';
      const emailVal = emailIdx !== -1 ? cols[emailIdx] : '';
      const slabInput = slabIdx !== -1 ? cols[slabIdx] : cols[1] || '';
      const ctcVal = ctcIdx !== -1 ? parseFloat(cols[ctcIdx].replace(/[^0-9.]/g, '')) : parseFloat(cols[2] || '0');
      const effVal = effIdx !== -1 ? cols[effIdx] : new Date().toISOString().slice(0, 10);

      // Match employee
      const matchedEmp = employees.find(
        (e: any) =>
          (codeVal && String(e.employeeCode || e.employee_code || e.code).toLowerCase() === codeVal.toLowerCase()) ||
          (emailVal && String(e.email).toLowerCase() === emailVal.toLowerCase())
      );

      // Match Slab
      const matchedSlab = slabs.find(
        (s: any) =>
          String(s.id) === slabInput ||
          String(s.name || s.slab_name).toLowerCase().includes(slabInput.toLowerCase())
      ) || slabs.find((s: any) => String(s.id) === String(selectedSlabId)) || slabs[0];

      const isValid = !!matchedEmp && !!matchedSlab && !isNaN(ctcVal) && ctcVal > 0;

      parsed.push({
        employeeId: matchedEmp?.id ? Number(matchedEmp.id) : undefined,
        employeeCode: codeVal || matchedEmp?.employeeCode || matchedEmp?.employee_code || '—',
        email: emailVal || matchedEmp?.email || '—',
        slabInput,
        annualCtc: !isNaN(ctcVal) && ctcVal > 0 ? ctcVal : Number(defaultCtc || 600000),
        effectiveFrom: effVal || defaultEffectiveFrom,
        matchedEmpName: matchedEmp ? `${matchedEmp.firstName || matchedEmp.first_name || ''} ${matchedEmp.lastName || matchedEmp.last_name || ''}`.trim() : undefined,
        matchedSlabName: matchedSlab?.name || matchedSlab?.slab_name || 'Standard Slab',
        matchedSlabId: matchedSlab?.id ? String(matchedSlab.id) : selectedSlabId,
        status: isValid ? 'valid' : 'invalid',
        error: !matchedEmp ? 'Employee not found' : !matchedSlab ? 'Slab not recognized' : isNaN(ctcVal) ? 'Invalid CTC' : undefined
      });
    }

    setParsedRows(parsed);
    const validCount = parsed.filter((r) => r.status === 'valid').length;
    toast.info(`Parsed ${parsed.length} rows (${validCount} valid). Review below to apply.`);
  };

  const handleApplyCsv = async () => {
    const validRows = parsedRows.filter((r) => r.status === 'valid');
    if (validRows.length === 0) {
      toast.error('No valid rows found to apply.');
      return;
    }

    setIsSubmitting(true);
    try {
      const assignments = validRows.map((r) => ({
        employeeId: r.employeeId,
        employeeCode: r.employeeCode !== '—' ? r.employeeCode : undefined,
        email: r.email !== '—' ? r.email : undefined,
        slabId: r.matchedSlabId,
        annualCtc: r.annualCtc,
        effectiveFrom: r.effectiveFrom,
      }));

      const res: any = await apiClient.post('/payroll/slabs/bulk-assign', { assignments });
      const summary = res.data?.summary || {};
      toast.success(
        `Applied salary structures for ${summary.successCount || validRows.length} employees from CSV!`
      );
      setParsedRows([]);
      setSelectedFile(null);
      setFileName('');
      fetchMasterData();
      fetchUploadLogs();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to apply spreadsheet assignments.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── CSV TEMPLATE DOWNLOAD ──
  const handleDownloadTemplate = (type: 'empty' | 'empCode' | 'email') => {
    let csvHeader = 'Employee Code,Target Slab Name,Annual CTC,Effective From Date\n';
    let csvRows = '';

    if (type === 'empty') {
      const slabName = slabs[0]?.name || slabs[0]?.slab_name || 'Monthly';
      csvRows = `${employees[0]?.employeeCode || employees[0]?.employee_code || 'EMP001'},"${slabName}",600000,${new Date().toISOString().slice(0, 10)}\n`;
    } else if (type === 'empCode') {
      csvRows = employees
        .map((e: any) => {
          const code = e.employeeCode || e.employee_code || e.code || `EMP-${e.id}`;
          const slabName = e.slab_name || slabs[0]?.name || slabs[0]?.slab_name || 'Monthly';
          const ctc = e.annual_ctc || 600000;
          const effDate = e.effective_from ? String(e.effective_from).slice(0, 10) : new Date().toISOString().slice(0, 10);
          return `${code},"${slabName}",${ctc},${effDate}`;
        })
        .join('\n');
    } else {
      csvHeader = 'Employee Email,Target Slab Name,Annual CTC,Effective From Date\n';
      csvRows = employees
        .map((e: any) => {
          const mail = e.email || `employee${e.id}@apponext.com`;
          const slabName = e.slab_name || slabs[0]?.name || slabs[0]?.slab_name || 'Monthly';
          const ctc = e.annual_ctc || 600000;
          const effDate = e.effective_from ? String(e.effective_from).slice(0, 10) : new Date().toISOString().slice(0, 10);
          return `${mail},"${slabName}",${ctc},${effDate}`;
        })
        .join('\n');
    }

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', type === 'empty' ? 'Salary_Structure_Empty_Template.csv' : `Salary_Structure_Staff_Template_${type}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${type === 'empty' ? 'Empty CSV Template' : `Staff Template by ${type === 'empCode' ? 'Employee Code' : 'Email'}`}`);
  };

  const selectedSlabObj = slabs.find((s) => String(s.id) === String(selectedSlabId));
  const numericDefaultCtc = Number(defaultCtc || 0);
  const estimatedMonthlyGross = Math.round(numericDefaultCtc / 12);
  const estimatedBasic = Math.round(estimatedMonthlyGross * 0.5);
  const estimatedHra = Math.round(estimatedBasic * 0.4);
  const estimatedPf = Math.min(1800, Math.round(estimatedBasic * 0.12));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* ── TOP HEADER BANNER ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Mass Salary Structure &amp; Bulk Assignment
              </h1>
              <Badge className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-extrabold">
                Live Dynamic Sync
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assign Salary Slabs, Annual CTC, and Effective Dates across employees via live roster selection or instant spreadsheet upload.
            </p>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2.5">
          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold h-9 px-3 rounded-xl shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Download Template
            </Button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2 z-30 min-w-[240px]">
              <button
                onClick={() => handleDownloadTemplate('empty')}
                className="w-full text-left px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Empty Template (CSV)</span>
              </button>
              <button
                onClick={() => handleDownloadTemplate('empCode')}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                <span>Active Staff (by Emp Code)</span>
              </button>
              <button
                onClick={() => handleDownloadTemplate('email')}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg flex items-center gap-2 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Active Staff (by Email)</span>
              </button>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLogsModal(true)}
            className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold h-9 px-3 rounded-xl shadow-2xs"
          >
            <History className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Upload Logs ({uploadLogs.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchMasterData}
            disabled={loading}
            className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold h-9 px-3 rounded-xl shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* ── UNIFIED DUAL FAST-ACTION DECK (SIDE-BY-SIDE IN ONE PAGE) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Quick Spreadsheet CSV Drag & Drop Box */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#5b52f6]" />
                Option 1: Upload Spreadsheet (CSV)
              </h2>
              <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950 text-[#5b52f6] border-indigo-200 text-[10px] font-bold">
                Auto-Parse &amp; Match
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Drag &amp; drop your salary CSV file to automatically map annual CTC and slabs across employees.
            </p>

            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer relative group ${
                isDragging
                  ? 'border-[#5b52f6] bg-indigo-50/60 dark:bg-indigo-950/40 scale-[0.99]'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/30 hover:border-[#5b52f6]'
              }`}
            >
              <input
                type="file"
                accept=".csv, .xlsx, .txt"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-[#5b52f6] flex items-center justify-center mx-auto shadow-2xs group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {fileName ? fileName : 'Drop your salary CSV here or browse'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports .CSV, .XLSX with Employee Code/Email, Slab, CTC
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick File Status / Commit Actions */}
          {selectedFile && parsedRows.length > 0 && (
            <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {parsedRows.filter((r) => r.status === 'valid').length} of {parsedRows.length} Rows Ready
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleApplyCsv}
                  disabled={isSubmitting || parsedRows.filter((r) => r.status === 'valid').length === 0}
                  className="bg-[#5b52f6] hover:bg-indigo-700 text-white text-xs font-extrabold h-8 px-3 rounded-lg"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Apply CSV Now
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileName('');
                    setParsedRows([]);
                  }}
                  className="text-slate-400 hover:text-red-500 h-8 px-2"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Bulk Slab & CTC Assignment Interactive Control Deck */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                Option 2: Bulk Assign Slabs &amp; CTC to Staff
              </h2>
              <span className="text-xs font-extrabold text-teal-700 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-full border border-teal-200 dark:border-teal-800">
                {selectedEmpIds.length} Staff Selected
              </span>
            </div>

            {/* Form Controls: Target Slab, Annual CTC, Effective Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Salary Slab <span className="text-red-500">*</span>
                </Label>
                <select
                  value={selectedSlabId}
                  onChange={(e) => {
                    setSelectedSlabId(e.target.value);
                    const matched = slabs.find((s: any) => String(s.id) === e.target.value);
                    const minCtc = matched?.min_ctc || matched?.minCtc;
                    if (minCtc) setDefaultCtc(String(minCtc));
                  }}
                  className="w-full h-9 text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs"
                >
                  {slabs.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      🏷️ {s.name || s.slab_name} (₹{(Number(s.min_ctc || 0) / 100000).toFixed(1)}L - ₹{(Number(s.max_ctc || 10000000) / 100000).toFixed(1)}L)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Default Annual CTC (₹) <span className="text-red-500">*</span>
                </Label>
                <input
                  type="number"
                  value={defaultCtc}
                  onChange={(e) => setDefaultCtc(e.target.value)}
                  placeholder="e.g. 600000"
                  className="w-full h-9 text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Effective From Date <span className="text-red-500">*</span>
                </Label>
                <input
                  type="date"
                  value={defaultEffectiveFrom}
                  onChange={(e) => setDefaultEffectiveFrom(e.target.value)}
                  className="w-full h-9 text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs"
                />
              </div>
            </div>

            {/* Live Calculation Preview Snapshot Pill */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-3 font-semibold text-slate-600 dark:text-slate-300">
                <span>Monthly Gross: <strong className="text-slate-900 dark:text-white font-extrabold">₹{estimatedMonthlyGross.toLocaleString('en-IN')}</strong></span>
                <span>Basic (50%): <strong className="text-indigo-600 font-extrabold">₹{estimatedBasic.toLocaleString('en-IN')}</strong></span>
                <span>HRA (40%): <strong className="text-indigo-600 font-extrabold">₹{estimatedHra.toLocaleString('en-IN')}</strong></span>
                <span>EPF: <strong className="text-slate-700 font-extrabold">₹{estimatedPf.toLocaleString('en-IN')}</strong></span>
              </div>
              <Badge variant="outline" className="bg-white dark:bg-slate-900 text-[10px] text-teal-700 border-teal-200 font-bold">
                Auto-Residual Balancing Active
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-400">
              Select employees from the roster below and click assign.
            </span>
            <Button
              onClick={handleBulkAssign}
              disabled={isSubmitting || selectedEmpIds.length === 0}
              className="bg-[#059669] hover:bg-[#047857] text-white text-xs font-extrabold h-9 px-5 rounded-xl shadow-xs cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              {isSubmitting ? 'Assigning...' : `Assign Slabs to Selected (${selectedEmpIds.length})`}
            </Button>
          </div>
        </div>
      </div>

      {/* ── PARSED SPREADSHEET TABLE PREVIEW (APPEARS INSTANTLY WHEN CSV IS LOADED) ── */}
      {parsedRows.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 shadow-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5b52f6]" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Spreadsheet Upload Preview ({parsedRows.length} Rows Parsed)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleApplyCsv}
                disabled={isSubmitting || parsedRows.filter((r) => r.status === 'valid').length === 0}
                className="bg-[#5b52f6] hover:bg-indigo-700 text-white text-xs font-extrabold h-8 px-4 rounded-lg"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Apply All {parsedRows.filter((r) => r.status === 'valid').length} Valid Rows
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setParsedRows([])}
                className="text-xs h-8 px-3 rounded-lg text-slate-500"
              >
                Clear Preview
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[300px] overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                <tr>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Employee Code</th>
                  <th className="p-2.5">Matched Employee</th>
                  <th className="p-2.5">Target Slab</th>
                  <th className="p-2.5 text-right">Annual CTC (₹)</th>
                  <th className="p-2.5">Effective Date</th>
                  <th className="p-2.5 text-right">Monthly Gross (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {parsedRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-2.5">
                      {r.status === 'valid' ? (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Valid
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          {r.error || 'Invalid'}
                        </span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono font-bold text-slate-900 dark:text-white">{r.employeeCode}</td>
                    <td className="p-2.5 font-semibold text-slate-800 dark:text-slate-200">{r.matchedEmpName || '—'}</td>
                    <td className="p-2.5 text-indigo-600 font-bold">{r.matchedSlabName}</td>
                    <td className="p-2.5 text-right font-extrabold text-emerald-600">₹{r.annualCtc.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 font-mono text-slate-600">{r.effectiveFrom}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">₹{Math.round(r.annualCtc / 12).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE EMPLOYEE ROSTER & ASSIGNMENT WORKSPACE ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden space-y-0">
        {/* Roster Header & Search/Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 flex-1 min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by name or code..."
              className="text-xs bg-transparent outline-none w-full text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-700 text-xs px-1 font-bold">
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d: any) => (
                <option key={d.id || d.name} value={d.name || d.department_name}>
                  {d.name || d.department_name}
                </option>
              ))}
            </select>

            {/* Grade Filter */}
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Grades</option>
              {grades.map((g: any) => (
                <option key={g.id || g.name} value={g.name || g.grade_name || g.code}>
                  {g.name || g.grade_name || g.code}
                </option>
              ))}
            </select>

            {/* Location Filter */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Locations</option>
              {locations.map((l: any) => (
                <option key={l.id || l.name} value={l.name || l.location_name}>
                  {l.name || l.location_name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedAssignmentStatus}
              onChange={(e) => setSelectedAssignmentStatus(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Staff ({employees.length})</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              <option value="ASSIGNED">Assigned Only</option>
            </select>
          </div>
        </div>

        {/* Employee Roster Table */}
        <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 backdrop-blur z-10">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-[#5b52f6] focus:ring-[#5b52f6] w-4 h-4 cursor-pointer"
                  />
                </th>
                <th className="p-3">Employee</th>
                <th className="p-3">Department &amp; Grade</th>
                <th className="p-3">Current Assigned Slab</th>
                <th className="p-3">Assign Slab</th>
                <th className="p-3">Annual CTC (₹)</th>
                <th className="p-3">Effective From</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No staff found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp: any) => {
                  const empId = Number(emp.id);
                  const isSelected = selectedEmpIds.includes(empId);
                  const activeSlab = customSlabMap[empId] || emp.slab_id || selectedSlabId;
                  const activeCtc = customCtcMap[empId] !== undefined ? customCtcMap[empId] : (emp.annual_ctc ? String(emp.annual_ctc) : defaultCtc);
                  const activeEffDate = customEffectiveDateMap[empId] || (emp.effective_from ? String(emp.effective_from).slice(0, 10) : defaultEffectiveFrom);
                  const hasCurrentSlab = !!(emp.slab_name || emp.slab_id);

                  return (
                    <tr
                      key={empId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectEmp(empId)}
                          className="rounded border-slate-300 text-[#5b52f6] focus:ring-[#5b52f6] w-4 h-4 cursor-pointer"
                        />
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{emp.firstName || emp.first_name || ''} {emp.lastName || emp.last_name || ''}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {emp.employeeCode || emp.employee_code || emp.code || `EMP-${empId}`} • {emp.email || '—'}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {emp.department || emp.department_name || 'General'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {emp.grade || emp.grade_name || emp.designation || 'Staff'}
                        </div>
                      </td>

                      <td className="p-3">
                        {hasCurrentSlab ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-400">
                              {emp.slab_name || 'Assigned Slab'}
                            </span>
                            {emp.annual_ctc && (
                              <span className="text-[11px] text-slate-400">
                                (₹{(emp.annual_ctc / 100000).toFixed(1)}L)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full text-[10px] font-extrabold border border-amber-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <select
                          value={activeSlab}
                          onChange={(e) => setCustomSlabMap({ ...customSlabMap, [empId]: e.target.value })}
                          className="h-8 text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs w-36"
                        >
                          {slabs.map((s: any) => (
                            <option key={s.id} value={s.id}>
                              {s.name || s.slab_name}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="p-3">
                        <input
                          type="number"
                          value={activeCtc}
                          onChange={(e) => setCustomCtcMap({ ...customCtcMap, [empId]: e.target.value })}
                          className="h-8 text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold w-28 text-right shadow-2xs"
                        />
                      </td>

                      <td className="p-3">
                        <input
                          type="date"
                          value={activeEffDate}
                          onChange={(e) => setCustomEffectiveDateMap({ ...customEffectiveDateMap, [empId]: e.target.value })}
                          className="h-8 text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs w-32"
                        />
                      </td>

                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSingleAssign(emp)}
                          className="h-7 px-2.5 text-[11px] font-extrabold border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg shadow-2xs cursor-pointer"
                        >
                          Assign
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── UPLOAD LOGS MODAL DIALOG ── */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Spreadsheet Upload Log History
                </h3>
              </div>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[350px] overflow-y-auto space-y-2">
              {uploadLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No upload logs recorded yet.
                </div>
              ) : (
                uploadLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">{log.fileName}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {log.uploadedAt} • By {log.uploadedBy}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-extrabold">
                        {log.status} ({log.totalRows} Rows)
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="text-right pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLogsModal(false)}
                className="text-xs h-8 px-4 rounded-xl font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MassSalaryStructureUploadPage;
