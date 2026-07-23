import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, ShieldAlert, Cpu } from 'lucide-react';
import { toast } from 'sonner';

export default function AssetPage() {
  const assets = [
    { code: 'AST-8821', type: 'Laptop Hardware', model: 'Macbook Pro 16" M3 Pro', serial: 'C02H203LMD6R', date: '2026-06-01', status: 'Allocated' },
    { code: 'AST-4190', type: 'Accessory', model: 'Dell 27" 4K Monitor', serial: 'CN0G0Y5H728', date: '2026-06-05', status: 'Allocated' },
  ];

  const handleReportIssue = (code: string) => {
    toast.success(`Support ticket initialized for asset ${code}. Check Helpdesk ticket list.`);
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">My Assigned Assets</h2>
          <p className="text-xs text-muted-foreground">List of company-provided hardware, accessories, and licensing assigned to you.</p>
        </div>
      </div>

      <Card className="border rounded-2xl shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Package className="w-4.5 h-4.5 text-violet-500" /> Active Assets List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Asset Code</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Asset Type</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Model & Details</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Allocated Date</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4 text-right">Support</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a, i) => (
                <TableRow key={i}>
                  <TableCell className="px-6 py-4 text-xs font-mono font-bold text-foreground">{a.code}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold text-violet-600">{a.type}</TableCell>
                  <TableCell className="px-6 py-4 text-xs">
                    <span className="font-semibold text-foreground block">{a.model}</span>
                    <span className="text-[10px] text-muted-foreground">S/N: {a.serial}</span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold">{a.date}</TableCell>
                  <TableCell className="px-6 py-4 text-xs text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleReportIssue(a.code)}
                      className="h-8 hover:text-rose-600 font-semibold gap-1 text-xs hover:bg-rose-50"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Report Issue
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
