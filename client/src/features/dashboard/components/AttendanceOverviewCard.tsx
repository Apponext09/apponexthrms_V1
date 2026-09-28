import { ArrowUpRight, Clock } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export type AttendancePeriod = 'today' | 'week' | 'month';
export type AttendanceSummary = { present: number; late: number; absent: number; onLeave: number; total: number; attendanceRate: number };

export function AttendanceOverviewCard({ summary, period, onPeriodChange, onOpenAttendance, className = '' }: {
  summary: AttendanceSummary | null;
  period: AttendancePeriod;
  onPeriodChange: (period: AttendancePeriod) => void;
  onOpenAttendance: () => void;
  className?: string;
}) {
  const data = summary ? [
    { name: 'Present', value: summary.present, color: '#4f46e5' },
    { name: 'Late', value: summary.late, color: '#e89220' },
    { name: 'Absent', value: summary.absent, color: '#e43f4f' },
    { name: 'On leave', value: summary.onLeave, color: '#9298e8' },
  ] : [];

  return <Card className={`dashboard-panel attendance-overview-card ${className}`}>
    <CardHeader className="p-5 pb-1">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div><CardTitle className="text-sm font-bold">Attendance overview</CardTitle><CardDescription className="mt-1 text-xs">Live check-ins across all locations</CardDescription></div>
        <div className="flex rounded-xl border border-border bg-muted/45 p-0.5" role="tablist" aria-label="Attendance period">
          {(['today', 'week', 'month'] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={period === item} onClick={() => onPeriodChange(item)}
            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold capitalize transition-all ${period === item ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{item}</button>)}
        </div>
      </div>
    </CardHeader>
    <CardContent className="px-5 pb-4 pt-1">
      {!summary || data.every((item) => item.value === 0) ? <div className="flex h-48 flex-col items-center justify-center text-xs text-muted-foreground"><Clock className="mb-2 size-8 opacity-40" /><span>No attendance recorded for this period</span></div> :
        <div className="attendance-overview-layout mx-auto grid w-full min-w-0 items-center justify-center gap-4">
          <div className="relative mx-auto h-36 w-36 2xl:h-40 2xl:w-40"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={49} outerRadius={68} cornerRadius={5} paddingAngle={2} dataKey="value" stroke="none">{data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ background: 'hsl(var(--popover))', color: 'hsl(var(--popover-foreground))', borderColor: 'hsl(var(--border))', borderRadius: '10px', fontSize: '11px' }} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-2xl font-extrabold text-foreground">{summary.attendanceRate}%</strong><span className="text-[10px] text-muted-foreground">present</span></div></div>
          <div className="min-w-0 w-full space-y-3 text-xs">{data.map((item) => <div key={item.name} className="grid min-w-0 grid-cols-[10px_minmax(58px,1fr)_auto_40px] items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate text-muted-foreground">{item.name}</span><strong className="tabular-nums text-foreground">{item.value.toLocaleString('en-IN')}</strong><span className="text-right text-[10px] tabular-nums text-muted-foreground">{summary.total > 0 ? ((item.value / summary.total) * 100).toFixed(1) : '0.0'}%</span></div>)}</div>
        </div>}
      <Button variant="link" size="sm" onClick={onOpenAttendance} className="mt-1 h-auto px-0 text-xs">Open attendance <ArrowUpRight className="size-3.5" /></Button>
    </CardContent>
  </Card>;
}
