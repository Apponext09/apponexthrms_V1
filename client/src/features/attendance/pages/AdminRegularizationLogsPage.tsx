import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

interface RegularizationLogItem {
  id: number;
  organization_id?: number;
  company_id?: number;
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
  manager_comments?: string;
  hr_comments?: string;
  created_at?: string;
}

export const AdminRegularizationLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<RegularizationLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/attendance/regularization/logs', {
        params: {
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      const items = Array.isArray(res.data?.data) ? res.data.data : [];
      setLogs(items);
    } catch (err) {
      console.error('Failed to load admin regularization logs', err);
      toast.error('Failed to load regularization logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
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

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_manager':
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 text-amber-500" /> Pending Manager
          </span>
        );
      case 'pending_hr':
      case 'manager_approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
            <UserCheck className="w-3 h-3 text-blue-500" /> Pending HR
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3 text-emerald-500" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3 text-rose-500" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Attendance Regularization System Logs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete administrative audit table of all work hour correction requests across the company.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            className="gap-1.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Logs
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Search Employee / Reason</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <Input
                type="text"
                placeholder="Name, Emp code, reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Approval Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value="all">All Statuses</option>
              <option value="pending_manager">Pending Manager</option>
              <option value="pending_hr">Pending HR</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              className="h-9 w-full bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold text-xs rounded-xl gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" /> Filter Logs
            </Button>
          </div>
        </form>
      </Card>

      {/* Main Logs Table */}
      <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <FileText className="w-4 h-4 text-emerald-600" /> Audit Log Entries ({logs.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Showing detailed audit records including company ID, employee, requested times, and approval decisions.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
              <p className="text-xs font-bold">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-center">
              <div className="p-3.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                <FileText className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No logs found</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Try adjusting your search criteria or date filter.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-6 py-3.5">Log ID / Company</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3.5">Employee</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3.5">Request Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3.5">Requested Slot</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3.5">Reason & Comment</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-6 py-3.5">Status Flow</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const empName = `${log.employee_first_name || ''} ${log.employee_last_name || ''}`.trim() || `Employee #${log.employee_id}`;
                  const compId = log.company_id || log.organization_id || 1;

                  return (
                    <TableRow key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                      
                      {/* Log ID & Company */}
                      <TableCell className="px-6 py-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        <div>#REG-{String(log.id).padStart(4, '0')}</div>
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">Company ID: {compId}</div>
                      </TableCell>

                      {/* Employee */}
                      <TableCell className="px-4 py-4 text-xs font-bold text-slate-900 dark:text-slate-100">
                        <div className="font-black text-slate-900 dark:text-slate-100">{empName}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {log.employee_code || `#EMP-${log.employee_id}`} {log.department_name ? `• ${log.department_name}` : ''}
                        </div>
                      </TableCell>

                      {/* Date */}
                      <TableCell className="px-4 py-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {log.is_date_range && log.end_date ? (
                          <span>{log.request_date} $\rightarrow$ {log.end_date}</span>
                        ) : (
                          <span>{log.request_date}</span>
                        )}
                      </TableCell>

                      {/* Requested Slot */}
                      <TableCell className="px-4 py-4 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{formatTimeDisplay(log.requested_check_in_time)} $\rightarrow$ {formatTimeDisplay(log.requested_check_out_time)}</span>
                        </div>
                      </TableCell>

                      {/* Reason & Comment */}
                      <TableCell className="px-4 py-4 text-xs text-slate-800 dark:text-slate-200">
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">{log.reason}</div>
                        <div className="text-[11px] text-slate-500 font-medium max-w-[200px] truncate">{log.comment || '--'}</div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-6 py-4 text-xs">
                        {renderStatusBadge(log.status)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRegularizationLogsPage;
