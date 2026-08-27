import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, PlusCircle } from 'lucide-react';
import type { AttendanceRecord } from '../types';
import { getLocalDateKey } from './MonthlyAttendanceLog';

interface AttendanceCalendarProps {
  month?: number;
  year?: number;
  records?: AttendanceRecord[];
  selectedStatus?: string;
  onSelectDay?: (dateStr: string, record?: AttendanceRecord) => void;
  onMonthChange?: (month: number, year: number) => void;
  onRequestCorrection?: (dateStr: string, record?: AttendanceRecord) => void;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  month: initialMonth = new Date().getMonth(),
  year: initialYear = new Date().getFullYear(),
  records = [],
  selectedStatus = 'all',
  onSelectDay,
  onMonthChange,
  onRequestCorrection,
}) => {
  const [currentMonth, setCurrentMonth] = useState(initialMonth);
  const [currentYear, setCurrentYear] = useState(initialYear);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const handlePrevMonth = () => {
    let newM = currentMonth - 1;
    let newY = currentYear;
    if (currentMonth === 0) {
      newM = 11;
      newY = currentYear - 1;
    }
    setCurrentMonth(newM);
    setCurrentYear(newY);
    if (onMonthChange) onMonthChange(newM, newY);
  };

  const handleNextMonth = () => {
    let newM = currentMonth + 1;
    let newY = currentYear;
    if (currentMonth === 11) {
      newM = 0;
      newY = currentYear + 1;
    }
    setCurrentMonth(newM);
    setCurrentYear(newY);
    if (onMonthChange) onMonthChange(newM, newY);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    if (onMonthChange) onMonthChange(today.getMonth(), today.getFullYear());
  };

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // Create record map
  const recordsMap = new Map<string, AttendanceRecord>();
  if (Array.isArray(records)) {
    records.forEach((rec) => {
      const rawDate = rec.check_in_date || (rec as any).checkInDate || rec.check_in_time || (rec as any).checkInTime;
      if (rawDate) {
        const key = getLocalDateKey(rawDate);
        recordsMap.set(key, rec);
      }
    });
  }

  const getRecordForDay = (day: number): AttendanceRecord => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (recordsMap.has(dateStr)) return recordsMap.get(dateStr)!;

    const dayOfWeek = new Date(currentYear, currentMonth, day).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        id: day,
        uuid: `uuid-${day}`,
        organization_id: 1,
        employee_id: 1,
        check_in_date: dateStr,
        check_in_time: null,
        check_out_time: null,
        duration_minutes: 0,
        break_time_minutes: 0,
        work_duration_minutes: 0,
        status: 'weekly_off',
        check_in_location_id: null,
        check_out_location_id: null,
        check_in_method: null,
        check_out_method: null,
        is_late: false,
        is_early_departure: false,
        is_regularized: false,
        regularization_request_id: null,
        overtime_minutes: 0,
        notes: 'Weekend',
        created_at: dateStr,
        updated_at: dateStr,
      };
    }

    const todayObj = new Date();
    const isPastDay =
      currentYear < todayObj.getFullYear() ||
      (currentYear === todayObj.getFullYear() && currentMonth < todayObj.getMonth()) ||
      (currentYear === todayObj.getFullYear() && currentMonth === todayObj.getMonth() && day < todayObj.getDate());

    const isFutureDay =
      currentYear > todayObj.getFullYear() ||
      (currentYear === todayObj.getFullYear() && currentMonth > todayObj.getMonth()) ||
      (currentYear === todayObj.getFullYear() && currentMonth === todayObj.getMonth() && day > todayObj.getDate());

    return {
      id: day,
      uuid: `uuid-${day}`,
      organization_id: 1,
      employee_id: 1,
      check_in_date: dateStr,
      check_in_time: null,
      check_out_time: null,
      duration_minutes: 0,
      break_time_minutes: 0,
      work_duration_minutes: 0,
      status: isFutureDay ? ('upcoming' as any) : isPastDay ? 'absent' : 'present',
      check_in_location_id: null,
      check_out_location_id: null,
      check_in_method: null,
      check_out_method: null,
      is_late: false,
      is_early_departure: false,
      is_regularized: false,
      regularization_request_id: null,
      overtime_minutes: 0,
      notes: null,
      created_at: dateStr,
      updated_at: dateStr,
    };
  };

  const getStatusColor = (status: string, isLate?: boolean) => {
    if (status === 'upcoming') {
      return null;
    }
    if (isLate || status === 'late') {
      return {
        label: 'Late',
        className: 'bg-[#78350f]/15 text-[#78350f] border-[#78350f]/30 dark:bg-[#78350f]/40 dark:text-amber-200 dark:border-[#78350f]/60',
        dot: 'bg-[#78350f]',
      };
    }
    switch (status) {
      case 'present':
        return {
          label: 'Present',
          className: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500',
        };
      case 'absent':
        return {
          label: 'Unpaid Day',
          className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
          dot: 'bg-red-500',
        };
      case 'work_from_home':
        return {
          label: 'WFH',
          className: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
          dot: 'bg-blue-500',
        };
      case 'weekly_off':
        return {
          label: 'Weekend',
          className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
          dot: 'bg-slate-400',
        };
      default:
        return null;
    }
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-5">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{monthName}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Monthly Attendance Grid & Work Hour Correction</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Today
          </button>
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-3 pb-2 border-y border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Status Legend:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Present</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Unpaid Day</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#78350f]" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Late</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">WFH</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 italic">Click any day to apply for Work Hour Request</p>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center py-1 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
            {day}
          </div>
        ))}

        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="min-h-[100px] bg-slate-50/40 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-100 dark:border-slate-800/40" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const record = getRecordForDay(dayNum);
          const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, dayNum).toDateString();
          const badge = getStatusColor(record.status, record.is_late);

          const matchesCategory =
            selectedStatus === 'all' ||
            (selectedStatus === 'late' && record.is_late) ||
            (selectedStatus === record.status && !record.is_late);

          const isWeekend = record.status === 'weekly_off';

          return (
            <div
              key={dateStr}
              onClick={() => {
                setSelectedDate(dateStr);
                if (onSelectDay) onSelectDay(dateStr, record);
                if (onRequestCorrection) onRequestCorrection(dateStr, record);
              }}
              className={`min-h-[105px] p-2.5 rounded-xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group ${
                !matchesCategory ? 'opacity-30 grayscale' : 'opacity-100'
              } ${
                isToday
                  ? 'ring-2 ring-indigo-500 border-indigo-300 bg-indigo-50/20 dark:bg-indigo-950/20'
                  : selectedDate === dateStr
                  ? 'border-indigo-400 bg-slate-50 dark:bg-slate-800 shadow-xs'
                  : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 hover:shadow-md bg-white dark:bg-slate-900'
              }`}
            >
              {/* Header: Shift Name on Left, Date Badge on Right */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                <span className="truncate max-w-[80px]">{(record as any).shift_name || (record as any).shiftName || (isWeekend ? 'Off Day' : 'Shift')}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                  isToday
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800'
                }`}>
                  {dayNum}
                </span>
              </div>

              {/* Body: Hours / Login Info */}
              <div className="my-1 text-center">
                {record.check_in_time ? (
                  <div className="space-y-0.5 text-[10px]">
                    <div className="font-bold text-slate-700 dark:text-slate-200">
                      Login {record.duration_minutes ? `${(record.duration_minutes / 60).toFixed(2)} Hrs` : '00:00 Hrs'}
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 truncate">
                      {new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to {record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00'}
                    </div>
                  </div>
                ) : !isWeekend && (record.status as string) !== 'upcoming' ? (
                  <div className="text-[10px] font-semibold text-slate-400">
                    Login <span className="font-mono">00:00 Hrs</span>
                  </div>
                ) : null}
              </div>

              {/* Footer: Status Badge */}
              <div className="flex items-center justify-between mt-auto pt-1">
                {badge ? (
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold inline-block ${badge.className}`}>
                    {badge.label}
                  </span>
                ) : (
                  <span />
                )}
                <PlusCircle className="w-3.5 h-3.5 text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
