import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, Landmark, TrendingUp } from 'lucide-react';
import { showToast, toast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';

export default function PayrollPage() {
  const [payslips, setPayslips] = React.useState<any[]>([]);
  const [revisions, setRevisions] = React.useState<any[]>([]);
  const [assignedStructure, setAssignedStructure] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [fromMonth, setFromMonth] = React.useState('');
  const [toMonth, setToMonth] = React.useState('');

  const formatPayPeriod = (item: any) => {
    const raw = item?.payslipMonth || item?.payslip_month || item?.month || item?.period || item?.createdAt || item?.created_at;
    if (!raw) return 'Current Pay Period';
    const str = String(raw).trim();
    if (str.includes(' ') && !str.includes('-')) return str;
    
    const dateStr = str.split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      const yr = parseInt(parts[0]);
      const mo = parseInt(parts[1]) - 1;
      if (!isNaN(yr) && !isNaN(mo) && mo >= 0 && mo <= 11) {
        const d = new Date(yr, mo, 1);
        return d.toLocaleString('default', { month: 'long', year: 'numeric' });
      }
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    return str;
  };

  React.useEffect(() => {
    const fetchPayrollData = async () => {
      try {
        const [payslipRes, revisionRes, structRes] = await Promise.all([
          apiClient.get('/payroll/payslips').catch(() => null),
          apiClient.get('/payroll/salary-revisions').catch(() => null),
          apiClient.get('/payroll/my-salary-structure').catch(() => null)
        ]);

        if (payslipRes?.data?.success && Array.isArray(payslipRes.data.data)) {
          const formatted = payslipRes.data.data.map((item: any) => {
            const periodStr = formatPayPeriod(item);
            const gross = Number(item.grossSalary || item.gross_salary || item.gross_earnings || 0);
            const ded = Number(item.totalDeductions || item.total_deductions || item.deductions || 0);
            const net = Number(item.netSalary || item.net_salary || item.net_paid || (gross - ded) || 0);
            const base = Number(item.basicSalary || item.basic_salary || Math.round(gross * 0.5));
            const allowance = Math.max(0, gross - base);
            const rawDateStr = item.payslipMonth || item.payslip_month || item.month || '';

            return {
              period: periodStr,
              grossEarnings: `₹${gross.toLocaleString('en-IN')}`,
              deduction: `₹${ded.toLocaleString('en-IN')}`,
              netPaid: `₹${net.toLocaleString('en-IN')}`,
              base: `₹${base.toLocaleString('en-IN')}`,
              allowance: `₹${allowance.toLocaleString('en-IN')}`,
              rawDateStr: String(rawDateStr).substring(0, 7)
            };
          });
          setPayslips(formatted);
        }

        if (revisionRes?.data?.success && Array.isArray(revisionRes.data.data)) {
          setRevisions(revisionRes.data.data);
        }

        const structData = structRes?.data?.data || structRes?.data;
        if (structData && (structData.annualCtc !== undefined || structData.grossMonthly !== undefined || structData.structureName)) {
          setAssignedStructure(structData);
        }
      } catch (err) {
        console.warn('Could not fetch payroll data from API:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayrollData();
  }, []);

  const handleDownload = (payslip: any) => {
    const content = `
--------------------------------------------------
              SALARY SLIP - ${payslip.period.toUpperCase()}
--------------------------------------------------
Pay Period      : ${payslip.period}
Gross Salary    : ${payslip.grossEarnings}
Deductions      : ${payslip.deduction}
Net Salary      : ${payslip.netPaid}

Breakdown:
- Basic Pay     : ${payslip.base || '₹50,000'}
- Allowances    : ${payslip.allowance || '₹22,000'}
- PF/Tax Ded.   : ${payslip.deduction}
--------------------------------------------------
Thank you for your service!
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Payslip_${payslip.period.replace(' ', '_')}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded payslip for ${payslip.period}`);
  };

  const handleResetFilters = () => {
    setFromMonth('');
    setToMonth('');
  };

  const filteredPayslips = payslips.filter((p) => {
    if (fromMonth && p.rawDateStr < fromMonth) return false;
    if (toMonth && p.rawDateStr > toMonth) return false;
    return true;
  });

  const handleDownloadFilteredData = () => {
    if (filteredPayslips.length === 0) {
      toast.error('No data available to download for the selected date range.');
      return;
    }

    const headers = ['Pay Period', 'Gross Earnings', 'Deductions', 'Net Paid', 'Basic Pay', 'Special Allowance'];
    const rows = filteredPayslips.map((p) => [
      p.period,
      p.grossEarnings.replace('₹', '').replace(/,/g, ''),
      p.deduction.replace('₹', '').replace(/,/g, ''),
      p.netPaid.replace('₹', '').replace(/,/g, ''),
      p.base ? p.base.replace('₹', '').replace(/,/g, '') : '',
      p.allowance ? p.allowance.replace('₹', '').replace(/,/g, '') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((e) => e.map((val) => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    let filename = 'payslips_data';
    if (fromMonth) filename += `_from_${fromMonth}`;
    if (toMonth) filename += `_to_${toMonth}`;
    filename += '.csv';

    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Successfully downloaded ${filteredPayslips.length} records!`);
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Assigned Salary Structure</h2>
          <p className="text-xs text-muted-foreground">View your assigned salary structure, annual CTC breakdown, and salary history.</p>
        </div>
      </div>

      {/* Overview Banner for Assigned Salary Structure */}
      <div className="bg-card border border-border/80 p-5 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/10 text-primary font-black border-primary/20 text-xs px-2.5 py-1 uppercase">
              Assigned Structure
            </Badge>
            <h3 className="text-base font-extrabold text-foreground">
              {assignedStructure?.structureName || 'Standard Assigned Salary Structure'}
            </h3>
          </div>
          <div className="text-xs font-bold text-muted-foreground">
            Status: <span className="text-emerald-600 font-extrabold">Active</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
          <div className="p-3 bg-muted/20 rounded-xl space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Annual CTC</span>
            <div className="text-base font-extrabold text-foreground">
              ₹{Number(assignedStructure?.annualCtc || (assignedStructure?.grossMonthly ? assignedStructure.grossMonthly * 12 : 0)).toLocaleString('en-IN')} / yr
            </div>
          </div>
          <div className="p-3 bg-muted/20 rounded-xl space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Monthly Gross</span>
            <div className="text-base font-extrabold text-primary">
              ₹{Number(assignedStructure?.grossMonthly || 0).toLocaleString('en-IN')} / mo
            </div>
          </div>
          <div className="p-3 bg-muted/20 rounded-xl space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Basic Pay (50%)</span>
            <div className="text-base font-extrabold text-foreground">
              ₹{Number(assignedStructure?.basicMonthly || 0).toLocaleString('en-IN')} / mo
            </div>
          </div>
          <div className="p-3 bg-muted/20 rounded-xl space-y-1">
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Monthly Take-Home</span>
            <div className="text-base font-extrabold text-emerald-600">
              ₹{Number(assignedStructure?.netTakeHome || (assignedStructure?.grossMonthly ? assignedStructure.grossMonthly - (assignedStructure?.pfDeduction || 0) - 200 : 0)).toLocaleString('en-IN')} / mo
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Salary Structure Breakdown */}
        <Card className="border rounded-2xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Landmark className="w-4.5 h-4.5 text-violet-500" /> Salary Structure Details
            </CardTitle>
            {assignedStructure?.structureName && (
              <Badge variant="outline" className="text-[10px] font-bold bg-violet-50 text-violet-700 border-violet-200">
                {assignedStructure.structureName}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-xs pt-4">
            {assignedStructure ? (
              <>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-semibold text-muted-foreground">Basic Pay</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{Number(assignedStructure.basicMonthly || 0).toLocaleString('en-IN')} / month
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-semibold text-muted-foreground">House Rent Allowance (HRA)</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{Number(assignedStructure.hraMonthly || 0).toLocaleString('en-IN')} / month
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="font-semibold text-muted-foreground">Special Allowance</span>
                  <span className="font-mono font-bold text-foreground">
                    ₹{Number(assignedStructure.specialAllowanceMonthly || 0).toLocaleString('en-IN')} / month
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b text-rose-500">
                  <span className="font-semibold">PF Deduction</span>
                  <span className="font-mono font-bold">
                    -₹{Number(assignedStructure.pfDeduction || 0).toLocaleString('en-IN')} / month
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b text-rose-500">
                  <span className="font-semibold">Professional Tax (PT)</span>
                  <span className="font-mono font-bold">
                    -₹{Number(assignedStructure.ptDeduction || 200).toLocaleString('en-IN')} / month
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 text-sm font-extrabold text-foreground">
                  <span>Net In-Hand Salary</span>
                  <span className="font-mono text-emerald-600">
                    ₹{Number(assignedStructure.netTakeHome || (assignedStructure.grossMonthly ? assignedStructure.grossMonthly - (assignedStructure.pfDeduction || 0) - 200 : 0)).toLocaleString('en-IN')} / month
                  </span>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground text-xs italic py-4 text-center">
                No active salary structure currently assigned.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary Revision History Card */}
        <Card className="border rounded-2xl shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4.5 h-4.5 text-emerald-500" /> Salary Revision History
              </span>
              <Badge variant="outline" className="font-bold text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                {revisions.length} Records
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-xs">
            {revisions.length === 0 ? (
              <div className="text-muted-foreground text-xs italic py-2 text-center">
                No salary revisions or appraisal hikes recorded yet.
              </div>
            ) : (
              revisions.map((rev: any, idx: number) => (
                <div key={idx} className="p-3 bg-muted/20 border border-border/80 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center font-bold text-foreground">
                    <span className="text-xs">{rev.revisionType || rev.revision_type || 'Appraisal Hike'}</span>
                    <Badge variant="outline" className="font-bold text-[10px] capitalize bg-emerald-50 text-emerald-700 border-emerald-200">
                      {rev.status || 'Approved'}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Effective Date: <span className="font-medium text-foreground">{rev.effectiveFrom || rev.effective_from || '2026-08-01'}</span>
                  </div>
                  <div className="flex justify-between items-center font-mono text-xs pt-1 border-t border-border/60">
                    <span className="text-muted-foreground line-through text-[11px]">
                      ₹{((rev.oldCtc || rev.currentCtc || 0) / 100000).toFixed(2)}L
                    </span>
                    <span className="font-extrabold text-emerald-600">
                      ₹{((rev.newCtc || rev.proposedCtc || 0) / 100000).toFixed(2)}L / yr
                      {rev.incrementPercentage ? ` (+${rev.incrementPercentage}%)` : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

