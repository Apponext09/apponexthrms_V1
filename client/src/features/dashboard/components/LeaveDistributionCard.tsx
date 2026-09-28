import { Palmtree } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdminDashboardData } from '../hooks/useAdminDashboard';

type LeaveType = NonNullable<AdminDashboardData['leaveAnalytics']>['byType'][number];
const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#0ea5e9', '#38bdf8'];

export function LeaveDistributionCard({ leaveTypes = [], className = '' }: { leaveTypes?: LeaveType[]; className?: string }) {
  const hasData = leaveTypes.some((item) => item.approvedCount > 0 || item.pendingCount > 0);
  return <Card className={`dashboard-panel ${className}`}><CardHeader className="p-5 pb-2"><CardTitle className="flex items-center gap-2 text-sm font-bold"><Palmtree className="size-4 text-primary" /> Leave Distribution by Type</CardTitle><CardDescription className="text-xs">Approved applications categorised by leave policy</CardDescription></CardHeader><CardContent className="p-5 pt-0">
    {!hasData ? <div className="flex h-44 flex-col items-center justify-center text-center text-xs text-muted-foreground"><Palmtree className="mb-2 size-8 text-primary opacity-40" /><span className="font-semibold text-foreground">No Leave Requests Logged</span><span className="mt-0.5">Applied requests will appear here</span></div> :
      <div className="space-y-3 pt-2">{leaveTypes.slice(0, 5).map((item, index) => { const max = Math.max(...leaveTypes.map((x) => x.approvedCount), 1); const width = Math.max(Math.round((item.approvedCount / max) * 100), 4); const color = item.color || COLORS[index % COLORS.length]; return <div key={item.leaveTypeId || index} className="space-y-1.5"><div className="flex items-center justify-between gap-2 text-[11px]"><span className="flex min-w-0 items-center gap-1.5 font-semibold text-foreground"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} /><span className="truncate">{item.name} ({item.code})</span></span><span className="shrink-0 font-bold tabular-nums text-foreground">{item.approvedCount} <span className="font-medium text-muted-foreground">approved</span></span></div><div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${width}%`, backgroundColor: color }} /></div>{item.pendingCount > 0 && <p className="text-right text-[9px] font-medium text-amber-500">{item.pendingCount} pending</p>}</div>; })}</div>}
  </CardContent></Card>;
}
