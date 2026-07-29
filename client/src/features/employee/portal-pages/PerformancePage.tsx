import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Award, Compass, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PerformancePage() {
  const reviews = [
    { period: 'Q1 Review (FY26-27)', manager: 'Asha Deshmukh', rating: '4.2 / 5.0', comments: 'Excellent code design and system stability improvements.', status: 'Completed' },
    { period: 'Annual Appraisal (FY25-26)', manager: 'Rajesh Sharma', rating: '4.5 / 5.0', comments: 'Promoted to Senior Team Lead position.', status: 'Completed' },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> Performance (KRA / OKR)
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Evaluations
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Access performance scorecards, supervisor evaluations, and annual appraisal details.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Cycle</p>
              <p className="text-xl font-black text-foreground mt-0.5">Q2 FY 2026-27</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Ends Sept 30, 2026</p>
            </div>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Award className="w-4 h-4" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Last Rating</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">4.2 / 5.0</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">Exceeded Expectations</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Star className="w-4 h-4" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Assigned KRAs</p>
              <p className="text-xl font-black text-foreground mt-0.5">4 Key Areas</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Engineering Goals</p>
            </div>
            <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
              <Compass className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Reviews List */}
      <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <TrendingUp className="w-4 h-4 text-primary" /> Appraisal & Review History
          </CardTitle>
          <CardDescription className="text-xs">Past supervisor assessments and rating logs.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Appraisal Cycle</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Assessed By</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Rating</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Supervisor Comments</TableHead>
                <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((r, i) => (
                <TableRow key={i} className="hover:bg-muted/20 transition-colors border-b border-border/50">
                  <TableCell className="px-4 py-3 text-xs font-bold text-foreground">{r.period}</TableCell>
                  <TableCell className="px-4 py-3 text-xs font-semibold text-foreground">{r.manager}</TableCell>
                  <TableCell className="px-4 py-3 text-xs font-mono font-bold text-primary">{r.rating}</TableCell>
                  <TableCell className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{r.comments}</TableCell>
                  <TableCell className="px-4 py-3 text-xs">
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                      {r.status}
                    </Badge>
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
