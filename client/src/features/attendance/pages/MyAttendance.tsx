import React, { useState, useEffect } from 'react';
import { CheckInCard, MonthlyAttendanceLog, AttendanceMethodDesk } from '../components';
import { useAttendance } from '../hooks/useAttendance';

export const MyAttendance: React.FC = () => {
  const { getTodayRecord } = useAttendance();
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('biometric');

  useEffect(() => {
    getTodayRecord()
      .then(setTodayRecord)
      .catch(console.error);
  }, [getTodayRecord]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My Attendance
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Quick check-in desk, method workspace, and monthly attendance records
        </p>
      </div>

      {/* Main Grid: Left Column (CheckInCard) & Right Column (Method Workspace Desk) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Quick Check-In/Out Card */}
        <div className="lg:col-span-1">
          <CheckInCard
            selectedMethod={selectedMethod}
            onMethodChange={setSelectedMethod}
          />
        </div>

        {/* Right Column: Method Workspace Desk (QR Code, Biometric Camera Desk, Web Location Desk, Kiosk) */}
        <div className="lg:col-span-2">
          <AttendanceMethodDesk method={selectedMethod} />
        </div>
      </div>

      {/* Bottom Section: Full Monthly Attendance Details Table */}
      <div className="pt-2">
        <MonthlyAttendanceLog />
      </div>
    </div>
  );
};
