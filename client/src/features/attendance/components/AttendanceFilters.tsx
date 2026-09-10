import React from 'react';
import { Calendar, Filter, RotateCcw, CheckCircle2 } from 'lucide-react';

interface AttendanceFiltersProps {
  startDate: string;
  endDate: string;
  selectedStatus: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onStatusChange: (status: string) => void;
  onReset: () => void;
}

export const AttendanceFilters: React.FC<AttendanceFiltersProps> = ({
  startDate,
  endDate,
  selectedStatus,
  onStartDateChange,
  onEndDateChange,
  onStatusChange,
  onReset,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Filters</h3>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1 font-semibold transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Date Range Selection */}
      <div className="space-y-3">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Date Range Filter
        </label>
        <div className="space-y-2">
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block mb-1 uppercase tracking-wider">From Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-semibold block mb-1 uppercase tracking-wider">To Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Category / Status Filter */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
          Category / Status
        </label>
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Categories</option>
          <option value="present">🟢 Present (Green)</option>
          <option value="absent">🔴 Absent (Red)</option>
          <option value="late">🟤 Late (Brown)</option>
          <option value="work_from_home">🔵 WFH (Blue)</option>
        </select>
      </div>
    </div>
  );
};
