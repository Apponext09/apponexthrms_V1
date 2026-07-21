import React, { useEffect } from 'react';
import { CheckInCard, AttendanceStats, PunchTimeline } from '../components';
import { useAttendance } from '../hooks/useAttendance';

export const MyAttendance: React.FC = () => {
  const { getTodayRecord } = useAttendance();
  const [todayRecord, setTodayRecord] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    getTodayRecord()
      .then(setTodayRecord)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [getTodayRecord]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Attendance</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <CheckInCard />
        </div>
        <div className="lg:col-span-2">
          <AttendanceStats />
        </div>
      </div>

      {todayRecord && (
        <div className="grid grid-cols-1 gap-6">
          <PunchTimeline sessions={[]} />
        </div>
      )}
    </div>
  );
};
