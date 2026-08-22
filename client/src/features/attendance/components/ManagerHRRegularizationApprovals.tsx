import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  FileCheck,
  MessageSquare,
  AlertTriangle,
  Building2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

interface RegularizationItem {
  id: number;
  employee_id: number;
  employee_first_name?: string;
  employee_last_name?: string;
  employee_code?: string;
  department_name?: string;
  request_date: string;
  is_date_range?: boolean;
  end_date?: string | null;
  requested_check_in_time?: string | null;
  requested_check_out_time?: string | null;
  actual_check_in_time?: string | null;
  actual_check_out_time?: string | null;
  reason: string;
  day_type?: string;
  comment?: string;
  status: string;
  created_at?: string;
}

interface Props {
  role: 'manager' | 'hr' | 'both';
}

export const ManagerHRRegularizationApprovals: React.FC<Props> = ({ role }) => {
  const [activeTab, setActiveTab] = useState<'manager' | 'hr'>(role === 'hr' ? 'hr' : 'manager');

  const [managerList, setManagerList] = useState<RegularizationItem[]>([]);
  const [hrList, setHrList] = useState<RegularizationItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state for approval/rejection comments
  const [actionItem, setActionItem] = useState<{
    item: RegularizationItem;
    action: 'manager-approve' | 'manager-reject' | 'hr-approve' | 'hr-reject';
  } | null>(null);
  const [comments, setComments] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchLists = async () => {
    setLoading(true);
    try {
      if (role === 'manager' || role === 'both') {
        const res = await apiClient.get('/attendance/regularization/manager-pending');
        setManagerList(Array.isArray(res.data?.data) ? res.data.data : []);
      }
      if (role === 'hr' || role === 'both') {
        const res = await apiClient.get('/attendance/regularization/hr-pending');
        setHrList(Array.isArray(res.data?.data) ? res.data.data : []);
      }
    } catch (err) {
      console.error('Failed to load pending regularizations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, [role]);

  // Re-checks the server's pending queue for this item. Used when the approve/reject
  // request throws client-side (e.g. a dropped connection) even though the write
  // already committed on the server — without this, a successful action can still
  // show a failure toast and leave the stale row in the list until a manual refresh.
  const isStillPendingOnServer = async (id: number, action: string) => {
    try {
      const endpoint = action.startsWith('manager')
        ? '/attendance/regularization/manager-pending'
        : '/attendance/regularization/hr-pending';
      const res = await apiClient.get(endpoint);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      return list.some((r: any) => r.id === id);
    } catch {
      return true;
    }
  };

  const handleExecuteAction = async () => {
    if (!actionItem) return;
    setSubmittingAction(true);
    const { item, action } = actionItem;
    try {
      const url = `/attendance/regularization/${item.id}/${action}`;
      const res = await apiClient.post(url, { comments });

      toast.success(res.data?.message || 'Action executed successfully!');
      setActionItem(null);
      setComments('');
      await fetchLists();
    } catch (err: any) {
      const stillPending = await isStillPendingOnServer(item.id, action);
      if (stillPending) {
        toast.error(err.response?.data?.message || 'Failed to process request action');
      } else {
        toast.success('Action executed successfully!');
        setActionItem(null);
        setComments('');
      }
      await fetchLists();
    } finally {
      setSubmittingAction(false);
    }
  };

  const formatTimeDisplay = (timeStr?: string | null) => {
    if (!timeStr) return '--';
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    try {
      const parts = timeStr.split(' ');
      const datePart = parts.length > 1 ? parts[0] : new Date().toISOString().split('T')[0];
      const timePart = parts.length > 1 ? parts[1] : parts[0];
      const dateObj = new Date(`${datePart}T${timePart}`);
      if (isNaN(dateObj.getTime())) return timeStr;
      return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return timeStr;
    }
  };

  const activeList = activeTab === 'manager' ? managerList : hrList;

  return (
    <div className="space-y-6">
      
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Work Hour Regularization Approvals
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Two-stage approval workflow for attendance corrections (Manager Stage 1 → HR Stage 2).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {role === 'both' && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('manager')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'manager'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Manager Stage ({managerList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hr')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  activeTab === 'hr'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> HR Stage ({hrList.length})
              </button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLists}
            className="gap-1.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            {activeTab === 'manager' ? (
              <>
                <Clock className="w-4 h-4 text-amber-500" /> Manager Review Inbox
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-blue-500" /> HR Final Review Inbox
              </>
            )}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {activeTab === 'manager'
              ? 'Requests from team members awaiting your Stage 1 approval'
              : 'Requests awaiting HR final approval and automatic attendance log regularization'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
              <p className="text-xs font-bold">Loading pending requests...</p>
            </div>
          ) : activeList.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-center">
              <div className="p-3.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                <FileCheck className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No pending requests</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  All work hour regularization requests in this queue have been processed.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-6 py-3.5">Employee</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3.5">Date / Range</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3.5">Requested Slot</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3.5">Reason & Day</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3.5">Comment</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-6 py-3.5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeList.map((item: any) => {
                  const firstName = item.employee_first_name || item.employeeFirstName || '';
                  const lastName = item.employee_last_name || item.employeeLastName || '';
                  const empCode = item.employee_code || item.employeeCode || `#EMP-${item.employee_id || item.employeeId}`;
                  const deptName = item.department_name || item.departmentName;
                  const reqDate = item.request_date || item.requestDate;
                  const endDate = item.end_date || item.endDate;
                  const isRange = item.is_date_range || item.isDateRange;
                  const checkIn = item.requested_check_in_time || item.requestedCheckInTime;
                  const checkOut = item.requested_check_out_time || item.requestedCheckOutTime;
                  const dayType = item.day_type || item.dayType;

                  const empName = `${firstName} ${lastName}`.trim() || `Employee #${item.employee_id || item.employeeId}`;

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                      
                      {/* Employee Info */}
                      <TableCell className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 dark:text-slate-100 text-sm">{empName}</span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-normal mt-0.5">
                            <span>{empCode}</span>
                            {deptName && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-2.5 h-2.5" /> {deptName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Request Date / Range */}
                      <TableCell className="px-4 py-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {isRange && endDate ? (
                          <span>{reqDate} → {endDate}</span>
                        ) : (
                          <span>{reqDate}</span>
                        )}
                      </TableCell>

                      {/* Requested Slot */}
                      <TableCell className="px-4 py-4 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{formatTimeDisplay(checkIn)} → {formatTimeDisplay(checkOut)}</span>
                        </div>
                      </TableCell>

                      {/* Reason */}
                      <TableCell className="px-4 py-4 text-xs font-medium text-slate-800 dark:text-slate-200">
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">{item.reason}</div>
                        {dayType && <div className="text-[10px] text-slate-400 font-normal">{dayType}</div>}
                      </TableCell>

                      {/* Comment */}
                      <TableCell className="px-4 py-4 text-xs text-slate-500 font-medium max-w-[180px] truncate">
                        {item.comment || '--'}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-6 py-4 text-xs text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setActionItem({
                                item,
                                action: activeTab === 'manager' ? 'manager-approve' : 'hr-approve',
                              })
                            }
                            className="px-3 py-1.5 bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setActionItem({
                                item,
                                action: activeTab === 'manager' ? 'manager-reject' : 'hr-reject',
                              })
                            }
                            className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-[11px] rounded-lg border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approval / Rejection Confirmation Dialog */}
      <Dialog open={!!actionItem} onOpenChange={(open) => !open && setActionItem(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {actionItem?.action.includes('approve') ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Confirm Approval
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600" /> Confirm Rejection
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              {actionItem?.action === 'manager-approve' && 'Approve Stage 1 review. Request will advance to HR review.'}
              {actionItem?.action === 'hr-approve' && 'Approve final Stage 2. Employee attendance log will be updated as regularized.'}
              {actionItem?.action.includes('reject') && 'Reject this work hour correction request.'}
            </DialogDescription>
          </DialogHeader>

          {actionItem && (
            <div className="space-y-4 my-2 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Employee:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {actionItem.item.employee_first_name} {actionItem.item.employee_last_name} ({actionItem.item.employee_code})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Requested Date:</span>
                  <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{actionItem.item.request_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold">Reason:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{actionItem.item.reason}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">Review Comments</label>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Enter optional comments..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setActionItem(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={submittingAction}
              onClick={handleExecuteAction}
              className={`px-5 py-2 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 ${
                actionItem?.action.includes('approve')
                  ? 'bg-[#00a65a] hover:bg-[#008d4c]'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {submittingAction ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processing...
                </>
              ) : (
                'Confirm Action'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
