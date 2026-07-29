import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileText, Landmark } from 'lucide-react';
import { showToast, toast } from '@/components/ui/toast';
import { apiClient } from '@/lib/api';

export default function PayrollPage() {
  const [payslips, setPayslips] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fromMonth, setFromMonth] = React.useState('');
  const [toMonth, setToMonth] = React.useState('');

  React.useEffect(() => {
    const fetchPayslips = async () => {
      try {
        const res = await apiClient.get('/payroll/payslips');
        if (res.data && res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const formatted = res.data.data.map((item: any) => {
            const date = new Date(item.payslipMonth + '-02');
            const periodStr = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            return {
              period: periodStr,
              grossEarnings: `₹${Number(item.grossSalary).toLocaleString('en-IN')}`,
              deduction: `₹${Number(item.totalDeductions).toLocaleString('en-IN')}`,
              netPaid: `₹${Number(item.netSalary).toLocaleString('en-IN')}`,
              base: `₹${Number(item.basicSalary).toLocaleString('en-IN')}`,
              allowance: `₹${Number(item.grossSalary - item.basicSalary).toLocaleString('en-IN')}`,
              rawDateStr: item.payslipMonth.substring(0, 7)
            };
          });
          setPayslips(formatted);
        } else {
          useMockData();
        }
      } catch (err) {
        console.warn('Could not fetch payslips from API, using mockup data:', err);
        useMockData();
      } finally {
        setLoading(false);
      }
    };

    const useMockData = () => {
      const mockPayslips = [
        { period: 'September 2026', grossEarnings: '₹72,000', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500', rawDateStr: '2026-09' },
        { period: 'August 2026', grossEarnings: '₹72,000', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500', rawDateStr: '2026-08' },
        { period: 'July 2026', grossEarnings: '₹72,000', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500', rawDateStr: '2026-07' },
        { period: 'June 2026', grossEarnings: '₹72,000', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500', rawDateStr: '2026-06' },
        { period: 'May 2026', grossEarnings: '₹72,000', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500', rawDateStr: '2026-05' },
        { period: 'April 2026', grossEarnings: '₹72,000', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500', rawDateStr: '2026-04' },
        { period: 'March 2026', grossEarnings: '₹72,000', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500', rawDateStr: '2026-03' },
        { period: 'February 2026', grossEarnings: '₹72,000', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500', rawDateStr: '2026-02' },
        { period: 'January 2026', grossEarnings: '₹72,000', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500', rawDateStr: '2026-01' },
      ];
      setPayslips(mockPayslips);
    };

    fetchPayslips();
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
          <h2 className="text-lg font-bold text-foreground">Payroll & Payslips</h2>
          <p className="text-xs text-muted-foreground">Access your salary history, payslip PDFs, and breakdown structure.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Salary Breakdown */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Landmark className="w-4.5 h-4.5 text-violet-500" /> Salary Structure Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-semibold text-muted-foreground">Basic Pay</span>
                <span className="font-mono font-bold text-foreground">₹50,000 / month</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-semibold text-muted-foreground">House Rent Allowance (HRA)</span>
                <span className="font-mono font-bold text-foreground">₹15,000 / month</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="font-semibold text-muted-foreground">Special Allowance</span>
                <span className="font-mono font-bold text-foreground">₹7,000 / month</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-rose-500">
                <span className="font-semibold">PF Deduction</span>
                <span className="font-mono font-bold">-₹1,800 / month</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-rose-500">
                <span className="font-semibold">Professional Tax (PT)</span>
                <span className="font-mono font-bold">-₹200 / month</span>
              </div>
              <div className="flex justify-between items-center pt-2 text-sm font-extrabold text-foreground">
                <span>Net In-Hand Salary</span>
                <span className="font-mono">₹70,000 / month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Payslips Table */}
        <div className="lg:col-span-2">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-violet-500" /> Issued Payslips List
              </CardTitle>
              
              {/* Date Filters inside Card Header */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">From:</span>
                  <input
                    type="month"
                    value={fromMonth}
                    onChange={(e) => setFromMonth(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium text-foreground h-8"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">To:</span>
                  <input
                    type="month"
                    value={toMonth}
                    onChange={(e) => setToMonth(e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-violet-500 font-medium text-foreground h-8"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {(fromMonth || toMonth) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleResetFilters} 
                      className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground font-medium"
                    >
                      Reset
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={handleDownloadFilteredData} 
                    className="text-xs h-8 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Pay Period</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Gross Earnings</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Deductions</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4">Net Paid</TableHead>
                    <TableHead className="font-bold text-xs uppercase px-6 py-4 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs">
                        Loading payslips...
                      </TableCell>
                    </TableRow>
                  ) : filteredPayslips.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-xs">
                        No payslips found in the selected date range.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayslips.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell className="px-6 py-4 text-xs font-semibold">{p.period}</TableCell>
                        <TableCell className="px-6 py-4 text-xs font-mono font-medium">{p.grossEarnings}</TableCell>
                        <TableCell className="px-6 py-4 text-xs font-mono text-rose-500 font-medium">{p.deduction}</TableCell>
                        <TableCell className="px-6 py-4 text-xs font-mono font-bold text-foreground">{p.netPaid}</TableCell>
                        <TableCell className="px-6 py-4 text-xs text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDownload(p)}
                            className="h-8 hover:text-violet-600 font-semibold gap-1 text-xs"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

