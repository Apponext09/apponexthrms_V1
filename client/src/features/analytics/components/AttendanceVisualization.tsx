import React from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  CalendarX,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AttendanceReportRow } from '../hooks/useAttendanceReports';

interface AttendanceVisualizationProps {
  data: AttendanceReportRow[];
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

export function AttendanceVisualization({ data }: AttendanceVisualizationProps) {
  // Aggregate stats from dataset
  const total = data.length || 1;
  const presentCount = data.filter((d) => d.dayStatus === 'Full Day').length;
  const halfDayCount = data.filter((d) => d.dayStatus === 'Half Day').length;
  const absentCount = data.filter((d) => d.dayStatus === 'Absent').length;
  const leaveCount = data.filter((d) => d.dayStatus === 'Leave').length;
  const weekOffCount = data.filter((d) => d.dayStatus === 'Week Off').length;
  const holidayCount = data.filter((d) => d.dayStatus === 'Holiday').length;
  const lateCount = data.filter((d) => d.isLate === 'Yes').length;

  const expectedWorkingDays = Math.max(1, total - weekOffCount - holidayCount);
  const attendanceRate = Math.round(((presentCount + halfDayCount * 0.5) / expectedWorkingDays) * 100);

  // Pie chart data
  const pieData = [
    { name: 'Full Day', value: presentCount },
    { name: 'Half Day', value: halfDayCount },
    { name: 'Absent', value: absentCount },
    { name: 'Leave', value: leaveCount },
    { name: 'Week Off', value: weekOffCount },
  ].filter((item) => item.value > 0);

  // 1. Dynamic Daily Trend Data aggregated from backend dataset
  const dailyTrendMap = new Map<string, { day: string; Present: number; Late: number; Absent: number }>();

  data.forEach((row) => {
    const dayLabel = row.date ? `${row.day ? row.day.slice(0, 3) : ''} (${row.date.slice(-5)})` : row.day || 'Day';
    if (!dailyTrendMap.has(dayLabel)) {
      dailyTrendMap.set(dayLabel, { day: dayLabel, Present: 0, Late: 0, Absent: 0 });
    }
    const item = dailyTrendMap.get(dayLabel)!;
    if (row.dayStatus === 'Full Day' || row.dayStatus === 'Half Day') {
      item.Present += 1;
    }
    if (row.isLate === 'Yes') {
      item.Late += 1;
    }
    if (row.dayStatus === 'Absent' || row.dayStatus === 'Leave') {
      item.Absent += 1;
    }
  });

  const dailyTrendData = Array.from(dailyTrendMap.values());

  // 2. Dynamic Department Breakdown Data aggregated from backend dataset
  const deptMap = new Map<string, { name: string; Present: number; Late: number; Absent: number }>();

  data.forEach((row) => {
    const deptName = row.departmentName || 'General';
    if (!deptMap.has(deptName)) {
      deptMap.set(deptName, { name: deptName, Present: 0, Late: 0, Absent: 0 });
    }
    const item = deptMap.get(deptName)!;
    if (row.dayStatus === 'Full Day' || row.dayStatus === 'Half Day') {
      item.Present += 1;
    }
    if (row.isLate === 'Yes') {
      item.Late += 1;
    }
    if (row.dayStatus === 'Absent' || row.dayStatus === 'Leave') {
      item.Absent += 1;
    }
  });

  const departmentData = Array.from(deptMap.values());

  return (
    <div className="space-y-6">
      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-soft-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Overall Attendance Rate</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">{attendanceRate}%</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              High attendance across active shifts
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-soft-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Present vs Expected</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {presentCount + halfDayCount} <span className="text-sm font-normal text-muted-foreground">/ {expectedWorkingDays}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Full day active check-ins</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-soft-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Late Arrivals</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{lateCount}</div>
            <p className="text-[11px] text-amber-600/80 font-medium mt-1">Punches past shift grace period</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-soft-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">Absent / Leave</CardTitle>
            <CalendarX className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground">
              {absentCount} <span className="text-sm text-rose-500 font-bold">({leaveCount} Leave)</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Unplanned absent & approved leaves</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart: Status Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Attendance Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart: Daily Attendance Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Weekly Attendance & Punctuality Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="day" style={{ fontSize: '11px' }} />
                <YAxis style={{ fontSize: '11px' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Bar Chart: Department Breakdown */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-sm font-bold">Department-wise Attendance Comparison (%)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" style={{ fontSize: '11px' }} />
                <YAxis style={{ fontSize: '11px' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Present" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
