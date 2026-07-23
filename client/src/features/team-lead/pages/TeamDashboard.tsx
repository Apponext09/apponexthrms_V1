import React, { useState } from 'react';
import { useTeam } from '../hooks/useTeam';
import { 
  Users, CheckCircle2, XCircle, Clock, Calendar, 
  Check, X, MessageSquare, ShieldAlert 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function TeamDashboard() {
  const { 
    dashboard, isDashboardLoading, 
    members, isMembersLoading, 
    approvals, isApprovalsLoading, 
    decideApproval, isDeciding 
  } = useTeam();

  const [comment, setComment] = useState<Record<number, string>>({});

  const handleAction = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const activeComment = comment[id] || '';
      await decideApproval({ id, status, comment: activeComment });
      toast.success(`Request ${status} successfully`);
      setComment(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit decision');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-md">
        <h1 className="text-2xl font-extrabold tracking-tight">Team Workspace</h1>
        <p className="text-sm text-indigo-100 mt-1">
          Monitor your direct reports' check-in status, attendance records, and manage pending leave approvals.
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Members */}
        <Card className="border shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Team Members</span>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {isDashboardLoading ? '...' : dashboard.totalTeamMembers}
              </p>
            </div>
            <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Checked In */}
        <Card className="border shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Checked In Today</span>
              <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                {isDashboardLoading ? '...' : dashboard.activeToday}
              </p>
            </div>
            <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* On Leave */}
        <Card className="border shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">On Leave Today</span>
              <p className="text-2xl font-extrabold text-amber-600 mt-1">
                {isDashboardLoading ? '...' : dashboard.onLeave}
              </p>
            </div>
            <div className="h-10 w-10 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="border shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Pending Approvals</span>
              <p className="text-2xl font-extrabold text-rose-600 mt-1">
                {isDashboardLoading ? '...' : dashboard.pendingApprovals}
              </p>
            </div>
            <div className="h-10 w-10 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Attendance Rate */}
        <Card className="border shadow-sm rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Attendance Rate</span>
              <p className="text-2xl font-extrabold text-violet-600 mt-1">
                {isDashboardLoading ? '...' : `${dashboard.teamAttendanceRate}%`}
              </p>
            </div>
            <div className="h-10 w-10 bg-violet-50 dark:bg-violet-950/40 text-violet-600 rounded-xl flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Approvals Section (Left/Center Column) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-indigo-600" />
                <CardTitle className="text-sm font-bold">Pending Leave Approvals</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-rose-100 text-rose-700 font-semibold px-2 py-0.5 text-[10px]">
                Action Required
              </Badge>
            </CardHeader>
            <CardContent className="p-4">
              {isApprovalsLoading ? (
                <div className="text-center py-8 text-xs text-muted-foreground">Loading approvals...</div>
              ) : approvals.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  <span>All caught up! No pending leave applications to review.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvals.map((req: any) => (
                    <div key={req.id} className="p-4 border rounded-xl bg-card hover:bg-muted/10 transition-all flex flex-col gap-3 shadow-inner">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-foreground">{req.employeeName}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Request: {req.startDate} to {req.endDate} ({req.totalDays} {req.totalDays === 1 ? 'day' : 'days'})
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-indigo-50 border-indigo-200 text-indigo-700 text-[9px] px-2 py-0.5 font-semibold">
                          Submitted
                        </Badge>
                      </div>

                      {req.reason && (
                        <div className="text-xs bg-muted/50 p-2.5 rounded-lg border border-dashed text-muted-foreground">
                          <strong>Reason:</strong> {req.reason}
                        </div>
                      )}

                      {/* Comment Input */}
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Add recommendation comment or reason..."
                          value={comment[req.id] || ''}
                          onChange={(e) => setComment(prev => ({ ...prev, [req.id]: e.target.value }))}
                          className="flex-1 text-xs bg-transparent border-b border-border focus:border-indigo-500 outline-none pb-1"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-border">
                        <Button 
                          onClick={() => handleAction(req.id, 'rejected')}
                          disabled={isDeciding}
                          variant="ghost" 
                          size="sm" 
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 rounded-lg font-bold gap-1 px-3"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                        <Button 
                          onClick={() => handleAction(req.id, 'approved')}
                          disabled={isDeciding}
                          variant="secondary" 
                          size="sm" 
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white h-8 rounded-lg font-bold gap-1 px-3"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Team Members List (Right Column) */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-indigo-600" />
                <CardTitle className="text-sm font-bold">My Direct Reports</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isMembersLoading ? (
                <div className="text-center py-8 text-xs text-muted-foreground">Loading team...</div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">No reports assigned under you.</div>
              ) : (
                <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                  {members.map((member: any) => {
                    const initials = `${member.firstName[0]}${member.lastName[0]}`.toUpperCase();
                    return (
                      <div key={member.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/40 transition-all border border-transparent hover:border-border">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center rounded-xl border">
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-foreground">{member.firstName} {member.lastName}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{member.designation}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] px-2 py-0.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 uppercase tracking-wider font-semibold">
                          {member.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
