import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Award, AwardIcon, Compass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PerformancePage() {
  const reviews = [
    { period: 'Q1 Review (FY26-27)', manager: 'Asha Deshmukh', rating: '4.2 / 5.0', comments: 'Excellent code design and system stability improvements.', status: 'Completed' },
    { period: 'Annual Appraisal (FY25-26)', manager: 'Rajesh Sharma', rating: '4.5 / 5.0', comments: 'Promoted to Senior Team Lead position.', status: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Performance (KRA/OKR)</h2>
          <p className="text-xs text-muted-foreground">Access performance scorecards, evaluations, and appraisals details.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border rounded-2xl shadow-sm bg-gradient-to-br from-violet-600 to-indigo-700 text-white border-0">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-violet-200 uppercase tracking-wider font-bold block">Current Appraisal Cycle</span>
              <span className="text-lg font-bold mt-1 block">Q2 FY 2026-27</span>
              <span className="text-[9px] text-violet-100/70 block mt-0.5">Ends September 30</span>
            </div>
            <Award className="w-8 h-8 text-white/30" />
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Last Review Rating</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">4.2 / 5.0</span>
              <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">Exceeded Expectations</span>
            </div>
            <TrendingUp className="w-8 h-8 text-violet-500/20" />
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Assigned KRAs</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">4 Key Areas</span>
              <span className="text-[9px] text-muted-foreground block mt-0.5">Aligned with engineering goals</span>
            </div>
            <Compass className="w-8 h-8 text-violet-500/20" />
          </CardContent>
        </Card>
      </div>

      {/* Performance Reviews List */}
      <Card className="border rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Appraisal & Review History</CardTitle>
          <CardDescription>View your past supervisor assessment ratings.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Appraisal Cycle</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Assessed By</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Rating</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Supervisor Comments</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="px-6 py-4 text-xs font-semibold">{r.period}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold">{r.manager}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-mono font-bold text-violet-600">{r.rating}</TableCell>
                  <TableCell className="px-6 py-4 text-xs text-muted-foreground max-w-xs truncate">{r.comments}</TableCell>
                  <TableCell className="px-6 py-4 text-xs">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-0 text-[10px] font-bold">
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
