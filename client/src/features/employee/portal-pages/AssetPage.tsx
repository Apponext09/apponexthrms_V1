import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Package, ShieldAlert, Cpu, Monitor } from 'lucide-react';
import { toast } from 'sonner';

export default function AssetPage() {
  const assets = [
    { code: 'AST-8821', type: 'Laptop Hardware', model: 'Macbook Pro 16" M3 Pro', serial: 'C02H203LMD6R', date: '2026-06-01', status: 'Allocated' },
    { code: 'AST-4190', type: 'Accessory', model: 'Dell 27" 4K Monitor', serial: 'CN0G0Y5H728', date: '2026-06-05', status: 'Allocated' },
  ];

  const handleReportIssue = (code: string) => {
    toast.success(`Support ticket raised for asset ${code}. Check your Helpdesk.`);
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> My Assigned Assets
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              {assets.length} Items
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Company hardware, accessories, and software licenses allocated to you.
          </p>
        </div>
      </div>

      {/* Asset Stats */}
      <div className="grid grid-cols-2 gap-3.5">
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total Assets</p>
              <p className="text-xl font-black text-foreground mt-0.5">{assets.length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Package className="w-4 h-4" />
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Active / Allocated</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{assets.filter(a => a.status === 'Allocated').length}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Monitor className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Package className="w-4 h-4 text-primary" /> Active Assets List
          </CardTitle>
          <CardDescription className="text-xs">Report any issues through the support button.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Asset Code</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Type</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Model & Serial</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Allocated On</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3 text-right">Support</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a, i) => (
                <TableRow key={i} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                  <TableCell className="px-4 py-3 text-xs font-mono font-bold text-foreground">{a.code}</TableCell>
                  <TableCell className="px-4 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                      {a.type}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs">
                    <span className="font-bold text-foreground block">{a.model}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">S/N: {a.serial}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs font-mono font-semibold text-foreground">{a.date}</TableCell>
                  <TableCell className="px-4 py-3 text-xs">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-xs text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReportIssue(a.code)}
                      className="h-7 px-2 text-xs font-bold hover:text-rose-600 hover:bg-rose-500/10 gap-1 rounded-lg"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Report
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
