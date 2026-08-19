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
  Filter
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header Banner */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            Mass Salary Structure &amp; Slab Assignment <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign Salary Slabs, Annual CTC, and Effective Dates across employees in bulk or via spreadsheet upload.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchMasterData}
          disabled={loading}
          className="text-xs font-bold"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Data
        </Button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-border space-x-1">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'upload'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" /> Spreadsheet Upload (CSV)
        </button>

        <button
          onClick={() => setActiveTab('assign')}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'assign'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Bulk Assign Slabs &amp; CTC
        </button>

        <button
          onClick={() => setActiveTab('log')}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'log'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-3.5 h-3.5" /> Upload Log History
        </button>
      </div>

      {/* ── TAB 1: INTERACTIVE BULK ASSIGN GRID ── */}
      {activeTab === 'assign' && (
        <div className="space-y-4">
          {/* Target Slab Assignment Control Bar */}
          <div className="border border-emerald-300/80 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-xl shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-emerald-200/60 dark:border-emerald-900/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-2xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Bulk Assign Salary Slabs to Staff</h2>
                  <p className="text-xs text-muted-foreground">
                    Set target slab, annual CTC, and effective date, select employees, and assign with 1 click.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-700">
                  {selectedEmpIds.length} Staff Selected
                </span>
                <button
                  onClick={handleBulkAssign}
                  disabled={isSubmitting || selectedEmpIds.length === 0}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-xs cursor-pointer transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Assigning...' : `Assign Slabs to Selected (${selectedEmpIds.length})`}
                </button>
              </div>
            </div>

            {/* Global Slab Selector & Options: Slab + CTC + Effective Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
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
                  className="w-full h-9 text-xs border border-input rounded-lg px-2.5 bg-background text-foreground font-semibold"
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
                <label className="text-xs font-bold text-foreground block mb-1">
                  Default Annual CTC (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={defaultCtc}
                  onChange={(e) => setDefaultCtc(e.target.value)}
                  placeholder="e.g. 600000"
                  className="w-full h-9 text-xs border border-input rounded-lg px-2.5 bg-background text-foreground font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Effective From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={defaultEffectiveFrom}
                  onChange={(e) => setDefaultEffectiveFrom(e.target.value)}
                  className="w-full h-9 text-xs border border-input rounded-lg px-2.5 bg-background text-foreground font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Filter / Search Bar */}
          <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-muted/40 border border-border/80 rounded-lg px-2.5 py-1.5 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name or code..."
                className="text-xs bg-transparent outline-none w-full text-foreground placeholder:text-muted-foreground"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="text-xs border border-input rounded-lg px-2.5 py-1.5 bg-background text-foreground cursor-pointer"
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
              className="text-xs border border-input rounded-lg px-2.5 py-1.5 bg-background text-foreground cursor-pointer"
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
              className="text-xs border border-input rounded-lg px-2.5 py-1.5 bg-background text-foreground cursor-pointer"
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
              className="text-xs border border-input rounded-lg px-2.5 py-1.5 bg-background text-foreground cursor-pointer"
            >
              <option value="ALL">All Staff</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              <option value="ASSIGNED">Assigned Only</option>
            </select>
          </div>

          {/* Employee List Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground font-bold border-b border-border sticky top-0 backdrop-blur">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleToggleSelectAll}
                        className="rounded border-border cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-4 font-bold text-foreground">Employee Details</th>
                    <th className="py-2.5 px-4 font-bold text-foreground">Department &amp; Location</th>
                    <th className="py-2.5 px-4 font-bold text-foreground">Designation / Grade</th>
                    <th className="py-2.5 px-4 font-bold text-foreground">Current Slab</th>
                    <th className="py-2.5 px-4 font-bold text-foreground">Target Slab</th>
                    <th className="py-2.5 px-4 font-bold text-foreground">Offered Annual CTC (₹)</th>
                    <th className="py-2.5 px-4 font-bold text-foreground">Effective Date</th>
                    <th className="py-2.5 px-4 font-bold text-foreground text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-muted-foreground">
                        No employees matching filter criteria found.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp: any) => {
                      const isChecked = selectedEmpIds.includes(Number(emp.id));
                      const currentSlabName =
                        emp.slab_name || emp.slabName || emp.structure_name || emp.salary_slab_id || emp.salarySlabId;
                      const currentCtc =
                        emp.annual_ctc || emp.annualCtc || (emp.gross_monthly ? Number(emp.gross_monthly) * 12 : null);
                      const rowSlab = customSlabMap[emp.id] || emp.slab_id || selectedSlabId;
                      const rowCtc = customCtcMap[emp.id] || (currentCtc ? String(currentCtc) : defaultCtc) || '480000';
                      const rowEffDate =
                        customEffectiveDateMap[emp.id] || defaultEffectiveFrom;

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-muted/40 transition-colors ${
                            isChecked ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelectEmp(Number(emp.id))}
                              className="rounded border-border cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-foreground">
                              {emp.firstName || emp.first_name || emp.name}{' '}
                              {emp.lastName || emp.last_name || ''}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              {emp.employeeCode || emp.employee_code || emp.code || `EMP-${emp.id}`}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            <div className="font-semibold text-foreground">
                              {emp.department || emp.department_name || 'General'}
                            </div>
                            <div className="text-[10px]">
                              {emp.location || emp.location_name || 'Headquarters'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            <div>
                              {emp.designation ||
                                emp.designation_name ||
                                emp.job_title ||
                                'Staff'}
                            </div>
                            <div className="text-[10px] font-mono">
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
                                setCustomSlabMap({ ...customSlabMap, [emp.id]: e.target.value })
                              }
                              className="text-xs border border-input rounded px-2 py-1 bg-background text-foreground font-semibold"
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
                                setCustomCtcMap({ ...customCtcMap, [emp.id]: e.target.value })
                              }
                              placeholder="Annual CTC"
                              className="w-28 h-7 border border-input bg-background rounded px-2 text-xs font-bold font-mono text-emerald-700 dark:text-emerald-400"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="date"
                              value={rowEffDate}
                              onChange={(e) =>
                                setCustomEffectiveDateMap({
                                  ...customEffectiveDateMap,
                                  [emp.id]: e.target.value,
                                })
                              }
                              className="w-32 h-7 border border-input bg-background rounded px-1.5 text-xs font-semibold text-foreground"
                            />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleSingleAssign(emp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer transition-colors shadow-2xs"
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

      {/* ── TAB 2: SPREADSHEET UPLOAD (CSV/EXCEL) ── */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="p-8 bg-card border border-border rounded-xl shadow-xs space-y-6 relative max-w-4xl mx-auto">
            <div className="absolute top-6 right-6 text-muted-foreground/40">
              <UploadCloud className="w-10 h-10" />
            </div>

            <h2 className="text-center font-extrabold text-foreground text-lg">
              Upload Salary Component Spreadsheet
            </h2>

            {/* File Chooser Strip */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center border border-input rounded-md overflow-hidden bg-background max-w-md w-full">
                <label className="bg-muted px-3 py-2 text-xs font-bold cursor-pointer hover:bg-muted/80 border-r text-foreground flex-shrink-0">
                  Choose File
                  <input
                    type="file"
                    accept=".csv, .xlsx, .txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="px-3 text-xs text-muted-foreground truncate flex-1">
                  {fileName ? fileName : 'No file chosen'}
                </span>
              </div>

              <Button
                onClick={handleUploadSubmit}
                disabled={isSubmitting}
                className="bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs px-6 shadow-sm flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}{' '}
                Upload &amp; Assign
              </Button>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold text-center">Max Size : 10MB</p>

            <hr className="border-border my-4" />

            {/* Slab Selection & Sample File Download Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end pt-2">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Default Payroll Slab <span className="text-red-500 font-extrabold">*</span>
                </Label>
                <select
                  value={selectedSlabId}
                  onChange={(e) => setSelectedSlabId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground focus:ring-1 focus:ring-indigo-500"
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

                <Button
                  onClick={handleDownloadSample}
                  className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2 shadow-xs"
                >
                  Download Sample File
                </Button>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold text-foreground">Download Sheet Identifier</Label>
                <div className="flex border border-input rounded-md overflow-hidden bg-background w-fit">
                  <button
                    type="button"
                    onClick={() => setDownloadBasis('empCode')}
                    className={`px-4 py-1.5 text-xs font-bold transition-all ${
                      downloadBasis === 'empCode'
                        ? 'bg-sky-600 text-white'
                        : 'bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Emp Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setDownloadBasis('email')}
                    className={`px-4 py-1.5 text-xs font-bold transition-all ${
                      downloadBasis === 'email'
                        ? 'bg-sky-600 text-white'
                        : 'bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Email
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground italic mt-2">
              * The sample CSV sheet includes columns for Employee Identifier, Name, Payroll Slab, Annual CTC, and Effective Date.
            </p>
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="p-6 bg-card border border-border rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Loaded Records Preview (
                  {parsedRows.length})
                </h3>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-3 py-1 rounded-full border">
                  Target Slab: {selectedSlabObj?.name || 'Selected Slab'}
                </span>
              </div>

              <div className="overflow-x-auto border rounded-lg bg-background max-h-72">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-bold border-b sticky top-0">
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
                  <tbody className="divide-y divide-border">
                    {parsedRows.map((r, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="p-3">
                          {r.status === 'valid' ? (
                            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                              Valid
                            </span>
                          ) : (
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-400 px-2 py-0.5 rounded-full">
                              Not Found
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold">{r.employeeCode}</td>
                        <td className="p-3 font-semibold">
                          {r.matchedEmpName || (
                            <span className="text-muted-foreground italic">No match</span>
                          )}
                        </td>
                        <td className="p-3 text-indigo-600 font-bold">{r.matchedSlabName}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">
                          ₹{r.annualCtc.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 font-mono font-medium">{r.effectiveFrom}</td>
                        <td className="p-3 text-right font-bold">
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

      {/* ── TAB 3: UPLOAD LOG HISTORY ── */}
      {activeTab === 'log' && (
        <div className="p-6 bg-card border border-border rounded-xl shadow-xs space-y-4">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" /> Mass Salary Component Upload Log
          </h2>

          <div className="overflow-x-auto border rounded-lg bg-background">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/60 text-muted-foreground font-bold border-b">
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
              <tbody className="divide-y divide-border">
                {uploadLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground font-medium">
                      No upload logs recorded yet. Upload a salary component sheet to track history.
                    </td>
                  </tr>
                ) : (
                  uploadLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30">
                      <td className="p-3 font-mono font-bold">#{log.id}</td>
                      <td className="p-3 font-bold text-foreground">{log.fileName}</td>
                      <td className="p-3 text-indigo-600 font-semibold">{log.slabName}</td>
                      <td className="p-3 text-center font-extrabold">{log.totalRows}</td>
                      <td className="p-3 text-muted-foreground">{log.uploadedAt}</td>
                      <td className="p-3 font-semibold">{log.uploadedBy}</td>
                      <td className="p-3 text-center">
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 px-2.5 py-0.5 rounded-full">
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
