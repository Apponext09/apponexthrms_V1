import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileSpreadsheet, CheckCircle2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api';

interface BulkCandidateImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkCandidateImportModal: React.FC<BulkCandidateImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleDownloadSample = () => {
    const csvContent =
      'First Name,Last Name,Email,Phone,Alt Phone,Gender,Marital Status,Qualification,Skills,Date of Birth,Years Of Experience,Current Company,Current Salary,Expected Salary,Notice Period Days,LinkedIn URL,Portfolio URL,Source\n' +
      'Rahul,Sharma,rahul.sharma@example.com,9876543210,9876543299,Male,Single,B.Tech,React; Node.js; MySQL,1995-08-15,4,TechCorp,800000,1200000,30,https://linkedin.com/in/rahul,https://github.com/rahul,job_board\n' +
      'Priya,Patel,priya.patel@example.com,9876543211,9876543288,Female,Married,M.Tech,Python; Data Analysis; SQL,1993-04-20,6,InfoSys,1200000,1600000,60,https://linkedin.com/in/priya,,Referral\n' +
      'Amit,Verma,amit.verma@example.com,9876543212,,Male,Unmarried,B.Sc,Java; Spring Boot,1998-12-10,2,Wipro,500000,750000,15,https://linkedin.com/in/amit,,direct_apply\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'all_fields_candidate_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVText = (text: string) => {
    const lines = text.split(/\r\n|\n/).filter((line) => line.trim() !== '');
    if (lines.length <= 1) {
      toast.error('The selected file appears to be empty or missing data rows.');
      return [];
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i].split(',').map((c) => c.trim());
      if (currentLine.length < 2) continue;

      const obj: any = {};
      headers.forEach((header, index) => {
        const val = currentLine[index] || '';
        if (header.includes('first')) obj.firstName = val;
        else if (header.includes('last')) obj.lastName = val;
        else if (header.includes('email')) obj.email = val;
        else if (header.includes('alt') || header.includes('sec')) obj.alternativePhone = val;
        else if (header.includes('phone') || header.includes('mobile')) obj.phone = val;
        else if (header.includes('gender')) obj.gender = val;
        else if (header.includes('marital')) obj.maritalStatus = val;
        else if (header.includes('qual') || header.includes('edu') || header.includes('degree')) obj.qualification = val;
        else if (header.includes('skill')) obj.skills = val;
        else if (header.includes('dob') || header.includes('birth')) obj.dateOfBirth = val;
        else if (header.includes('company')) obj.currentCompany = val;
        else if (header.includes('exp') || header.includes('year')) obj.yearsOfExperience = val;
        else if (header.includes('expectedsal') || header.includes('ectc')) obj.expectedSalary = val;
        else if (header.includes('currentsal') || header.includes('ctc') || header.includes('salary')) obj.currentSalary = val;
        else if (header.includes('notice')) obj.noticePeriodDays = val;
        else if (header.includes('linkedin')) obj.linkedinUrl = val;
        else if (header.includes('port') || header.includes('github')) obj.portfolioUrl = val;
        else if (header.includes('source')) obj.source = val;
      });

      // Fallback column positioning
      if (!obj.email) {
        obj.firstName = currentLine[0] || '';
        obj.lastName = currentLine[1] || '';
        obj.email = currentLine[2] || '';
        obj.phone = currentLine[3] || '';
        obj.alternativePhone = currentLine[4] || '';
        obj.gender = currentLine[5] || '';
        obj.maritalStatus = currentLine[6] || '';
        obj.qualification = currentLine[7] || '';
        obj.skills = currentLine[8] || '';
        obj.dateOfBirth = currentLine[9] || '';
        obj.yearsOfExperience = currentLine[10] || '';
        obj.currentCompany = currentLine[11] || '';
        obj.currentSalary = currentLine[12] || '';
        obj.expectedSalary = currentLine[13] || '';
        obj.noticePeriodDays = currentLine[14] || '';
        obj.linkedinUrl = currentLine[15] || '';
        obj.portfolioUrl = currentLine[16] || '';
        obj.source = currentLine[17] || 'bulk_import';
      }

      if (obj.email && obj.email.includes('@')) {
        rows.push(obj);
      }
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const rows = parseCSVText(content);
        setParsedData(rows);
        toast.success(`Parsed ${rows.length} valid candidate records from ${selectedFile.name}`);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error('No valid candidate records to import.');
      return;
    }

    try {
      setIsUploading(true);
      const res = await apiClient.post('/recruitment/candidates/bulk-import', {
        candidates: parsedData,
      });

      const responseData = res.data;
      if (responseData?.success || res.status === 200 || res.status === 201) {
        toast.success(responseData?.message || `Successfully processed ${parsedData.length} candidates!`);
        onSuccess();
        onClose();
        setFile(null);
        setParsedData([]);
        setFileName('');
      } else {
        toast.error(responseData?.message || 'Failed to process bulk import.');
      }
    } catch (err: any) {
      console.error('Bulk candidate import error:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to complete bulk candidate import';
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full flex flex-col border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Bulk Import Candidates (Excel / CSV)</h2>
              <p className="text-xs text-slate-500">Upload 1,000+ candidates at once into database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Download Template Box */}
          <div className="flex items-center justify-between p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100">
            <div>
              <p className="text-xs font-bold text-indigo-900">Download CSV Sample Template</p>
              <p className="text-[11px] text-indigo-600">Standard headers: First Name, Last Name, Email, Phone, Company, Experience, Source</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadSample}
              className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> Template
            </Button>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-6 text-center bg-slate-50/50 transition-all cursor-pointer relative">
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">
              {fileName ? fileName : 'Click to select CSV / Excel File'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Supports files up to 10MB (1,000+ rows)</p>
          </div>

          {/* Validated Rows Count Badge */}
          {parsedData.length > 0 && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-900">
                  Ready to import {parsedData.length} valid candidate records!
                </span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                Validated
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isUploading} className="text-xs cursor-pointer">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={isUploading || parsedData.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 shadow-xs cursor-pointer"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Importing...
              </>
            ) : (
              <>Import {parsedData.length > 0 ? `${parsedData.length} Candidates` : 'File'}</>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
};
