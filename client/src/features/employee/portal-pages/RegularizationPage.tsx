import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileCheck,
  RefreshCw,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  ClipboardList,
  PlusCircle,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { AttendanceCalendar } from '../../attendance/components/AttendanceCalendar';
import { WorkHourRequestModal } from '../../attendance/components/WorkHourRequestModal';
import type { AttendanceRecord } from '../../attendance/types';

interface RegularizationRequest {
  id: number;
  request_date?: string;
  is_date_range?: boolean;
  end_date?: string | null;
  requested_check_in_time?: string | null;
  requested_check_out_time?: string | null;
  actual_check_in_time?: string | null;
  actual_check_out_time?: string | null;
  reason: string;
  day_type?: string;
  comment?: string;
  status: 'pending_manager' | 'pending_hr' | 'manager_approved' | 'approved' | 'rejected' | 'pending';
  created_at?: string;
}

export default function RegularizationPage() {
  const [history, setHistory] = useState<RegularizationRequest[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [regRes, attRes] = await Promise.all([
        apiClient.get('/attendance/regularization'),
        apiClient.get('/attendance/history'),
      ]);
      const regItems = Array.isArray(regRes.data?.data) ? regRes.data.data : [];
      const attItems = Array.isArray(attRes.data?.data) ? attRes.data.data : [];
      setHistory(regItems);
      setAttendanceRecords(attItems);
    } catch (err) {
      console.error('Failed to load regularization requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleOpenModal = (dateStr?: string) => {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    setSelectedDate(targetDate);
    setIsModalOpen(true);
  };

  const formatTimeDisplay = (timeStr?: string | null) => {
    if (!timeStr) return '--';
    if (timeStr.includes('AM') || timeStr.includes('PM') || timeStr.includes('AM') || timeStr.includes('PM')) {
      return timeStr;
    }
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

  const pendingManagerCount = history.filter(h => h.status === 'pending_manager' || h.status === 'pending').length;
  const pendingHrCount = history.filter(h => h.status === 'pending_hr' || h.status === 'manager_approved').length;
  const approvedCount = history.filter(h => h.status === 'approved').length;
  const rejectedCount = history.filter(h => h.status === 'rejected').length;

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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /> Attendance Regularization
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-bold">
              Work Hour Request
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Apply work hour correction requests for missed punches, site duty, or work from home.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchHistory}
            className="gap-1.5 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-[#00a65a] hover:bg-[#008d4c] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" /> Work Hour Request
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Manager</p>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{pendingManagerCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending HR</p>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{pendingHrCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Approved</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{approvedCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejected</p>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{rejectedCount}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Attendance Monthly Calendar Section */}
      <AttendanceCalendar
        records={attendanceRecords}
        onRequestCorrection={(dateStr) => handleOpenModal(dateStr)}
        onSelectDay={(dateStr) => handleOpenModal(dateStr)}
      />

      {/* Request History Table */}
      <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="pb-3 pt-5 px-6 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <ClipboardList className="w-4 h-4 text-emerald-600" /> Work Hour Request History
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Track multi-stage approval status for your attendance regularization requests
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
              <p className="text-xs font-bold">Loading request history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-center">
              <div className="p-3.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
                <FileCheck className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No requests submitted yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click on any day in the calendar above or use the "Work Hour Request" button.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-6 py-3.5">Date / Range</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3.5">Requested Slot</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3.5">Reason & Day</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-4 py-3.5">Comment</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-slate-500 px-6 py-3.5">Approval Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors border-b border-slate-100 dark:border-slate-800/60">
                    <TableCell className="px-6 py-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                      {h.is_date_range && h.end_date ? (
                        <span>{h.request_date} $\rightarrow$ {h.end_date}</span>
                      ) : (
                        <span>{h.request_date}</span>
                      )}
                    </TableCell>

                    <TableCell className="px-4 py-4 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{formatTimeDisplay(h.requested_check_in_time)} $\rightarrow$ {formatTimeDisplay(h.requested_check_out_time)}</span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-4 text-xs font-medium text-slate-800 dark:text-slate-200">
                      <div className="font-bold text-emerald-700 dark:text-emerald-400">{h.reason}</div>
                      {h.day_type && <div className="text-[10px] text-slate-400 font-normal">{h.day_type}</div>}
                    </TableCell>

                    <TableCell className="px-4 py-4 text-xs text-slate-500 font-medium max-w-[200px] truncate">
                      {h.comment || '--'}
                    </TableCell>

                    <TableCell className="px-6 py-4 text-xs">
                      {renderStatusBadge(h.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Work Hour Request Modal Component */}
      <WorkHourRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialDate={selectedDate}
        onSuccess={() => fetchHistory()}
      />
    </div>
  );
}
