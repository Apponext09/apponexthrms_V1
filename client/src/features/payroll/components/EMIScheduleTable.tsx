import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet } from 'lucide-react';

interface EMI {
  id: number;
  emi_number: number;
  emi_amount: number;
  principal_amount: number;
  interest_amount: number;
  due_date: string;
  status: 'pending' | 'paid';
  paid_date?: string;
}

interface EMIScheduleTableProps {
  emis: EMI[];
  title?: string;
  loanId?: number | string;
}

export const EMIScheduleTable: React.FC<EMIScheduleTableProps> = ({ emis, title = 'EMI Schedule', loanId }) => {
  const getStatusColor = (status: string) => {
    return status === 'paid'
      ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
  };

  const handleExportEMICSV = () => {
    if (!emis || emis.length === 0) return;

    const headers = ['Installment #', 'Due Date', 'Principal Amount (₹)', 'Interest Amount (₹)', 'Total EMI Amount (₹)', 'Status', 'Paid Date'];
    const rows = emis.map((emi) => [
      emi.emi_number,
      `"${new Date(emi.due_date).toLocaleDateString()}"`,
      Number(emi.principal_amount || 0).toFixed(2),
      Number(emi.interest_amount || 0).toFixed(2),
      Number(emi.emi_amount || 0).toFixed(2),
      `"${(emi.status || 'pending').toUpperCase()}"`,
      `"${emi.paid_date ? new Date(emi.paid_date).toLocaleDateString() : 'N/A'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Loan_${loanId || 'Details'}_EMI_Schedule_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="border shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
          {title}
        </CardTitle>
        {emis && emis.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportEMICSV}
            className="flex items-center gap-1.5 text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/50"
          >
            <Download className="w-3.5 h-3.5" />
            Export EMI Schedule (CSV)
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>EMI #</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right">EMI Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emis.map((emi) => (
                <TableRow key={emi.id}>
                  <TableCell className="font-medium">{emi.emi_number}</TableCell>
                  <TableCell>{new Date(emi.due_date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">₹{emi.principal_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₹{emi.interest_amount.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">₹{emi.emi_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(emi.status)}>
                      {emi.status === 'paid' ? 'Paid' : 'Pending'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

