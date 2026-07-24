import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function GoalsPage() {
  const goals = [
    { title: 'HRMS Front-end UI Refactoring', category: 'Project Deliverable', progress: 85, due: '2026-08-15', status: 'On Track' },
    { title: 'Argon2 Authentication migration', category: 'Security Implementation', progress: 100, due: '2026-07-20', status: 'Completed' },
    { title: 'LMS course video completion', category: 'Learning Goal', progress: 30, due: '2026-09-01', status: 'At Risk' },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b">
        <h2 className="text-lg font-bold text-foreground">Goals & OKRs</h2>
        <p className="text-xs text-muted-foreground">Track individual progress on professional targets and OKR metrics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {goals.map((g, i) => (
          <Card key={i} className="border rounded-2xl shadow-sm hover:border-violet-600 transition-colors">
            <CardHeader className="pb-3 border-b flex flex-row justify-between items-start space-y-0">
              <div>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{g.category}</span>
                <CardTitle className="text-sm font-bold text-foreground mt-1 leading-snug">{g.title}</CardTitle>
              </div>
              <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
                g.status === 'Completed'
                  ? 'bg-emerald-100 text-emerald-800'
                  : g.status === 'On Track'
                  ? 'bg-violet-100 text-violet-800'
                  : 'bg-rose-100 text-rose-800'
              }`}>{g.status}</span>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-muted-foreground">Goal Progress</span>
                  <span className="text-foreground">{g.progress}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${
                    g.status === 'Completed' ? 'bg-emerald-500' : 'bg-violet-600'
                  }`} style={{ width: `${g.progress}%` }}></div>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-3 border-t">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Due by {g.due}</span>
                {g.status === 'Completed' && <span className="flex items-center gap-1 text-emerald-600 font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
