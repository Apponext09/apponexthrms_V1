import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, FileEdit, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MyRequest {
  id: number;
  reqId: string;
  profileSection: string;
  reason: string;
  requestedChanges: string;
  status: string;
  rejectionReason?: string;
  submittedAt: string;
  approvedAt?: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: any; cls: string }> = {
  pending:   { label: 'Pending',   icon: Clock,         cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  approved:  { label: 'Approved',  icon: CheckCircle2,  cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  rejected:  { label: 'Rejected',  icon: XCircle,       cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30' },
  completed: { label: 'Completed (Used)', icon: CheckCircle2, cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30' },
};

interface Props {
  employeeId: number;
}

export function MyProfileRequestsView({ employeeId }: Props) {
  const { data: requests = [], isLoading, refetch } = useQuery<MyRequest[]>({
    queryKey: ['my-profile-requests', employeeId],
    queryFn: async () => {
      const res = await apiClient.get('/employees/my-profile-requests');
      return res.data?.data ?? [];
    },
    staleTime: 15000,
  });

  function formatDate(d?: string) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={'text-[11px] font-semibold gap-1 ' + cfg.cls}>
        <Icon className="w-3 h-3" />
        {cfg.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border/80 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">My Profile Update Requests</h3>
              <p className="text-xs text-muted-foreground">History of all your profile edit requests and their approval status</p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => refetch()}>
            <RotateCcw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-14 gap-2 text-xs text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading your requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-2">
            <FileEdit className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-muted-foreground">No requests yet</p>
            <p className="text-xs text-muted-foreground/60">Click the 🔒 Request Edit button on any section to submit a request</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/30 text-muted-foreground border-b border-border">
                  <th className="text-left px-5 py-3 font-semibold">Req ID</th>
                  <th className="text-left px-5 py-3 font-semibold">Profile Section</th>
                  <th className="text-left px-5 py-3 font-semibold">Reason</th>
                  <th className="text-left px-5 py-3 font-semibold">Requested Changes</th>
                  <th className="text-left px-5 py-3 font-semibold">Submitted</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-primary">{req.reqId}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-primary/8 text-primary text-[11px] font-semibold">
                        {req.profileSection}
                      </span>
                    </td>
                    <td className="px-5 py-3 max-w-[180px]">
                      <p className="truncate text-foreground/80" title={req.reason}>{req.reason || '-'}</p>
                    </td>
                    <td className="px-5 py-3 max-w-[220px]">
                      <p className="truncate text-foreground/70" title={req.requestedChanges}>{req.requestedChanges || '-'}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">{formatDate(req.submittedAt)}</td>
                    <td className="px-5 py-3">
                      <div className="space-y-1">
                        <StatusBadge status={req.status} />
                        {req.rejectionReason && (
                          <p className="text-[10px] text-rose-600 font-medium">↳ {req.rejectionReason}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
