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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';

interface ParsedRow {
  employeeCode: string;
  email: string;
  slabInput: string;
  annualCtc: number;
  matchedEmpName?: string;
  matchedSlabName?: string;
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
  const [activeTab, setActiveTab] = useState<'upload' | 'log'>('upload');
  const [slabs, setSlabs] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedSlabId, setSelectedSlabId] = useState<string>('');
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
      setUploadLogs(rows.map((r) => ({
        id: r.id,
        fileName: r.fileName || r.file_name,
        slabName: r.slabName || r.slab_name || '—',
        totalRows: Number(r.totalRows ?? r.total_rows ?? 0),
        uploadedAt: r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : '',
        uploadedBy: r.uploadedByName || r.uploaded_by_name || 'HR Admin',
        status: Number(r.failCount ?? r.fail_count ?? 0) > 0
          ? `Completed (${r.failCount ?? r.fail_count} failed)`
          : 'Completed'
      })));
    } catch (e) {
      console.error('Failed to load upload logs:', e);
    }
  };

  const fetchMasterData = async () => {
    setLoading(true);
    let slabsFailed = false;
    let empsFailed = false;
    try {
      const [slabsRes, cyclesRes, empsRes] = await Promise.all([
        apiClient.get('/payroll/slabs').catch(() => { slabsFailed = true; return { data: [] }; }),
        apiClient.get('/payroll/cycles').catch(() => ({ data: [] })),
        apiClient.get('/employees?pageSize=1000').catch(() => { empsFailed = true; return { data: [] }; }),
      ]);

      const slabList = slabsRes.data?.data || slabsRes.data || [];
      const cycleList = cyclesRes.data?.data || cyclesRes.data || [];
      const empList = empsRes.data?.data || empsRes.data?.items || empsRes.data || [];

      const validSlabs = Array.isArray(slabList) ? slabList : [];
      const validCycles = Array.isArray(cycleList) ? cycleList : [];

      setCycles(validCycles);
      setSlabs(validSlabs);

      if (validSlabs.length > 0) {
        setSelectedSlabId(String(validSlabs[0].id));
      }
      setEmployees(Array.isArray(empList) ? empList : []);

      if (slabsFailed || empsFailed) {
        toast.error(`Failed to load ${[slabsFailed && 'salary slabs', empsFailed && 'employees'].filter(Boolean).join(' and ')} — retry before uploading.`);
      }
    } catch (e) {
      console.error('Failed to load master data:', e);
      toast.error('Failed to load master data — retry before uploading.');
    } finally {
      setLoading(false);
    }
  };

  // Download Sample File based on Selected Payroll Slab & Download Basis (Emp Code or Email)
  const handleDownloadSample = () => {
    if (!selectedSlabId) {
      toast.error('Please select a payroll slab first!');
      return;
    }

    const matchedSlab = slabs.find((s) => String(s.id) === String(selectedSlabId)) || slabs[0];
    const slabName = matchedSlab ? matchedSlab.name || matchedSlab.slab_name : 'Selected Slab';
    const pfRate = matchedSlab ? Number(matchedSlab.pf_rate_pct || 12) : 12;

    // Header based on basis
    let csvContent = downloadBasis === 'empCode'
      ? `Employee Code,Employee Name,Payroll Slab,Offered Annual CTC,Monthly Gross,Basic (50%),HRA (40%),PF (${pfRate}%),PT\n`
      : `Email,Employee Name,Payroll Slab,Offered Annual CTC,Monthly Gross,Basic (50%),HRA (40%),PF (${pfRate}%),PT\n`;

    // Pre-populate with active employees
    if (employees.length > 0) {
      employees.forEach((emp: any) => {
        const empCode = emp.employeeCode || emp.employee_code || '';
        const email = emp.email || '';
        const empName = `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim() || 'Employee';
        const defaultCtc = Number(matchedSlab?.min_ctc || emp.annual_ctc || 600000);
        const monthlyGross = Math.round(defaultCtc / 12);
        const basic = Math.round(monthlyGross * 0.5);
        const hra = Math.round(basic * 0.4);
        const pf = Math.min(1800, Math.round(basic * (pfRate / 100)));
        const pt = 200;

        if (downloadBasis === 'empCode') {
          csvContent += `"${empCode}","${empName}","${slabName}",${defaultCtc},${monthlyGross},${basic},${hra},${pf},${pt}\n`;
        } else {
          csvContent += `"${email}","${empName}","${slabName}",${defaultCtc},${monthlyGross},${basic},${hra},${pf},${pt}\n`;
        }
      });
    } else {
      csvContent += downloadBasis === 'empCode'
        ? `"EMP001","Rahul Sharma","${slabName}",600000,50000,25000,10000,1800,200\n`
        : `"rahul@company.com","Rahul Sharma","${slabName}",600000,50000,25000,10000,1800,200\n`;
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

  // Select File
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

      dataRows.forEach((line, idx) => {
        const cols = line.split(/,|\t/).map((c) => c.replace(/^["']|["']$/g, '').trim());
        const primaryIdentifier = cols[0] || '';
        const empNameCol = cols[1] || '';
        const slabCol = cols[2] || '';
        const annualCtc = Number(cols[3]) || 0;

        if (!primaryIdentifier) return;

        // Match Employee
        const matchedEmp = employees.find(
          (e: any) =>
            String(e.employeeCode || e.employee_code).toLowerCase() === primaryIdentifier.toLowerCase() ||
            String(e.email).toLowerCase() === primaryIdentifier.toLowerCase()
        );

        // Match Slab
        const matchedSlab = slabs.find((s) => String(s.id) === String(selectedSlabId)) ||
          slabs.find((s) => (s.name || s.slab_name || '').toLowerCase() === slabCol.toLowerCase()) || slabs[0];

        const empName = matchedEmp
          ? `${matchedEmp.firstName || matchedEmp.first_name || ''} ${matchedEmp.lastName || matchedEmp.last_name || ''}`.trim()
          : empNameCol || undefined;

        parsed.push({
          employeeCode: primaryIdentifier,
          email: matchedEmp?.email || (primaryIdentifier.includes('@') ? primaryIdentifier : ''),
          slabInput: matchedSlab?.name || slabCol || 'Selected Slab',
          annualCtc: annualCtc || (matchedSlab ? Number(matchedSlab.min_ctc || 600000) : 600000),
          matchedEmpName: empName,
          matchedSlabName: matchedSlab?.name || matchedSlab?.slab_name || 'Selected Slab',
          status: matchedEmp ? 'valid' : 'invalid',
          error: !matchedEmp ? 'Employee identifier not found' : undefined,
        });
      });

      setParsedRows(parsed);
      toast.info(`Loaded ${parsed.length} employee records from file!`);
    };

    reader.readAsText(file);
  };

  // Submit Mass Upload to Backend
  const handleUploadSubmit = async () => {
    if (!selectedFile && parsedRows.length === 0) {
      toast.error('Please choose a salary component spreadsheet file first!');
      return;
    }

    const validRows = parsedRows.filter((r) => r.status === 'valid');
    if (validRows.length === 0) {
      toast.error('No valid rows to upload — every row failed employee matching. Fix the file and re-upload.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = validRows.map((r) => ({
        employeeCode: r.employeeCode,
        email: r.email,
        slabId: selectedSlabId,
        slabName: r.matchedSlabName,
        annualCtc: r.annualCtc,
      }));

      const res = await apiClient.post('/payroll/slabs/bulk-assign', { rows: payload });
      const summary = res.data?.summary || res.data;

      setUploadSuccess(summary);

      // Persist the log server-side so it survives a refresh, instead of
      // keeping it only in local state.
      const selectedSlab = slabs.find((s) => String(s.id) === String(selectedSlabId));
      try {
        await apiClient.post('/payroll/structures/mass-upload-log', {
          fileName: fileName || 'Salary_Component_Upload.csv',
          slabName: selectedSlab ? selectedSlab.name : 'Monthly Slab',
          totalRows: validRows.length || summary?.total || 1,
          successCount: summary?.successCount || 0,
          failCount: summary?.failCount || 0,
          errors: summary?.errors || []
        });
      } catch (logErr) {
        console.error('Failed to persist upload log:', logErr);
      }
      fetchUploadLogs();

      if (summary?.failCount) {
        toast.warning(`Assigned ${summary.successCount} of ${summary.total} — ${summary.failCount} row(s) failed. See details below.`);
      } else {
        toast.success(`Successfully uploaded salary components for ${summary?.successCount || validRows.length} employees!`);
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
            Mass Employee Salary Component <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bulk assign Master Salary Slabs and calculate monthly earning/deduction structures for organization employees.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchMasterData} disabled={loading} className="text-xs font-bold">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Slabs
        </Button>
      </div>

      {/* Hoshi Style Navigation Tabs */}
      <div className="flex border-b border-border space-x-1">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'upload'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Upload Salary Component
        </button>

        <button
          onClick={() => setActiveTab('log')}
          className={`px-5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === 'log'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History className="w-3.5 h-3.5" /> Uploaded Salary Component Log
        </button>
      </div>

      {/* Tab 1: Upload Salary Component */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Main Upload Card (Matching Hoshi HRMS Design) */}
          <div className="p-8 bg-card border border-border rounded-xl shadow-xs space-y-6 relative max-w-4xl mx-auto">
            <div className="absolute top-6 right-6 text-muted-foreground/40">
              <UploadCloud className="w-10 h-10" />
            </div>

            <h2 className="text-center font-extrabold text-foreground text-lg">Upload Salary Component</h2>

            {/* File Chooser Strip */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center border border-input rounded-md overflow-hidden bg-background max-w-md w-full">
                <label className="bg-muted px-3 py-2 text-xs font-bold cursor-pointer hover:bg-muted/80 border-r text-foreground flex-shrink-0">
                  Choose File
                  <input type="file" accept=".csv, .xlsx, .txt" onChange={handleFileChange} className="hidden" />
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
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-4 h-4" />} Upload
              </Button>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold text-center">Max Size : 10MB</p>

            <hr className="border-border my-4" />

            {/* Slab Selection & Sample File Download Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end pt-2">
              {/* Left Column: Payroll Slab Selector & Download Sample Button */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1">
                  Payroll Slab <span className="text-red-500 font-extrabold">*</span>
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
                      const matchedCycle = cycles.find((c) => String(c.id) === String(slab.cycleId || slab.cycle_id));
                      const cycleLabel = matchedCycle ? (matchedCycle.cycle_name || matchedCycle.name) : 'Monthly';
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

              {/* Right Column: Download Sheet Based On */}
              <div className="space-y-3">
                <Label className="text-xs font-bold text-foreground">Download sheet based on</Label>
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
              Note : Please select payroll slab to download sample file.
            </p>
          </div>

          {/* Parsed Preview Table */}
          {parsedRows.length > 0 && (
            <div className="p-6 bg-card border border-border rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Loaded Records Preview ({parsedRows.length})
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
                        <td className="p-3 font-semibold">{r.matchedEmpName || <span className="text-muted-foreground italic">No match</span>}</td>
                        <td className="p-3 text-indigo-600 font-bold">{r.matchedSlabName}</td>
                        <td className="p-3 text-right font-bold text-emerald-600">₹{r.annualCtc.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-right font-bold">₹{Math.round(r.annualCtc / 12).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Uploaded Salary Component Log */}
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
