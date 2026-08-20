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
  DollarSign,
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
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';

interface ParsedRow {
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
  const [activeTab, setActiveTab] = useState<'upload' | 'assign' | 'log'>('upload');
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
  const [uploadSuccess, setUploadSuccess] = useState<any | null>(null);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
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

      // Map salary structure details to each employee
      const structMap = new Map<number, any>();
      if (Array.isArray(mappingsList)) {
        mappingsList.forEach((m: any) => {
          const empId = Number(m.empId || m.employee_id || m.id);
          if (empId) structMap.set(empId, m);
        });
      }

      const mergedEmployees = (Array.isArray(empList) ? empList : []).map((emp: any) => {
        const m = structMap.get(Number(emp.id));
        return {
          ...emp,
          slab_name: m?.slabName || m?.structureName || emp.slab_name || emp.salary_slab_id || null,
          slab_id: m?.slabId || emp.slab_id || null,
          annual_ctc: m?.annualCtc ? Number(m.annualCtc) : (emp.annual_ctc ? Number(emp.annual_ctc) : (m?.grossMonthly ? Number(m.grossMonthly) * 12 : null))
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

  // ── FILTERING EMPLOYEES FOR GRID TAB ──
  const filteredEmployees = employees.filter((emp: any) => {
    const name = `${emp.firstName || emp.first_name || emp.name || ''} ${emp.lastName || emp.last_name || ''}`.toLowerCase();
    const code = String(emp.employeeCode || emp.employee_code || emp.code || '').toLowerCase();
    const dept = (emp.department || emp.department_name || emp.dept_name || '').toLowerCase();
    const grade = (emp.grade || emp.grade_name || emp.designation || '').toLowerCase();
    const loc = (emp.location || emp.location_name || emp.branch || '').toLowerCase();
    const hasSlab = !!(emp.salary_slab_id || emp.salarySlabId || emp.slab_name || emp.slab);

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
        const slabToAssign = customSlabMap[empId] || selectedSlabId;
        const ctcToAssign = customCtcMap[empId] || defaultCtc || '600000';
        const effDate = customEffectiveDateMap[empId] || defaultEffectiveFrom;

        return {
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
        `Successfully assigned salary slab to ${summary.successCount || selectedEmpIds.length} employees!`
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
    const slabToAssign = customSlabMap[emp.id] || selectedSlabId;
    const ctcToAssign = customCtcMap[emp.id] || defaultCtc || '600000';
    const effDate = customEffectiveDateMap[emp.id] || defaultEffectiveFrom;

    if (!slabToAssign) {
      toast.error('Please choose a salary slab for this employee.');
      return;
    }

    try {
      await apiClient.post('/payroll/slabs/bulk-assign', {
        assignments: [
          {
            employeeCode: emp.employeeCode || emp.employee_code || emp.code,
            email: emp.email,
            slabId: slabToAssign,
            annualCtc: Number(ctcToAssign),
            effectiveFrom: effDate,
          },
        ],
      });
      toast.success(`Assigned slab to ${emp.firstName || emp.first_name || emp.name}`);
      fetchMasterData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Could not assign slab');
    }
  };

  // ── DOWNLOAD SAMPLE CSV ──
  const handleDownloadSample = () => {
    if (!selectedSlabId) {
      toast.error('Please select a payroll slab first!');
      return;
    }

    const matchedSlab = slabs.find((s) => String(s.id) === String(selectedSlabId)) || slabs[0];
    const slabName = matchedSlab ? matchedSlab.name || matchedSlab.slab_name : 'Selected Slab';
    const pfRate = matchedSlab ? Number(matchedSlab.pf_rate_pct || 12) : 12;
    const todayStr = new Date().toISOString().slice(0, 10);

    let csvContent =
      downloadBasis === 'empCode'
        ? `Employee Code,Employee Name,Payroll Slab,Offered Annual CTC,Effective Date,Monthly Gross,Basic (50%),HRA (40%),PF (${pfRate}%),PT\n`
        : `Email,Employee Name,Payroll Slab,Offered Annual CTC,Effective Date,Monthly Gross,Basic (50%),HRA (40%),PF (${pfRate}%),PT\n`;

    if (employees.length > 0) {
      employees.forEach((emp: any) => {
        const empCode = emp.employeeCode || emp.employee_code || '';
        const email = emp.email || '';
        const empName =
          `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim() ||
          'Employee';
        const defaultCtcVal = Number(matchedSlab?.min_ctc || emp.annual_ctc || 600000);
        const monthlyGross = Math.round(defaultCtcVal / 12);
        const basic = Math.round(monthlyGross * 0.5);
        const hra = Math.round(basic * 0.4);
        const pf = Math.min(1800, Math.round(basic * (pfRate / 100)));
        const pt = 200;

        if (downloadBasis === 'empCode') {
          csvContent += `"${empCode}","${empName}","${slabName}",${defaultCtcVal},"${todayStr}",${monthlyGross},${basic},${hra},${pf},${pt}\n`;
        } else {
          csvContent += `"${email}","${empName}","${slabName}",${defaultCtcVal},"${todayStr}",${monthlyGross},${basic},${hra},${pf},${pt}\n`;
        }
      });
    } else {
      csvContent +=
        downloadBasis === 'empCode'
          ? `"EMP001","Rahul Sharma","${slabName}",600000,"${todayStr}",50000,25000,10000,1800,200\n`
          : `"rahul@company.com","Rahul Sharma","${slabName}",600000,"${todayStr}",50000,25000,10000,1800,200\n`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${slabName.replace(/[^a-zA-Z0-9]/g, '_')}_Sample_Sheet.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded sample sheet for '${slabName}'!`);
  };

  // ── PARSE SPREADSHEET FILE ──
  const processFile = (file: File) => {
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
    setUploadSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');
      if (lines.length <= 1) {
        toast.error('Uploaded CSV file is empty or missing data!');
        return;
      }

      const dataRows = lines.slice(1);
      const parsed: ParsedRow[] = [];

      dataRows.forEach((line) => {
        const cols = line.split(/,|\t/).map((c) => c.replace(/^["']|["']$/g, '').trim());
        const primaryIdentifier = cols[0] || '';
        const empNameCol = cols[1] || '';
        const slabCol = cols[2] || '';
        const annualCtc = Number(cols[3]) || 0;
        const effectiveDateCol = cols[4] || new Date().toISOString().slice(0, 10);

        if (!primaryIdentifier) return;

        const matchedEmp = employees.find(
          (emp: any) =>
            String(emp.employeeCode || emp.employee_code || emp.code).toLowerCase() ===
              primaryIdentifier.toLowerCase() ||
            String(emp.email).toLowerCase() === primaryIdentifier.toLowerCase()
        );

        const matchedSlab =
          slabs.find((s) => String(s.id) === String(selectedSlabId)) ||
          slabs.find((s) => (s.name || s.slab_name || '').toLowerCase() === slabCol.toLowerCase()) ||
          slabs[0];

        const empName = matchedEmp
          ? `${matchedEmp.firstName || matchedEmp.first_name || ''} ${matchedEmp.lastName || matchedEmp.last_name || ''}`.trim()
          : empNameCol || undefined;

        parsed.push({
          employeeCode: primaryIdentifier,
          email: matchedEmp?.email || (primaryIdentifier.includes('@') ? primaryIdentifier : ''),
          slabInput: matchedSlab?.name || slabCol || 'Selected Slab',
          annualCtc: annualCtc || (matchedSlab ? Number(matchedSlab.min_ctc || 600000) : 600000),
          effectiveFrom: effectiveDateCol,
          matchedEmpName: empName,
          matchedSlabName: matchedSlab?.name || matchedSlab?.slab_name || 'Selected Slab',
          matchedSlabId: matchedSlab?.id,
          status: matchedEmp ? 'valid' : 'invalid',
          error: !matchedEmp ? 'Employee identifier not found' : undefined,
        });
      });

      setParsedRows(parsed);
      toast.info(`Loaded ${parsed.length} employee records from spreadsheet!`);
    };

    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── SUBMIT SPREADSHEET UPLOAD ──
  const handleUploadSubmit = async () => {
    if (!selectedFile && parsedRows.length === 0) {
      toast.error('Please choose a salary component spreadsheet file first!');
      return;
    }

    const validRows = parsedRows.filter((r) => r.status === 'valid');
    if (validRows.length === 0) {
      toast.error(
        'No valid rows to upload — every row failed employee matching. Fix the file and re-upload.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = validRows.map((r) => ({
        employeeCode: r.employeeCode,
        email: r.email,
        slabId: r.matchedSlabId || selectedSlabId,
        slabName: r.matchedSlabName,
        annualCtc: r.annualCtc,
        effectiveFrom: r.effectiveFrom || defaultEffectiveFrom,
      }));

      const res = await apiClient.post('/payroll/slabs/bulk-assign', { rows: payload });
      const summary = res.data?.summary || res.data;

      setUploadSuccess(summary);

      const selectedSlab = slabs.find((s) => String(s.id) === String(selectedSlabId));
      try {
        await apiClient.post('/payroll/structures/mass-upload-log', {
          fileName: fileName || 'Salary_Component_Upload.csv',
          slabName: selectedSlab ? selectedSlab.name : 'Monthly Slab',
          totalRows: validRows.length || summary?.total || 1,
          successCount: summary?.successCount || 0,
          failCount: summary?.failCount || 0,
          errors: summary?.errors || [],
        });
      } catch (logErr) {
        console.error('Failed to persist upload log:', logErr);
      }
      fetchUploadLogs();
      fetchMasterData();

      if (summary?.failCount) {
        toast.warning(
          `Assigned ${summary.successCount} of ${summary.total} — ${summary.failCount} row(s) failed.`
        );
      } else {
        toast.success(
          `Successfully assigned salary structure for ${summary?.successCount || validRows.length} employees!`
        );
      }
    } catch (err: any) {
      console.error('Failed upload:', err);
      toast.error(err.response?.data?.message || 'Failed to upload salary components');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedSlabObj = slabs.find((s) => String(s.id) === String(selectedSlabId));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* ── TOP HEADER BANNER (MATCHES PAYROLL MASTER SETTINGS EXACTLY) ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#5b52f6] text-white flex items-center justify-center shadow-sm flex-shrink-0">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Mass Salary Structure &amp; Slab Assignment
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Assign Salary Slabs, Annual CTC, and Effective Dates across employees in bulk or via spreadsheet upload.
            </p>
          </div>
        </div>

        {/* Sub-Tab Navigation Switcher on Top Right (Matches Payroll Master Settings Header Tabs) */}
        <div className="flex items-center gap-3">
          <div className="bg-[#f1f5f9] dark:bg-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-900 text-[#5b52f6] dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Spreadsheet Upload (CSV)</span>
            </button>

            <button
              onClick={() => setActiveTab('assign')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'assign'
                  ? 'bg-white dark:bg-slate-900 text-[#5b52f6] dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Assign Slabs &amp; CTC</span>
              {selectedEmpIds.length > 0 && (
                <Badge className="bg-[#5b52f6] text-white text-[10px] px-1.5 py-0 h-4 font-extrabold">
                  {selectedEmpIds.length}
                </Badge>
              )}
            </button>

            <button
              onClick={() => setActiveTab('log')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'log'
                  ? 'bg-white dark:bg-slate-900 text-[#5b52f6] dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Upload Log History</span>
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchMasterData}
            disabled={loading}
            className="border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold h-9 px-3 rounded-xl shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* ── TAB 1: SPREADSHEET UPLOAD (CSV / EXCEL) ── */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Box: Drag & Drop Portal */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-[#5b52f6]" />
                    Upload Salary Component Spreadsheet
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload employee salary structure sheets to map annual CTCs and slabs automatically.
                  </p>
                </div>
                <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/50 text-[#5b52f6] dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                  Max Size: 10MB
                </Badge>
              </div>

              {/* Interactive Drag & Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative group ${
                  isDragging
                    ? 'border-[#5b52f6] bg-indigo-50/60 dark:bg-indigo-950/40 scale-[0.99]'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 hover:border-[#5b52f6]'
                }`}
              >
                <input
                  type="file"
                  accept=".csv, .xlsx, .txt"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />

                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#5b52f6]/10 text-[#5b52f6] flex items-center justify-center mx-auto shadow-2xs group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-7 h-7" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Drag &amp; drop your salary CSV file here
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      or <span className="text-[#5b52f6] dark:text-indigo-400 font-extrabold underline">click to browse</span> from your computer
                    </p>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500">.CSV</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500">.XLSX</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-500">UTF-8</span>
                  </div>
                </div>
              </div>

              {/* Selected File Preview Box */}
              {selectedFile ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between animate-fade-in shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#059669] text-white">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{fileName}</div>
                      <div className="text-[11px] text-[#059669] dark:text-emerald-400 font-semibold">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Ready for processing
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setFileName('');
                      setParsedRows([]);
                    }}
                    className="text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    <X className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <div className="text-center py-1 text-xs text-slate-400 font-medium">
                  No file selected yet. Choose a CSV or sample file to begin.
                </div>
              )}

              {/* Main Submit Button (Emerald Green - Matches + + Add Component in Payroll Master Settings) */}
              <Button
                onClick={handleUploadSubmit}
                disabled={isSubmitting || (!selectedFile && parsedRows.length === 0)}
                className="w-full h-11 bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                <span>Upload &amp; Assign Salary Components</span>
              </Button>
            </div>

            {/* Right Box: Configurations & Sample Template */}
            <div className="lg:col-span-5 space-y-5">
              {/* Default Slab Configuration */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <Tag className="w-4 h-4 text-[#5b52f6]" />
                  Default Payroll Slab Settings
                </h3>

                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-900 dark:text-white">
                    Default Payroll Slab <span className="text-red-500">*</span>
                  </Label>
                  <select
                    value={selectedSlabId}
                    onChange={(e) => setSelectedSlabId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5b52f6] shadow-2xs"
                  >
                    {slabs.length === 0 ? (
                      <option value="">-- No Slabs Available --</option>
                    ) : (
                      slabs.map((slab) => {
                        const matchedCycle = cycles.find(
                          (c) => String(c.id) === String(slab.cycleId || slab.cycle_id)
                        );
                        const cycleLabel = matchedCycle
                          ? matchedCycle.cycle_name || matchedCycle.name
                          : 'Monthly';
                        return (
                          <option key={slab.id} value={slab.id}>
                            {cycleLabel} • {slab.name || slab.slab_name || `Slab #${slab.id}`}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-bold text-slate-900 dark:text-white">
                    Download Sheet Identifier Basis
                  </Label>
                  <div className="grid grid-cols-2 gap-2 bg-[#f1f5f9] dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setDownloadBasis('empCode')}
                      className={`h-8 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        downloadBasis === 'empCode'
                          ? 'bg-[#5b52f6] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Hash className="w-3.5 h-3.5" />
                      <span>Emp Code</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDownloadBasis('email')}
                      className={`h-8 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        downloadBasis === 'email'
                          ? 'bg-[#5b52f6] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sample Sheet Download Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-[#5b52f6]" />
                      Download Sample Template
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Get a pre-formatted CSV template tailored with active employees and columns.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">Included Columns:</div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-mono font-semibold">Employee Identifier</span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-mono font-semibold">Name</span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-mono font-semibold">Payroll Slab</span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-mono font-semibold">Annual CTC</span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-mono font-semibold">Effective Date</span>
                  </div>
                </div>

                <Button
                  onClick={handleDownloadSample}
                  className="w-full h-10 bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Sample CSV File</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  Loaded Records Preview ({parsedRows.length})
                </h3>
                <span className="text-xs font-bold text-[#5b52f6] bg-indigo-50 dark:bg-indigo-950 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Target Slab: {selectedSlabObj?.name || 'Selected Slab'}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 max-h-72 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="p-3">Status</th>
                      <th className="p-3">Emp Identifier</th>
                      <th className="p-3">Matched Employee Name</th>
                      <th className="p-3">Payroll Slab</th>
                      <th className="p-3 text-right">Offered Annual CTC</th>
                      <th className="p-3">Effective Date</th>
                      <th className="p-3 text-right">Est. Monthly Gross</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          {r.status === 'valid' ? (
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                              Valid
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                              Not Found
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{r.employeeCode}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {r.matchedEmpName || (
                            <span className="text-slate-400 italic">No match</span>
                          )}
                        </td>
                        <td className="p-3 text-[#5b52f6] dark:text-indigo-400 font-bold">{r.matchedSlabName}</td>
                        <td className="p-3 text-right font-extrabold text-[#059669] dark:text-emerald-400">
                          ₹{r.annualCtc.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-700 dark:text-slate-300">{r.effectiveFrom}</td>
                        <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                          ₹{Math.round(r.annualCtc / 12).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: INTERACTIVE BULK ASSIGN GRID ── */}
      {activeTab === 'assign' && (
        <div className="space-y-5">
          {/* Target Slab Assignment Control Bar (Teal Header Accent matching Group Headers in Master Settings) */}
          <div className="border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs overflow-hidden">
            {/* Header Strip in Teal Accent */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-white">Bulk Assign Salary Slabs to Staff</h2>
                  <p className="text-xs text-teal-100 mt-0.5">
                    Set target slab, annual CTC, and effective date, select employees, and assign with 1 click.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-white bg-white/20 px-3 py-1 rounded-full border border-white/30 backdrop-blur">
                  {selectedEmpIds.length} Staff Selected
                </span>
                <button
                  onClick={handleBulkAssign}
                  disabled={isSubmitting || selectedEmpIds.length === 0}
                  className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-sm cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Assigning...' : `Assign Slabs to Selected (${selectedEmpIds.length})`}
                </button>
              </div>
            </div>

            {/* Global Slab Selector & Options: Slab + CTC + Effective Date */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                  Target Salary Slab to Assign <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSlabId}
                  onChange={(e) => {
                    setSelectedSlabId(e.target.value);
                    const matched = slabs.find((s: any) => String(s.id) === e.target.value);
                    const minCtc = matched?.min_ctc || matched?.minCtc;
                    if (minCtc) setDefaultCtc(String(minCtc));
                  }}
                  className="w-full h-10 text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs"
                >
                  {slabs.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      🏷️ {s.name || s.slab_name} (₹
                      {(Number(s.min_ctc || s.minCtc || 0) / 100000).toFixed(1)}L - ₹
                      {(Number(s.max_ctc || s.maxCtc || 10000000) / 100000).toFixed(1)}L)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                  Default Annual CTC (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={defaultCtc}
                  onChange={(e) => setDefaultCtc(e.target.value)}
                  placeholder="e.g. 600000"
                  className="w-full h-10 text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold shadow-2xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 dark:text-white block mb-1">
                  Effective From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={defaultEffectiveFrom}
                  onChange={(e) => setDefaultEffectiveFrom(e.target.value)}
                  className="w-full h-10 text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Filter / Search Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-wrap items-center gap-3 shadow-xs">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name or code..."
                className="text-xs bg-transparent outline-none w-full text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs font-semibold"
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
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs font-semibold"
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
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs font-semibold"
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
              className="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 cursor-pointer shadow-2xs font-semibold"
            >
              <option value="ALL">All Staff</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              <option value="ASSIGNED">Assigned Only</option>
            </select>
          </div>

          {/* Employee List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 sticky top-0 backdrop-blur">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">Employee Details</th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">Department &amp; Location</th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">Designation / Grade</th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">Current Slab</th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">Target Slab</th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">Offered Annual CTC (₹)</th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white">Effective Date</th>
                    <th className="py-3 px-4 font-bold text-slate-900 dark:text-white text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400 font-medium">
                        No employees found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp: any) => {
                      const empId = Number(emp.id);
                      const isSelected = selectedEmpIds.includes(empId);
                      const currentSlabName = emp.slab_name || emp.salary_slab_name;
                      const currentCtc = emp.annual_ctc;
                      const rowSlab = customSlabMap[empId] || selectedSlabId;
                      const rowCtc = customCtcMap[empId] ?? defaultCtc;
                      const rowEffDate = customEffectiveDateMap[empId] ?? defaultEffectiveFrom;

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectEmp(empId)}
                              className="rounded border-slate-300 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {emp.firstName || emp.first_name || emp.name}{' '}
                              {emp.lastName || emp.last_name || ''}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {emp.employeeCode || emp.employee_code || emp.code || '—'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {emp.department || emp.department_name || '—'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {emp.location || emp.location_name || emp.branch || '—'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {emp.designation ||
                                emp.designation_name ||
                                emp.job_title ||
                                'Staff'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              Grade: {emp.grade || emp.grade_name || '—'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {currentSlabName ? (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold"
                              >
                                🏷️ {String(currentSlabName)}{' '}
                                {currentCtc
                                  ? `(₹${(Number(currentCtc) / 100000).toFixed(1)}L)`
                                  : ''}
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-semibold"
                              >
                                ⚠️ Unassigned
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={rowSlab}
                              onChange={(e) =>
                                setCustomSlabMap({ ...customSlabMap, [empId]: e.target.value })
                              }
                              className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-semibold shadow-2xs"
                            >
                              {slabs.map((s: any) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={rowCtc}
                              onChange={(e) =>
                                setCustomCtcMap({ ...customCtcMap, [empId]: e.target.value })
                              }
                              placeholder="Annual CTC"
                              className="w-28 h-8 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-2 text-xs font-bold font-mono text-[#059669] dark:text-emerald-400 shadow-2xs"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="date"
                              value={rowEffDate}
                              onChange={(e) =>
                                setCustomEffectiveDateMap({
                                  ...customEffectiveDateMap,
                                  [empId]: e.target.value,
                                })
                              }
                              className="w-32 h-8 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg px-2 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleSingleAssign(emp)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-extrabold text-[11px] cursor-pointer transition-colors shadow-2xs"
                            >
                              ✓ Assign
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: UPLOAD LOG HISTORY ── */}
      {activeTab === 'log' && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-[#5b52f6]" />
            Mass Salary Component Upload Log
          </h2>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Log ID</th>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Target Payroll Slab</th>
                  <th className="p-3 text-center">Total Rows</th>
                  <th className="p-3">Uploaded At</th>
                  <th className="p-3">Uploaded By</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {uploadLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      No upload logs recorded yet. Upload a salary component sheet to track history.
                    </td>
                  </tr>
                ) : (
                  uploadLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold">#{log.id}</td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">{log.fileName}</td>
                      <td className="p-3 text-[#5b52f6] dark:text-indigo-400 font-semibold">{log.slabName}</td>
                      <td className="p-3 text-center font-extrabold">{log.totalRows}</td>
                      <td className="p-3 text-slate-400">{log.uploadedAt}</td>
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{log.uploadedBy}</td>
                      <td className="p-3 text-center">
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default MassSalaryStructureUploadPage;
