import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useBulkUploadEmployees } from '../hooks/useEmployees';
import { AlertCircle, Upload, CheckCircle2, FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import { read, utils } from 'xlsx';

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const parseCSVContent = (text: string) => {
    const lines = text.split('\n').map(line => line.trim());
    if (lines.length === 0 || !lines[0]) {
      toast.error('The selected file is empty.');
      return;
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    // Map of CSV headers to expected camelCase keys
    const headerMapping: Record<string, string> = {
      employeeCode: 'employeeCode',
      firstName: 'firstName',
      lastName: 'lastName',
      middleName: 'middleName',
      email: 'email',
      phone: 'phone',
      mobile: 'mobile',
      dateOfBirth: 'dateOfBirth',
      gender: 'gender',
      dateOfJoining: 'dateOfJoining',
      employmentType: 'employmentType',
      departmentId: 'departmentId',
      reportingManagerId: 'reportingManagerId',
      password: 'password',
      confirmPassword: 'confirmPassword',
    };

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

      const values = line.split(',').map(val => val.trim().replace(/^["']|["']$/g, ''));
      
      const rowData: Record<string, any> = {};
      headers.forEach((header, index) => {
        const camelKey = headerMapping[header] || header;
        rowData[camelKey] = values[index] || '';
      });

      // Normalize gender and employmentType
      if (rowData.gender) {
        rowData.gender = rowData.gender.toLowerCase();
      }
      if (rowData.employmentType) {
        rowData.employmentType = rowData.employmentType.toLowerCase().replace(/[- ]/g, '_');
      } else {
        rowData.employmentType = 'full_time';
      }

      // Format Dates
      if (rowData.dateOfJoining) {
        rowData.dateOfJoining = formatDateToYYYYMMDD(rowData.dateOfJoining);
      }
      if (rowData.dateOfBirth) {
        rowData.dateOfBirth = formatDateToYYYYMMDD(rowData.dateOfBirth);
      }

      // Validations
      const errors: string[] = [];
      if (!rowData.employeeCode) errors.push('Employee Code is required');
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
        errors.push('Invalid Date of Joining format (expected YYYY-MM-DD or DD-MM-YYYY)');
      }

      if (rowData.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(rowData.dateOfBirth)) {
        errors.push('Invalid Date of Birth format');
      }

      if (rowData.gender && !['male', 'female', 'other'].includes(rowData.gender)) {
        errors.push('Gender must be male, female, or other');
      }

      if (rowData.employmentType && !['full_time', 'part_time', 'contract', 'internship'].includes(rowData.employmentType)) {
        errors.push('Employment Type must be full_time, part_time, contract, or internship');
      }

      if (rowData.departmentId && isNaN(Number(rowData.departmentId))) {
        errors.push('Department ID must be a valid number');
      }

      if (rowData.reportingManagerId && isNaN(Number(rowData.reportingManagerId))) {
        errors.push('Reporting Manager ID must be a valid number');
      }

      if (!rowData.password) {
        errors.push('Password is required');
      } else if (rowData.password.length < 6) {
        errors.push('Password must be at least 6 characters long');
      }

      if (!rowData.confirmPassword) {
        errors.push('Confirm Password is required');
      } else if (rowData.password !== rowData.confirmPassword) {
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
      const isExcelOrCsv = selectedFile.name.endsWith('.csv') || 
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
      .filter(row => row.isValid)
      .map(row => ({
        employeeCode: row.data.employeeCode,
        firstName: row.data.firstName,
        lastName: row.data.lastName,
        middleName: row.data.middleName || null,
        email: row.data.email,
        phone: row.data.phone || null,
        mobile: row.data.mobile || null,
        dateOfBirth: row.data.dateOfBirth || null,
        gender: row.data.gender || null,
        dateOfJoining: row.data.dateOfJoining,
        employmentType: row.data.employmentType || 'full_time',
        departmentId: row.data.departmentId ? parseInt(row.data.departmentId, 10) : null,
        reportingManagerId: row.data.reportingManagerId ? parseInt(row.data.reportingManagerId, 10) : null,
        password: row.data.password,
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
      const details = errorData?.details?.message || (typeof errorData?.details === 'string' ? errorData.details : '');
      const fullMessage = details ? `${message}: ${details}` : message;
      toast.error(fullMessage);
    }
  };

  const totalValid = parsedRows.filter(r => r.isValid).length;
  const totalInvalid = parsedRows.length - totalValid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-primary" />
            Bulk Upload Employees
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel sheet to add multiple employees at once. Make sure columns match the template structure.
          </DialogDescription>
        </DialogHeader>

        {/* Upload Zone */}
        {!file ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-10 cursor-pointer transition-all duration-300 ${
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
            <p className="font-semibold text-lg mb-1">Drag and drop your CSV or Excel file here</p>
            <p className="text-muted-foreground text-sm">or click to browse from files</p>
            <p className="text-xs text-muted-foreground/60 mt-4">Only .csv, .xlsx, and .xls files are supported</p>
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
                    <th className="p-3 font-semibold border-b">Joining Date</th>
                    <th className="p-3 font-semibold border-b">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr
                      key={row.index}
                      className={`border-b transition-colors ${
                        row.isValid
                          ? 'hover:bg-muted/30'
                          : 'bg-destructive/5 hover:bg-destructive/10'
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
                      <td className="p-3">{row.data.employeeCode || '-'}</td>
                      <td className="p-3 font-medium">
                        {row.data.firstName || ''} {row.data.lastName || ''}
                      </td>
                      <td className="p-3 truncate max-w-[150px]">{row.data.email || '-'}</td>
                      <td className="p-3">{row.data.dateOfJoining || '-'}</td>
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
              <Button
                onClick={handleImport}
                disabled={isLoading || totalValid === 0}
                className="gap-2"
              >
                {isLoading ? 'Importing...' : `Import ${totalValid} Employees`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
