import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { BarChart3, PieChart as PieIcon, CheckCircle2, XCircle, Clock, Home } from 'lucide-react';
import type { AttendanceRecord } from '../types';

interface AttendanceChartProps {
  selectedStatus?: string;
  startDate?: string;
  endDate?: string;
  records?: AttendanceRecord[];
}

export const AttendanceChart: React.FC<AttendanceChartProps> = ({
  selectedStatus = 'all',
  records = [],
}) => {
  // Calculate real DB metrics from attendance records
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  let wfhDays = 0;

  const dayTrendMap: Record<string, { day: string; present: number; absent: number; late: number; wfh: number }> = {
    Mon: { day: 'Mon', present: 0, absent: 0, late: 0, wfh: 0 },
    Tue: { day: 'Tue', present: 0, absent: 0, late: 0, wfh: 0 },
    Wed: { day: 'Wed', present: 0, absent: 0, late: 0, wfh: 0 },
    Thu: { day: 'Thu', present: 0, absent: 0, late: 0, wfh: 0 },
    Fri: { day: 'Fri', present: 0, absent: 0, late: 0, wfh: 0 },
  };

  const weekDaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (Array.isArray(records) && records.length > 0) {
    records.forEach((rec) => {
      const isLate = rec.is_late || (rec.status as string) === 'late';
      const status = rec.status;
      const dateObj = new Date(rec.check_in_date);
      const dayName = weekDaysShort[dateObj.getDay()];

      if (isLate) {
        lateDays++;
        if (dayTrendMap[dayName]) dayTrendMap[dayName].late++;
      } else if (status === 'work_from_home') {
        wfhDays++;
        if (dayTrendMap[dayName]) dayTrendMap[dayName].wfh++;
      } else if (status === 'absent') {
        absentDays++;
        if (dayTrendMap[dayName]) dayTrendMap[dayName].absent++;
      } else if (status === 'present') {
        presentDays++;
        if (dayTrendMap[dayName]) dayTrendMap[dayName].present++;
      }
    });
  }

  // Build color palette strictly matching requested status colors
  const statusPieData = [
    { name: 'Present (Green)', value: presentDays, color: '#10b981', code: 'present' },
    { name: 'Absent (Red)', value: absentDays, color: '#ef4444', code: 'absent' },
    { name: 'Late (Brown)', value: lateDays, color: '#78350f', code: 'late' },
    { name: 'WFH (Blue)', value: wfhDays, color: '#3b82f6', code: 'work_from_home' },
  ].filter((item) => selectedStatus === 'all' || item.code === selectedStatus);

  const dailyTrendData = Object.values(dayTrendMap);

  return (
    <div className="space-y-6">
      {/* Selected Data Summary Visual Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">Present (Green)</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{presentDays} Days</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-red-800 dark:text-red-300 uppercase tracking-wider block">Absent (Red)</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{absentDays} Days</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center text-red-600">
            <XCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#78350f]/30 dark:border-[#78350f]/60 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-[#78350f] dark:text-amber-300 uppercase tracking-wider block">Late (Brown)</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{lateDays} Days</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-[#78350f]">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/40 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block">WFH (Blue)</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">{wfhDays} Days</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600">
            <Home className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Selected Data Charts Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Donut Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <PieIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Selected Category Visualization</h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#1e293b', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle" 
                  formatter={(value) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mr-2">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Attendance Breakdown Bar Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Attendance Breakdown Trend</h3>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderColor: '#1e293b', 
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }} 
                />
                <Bar dataKey="present" name="Present (Green)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="Absent (Red)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" name="Late (Brown)" fill="#78350f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="wfh" name="WFH (Blue)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
