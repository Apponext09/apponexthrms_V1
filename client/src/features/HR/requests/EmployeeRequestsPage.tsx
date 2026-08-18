import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/config/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  User,
  Check,
  X,
  RefreshCw,
  FileEdit,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProfileRequest {
  id: number;
  reqId: string;
  profileSection: string;
  reason: string;
  requestedChanges: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  departmentName?: string;
  avatarUrl?: string;
  submittedAt: string;
  approvedAt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  rejectionReason?: string;
}

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   icon: Clock,         cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  approved:  { label: 'Approved',  icon: CheckCircle2,  cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  rejected:  { label: 'Rejected',  icon: XCircle,       cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30' },
  completed: { label: 'Completed', icon: CheckCircle2,  cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30' },
};

export function EmployeeRequestsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ProfileRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const { data: requests = [], isLoading, refetch } = useQuery<ProfileRequest[]>({
    queryKey: ['profile-update-requests'],
    queryFn: async () => {
      const res = await apiClient.get('/employees/profile-update-requests');
      return res.data?.data ?? [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.patch('/employees/profile-update-requests/' + id + '/status', { status: 'approved' });
    },
    onSuccess: () => {
      toast.success('Request approved successfully');
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-edit-permission'] });
      setViewModalOpen(false);
    },
    onError: () => toast.error('Failed to approve request'),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      await apiClient.patch('/employees/profile-update-requests/' + id + '/status', { status: 'rejected', rejectionReason: reason });
    },
    onSuccess: () => {
      toast.success('Request rejected');
      queryClient.invalidateQueries({ queryKey: ['profile-update-requests'] });
      setRejectModalOpen(false);
      setViewModalOpen(false);
      setRejectReason('');
    },
    onError: () => toast.error('Failed to reject request'),
  });

  const filtered = requests.filter((r) => {
    const matchSearch = !search || r.employeeName.toLowerCase().includes(search.toLowerCase()) || r.reqId.toLowerCase().includes(search.toLowerCase()) || r.profileSection.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  function formatDate(d?: string) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
    const Icon = cfg.icon;
    return (
      <Badge variant="outline" className={'text-[11px] font-semibold gap-1 ' + cfg.cls}>
        <Icon className="w-3 h-3" /> {cfg.label}
      </Badge>
    );
  };

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-foreground flex items-center gap-2">
            <FileEdit className="w-5 h-5 text-primary" />
            Profile Update Requests
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Review and action employee profile edit requests</p>
        </div>
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => refetch()}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </Button>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'all',      label: 'Total',    color: 'text-foreground' },
          { key: 'pending',  label: 'Pending',  color: 'text-amber-600' },
          { key: 'approved', label: 'Approved', color: 'text-emerald-600' },
          { key: 'rejected', label: 'Rejected', color: 'text-rose-600' },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={'rounded-xl border p-3 text-left transition-all ' + (statusFilter === key ? 'border-primary/50 bg-primary/5 shadow-sm' : 'border-border bg-card hover:bg-muted/50')}
          >
            <p className={'text-xl font-black ' + color}>{counts[key as keyof typeof counts]}</p>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID or section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-xs text-muted-foreground gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading requests...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <FileEdit className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-muted-foreground">No requests found</p>
            <p className="text-xs text-muted-foreground/60">Profile update requests will appear here once submitted</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-muted-foreground">
                <th className="text-left px-4 py-3 font-semibold">Req ID</th>
                <th className="text-left px-4 py-3 font-semibold">Employee</th>
                <th className="text-left px-4 py-3 font-semibold">Profile Section</th>
                <th className="text-left px-4 py-3 font-semibold">Reason</th>
                <th className="text-left px-4 py-3 font-semibold">Submitted</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((req) => (
                <tr key={req.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-4 py-3 font-mono font-bold text-primary">{req.reqId}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                        {req.avatarUrl ? <img src={req.avatarUrl} className="w-7 h-7 rounded-full object-cover" alt="" /> : req.employeeName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground leading-tight">{req.employeeName}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{req.employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-primary/8 text-primary text-[11px] font-semibold">
                      {req.profileSection}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="truncate text-foreground/80 font-medium" title={req.reason}>{req.reason || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {formatDate(req.submittedAt)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2.5 gap-1"
                        onClick={() => { setSelectedRequest(req); setViewModalOpen(true); }}
                      >
                        View
                      </Button>
                      {req.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            onClick={() => approveMutation.mutate(req.id)}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="w-3 h-3" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5 text-rose-600 border-rose-500/30 hover:bg-rose-500/10 gap-1"
                            onClick={() => { setSelectedRequest(req); setRejectModalOpen(true); }}
                          >
                            <X className="w-3 h-3" /> Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── View Detail Modal ── */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <FileEdit className="w-4 h-4 text-primary" />
              Request Details — {selectedRequest?.reqId}
            </DialogTitle>
            <DialogDescription className="text-xs">Profile update request submitted by employee</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-3 text-xs mt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground font-medium">Employee</p>
                  <p className="font-semibold text-foreground">{selectedRequest.employeeName}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{selectedRequest.employeeCode}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-muted-foreground font-medium">Status</p>
                  <StatusBadge status={selectedRequest.status} />
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <div>
                  <p className="text-muted-foreground font-medium mb-0.5">Profile Section</p>
                  <p className="font-bold text-primary">{selectedRequest.profileSection}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-0.5">Requested Changes</p>
                  <p className="font-semibold text-foreground whitespace-pre-wrap">{selectedRequest.requestedChanges || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground font-medium mb-0.5">Reason</p>
                  <p className="font-medium text-foreground/80">{selectedRequest.reason || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>Submitted: {formatDate(selectedRequest.submittedAt)}</span>
              </div>
              {selectedRequest.rejectionReason && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300">
                  <p className="font-semibold">Rejection Reason:</p>
                  <p className="mt-0.5">{selectedRequest.rejectionReason}</p>
                </div>
              )}
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    onClick={() => approveMutation.mutate(selectedRequest.id)}
                    disabled={approveMutation.isPending}
                  >
                    <Check className="w-3.5 h-3.5" /> Approve Request
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-9 text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10 gap-1.5"
                    onClick={() => setRejectModalOpen(true)}
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Reject Modal ── */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-rose-600">Reject Request</DialogTitle>
            <DialogDescription className="text-xs">Provide a reason for rejection. This will be shown to the employee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full rounded-xl border border-border bg-background p-3 text-xs font-medium resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-9 text-xs" onClick={() => setRejectModalOpen(false)}>Cancel</Button>
              <Button
                className="flex-1 h-9 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => selectedRequest && rejectMutation.mutate({ id: selectedRequest.id, reason: rejectReason })}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
