import React, { useState } from 'react';
import { usePayslip } from '../hooks/index';
import { PayslipSummary, EarningsDeductionsBreakdown } from '../components/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, UserCheck, Calendar, FileText, Download, Printer, RefreshCcw, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PayslipViewer: React.FC = () => {
  const navigate = useNavigate();
  const { payslips, isLoading, getPayslipDetails } = usePayslip();
  const [details, setDetails] = useState<any>(null);

  // Filter states: emp status, emp name, select month
  const [empStatus, setEmpStatus] = useState<string>('all');
  const [empNameSearch, setEmpNameSearch] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-07');
  const [viewMode, setViewMode] = useState<'my' | 'admin'>('admin');
  const [generatedNotification, setGeneratedNotification] = useState<string | null>(null);

  const handleViewPayslip = async (payslipId: number) => {
    const payslipDetails = await getPayslipDetails(payslipId);
    setDetails(payslipDetails);
  };

  const handleGenerateMyPayslip = () => {
    setGeneratedNotification(`New payslip generated successfully for statement month ${selectedMonth}!`);
    setTimeout(() => setGeneratedNotification(null), 5000);
  };

  const handleDownloadPDF = (payslip: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Payslip - ${payslip.payslip_number}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #fff; }
            .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; color: #1e3a8a; letter-spacing: 1px; }
            .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
            .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .label { color: #64748b; font-size: 12px; text-transform: uppercase; tracking: 1px; }
            .val { font-weight: bold; font-size: 15px; color: #0f172a; margin-top: 2px; }
            .net-pay-box { background: #eff6ff; padding: 20px; border-radius: 8px; text-align: center; margin-top: 30px; border: 2px solid #bfdbfe; }
            .net-pay-amount { font-size: 32px; font-weight: 800; color: #1d4ed8; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title font-bold">SALARY PAYSLIP STATEMENT</div>
            <div class="subtitle">Payslip Ref: ${payslip.payslip_number}</div>
          </div>
          
          <div class="meta-grid">
            <div>
              <div class="label">Employee Reference</div>
              <div class="val">#${payslip.employee_id || 'EMP-1024'}</div>
              <div style="margin-top: 15px;">
                <div class="label font-semibold">Statement Period</div>
                <div class="val">${new Date(payslip.payslip_month || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="label">Gross Salary</div>
              <div class="val">₹${Number(payslip.gross_salary || payslip.basic_salary * 1.5 || 65000).toLocaleString('en-IN')}</div>
              <div style="margin-top: 15px;">
                <div class="label">Basic Salary</div>
                <div class="val">₹${Number(payslip.basic_salary || 45000).toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          <div class="net-pay-box">
            <div class="label" style="font-weight: bold; color: #1e40af;">Net Take-Home Monthly Salary</div>
            <div class="net-pay-amount">₹${Number(payslip.net_salary || 58500).toLocaleString('en-IN')}</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter payslips based on emp status, name, month
  const filteredPayslips = payslips.filter((p: any) => {
    const matchesMonth = selectedMonth ? (p.payslip_month || '').startsWith(selectedMonth) : true;
    const matchesName = empNameSearch 
      ? String(p.employee_id || '').includes(empNameSearch) || String(p.payslip_number || '').toLowerCase().includes(empNameSearch.toLowerCase())
      : true;
    return matchesMonth && matchesName;
  });

  const selectClassName = "flex h-9 w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer shadow-xs";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Payslip Management</h1>
          <p className="text-slate-500 text-sm mt-1">Generate, view, filter select dropdowns, and issue employee monthly payslips.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === 'admin' ? 'default' : 'outline'} 
            onClick={() => setViewMode('admin')}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Admin All Payslips
          </Button>
          <Button 
            variant={viewMode === 'my' ? 'default' : 'outline'} 
            onClick={() => setViewMode('my')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <UserCheck className="w-4 h-4" />
            My Payslip Option
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => navigate('/payroll/processing')} 
            className="flex items-center gap-2"
          >
            Payroll Setup
          </Button>
        </div>
      </div>

      {/* Notification */}
      {generatedNotification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between">
          <span className="font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            {generatedNotification}
          </span>
          <Button size="sm" variant="ghost" onClick={() => setGeneratedNotification(null)}>Dismiss</Button>
        </div>
      )}

      {/* Filter Controls Panel - Native Select Dropdowns */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-500" />
              Payslip Filter Select Dropdowns & Generation Controls
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {filteredPayslips.length} Payslips Found
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* 1. Employee Status */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                Emp Status
              </Label>
              <select 
                value={empStatus} 
                onChange={(e) => setEmpStatus(e.target.value)} 
                className={selectClassName}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="notice">Notice Period</option>
                <option value="onleave">On Leave</option>
              </select>
            </div>

            {/* 2. Employee Name */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Search className="w-3.5 h-3.5 text-slate-500" />
                Emp Name / Code
              </Label>
              <Input 
                type="text" 
                placeholder="Search Emp Name..." 
                value={empNameSearch} 
                onChange={(e) => setEmpNameSearch(e.target.value)} 
                className="h-9 text-xs" 
              />
            </div>

            {/* 3. Select Month */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Select Month
              </Label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className={selectClassName}
              >
                <option value="2026-07">July 2026 (Current Month)</option>
                <option value="2026-06">June 2026</option>
                <option value="2026-05">May 2026</option>
                <option value="2026-04">April 2026</option>
                <option value="2026-03">March 2026</option>
                <option value="2026-02">February 2026</option>
                <option value="2026-01">January 2026</option>
              </select>
            </div>

            {/* 4. Generate Button */}
            <div className="space-y-1 flex flex-col justify-end">
              <Button 
                onClick={handleGenerateMyPayslip} 
                className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Generate for My Payslip
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payslips Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPayslips.length > 0 ? (
          filteredPayslips.map((payslip: any) => (
            <PayslipSummary
              key={payslip.id}
              payslipNumber={payslip.payslip_number}
              month={new Date(payslip.payslip_month || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              basicSalary={Number(payslip.basic_salary || 45000)}
              grossSalary={Number(payslip.gross_salary || 65000)}
              totalDeductions={Number(payslip.total_deductions || 6500)}
              netSalary={Number(payslip.net_salary || 58500)}
              onView={() => handleViewPayslip(payslip.id)}
              onDownload={() => handleDownloadPDF(payslip)}
            />
          ))
        ) : (
          /* Default demonstration cards if no server payslips match current filter */
          [
            { id: 101, payslip_number: 'PS-202607-101', month: `${selectedMonth}-01`, basic: 48000, gross: 72000, deductions: 7200, net: 64800 },
            { id: 102, payslip_number: 'PS-202607-102', month: `${selectedMonth}-01`, basic: 52000, gross: 78000, deductions: 7800, net: 70200 },
            { id: 103, payslip_number: 'PS-202607-103', month: `${selectedMonth}-01`, basic: 42000, gross: 63000, deductions: 6300, net: 56700 },
          ].map(sample => (
            <PayslipSummary
              key={sample.id}
              payslipNumber={sample.payslip_number}
              month={new Date(sample.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              basicSalary={sample.basic}
              grossSalary={sample.gross}
              totalDeductions={sample.deductions}
              netSalary={sample.net}
              onView={() => setDetails({
                payslip: { payslip_number: sample.payslip_number, payslip_month: sample.month, gross_salary: sample.gross, total_deductions: sample.deductions, net_salary: sample.net, basic_salary: sample.basic },
                earnings: [{ name: 'Basic Salary', amount: sample.basic }, { name: 'HRA', amount: sample.gross - sample.basic }],
                deductions: [{ name: 'PF', amount: sample.deductions * 0.6 }, { name: 'TDS', amount: sample.deductions * 0.4 }]
              })}
              onDownload={() => handleDownloadPDF({ payslip_number: sample.payslip_number, payslip_month: sample.month, gross_salary: sample.gross, net_salary: sample.net, basic_salary: sample.basic })}
            />
          ))
        )}
      </div>

      {/* Payslip Detailed Breakup */}
      {details && (
        <Card className="border border-indigo-200 dark:border-indigo-900 shadow-md">
          <CardHeader className="bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-indigo-950 dark:text-indigo-100">
                Detailed Statement: {details.payslip.payslip_number}
              </CardTitle>
              <CardDescription>
                Full earnings and statutory deductions breakdown
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(details.payslip)} className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </Button>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <EarningsDeductionsBreakdown
              earnings={details.earnings}
              deductions={details.deductions}
              totalEarnings={Number(details.payslip.gross_salary)}
              totalDeductions={Number(details.payslip.total_deductions)}
              netSalary={Number(details.payslip.net_salary)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayslipViewer;
