import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Calendar,
  Sparkles,
  Layers,
  FileCode,
  Eye,
  File,
} from 'lucide-react';
import { showToast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';
import { read, utils, writeFile } from 'xlsx';
import { cn } from '@/lib/utils';

interface ParsedHoliday {
  holiday_name: string;
  holiday_date: string;
  holiday_type: string;
  is_optional: boolean;
  description?: string;
  isValid: boolean;
  error?: string;
}

interface BulkHolidayImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendarId: number;
  calendarYear: number;
  calendarName: string;
  onSuccess: () => void;
}

export function BulkHolidayImportModal({
  isOpen,
  onClose,
  calendarId,
  calendarYear,
  calendarName,
  onSuccess,
}: BulkHolidayImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeMode, setActiveMode] = useState<'upload' | 'paste'>('upload');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Paste text state
  const [pasteContent, setPasteContent] = useState('');

  // Parsed list & loading state
  const [parsedHolidays, setParsedHolidays] = useState<ParsedHoliday[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const sampleHolidays = [
    { Date: `${calendarYear}-01-01`, 'Holiday Name': "New Year's Day", Category: 'Optional', 'Optional (Yes/No)': 'Yes', Description: 'First day of Gregorian year' },
    { Date: `${calendarYear}-01-26`, 'Holiday Name': 'Republic Day', Category: 'National', 'Optional (Yes/No)': 'No', Description: 'National gazetted holiday' },
    { Date: `${calendarYear}-03-24`, 'Holiday Name': 'Holi Festival', Category: 'Festival', 'Optional (Yes/No)': 'No', Description: 'Festival of colors' },
    { Date: `${calendarYear}-04-09`, 'Holiday Name': 'Eid al-Fitr', Category: 'Festival', 'Optional (Yes/No)': 'No', Description: 'Islamic festival' },
    { Date: `${calendarYear}-05-01`, 'Holiday Name': 'May Day / Labor Day', Category: 'National', 'Optional (Yes/No)': 'No', Description: 'International workers day' },
    { Date: `${calendarYear}-08-15`, 'Holiday Name': 'Independence Day', Category: 'National', 'Optional (Yes/No)': 'No', Description: 'National sovereignty day' },
    { Date: `${calendarYear}-10-02`, 'Holiday Name': 'Mahatma Gandhi Jayanti', Category: 'National', 'Optional (Yes/No)': 'No', Description: 'National holiday' },
    { Date: `${calendarYear}-10-20`, 'Holiday Name': 'Dussehra / Vijayadashami', Category: 'Festival', 'Optional (Yes/No)': 'No', Description: 'Festival celebration' },
    { Date: `${calendarYear}-10-29`, 'Holiday Name': 'Diwali (Deepavali)', Category: 'Festival', 'Optional (Yes/No)': 'No', Description: 'Festival of lights' },
    { Date: `${calendarYear}-12-25`, 'Holiday Name': 'Christmas Day', Category: 'Festival', 'Optional (Yes/No)': 'No', Description: 'Christmas public holiday' },
  ];

  // ─── 1. Download Sample Excel (.xlsx) ───────────────────────────────────────
  const handleDownloadExcel = () => {
    try {
      const ws = utils.json_to_sheet(sampleHolidays);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, `Holidays_${calendarYear}`);

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Date
        { wch: 28 }, // Holiday Name
        { wch: 15 }, // Category
        { wch: 18 }, // Optional
        { wch: 35 }, // Description
      ];

      writeFile(wb, `Holiday_Calendar_Template_${calendarYear}.xlsx`);
      showToast.success('Template Downloaded', `Sample Excel template for Year ${calendarYear} downloaded.`);
    } catch (err) {
      showToast.error('Download Failed', 'Could not generate Excel template.');
    }
  };

  // ─── 2. Download Sample CSV (.csv) ──────────────────────────────────────────
  const handleDownloadCSV = () => {
    try {
      const header = 'Date,Holiday Name,Category,Optional (Yes/No),Description\n';
      const rows = sampleHolidays
        .map(
          (h) =>
            `"${h.Date}","${h['Holiday Name']}","${h.Category}","${h['Optional (Yes/No)']}","${h.Description}"`
        )
        .join('\n');
      const csvContent = header + rows;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Holiday_Calendar_Template_${calendarYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast.success('CSV Template Downloaded', `Sample CSV template for Year ${calendarYear} downloaded.`);
    } catch (err) {
      showToast.error('Download Failed', 'Could not generate CSV template.');
    }
  };

  // ─── 3. Download Sample PDF Reference Document ──────────────────────────────
  const handleDownloadPDF = () => {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        showToast.error('Popup Blocked', 'Please allow popups to view/print sample PDF template.');
        return;
      }

      const rowsHtml = sampleHolidays
        .map(
          (h, i) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 8px 12px; font-size: 11px;">${i + 1}</td>
          <td style="padding: 8px 12px; font-family: monospace; font-size: 11px; font-weight: 600;">${h.Date}</td>
          <td style="padding: 8px 12px; font-size: 11px; font-weight: 600;">${h['Holiday Name']}</td>
          <td style="padding: 8px 12px; font-size: 11px;">
            <span style="display:inline-block; padding: 2px 8px; border-radius: 9999px; background: #e0e7ff; color: #3730a3; font-size: 10px; font-weight: 600;">
              ${h.Category}
            </span>
          </td>
          <td style="padding: 8px 12px; font-size: 11px;">${h['Optional (Yes/No)']}</td>
          <td style="padding: 8px 12px; font-size: 10px; color: #6b7280;">${h.Description}</td>
        </tr>
      `
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Holiday Calendar Schedule ${calendarYear} - Sample Reference</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #111827; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 20px; font-weight: bold; color: #1e1b4b; }
            .subtitle { font-size: 12px; color: #6b7280; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; text-align: left; }
            th { background-color: #f9fafb; padding: 10px 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #d1d5db; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
            .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">${calendarName} (${calendarYear})</div>
              <div class="subtitle">Official Public & Gazetted Holiday Calendar Reference Schedule</div>
            </div>
            <div style="font-size: 11px; text-align: right; color: #4f46e5; font-weight: 600;">
              Total Holidays: ${sampleHolidays.length}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date (YYYY-MM-DD)</th>
                <th>Holiday Name</th>
                <th>Category</th>
                <th>Floater Option</th>
                <th>Description / Notes</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Generated via ApponextHRMS Holiday Master Sub-Module • Print or save as PDF (Ctrl+P / Cmd+P)
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      showToast.success('PDF Preview Opened', 'Print or save sample PDF from browser preview.');
    } catch (err) {
      showToast.error('PDF Failed', 'Could not open PDF preview.');
    }
  };

  // ─── File Parsing Logic ────────────────────────────────────────────────────
  const parseFileContent = async (file: File) => {
    setSelectedFile(file);
    setParsing(true);
    setPreviewError(null);

    const fileName = file.name.toLowerCase();

    try {
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        const wb = read(buffer, { type: 'array' });
        const firstSheetName = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheetName];
        const rawJson: any[] = utils.sheet_to_json(ws, { defval: '' });

        processRawRows(rawJson);
      } else if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
        const text = await file.text();
        parseTextRows(text);
      } else if (fileName.endsWith('.json')) {
        const text = await file.text();
        const json = JSON.parse(text);
        const list = Array.isArray(json) ? json : json.holidays || [];
        processRawRows(list);
      } else if (fileName.endsWith('.pdf')) {
        // For PDF files, inform user or parse text if available
        const text = await file.text().catch(() => '');
        if (text && text.length > 50) {
          parseTextRows(text);
        } else {
          showToast.info(
            'PDF Selected',
            'For exact automated parsing, please use .xlsx or .csv template, or paste the text content in Paste tab.'
          );
          setActiveMode('paste');
        }
      } else {
        showToast.error('Unsupported Format', 'Please upload .xlsx, .csv, .txt, or .json file.');
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setPreviewError(err?.message || 'Failed to parse file content. Please check file format.');
      setParsedHolidays([]);
    } finally {
      setParsing(false);
    }
  };

  // ─── Process Structured Objects ────────────────────────────────────────────
  const processRawRows = (rows: any[]) => {
    if (!rows || rows.length === 0) {
      setPreviewError('File contains no records or empty sheet.');
      setParsedHolidays([]);
      return;
    }

    const holidays: ParsedHoliday[] = [];

    rows.forEach((row) => {
      // Find Date
      const rawDate =
        row.Date ||
        row.date ||
        row.holiday_date ||
        row.Holiday_Date ||
        row['Holiday Date'] ||
        row.DATE ||
        '';

      // Find Name
      const rawName =
        row['Holiday Name'] ||
        row.holiday_name ||
        row.Holiday_Name ||
        row.Name ||
        row.name ||
        row.HOLIDAY_NAME ||
        '';

      // Find Category / Type
      const rawType =
        row.Category ||
        row.category ||
        row.holiday_type ||
        row.Holiday_Type ||
        row.Type ||
        row.type ||
        'National';

      // Find Optional Flag
      const rawOpt =
        row['Optional (Yes/No)'] ||
        row.is_optional ||
        row.Optional ||
        row.optional ||
        row.isOptional ||
        '';

      const isOpt =
        String(rawOpt).toLowerCase() === 'yes' ||
        String(rawOpt).toLowerCase() === 'true' ||
        rawOpt === true ||
        rawOpt === 1;

      const rawDesc = row.Description || row.description || row.Notes || row.notes || '';

      const nameTrim = String(rawName).trim();
      let dateStr = String(rawDate).trim().split('T')[0];

      // Handle Excel numeric date serials if any
      if (typeof rawDate === 'number') {
        const utcDays = Math.floor(rawDate - 25569);
        const utcVal = utcDays * 86400;
        const dateInfo = new Date(utcVal * 1000);
        dateStr = dateInfo.toISOString().split('T')[0];
      }

      if (!nameTrim && !dateStr) return; // Skip empty rows

      let isValid = true;
      let error: string | undefined;

      if (!nameTrim) {
        isValid = false;
        error = 'Missing holiday name';
      } else if (!dateStr || isNaN(Date.parse(dateStr))) {
        isValid = false;
        error = 'Invalid date format (must be YYYY-MM-DD)';
      } else {
        const parsedYear = new Date(dateStr).getFullYear();
        if (parsedYear !== calendarYear) {
          isValid = false;
          error = `Date is in year ${parsedYear}, but calendar is Year ${calendarYear}`;
        }
      }

      holidays.push({
        holiday_name: nameTrim || 'Untitled Holiday',
        holiday_date: dateStr,
        holiday_type: normalizeType(rawType),
        is_optional: isOpt,
        description: String(rawDesc).trim() || undefined,
        isValid,
        error,
      });
    });

    setParsedHolidays(holidays);
    if (holidays.length === 0) {
      setPreviewError('No valid holiday rows found. Check column headers: Date, Holiday Name, Category');
    }
  };

  // ─── Process Plain Text / CSV Rows ─────────────────────────────────────────
  const parseTextRows = (text: string) => {
    const lines = text.split(/\r?\n/);
    const rows: any[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      const parts = trimmed.split(/,|\t|;/).map((p) => p.replace(/^["']|["']$/g, '').trim());

      // If header line
      if (parts[0].toLowerCase() === 'date' || parts[0].toLowerCase() === 'holiday name') return;

      if (parts.length >= 2) {
        let dateStr = '';
        let nameStr = '';
        let typeStr = 'National';
        let optStr = 'No';
        let descStr = '';

        if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
          dateStr = parts[0];
          nameStr = parts[1];
          if (parts[2]) typeStr = parts[2];
          if (parts[3]) optStr = parts[3];
          if (parts[4]) descStr = parts[4];
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(parts[1])) {
          nameStr = parts[0];
          dateStr = parts[1];
          if (parts[2]) typeStr = parts[2];
          if (parts[3]) optStr = parts[3];
          if (parts[4]) descStr = parts[4];
        } else {
          dateStr = parts[0];
          nameStr = parts[1];
        }

        rows.push({
          Date: dateStr,
          'Holiday Name': nameStr,
          Category: typeStr,
          'Optional (Yes/No)': optStr,
          Description: descStr,
        });
      }
    });

    processRawRows(rows);
  };

  const normalizeType = (type: any): string => {
    const t = String(type || '').toLowerCase();
    if (t.includes('fest')) return 'Festival';
    if (t.includes('nat')) return 'National';
    if (t.includes('opt') || t.includes('float')) return 'Optional';
    if (t.includes('restr')) return 'Restricted';
    return 'National';
  };

  // ─── Submit Import ─────────────────────────────────────────────────────────
  const handleImportSubmit = async () => {
    const validItems = parsedHolidays.filter((h) => h.isValid);
    if (validItems.length === 0) {
      showToast.error('No Valid Records', 'Please fix errors or upload a valid file before importing.');
      return;
    }

    setImporting(true);
    try {
      const payload = {
        holidays: validItems.map((h) => ({
          holiday_name: h.holiday_name,
          holiday_date: h.holiday_date,
          holiday_type: h.holiday_type,
          is_optional: h.is_optional,
          description: h.description || null,
        })),
      };

      const res = await apiClient.post(`/master/holiday-calendars/${calendarId}/holidays/bulk`, payload);

      showToast.success(
        'Bulk Import Successful',
        res.data?.message || `${validItems.length} holidays imported into ${calendarName}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast.error('Import Failed', err?.response?.data?.message || 'Could not import holidays into calendar.');
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedHolidays.filter((h) => h.isValid).length;
  const invalidCount = parsedHolidays.filter((h) => !h.isValid).length;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[720px] p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800 space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                  Bulk Holiday Upload & Import
                  <Badge variant="secondary" className="text-[11px] font-semibold">
                    Year {calendarYear}
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Target Calendar: <strong className="text-neutral-700 dark:text-neutral-300">{calendarName}</strong>
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* ─── SAMPLE DOWNLOAD TEMPLATES BAR ──────────────────────────────── */}
        <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-950 dark:text-indigo-200">
            <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Download Sample Templates:</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadExcel}
              className="h-8 px-2.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-neutral-800 border-indigo-200 dark:border-indigo-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 shadow-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (.xlsx)
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              className="h-8 px-2.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-neutral-800 border-indigo-200 dark:border-indigo-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 shadow-xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              CSV (.csv)
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="h-8 px-2.5 text-[11px] font-semibold rounded-lg bg-white dark:bg-neutral-800 border-indigo-200 dark:border-indigo-800 text-purple-700 dark:text-purple-400 hover:bg-purple-50 shadow-xs flex items-center gap-1.5"
            >
              <File className="w-3.5 h-3.5" />
              PDF Reference
            </Button>
          </div>
        </div>

        {/* ─── MODE SELECTOR (UPLOAD VS PASTE) ─────────────────────────────── */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={cn(
              'px-4 py-2 border-b-2 flex items-center gap-2 transition-all',
              activeMode === 'upload'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            )}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload File (.xlsx, .csv, .pdf)
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('paste')}
            className={cn(
              'px-4 py-2 border-b-2 flex items-center gap-2 transition-all',
              activeMode === 'paste'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            )}
          >
            <FileCode className="w-3.5 h-3.5" />
            Paste Text / JSON Lines
          </button>
        </div>

        {/* ─── BODY CONTAINER ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {activeMode === 'upload' ? (
            <div className="space-y-3">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    parseFileContent(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2',
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[0.99]'
                    : 'border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 bg-neutral-50/50 dark:bg-neutral-950/40'
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      parseFileContent(e.target.files[0]);
                    }
                  }}
                  accept=".xlsx,.xls,.csv,.txt,.json,.pdf"
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Click to browse or drag and drop your holiday file here
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Supports <strong>Excel (.xlsx, .xls)</strong>, <strong>CSV (.csv)</strong>, <strong>PDF (.pdf)</strong>, <strong>JSON</strong>
                  </p>
                </div>

                {selectedFile && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono text-neutral-800 dark:text-neutral-200">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{selectedFile.name}</span>
                    <span className="text-[10px] text-neutral-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Enter one holiday per line: <code className="font-mono text-[11px] bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">YYYY-MM-DD, Holiday Name, Category</code></span>
                <button
                  type="button"
                  onClick={() => {
                    const sample = sampleHolidays.map((h) => `${h.Date}, ${h['Holiday Name']}, ${h.Category}`).join('\n');
                    setPasteContent(sample);
                    parseTextRows(sample);
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Load Sample Data
                </button>
              </div>

              <textarea
                rows={6}
                value={pasteContent}
                onChange={(e) => {
                  setPasteContent(e.target.value);
                  parseTextRows(e.target.value);
                }}
                placeholder={`2027-01-01, New Year's Day, Optional\n2027-01-26, Republic Day, National\n2027-03-24, Holi, Festival\n2027-08-15, Independence Day, National\n2027-10-02, Gandhi Jayanti, National\n2027-10-29, Diwali, Festival\n2027-12-25, Christmas, Festival`}
                className="w-full text-xs font-mono p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
          )}

          {/* ─── PARSED PREVIEW & VALIDATION ───────────────────────────────── */}
          {parsing && (
            <div className="py-6 text-center text-neutral-500 flex items-center justify-center gap-2 text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Parsing holiday file...
            </div>
          )}

          {previewError && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-2.5 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Parsing Warning</span>
                {previewError}
              </div>
            </div>
          )}

          {parsedHolidays.length > 0 && !parsing && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-900 dark:text-white">Parsed Preview:</span>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-bold">
                    {validCount} Valid
                  </Badge>
                  {invalidCount > 0 && (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 text-[11px] font-bold">
                      {invalidCount} Invalid
                    </Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setParsedHolidays([]);
                    setSelectedFile(null);
                    setPasteContent('');
                  }}
                  className="h-7 text-xs text-neutral-500 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Holiday Name</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Floater</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {parsedHolidays.map((item, idx) => (
                      <tr
                        key={idx}
                        className={cn(
                          'hover:bg-neutral-50/50',
                          !item.isValid && 'bg-red-50/40 dark:bg-red-950/20 text-red-900 dark:text-red-200'
                        )}
                      >
                        <td className="py-2 px-3 font-mono font-medium">{item.holiday_date}</td>
                        <td className="py-2 px-3 font-semibold">{item.holiday_name}</td>
                        <td className="py-2 px-3">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800">
                            {item.holiday_type}
                          </span>
                        </td>
                        <td className="py-2 px-3">{item.is_optional ? 'Yes' : 'No'}</td>
                        <td className="py-2 px-3 text-right font-medium">
                          {item.isValid ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Ready
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 flex items-center justify-end gap-1 text-[11px]" title={item.error}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              {item.error || 'Error'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="pt-3 border-t border-neutral-100 dark:border-neutral-800 gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold rounded-xl"
            disabled={importing}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleImportSubmit}
            disabled={validCount === 0 || importing}
            className="h-9 px-5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Importing {validCount} Holidays...
              </>
            ) : (
              `Import ${validCount} Holidays`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
