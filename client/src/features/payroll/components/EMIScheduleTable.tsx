import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

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
}

export const EMIScheduleTable: React.FC<EMIScheduleTableProps> = ({ emis, title = 'EMI Schedule' }) => {
  const getStatusColor = (status: string) => {
    return status === 'paid'
      ? 'bg-green-100 text-green-800'
      : 'bg-yellow-100 text-yellow-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
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

