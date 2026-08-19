import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Crown, Calendar, RefreshCw } from 'lucide-react';
import { AttendanceReportFilter } from '../components/AttendanceReportFilter';
import { AttendanceReportTable } from '../components/AttendanceReportTable';
import { AttendanceVisualization } from '../components/AttendanceVisualization';
import { EmployeeTimelineModal } from '../components/EmployeeTimelineModal';
import {
  AttendanceReportFilterParams,
  AttendanceReportRow,
  useAttendanceReportQuery,
} from '../hooks/useAttendanceReports';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ─── Date helpers ─────────────────────────────────────────────────────────────
const getTodayStr = () => new Date().toISOString().split('T')[0];
const get30DaysAgoStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CeoAttendanceReportPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Pre-seed filters with the CEO's own employee ID so only their records show
  const ceoEmployeeId = user?.employeeId ? String(user.employeeId) : '';

  const defaultFilters: AttendanceReportFilterParams = {
    companies: [],
    locations: [],
    departments: [],
    reportingOfficers: [],
    employees: ceoEmployeeId ? [ceoEmployeeId] : [],
    status: 'active',
    fromDate: get30DaysAgoStr(),
    toDate: getTodayStr(),
    isTabularView: true,
    workType: 'choose',
    statusFilters: {
      present: true,
      leave: true,
      absent: true,
      expected: true,
      lateMark: true,
      shortWorkingHour: true,
      breakLog: true,
      halfDay: true,
    },
  };

  const [currentFilters, setCurrentFilters] = useState<AttendanceReportFilterParams>(defaultFilters);
  const [selectedTimelineRow, setSelectedTimelineRow] = useState<AttendanceReportRow | null>(null);

  const { data: fetchedRows, isLoading, isError, refetch } = useAttendanceReportQuery(currentFilters);
  const reportRows = fetchedRows || [];

  const handleFilterSubmit = (filters: AttendanceReportFilterParams) => {
    // Always enforce CEO's own employeeId in employees filter so other
    // employees' records can't be viewed via this report.
    setCurrentFilters({
      ...filters,
      employees: ceoEmployeeId ? [ceoEmployeeId] : filters.employees,
    });
  };

  const ceoName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'CEO';

  return (
    <div className="space-y-6 pb-12">
      {/* ── TOP HEADER ─────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-4 space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                CEO Attendance Report
              </h1>
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-black text-[10px] px-2.5 py-0.5 flex items-center gap-1.5">
                <Crown className="w-3 h-3" />
                {ceoName}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Executive attendance records — showing only your personal check-in / check-out history.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/attendance/face-punch')}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Face Punch Terminal
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => refetch()}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-primary ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* CEO-locked filter notice */}
        <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary/80 font-semibold flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 shrink-0" />
          <span>
            This report is locked to your employee record ({ceoEmployeeId || 'CEO'}). Date range and status filters can be adjusted below.
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* ── FILTER FORM ─────────────────────────────────────────────────── */}
        <AttendanceReportFilter
          onFilterSubmit={handleFilterSubmit}
          isSubmitting={isLoading}
        />

        {/* ── CONTENT AREA ────────────────────────────────────────────────── */}
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {isError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Could not load attendance report data. Please check your connection and try again.
            </div>
          )}

          {!isError && reportRows.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Crown className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm font-bold text-foreground">No attendance records found</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                No punch data found for the selected date range. Use the Face Punch Terminal to record your attendance.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/attendance/face-punch')}
                className="mt-2 text-xs font-bold gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Go to Face Punch Terminal
              </Button>
            </div>
          )}

          {currentFilters.isTabularView ? (
            <AttendanceReportTable
              data={reportRows}
              onOpenTimeline={(row) => setSelectedTimelineRow(row)}
            />
          ) : (
            <AttendanceVisualization data={reportRows} />
          )}
        </div>
      </div>

      {/* ── TIMELINE MODAL ──────────────────────────────────────────────────── */}
      <EmployeeTimelineModal
        row={selectedTimelineRow}
        isOpen={!!selectedTimelineRow}
        onClose={() => setSelectedTimelineRow(null)}
      />
    </div>
  );
}
