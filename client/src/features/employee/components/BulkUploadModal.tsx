import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBulkUploadEmployees, useEmployees } from '../hooks/useEmployees';
import { useDepartments } from '../../settings/hooks/useDepartments';
import { AlertCircle, Upload, CheckCircle2, FileSpreadsheet, X, Download } from 'lucide-react';
import { toast } from 'sonner';
import { read, utils, writeFile } from 'xlsx';

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedRow {
  index: number;
  data: any;
  errors: string[];
  isValid: boolean;
}

export function BulkUploadModal({
  open,
  onOpenChange,
  onSuccess,
}: BulkUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { bulkUploadEmployees, isLoading, error: apiError } = useBulkUploadEmployees();
  const { data: departmentsData } = useDepartments(1, 100);
  const { employees: allEmployees } = useEmployees({ pageSize: 500 });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Helper to generate and download a sample Excel file (.xlsx) matching database departments and managers
  const handleDownloadSampleTemplate = () => {
    try {
      const sampleDept = departmentsData?.data?.[0]?.name || 'Human Resources';
      const sampleMgrEmail = allEmployees?.[0]?.email || 'admin@apponexthrms.com';

      const sampleData = [
        {
          'Employee Code': 'EMP1001',
          'First Name': 'Rahul',
          'Last Name': 'Sharma',
          'Email Address': 'rahul.sharma@apponexthrms.com',
          'Mobile Number': '9876543210',
          'Date of Joining': new Date().toISOString().split('T')[0],
          'Department Name': sampleDept,
          'Job Title': 'Software Engineer',
          'Reports To (Manager Email / Code)': sampleMgrEmail,
          'Employment Type': 'Full Time',
          'Role': 'Employee',
          'Password': 'Admin@123',
          'Confirm Password': 'Admin@123',
        },
        {
          'Employee Code': 'EMP1002',
          'First Name': 'Priya',
          'Last Name': 'Verma',
          'Email Address': 'priya.verma@apponexthrms.com',
          'Mobile Number': '9876543211',
          'Date of Joining': new Date().toISOString().split('T')[0],
          'Department Name': sampleDept,
          'Job Title': 'HR Executive',
          'Reports To (Manager Email / Code)': sampleMgrEmail,
          'Employment Type': 'Full Time',
          'Role': 'HR',
          'Password': 'Admin@123',
          'Confirm Password': 'Admin@123',
        },
      ];

      const worksheet = utils.json_to_sheet(sampleData);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, 'Employee Template');
      writeFile(workbook, 'Sample_Employee_Import_Template.xlsx');
      toast.success('Sample Excel template downloaded successfully!');
    } catch (err) {
      console.error('Failed to generate sample Excel:', err);
      toast.error('Failed to download template.');
    }
  };

  const parseCSVContent = (text: string) => {
    const lines = text.split('\n').map((line) => line.trim());
    if (lines.length === 0 || !lines[0]) {
      toast.error('The selected file is empty.');
      return;
    }

    // Parse headers
    const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

    // Normalize header mapping
    const normalizeHeaderKey = (h: string) => {
      const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('employeecode') || lower === 'code') return 'employeeCode';
      if (lower.includes('firstname') || lower === 'first') return 'firstName';
      if (lower.includes('lastname') || lower === 'last') return 'lastName';
      if (lower.includes('middlename')) return 'middleName';
      if (lower.includes('report') || lower.includes('manager')) return 'reportsToInput';
      if (lower.includes('email')) return 'email';
      if (lower.includes('phone') || lower.includes('mobile')) return 'mobile';
      if (lower.includes('birth')) return 'dateOfBirth';
      if (lower.includes('gender')) return 'gender';
      if (lower.includes('joining')) return 'dateOfJoining';
      if (lower.includes('employmenttype') || lower.includes('type')) return 'employmentType';
      if (lower.includes('department')) return 'departmentInput';
      if (lower.includes('title') || lower.includes('designation') || lower.includes('job')) return 'jobTitle';
      if (lower.includes('role') || lower.includes('access')) return 'accessRole';
      if (lower.includes('confirmpassword')) return 'confirmPassword';
      if (lower.includes('password')) return 'password';
      return h;
    };

    const headerKeys = rawHeaders.map(normalizeHeaderKey);
    const parsed: ParsedRow[] = [];

    const formatDateToYYYYMMDD = (dateStr: string) => {
      if (!dateStr) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }

      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);

        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else {
          if (year < 100) {
            year += 2000;
          }
          if (month > 12 && day <= 12) {
            const temp = day;
            day = month;
            month = temp;
          }
        }

        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }

      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
      }
      return '';
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const values = line.split(',').map((val) => val.trim().replace(/^["']|["']$/g, ''));
      const rowData: Record<string, any> = {};

      headerKeys.forEach((key, index) => {
        rowData[key] = values[index] || '';
      });

      // Default Employee Code if missing
      if (!rowData.employeeCode) {
        rowData.employeeCode = `EMP${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;
      }

      // Normalize gender and employmentType
      if (rowData.gender) {
        rowData.gender = rowData.gender.toLowerCase();
      }
      if (rowData.employmentType) {
        rowData.employmentType = rowData.employmentType.toLowerCase().replace(/[- ]/g, '_');
      } else {
        rowData.employmentType = 'full_time';
      }

      // Normalize Access Role
      let normalizedRole = 'employee';
      if (rowData.accessRole) {
        const rLower = rowData.accessRole.toLowerCase();
        if (rLower.includes('hr')) normalizedRole = 'hr_manager';
        else if (rLower.includes('manager') || rLower.includes('head')) normalizedRole = 'department_head';
        else if (rLower.includes('lead')) normalizedRole = 'team_lead';
      }
      rowData.accessRole = normalizedRole;

      // Format Dates
      if (rowData.dateOfJoining) {
        rowData.dateOfJoining = formatDateToYYYYMMDD(rowData.dateOfJoining);
      }
      if (rowData.dateOfBirth) {
        rowData.dateOfBirth = formatDateToYYYYMMDD(rowData.dateOfBirth);
      }

      // Dynamic Resolution 1: Department Name or ID -> Department ID
      let resolvedDepartmentId: number | null = null;
      let resolvedDepartmentName = '';
      if (rowData.departmentInput) {
        const dInput = String(rowData.departmentInput).trim();
        const depts = departmentsData?.data || [];

        // Check if dInput is numeric ID
        const byId = depts.find((d: any) => String(d.id) === dInput);
        if (byId) {
          resolvedDepartmentId = byId.id;
          resolvedDepartmentName = byId.name;
        } else {
          // Check by Department Name match
          const byName = depts.find((d: any) => d.name.toLowerCase() === dInput.toLowerCase());
          if (byName) {
            resolvedDepartmentId = byName.id;
            resolvedDepartmentName = byName.name;
          }
        }
      }
      rowData.departmentId = resolvedDepartmentId;
      rowData.departmentName = resolvedDepartmentName || rowData.departmentInput || '';

      // Dynamic Resolution 2: Reports To (Manager Email, Code, Name, or ID) -> Reporting Manager ID
      let resolvedManagerId: number | null = null;
      let resolvedManagerName = '';
      if (rowData.reportsToInput) {
        const mInput = String(rowData.reportsToInput).trim().toLowerCase();
        const emps = allEmployees || [];

        const byId = emps.find((e: any) => String(e.id) === mInput);
        const byCode = emps.find((e: any) => e.employeeCode?.toLowerCase() === mInput);
        const byEmail = emps.find((e: any) => e.email?.toLowerCase() === mInput);
        const byName = emps.find((e: any) => `${e.firstName} ${e.lastName}`.toLowerCase() === mInput);

        const matchedMgr = byId || byCode || byEmail || byName;
        if (matchedMgr) {
          resolvedManagerId = matchedMgr.id;
          resolvedManagerName = `${matchedMgr.firstName} ${matchedMgr.lastName}`;
        }
      }
      rowData.reportingManagerId = resolvedManagerId;
      rowData.reportingManagerName = resolvedManagerName || rowData.reportsToInput || '';

      // Default Password to Admin@123 if omitted in CSV
      if (!rowData.password) {
        rowData.password = 'Admin@123';
        rowData.confirmPassword = 'Admin@123';
      } else if (!rowData.confirmPassword) {
        rowData.confirmPassword = rowData.password;
      }

      // Validations
      const errors: string[] = [];
      if (!rowData.firstName) errors.push('First Name is required');
      if (!rowData.lastName) errors.push('Last Name is required');

      if (!rowData.email) {
        errors.push('Email is required');
      } else if (!/\S+@\S+\.\S+/.test(rowData.email)) {
        errors.push('Invalid email format');
      }

      if (!rowData.dateOfJoining) {
        errors.push('Date of Joining is required');
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(rowData.dateOfJoining)) {
        errors.push('Invalid Date of Joining format (expected YYYY-MM-DD)');
      }

      if (rowData.departmentInput && !resolvedDepartmentId) {
        errors.push(`Department "${rowData.departmentInput}" not found in organization`);
      }


      if (rowData.password && rowData.password.length < 6) {
        errors.push('Password must be at least 6 characters long');
      }

      if (rowData.password !== rowData.confirmPassword) {
        errors.push('Passwords do not match');
      }

      parsed.push({
        index: i,
        data: rowData,
        errors,
        isValid: errors.length === 0,
      });
    }

    setParsedRows(parsed);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      const isExcelOrCsv =
        selectedFile.name.endsWith('.csv') ||
        selectedFile.name.endsWith('.xlsx') ||
        selectedFile.name.endsWith('.xls');
      if (isExcelOrCsv) {
        setFile(selectedFile);
        readFile(selectedFile);
      } else {
        toast.error('Please upload a valid CSV or Excel file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      readFile(selectedFile);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const csvContent = utils.sheet_to_csv(sheet);
        parseCSVContent(csvContent);
      } catch (err) {
        console.error('Failed to parse file:', err);
        toast.error('Failed to parse the file structure. Please ensure it is a valid Excel or CSV.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const clearFile = () => {
    setFile(null);
    setParsedRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    const validEmployees = parsedRows
      .filter((row) => row.isValid)
      .map((row) => ({
        employeeCode: row.data.employeeCode,
        firstName: row.data.firstName,
        lastName: row.data.lastName,
        middleName: row.data.middleName || null,
        email: row.data.email,
        phone: row.data.mobile || row.data.phone || null,
        mobile: row.data.mobile || row.data.phone || null,
        dateOfBirth: row.data.dateOfBirth || null,
        gender: row.data.gender || null,
        dateOfJoining: row.data.dateOfJoining,
        employmentType: row.data.employmentType || 'full_time',
        departmentId: row.data.departmentId || null,
        reportingManagerId: row.data.reportingManagerId || null,
        jobTitle: row.data.jobTitle || null,
        accessRole: row.data.accessRole || 'employee',
        password: row.data.password || 'Admin@123',
      }));

    if (validEmployees.length === 0) {
      toast.error('No valid employee records to import.');
      return;
    }

    try {
      await bulkUploadEmployees(validEmployees);
      toast.success(`Successfully imported ${validEmployees.length} employees!`);
      clearFile();
      onSuccess();
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      const message = errorData?.message || err.response?.data?.message || 'Failed to import employees';
      const details =
        errorData?.details?.message || (typeof errorData?.details === 'string' ? errorData.details : '');
      const fullMessage = details ? `${message}: ${details}` : message;
      toast.error(fullMessage);
    }
  };

  const totalValid = parsedRows.filter((r) => r.isValid).length;
  const totalInvalid = parsedRows.length - totalValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="mb-4 flex flex-row items-center justify-between border-b pb-3">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-primary" />
              Bulk Upload Employees
            </DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel sheet to add multiple employees at once. Department and Manager fields are automatically matched.
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSampleTemplate}
            className="gap-2 font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border-violet-200"
          >
            <Download className="w-4 h-4" /> Download Sample Excel
          </Button>
        </DialogHeader>

        {/* Upload Zone & Instructions Grid */}
        {!file ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`md:col-span-2 flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all duration-300 min-h-[300px] ${
                dragActive
                  ? 'border-primary bg-primary/5 scale-[0.99]'
                  : 'border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, .xlsx, .xls"
                className="hidden"
              />
              <div className="p-4 bg-primary/10 rounded-full text-primary mb-4">
                <Upload className="w-8 h-8" />
              </div>
              <p className="font-semibold text-lg mb-1 text-center">Drag and drop your CSV or Excel file here</p>
              <p className="text-muted-foreground text-sm text-center">or click to browse from files</p>
              <p className="text-xs text-muted-foreground/60 mt-4 text-center">Only .csv, .xlsx, and .xls files are supported</p>
            </div>

            {/* Instruction Panel for Dropdowns & Mapping */}
            <div className="border border-border/80 rounded-xl p-4 bg-muted/20 space-y-4 max-h-[350px] overflow-y-auto">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-primary shrink-0" />
                Data Reference Guide
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                When importing employees, matching of dropdown values is automatic. Use these exact reference values in your file columns:
              </p>

              <div className="space-y-3 pt-1">
                {/* Departments */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Departments</span>
                  <div className="flex flex-wrap gap-1">
                    {(departmentsData?.data || []).map((d: any) => (
                      <span key={d.id} className="text-[10px] bg-violet-50 text-violet-700 font-semibold px-2 py-0.5 rounded border border-violet-100">
                        {d.name}
                      </span>
                    ))}
                    {(departmentsData?.data || []).length === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">No departments configured</span>
                    )}
                  </div>
                </div>

                {/* Reporting Managers */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Reporting Managers (Email/Name)</span>
                  <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto pr-1">
                    {allEmployees
                      ?.filter((e: any) =>
                        ['team_lead', 'hr_manager', 'department_head'].includes(e.accessRole || e.access_role || '')
                      )
                      .slice(0, 10) // Show top 10 managers
                      .map((e: any) => (
                        <span key={e.id} className="text-[9px] bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded truncate" title={`${e.firstName} ${e.lastName}`}>
                          {e.firstName} {e.lastName} ({e.email})
                        </span>
                      ))}
                    {allEmployees?.filter((e: any) =>
                      ['team_lead', 'hr_manager', 'department_head'].includes(e.accessRole || e.access_role || '')
                    ).length === 0 && (
                      <span className="text-[10px] text-muted-foreground italic">No managers configured</span>
                    )}
                  </div>
                </div>

                {/* Employment Type */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Employment Types</span>
                  <div className="flex flex-wrap gap-1">
                    {['Full Time', 'Part Time', 'Contract', 'Internship'].map((t) => (
                      <span key={t} className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-100">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Access Roles */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Roles</span>
                  <div className="flex flex-wrap gap-1">
                    {['Employee', 'Team Lead', 'HR', 'Manager'].map((r) => (
                      <span key={r} className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded border border-blue-100">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* File Info Banner */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 text-green-600 rounded">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-sm max-w-[250px] truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={clearFile}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Validation Stats Summary */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="border rounded-lg p-3 bg-card flex flex-col">
                <span className="text-muted-foreground text-xs font-medium">Total Rows</span>
                <span className="text-xl font-bold">{parsedRows.length}</span>
              </div>
              <div className="border rounded-lg p-3 bg-green-500/5 border-green-500/10 flex flex-col text-green-600">
                <span className="text-xs font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ready to Import
                </span>
                <span className="text-xl font-bold">{totalValid}</span>
              </div>
              <div className="border rounded-lg p-3 bg-destructive/5 border-destructive/10 flex flex-col text-destructive">
                <span className="text-xs font-medium flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Requires Correction
                </span>
                <span className="text-xl font-bold">{totalInvalid}</span>
              </div>
            </div>

            {/* Preview Sheet Data */}
            <div className="flex-1 overflow-auto border rounded-lg min-h-0 bg-card">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold border-b">Status</th>
                    <th className="p-3 font-semibold border-b">Code</th>
                    <th className="p-3 font-semibold border-b">Name</th>
                    <th className="p-3 font-semibold border-b">Email</th>
                    <th className="p-3 font-semibold border-b">Department</th>
                    <th className="p-3 font-semibold border-b">Reports To</th>
                    <th className="p-3 font-semibold border-b">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr
                      key={row.index}
                      className={`border-b transition-colors ${
                        row.isValid ? 'hover:bg-muted/30' : 'bg-destructive/5 hover:bg-destructive/10'
                      }`}
                    >
                      <td className="p-3 font-medium">
                        {row.isValid ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            Valid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            Error
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs">{row.data.employeeCode || '-'}</td>
                      <td className="p-3 font-medium">
                        {row.data.firstName || ''} {row.data.lastName || ''}
                      </td>
                      <td className="p-3 truncate max-w-[150px]">{row.data.email || '-'}</td>
                      <td className="p-3">
                        <span className="font-semibold text-violet-600 dark:text-violet-400">
                          {row.data.departmentName || row.data.departmentInput || '-'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {row.data.reportingManagerName || row.data.reportsToInput || '-'}
                        </span>
                      </td>
                      <td className="p-3 text-destructive text-xs max-w-[200px]">
                        {row.errors.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {row.errors.map((err, idx) => (
                              <span key={idx} className="flex items-center gap-1">
                                • {err}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-green-600 font-medium">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={clearFile} disabled={isLoading}>
                Reset
              </Button>
              <Button onClick={handleImport} disabled={isLoading || totalValid === 0} className="gap-2">
                {isLoading ? 'Importing...' : `Import ${totalValid} Employees`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
