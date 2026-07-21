import React, { useMemo } from 'react';

interface AttendanceCalendarProps {
  month: number;
  year: number;
  records: any[];
  onDateClick?: (date: string) => void;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  month,
  year,
  records,
  onDateClick,
}) => {
  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [month, year]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(year, month, 1).getDay();
  }, [month, year]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'half_day':
        return 'bg-yellow-100 text-yellow-800';
      case 'work_from_home':
        return 'bg-blue-100 text-blue-800';
      case 'on_leave':
        return 'bg-purple-100 text-purple-800';
      case 'holiday':
        return 'bg-gray-100 text-gray-800';
      case 'weekly_off':
        return 'bg-gray-200 text-gray-800';
      default:
        return 'bg-white text-gray-800 border border-gray-300';
    }
  };

  const getRecordByDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (!Array.isArray(records)) {
      console.warn('AttendanceCalendar: records is not an array', records);
      return undefined;
    }
    return records.find((r) => r.check_in_date === dateStr);
  };

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">
        {new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </h3>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-semibold text-sm text-gray-600 py-2">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const record = day ? getRecordByDate(day) : null;
          return (
            <div
              key={index}
              onClick={() => {
                if (day && onDateClick) {
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  onDateClick(dateStr);
                }
              }}
              className={`p-2 rounded text-center text-sm cursor-pointer ${
                day ? getStatusColor(record?.status || '') : 'bg-gray-50'
              } ${day ? 'hover:shadow-md transition' : ''}`}
            >
              {day && (
                <div>
                  <div className="font-semibold">{day}</div>
                  {record && (
                    <div className="text-xs mt-1">
                      {record.status === 'present' ? '✓' : '–'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
