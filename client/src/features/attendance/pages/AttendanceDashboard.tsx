import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Scan,
  BarChart3,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AttendanceVisualization } from '@/features/analytics/components/AttendanceVisualization';
import {
  AttendanceReportFilterParams,
  AttendanceReportRow,
  useAttendanceReportQuery,
} from '@/features/analytics/hooks/useAttendanceReports';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserRoleAndDept } from '@/lib/userProfile';

// Theme tokens (light blue / white surface, navy text, blue accents)
const NAVY = 'text-[#0B2545]';
const NAVY_MUTED = 'text-[#4A6285]';
const FONT = "font-['Plus_Jakarta_Sans',ui-sans-serif,system-ui,sans-serif]";

export const AttendanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);

  const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const getTodayStr = () => toLocalDateString(new Date());
  const get14DaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return toLocalDateString(d);
  };

  const defaultFilters: AttendanceReportFilterParams = {
    companies: ['all'],
    locations: [],
    departments: [],
    reportingOfficers: [],
    employees: [],
    status: 'active',
    fromDate: get14DaysAgoStr(),
    toDate: getTodayStr(),
    isTabularView: true,
    workType: 'choose',
    statusFilters: {
      present: true,
      leave: true,
      absent: true,
      expected: true,
      lateMark: false,
      shortWorkingHour: false,
      breakLog: false,
      halfDay: true,
    },
  };

  // Initialize with defaultFilters so report data is fetched and displayed directly on page load.
  const [currentFilters, setCurrentFilters] = useState<AttendanceReportFilterParams>(defaultFilters);
  const { data: fetchedRows, isLoading, isError, refetch } = useAttendanceReportQuery(currentFilters);
  const reportRows = fetchedRows || [];

  // Stat summary calculations
  const totalRecords = reportRows.length;
  const presentCount = reportRows.filter((r) => {
    const st = (r.dayStatus || '').toLowerCase();
    const isPresentStatus = st.includes('full') || st.includes('present') || st === 'p';
    const hasPunched = Boolean(r.checkInTime || (r.actualTiming && r.actualTiming !== '-- - --'));
    return isPresentStatus || hasPunched;
  }).length;
  const halfDayCount = reportRows.filter((r) => {
    const st = (r.dayStatus || '').toLowerCase();
    return st.includes('half') || st === 'hd';
  }).length;
  const lateCount = reportRows.filter((r) => (r.isLate || '').toLowerCase() === 'yes').length;
  const absentCount = reportRows.filter((r) => {
    const st = (r.dayStatus || '').toLowerCase();
    return st.includes('absent') || st.includes('leave') || st === 'a' || st === 'lwp';
  }).length;

  const kpis = [
    {
      label: 'Filtered Records',
      value: totalRecords,
      hint: 'Matching date range',
      icon: Users,
      valueClass: NAVY,
      labelClass: NAVY_MUTED,
      iconClass: 'bg-blue-600 text-white',
      accent: 'bg-blue-600',
    },
    {
      label: 'Present (Full / Half Day)',
      value: presentCount + halfDayCount,
      hint: 'Checked in employees',
      icon: CheckCircle2,
      valueClass: 'text-emerald-700',
      labelClass: 'text-emerald-700',
      iconClass: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      accent: 'bg-emerald-500',
    },
    {
      label: 'Late Check-Ins',
      value: lateCount,
      hint: 'Past shift start time',
      icon: AlertTriangle,
      valueClass: 'text-amber-700',
      labelClass: 'text-amber-700',
      iconClass: 'bg-amber-50 text-amber-600 border border-amber-100',
      accent: 'bg-amber-500',
    },
    {
      label: 'Absent / On Leave',
      value: absentCount,
      hint: 'Unmarked check-ins',
      icon: Clock,
      valueClass: 'text-rose-700',
      labelClass: 'text-rose-700',
      iconClass: 'bg-rose-50 text-rose-600 border border-rose-100',
      accent: 'bg-rose-500',
    },
  ];

  return (
    <div className={`${FONT} min-h-full bg-[#F2F7FD] -m-4 p-4 sm:-m-6 sm:p-6 space-y-5 pb-12`}>
      {/* Header */}
      <header className="rounded-2xl border border-blue-100 bg-white shadow-[0_1px_3px_rgba(11,37,69,0.06)]">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={`text-xl font-extrabold tracking-tight ${NAVY}`}>
                  Attendance Control Dashboard
                </h1>
                <Badge
                  variant="outline"
                  className="rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700"
                >
                  {roleInfo.roleTitle}
                </Badge>
              </div>
              <p className={`mt-1 text-sm ${NAVY_MUTED}`}>
                Live organization-wide attendance visualizations, real-time metrics, punctuality analytics &amp; status distribution.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="h-9 gap-2 rounded-lg border-blue-200 bg-white px-4 text-xs font-semibold text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Sync Records
            </Button>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, hint, icon: Icon, valueClass, labelClass, iconClass, accent }) => (
          <Card
            key={label}
            className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_1px_3px_rgba(11,37,69,0.06)] transition-shadow hover:shadow-[0_4px_14px_rgba(37,99,235,0.10)]"
          >
            <span className={`absolute inset-y-0 left-0 w-1 ${accent}`} aria-hidden="true" />
            <CardContent className="flex items-start justify-between p-5 pl-6">
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${labelClass}`}>{label}</p>
                <div className={`mt-2 text-3xl font-extrabold tabular-nums tracking-tight ${valueClass}`}>
                  {isLoading ? '…' : value}
                </div>
                <p className={`mt-1 text-xs ${NAVY_MUTED}`}>{hint}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Visualizations */}
      <section className="space-y-4 animate-in fade-in-50 duration-200">
        {isError && (
          <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Could not load attendance report data. Please check your connection and try again.
          </div>
        )}

        <div className={`rounded-2xl border border-blue-100 bg-white p-4 sm:p-5 shadow-[0_1px_3px_rgba(11,37,69,0.06)] ${NAVY}`}>
          <AttendanceVisualization data={reportRows} />
        </div>
      </section>
    </div>
  );
};

export default AttendanceDashboard;
