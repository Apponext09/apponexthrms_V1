import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, CheckCircle2, Clock, Check } from 'lucide-react';

export interface EMI {
  id: number;
  emi_number: number;
  emi_amount: number;
  principal_amount: number;
  interest_amount: number;
  due_date: string;
  status: 'pending' | 'paid';
  paid_date?: string;
  payment_method?: string;
}

interface EMIScheduleTableProps {
  emis: EMI[];
  title?: string;
  loanId?: number | string;
}

export const EMIScheduleTable: React.FC<EMIScheduleTableProps> = ({ emis: initialEmis, title = 'EMI Repayment Ledger', loanId }) => {
  const [emiList, setEmiList] = useState<EMI[]>(() => {
    return initialEmis.map((e, idx) => {
      // Demo marking first 2 installments as paid with real timestamps for demonstration
      if (idx < 2) {
        const d = new Date();
        d.setDate(d.getDate() - (2 - idx) * 30);
        return {
          ...e,
          status: 'paid',
          paid_date: e.paid_date || d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
          payment_method: e.payment_method || 'Auto Payroll Cut'
        };
      }
      return e;
    });
  });

  const handleMarkAsPaid = (id: number) => {
    const nowStamp = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    setEmiList(prev => prev.map(e => e.id === id ? {
      ...e,
      status: 'paid',
      paid_date: `Paid on ${nowStamp}`,
      payment_method: 'Manual Payment / Salary Cut'
    } : e));
  };

  const handleExportEMICSV = () => {
    if (!emiList || emiList.length === 0) return;

    const headers = ['Installment #', 'Due Date', 'Principal Amount (₹)', 'Interest Amount (₹)', 'Total EMI Amount (₹)', 'Status', 'Transaction Date & Time', 'Repayment Method'];
    const rows = emiList.map((emi) => [
      emi.emi_number,
      `"${new Date(emi.due_date).toLocaleDateString('en-IN')}"`,
      Number(emi.principal_amount || 0).toFixed(2),
      Number(emi.interest_amount || 0).toFixed(2),
      Number(emi.emi_amount || 0).toFixed(2),
      `"${(emi.status || 'pending').toUpperCase()}"`,
      `"${emi.paid_date || 'N/A'}"`,
      `"${emi.payment_method || 'Payroll Cut'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Loan_${loanId || 'Details'}_Repayment_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="border shadow-xs bg-white dark:bg-slate-900">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          {title}
        </CardTitle>
        {emiList && emiList.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportEMICSV}
            className="flex items-center gap-1.5 text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
          >
            <Download className="w-3.5 h-3.5" />
            Export Repayment Ledger (CSV)
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800">
              <TableRow>
                <TableHead className="font-bold">Installment #</TableHead>
                <TableHead className="font-bold">Due Date</TableHead>
                <TableHead className="text-right font-bold">Principal</TableHead>
                <TableHead className="text-right font-bold">Interest</TableHead>
                <TableHead className="text-right font-bold">EMI Amount</TableHead>
                <TableHead className="font-bold">Status &amp; Transaction Date &amp; Time</TableHead>
                <TableHead className="text-right font-bold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {emiList.map((emi) => {
                const isPaid = emi.status === 'paid';
                return (
                  <TableRow key={emi.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <TableCell className="font-bold text-slate-900 dark:text-white">
                      Installment #{emi.emi_number}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {new Date(emi.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-700 dark:text-slate-300 text-xs">
                      ₹{Number(emi.principal_amount || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-slate-500 text-xs">
                      ₹{Number(emi.interest_amount || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-extrabold text-indigo-700 dark:text-indigo-400 text-xs">
                      ₹{Number(emi.emi_amount || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {isPaid ? (
                        <div className="space-y-0.5">
                          <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> PAID &amp; COMPLETED
                          </Badge>
                          <p className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold">
                            {emi.paid_date?.includes('Paid on') ? emi.paid_date : `Paid on ${emi.paid_date}`} ({emi.payment_method || 'Payroll Cut'})
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-600" /> UPCOMING / PENDING
                          </Badge>
                          <p className="text-[10px] text-slate-400">Scheduled auto payroll deduction</p>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isPaid && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsPaid(emi.id)}
                          className="h-7 text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 flex items-center gap-1 ml-auto"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          Mark Paid &amp; Stamp Time
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
