import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function GoalsPage() {
  const goals = [
    { title: 'HRMS Front-end UI Refactoring', category: 'Project Deliverable', progress: 85, due: '2026-08-15', status: 'On Track' },
    { title: 'Argon2 Authentication Migration', category: 'Security Implementation', progress: 100, due: '2026-07-20', status: 'Completed' },
    { title: 'LMS Course Video Completion', category: 'Learning Goal', progress: 30, due: '2026-09-01', status: 'At Risk' },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Goals & OKRs
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Checklist
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track individual progress on professional targets and quarterly OKR metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {goals.map((g, i) => (
          <Card key={i} className="border border-border/80 rounded-xl shadow-2xs bg-card hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60 flex flex-row justify-between items-start space-y-0">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{g.category}</span>
                <CardTitle className="text-sm font-bold text-foreground mt-0.5 leading-snug">{g.title}</CardTitle>
              </div>
              <Badge variant="outline" className={`text-[10px] font-bold ${
                g.status === 'Completed'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                  : g.status === 'On Track'
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
              }`}>
                {g.status}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-muted-foreground">Goal Progress</span>
                  <span className="text-foreground font-mono">{g.progress}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      g.status === 'Completed' ? 'bg-emerald-500' : 'bg-primary'
                    }`}
                    style={{ width: `${g.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-3 border-t border-border/60">
                <span className="flex items-center gap-1 font-medium"><Clock className="w-3.5 h-3.5" /> Due: {g.due}</span>
                {g.status === 'Completed' && (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
