import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, FileText, Landmark, PieChart } from 'lucide-react';
import { toast } from 'sonner';

export default function PayrollPage() {
  const payslips = [
    { period: 'June 2026', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500' },
    { period: 'May 2026', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500' },
    { period: 'April 2026', netPaid: '₹68,500', base: '₹50,000', allowance: '₹22,000', deduction: '₹3,500' },
  ];

  const handleDownload = (period: string) => {
    toast.success(`Downloading payslip for ${period}...`);
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
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-violet-500" /> Issued Payslips List
              </CardTitle>
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
                  {payslips.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{p.period}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono font-medium">₹72,000</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono text-rose-500 font-medium">{p.deduction}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono font-bold text-foreground">{p.netPaid}</TableCell>
                      <TableCell className="px-6 py-4 text-xs text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDownload(p.period)}
                          className="h-8 hover:text-violet-600 font-semibold gap-1 text-xs"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
