import React, { useState, useEffect } from 'react';
import { CheckInCard, AttendanceKPIs, MonthlyAttendanceLog } from '../components';
import { useAttendance } from '../hooks/useAttendance';

export const MyAttendance: React.FC = () => {
  const { getTodayRecord } = useAttendance();
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTodayRecord()
      .then(setTodayRecord)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [getTodayRecord]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My Attendance
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Quick check-in desk, KPI metrics, and monthly attendance records
        </p>
      </div>

      {/* Top Grid: Quick Check-In/Out Card & KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <CheckInCard />
        </div>
        <div className="lg:col-span-2">
          <AttendanceKPIs present={20} absent={2} late={5} percentage="90%" />
        </div>
      </div>

      {/* Bottom Section: Added Attendance Functionality & Records for the Month */}
      <div className="pt-2">
        <MonthlyAttendanceLog />
      </div>
    </div>
  );
};
