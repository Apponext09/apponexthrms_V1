import React, { useEffect } from 'react';
import { AttendanceCalendar, AttendanceChart, AttendanceFilters } from '../components';
import { useAttendanceHistory } from '../hooks/useAttendanceHistory';

export const AttendanceDashboard: React.FC = () => {
  const { records, getHistory } = useAttendanceHistory();
  const [month, setMonth] = React.useState(new Date().getMonth());
  const [year, setYear] = React.useState(new Date().getFullYear());

  useEffect(() => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    getHistory({ startDate, endDate });
  }, [month, year, getHistory]);

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Attendance Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="lg:col-span-1">
          <AttendanceFilters />
        </div>
        <div className="lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <button onClick={handlePrevMonth} className="px-3 py-1 text-sm bg-gray-200 rounded">
              ← Previous
            </button>
            <h2 className="text-xl font-semibold">
              {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={handleNextMonth} className="px-3 py-1 text-sm bg-gray-200 rounded">
              Next →
            </button>
          </div>
          <AttendanceCalendar month={month} year={year} records={records} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AttendanceChart />
      </div>
    </div>
  );
};
