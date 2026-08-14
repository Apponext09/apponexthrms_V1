import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Scan,
  Calendar as CalendarIcon,
  Table as TableIcon,
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
import { TimelogReportView } from '@/features/analytics/components/TimelogReportView';
import { AttendanceVisualization } from '@/features/analytics/components/AttendanceVisualization';
import { AttendancePoliciesManager } from '@/features/attendance/components/AttendancePoliciesManager';
import {
  AttendanceReportFilterParams,
  AttendanceReportRow,
  useAttendanceReportQuery,
} from '@/features/analytics/hooks/useAttendanceReports';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserRoleAndDept } from '@/lib/userProfile';

export const AttendanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const get14DaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  };

  const [activeTab, setActiveTab] = useState<'calendar' | 'analytics'>('calendar');

  const [currentFilters, setCurrentFilters] = useState<AttendanceReportFilterParams>({
    companies: [],
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
      breakLog: true,
      halfDay: true,
    },
  });

  const { data: fetchedRows, isLoading, isError, refetch } = useAttendanceReportQuery(currentFilters);
  const reportRows = fetchedRows || [];



  // Stat summary calculations
  const totalRecords = reportRows.length;
  const presentCount = reportRows.filter((r) => r.dayStatus === 'Full Day').length;
  const halfDayCount = reportRows.filter((r) => r.dayStatus === 'Half Day').length;
  const lateCount = reportRows.filter((r) => r.isLate === 'Yes').length;
  const absentCount = reportRows.filter((r) => r.dayStatus === 'Absent' || r.dayStatus === 'Leave').length;

  const handleOpenPoliciesPage = () => {
    const cleanRole = (roleInfo.roleTitle || '').toLowerCase();
    if (cleanRole.includes('hr')) {
      navigate('/hr/attendance-policies');
    } else {
      navigate('/attendance/policies');
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">
                Attendance Control Dashboard
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] px-2 py-0.5">
                {roleInfo.roleTitle}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live organization-wide attendance records, monthly timelog calendar, break logs & daily punch timelines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            Sync Records
          </Button>
        </div>
      </div>

      {/* KPI Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Filtered Records</p>
              <div className="text-2xl font-black text-foreground mt-1">{isLoading ? '...' : totalRecords}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Matching date range</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Present (Full / Half Day)</p>
              <div className="text-2xl font-black text-emerald-600 mt-1">{isLoading ? '...' : `${presentCount + halfDayCount}`}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Checked in employees</p>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">Late Check-Ins</p>
              <div className="text-2xl font-black text-amber-600 mt-1">{isLoading ? '...' : lateCount}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Past shift start time</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-rose-600 tracking-wider">Absent / On Leave</p>
              <div className="text-2xl font-black text-rose-600 mt-1">{isLoading ? '...' : absentCount}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Unmarked check-ins</p>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="flex border-b border-border/60 overflow-x-auto">
        {[
          { key: 'calendar', label: '1. Calendar View (Monthly Matrix)', icon: CalendarIcon },
          { key: 'analytics', label: '2. Attendance Analytics', icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === key
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${activeTab === key ? 'text-primary' : 'text-muted-foreground'}`} />
            {label}
          </button>
        ))}
      </div>



      {/* Dynamic Content Views */}
      <div className="space-y-4 animate-in fade-in-50 duration-200">
        {isError && activeTab !== 'calendar' && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Could not load attendance report data. Please check your connection and try again.
          </div>
        )}

        {activeTab === 'calendar' && (
          <TimelogReportView />
        )}

        {activeTab === 'analytics' && (
          <AttendanceVisualization data={reportRows} />
        )}
      </div>
    </div>
  );
};

export default AttendanceDashboard;
