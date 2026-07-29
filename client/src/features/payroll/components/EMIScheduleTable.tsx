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
    <Card className="border border-border/80 shadow-xs bg-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-border/60">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          <FileSpreadsheet className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
        {emiList && emiList.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportEMICSV}
            className="flex items-center gap-1.5 text-xs font-semibold h-7"
          >
            <Download className="w-3.5 h-3.5" />
            Export Ledger (CSV)
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-b border-border/60">
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Installment #</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Due Date</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Principal</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Interest</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">EMI Amount</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Status & Transaction Details</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {emiList.map((emi) => {
                const isPaid = emi.status === 'paid';
                return (
                  <TableRow key={emi.id} className="hover:bg-muted/20 transition-colors text-xs">
                    <TableCell className="font-bold text-foreground">
                      #{emi.emi_number}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-muted-foreground">
                      {new Date(emi.due_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-foreground text-xs">
                      ₹{Number(emi.principal_amount || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-muted-foreground text-xs">
                      ₹{Number(emi.interest_amount || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-black text-primary text-xs">
                      ₹{Number(emi.emi_amount || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {isPaid ? (
                        <div className="space-y-0.5">
                          <Badge className="bg-emerald-600 text-white font-extrabold text-[9px] px-2 py-0.5 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> PAID
                          </Badge>
                          <p className="text-[10px] font-mono text-emerald-600 font-semibold">
                            {emi.paid_date?.includes('Paid on') ? emi.paid_date : `Paid on ${emi.paid_date}`} ({emi.payment_method || 'Payroll Cut'})
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[9px] flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-600" /> PENDING
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!isPaid ? (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(emi.id)}
                          className="h-6 text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                        >
                          <Check className="w-3 h-3" /> Mark Paid
                        </Button>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground">Cleared</span>
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
