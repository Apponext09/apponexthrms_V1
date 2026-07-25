import React, { useState } from 'react';
import { Calendar as CalendarIcon, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttendanceReportRow } from '../hooks/useAttendanceReports';
import { cn } from '@/lib/utils';
import { ColumnCustomizer, DEFAULT_COLUMNS, ColumnDef } from './ColumnCustomizer';

interface AttendanceReportTableProps {
  data: AttendanceReportRow[];
  onOpenTimeline: (row: AttendanceReportRow) => void;
}

export function AttendanceReportTable({ data, onOpenTimeline }: AttendanceReportTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  // Column configuration state — initialized from DEFAULT_COLUMNS
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS.map(c => ({ ...c })));

  // Visible columns only (in the user's chosen order)
  const visibleCols = columns.filter(c => c.visible);

  // Filter by search term
  const filteredData = data.filter(
    (row) =>
      row.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.date.includes(searchTerm) ||
      row.shift.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.dayStatus.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEntries = filteredData.length;
  const startIndex = (currentPage - 1) * pageSize;
  const pageData = filteredData.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;

  const renderStatusBadge = (status: AttendanceReportRow['dayStatus']) => {
    switch (status) {
      case 'Full Day':
        return (
          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-[#00a65a] text-white text-center shadow-2xs">
            Full Day
          </span>
        );
      case 'Half Day':
        return (
          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-[#f39c12] text-white text-center shadow-2xs">
            Half Day
          </span>
        );
      case 'Absent':
        return (
          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-[#dd4b39] text-white text-center shadow-2xs">
            Absent
          </span>
        );
      case 'Leave':
        return (
          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-purple-600 text-white text-center shadow-2xs">
            Leave
          </span>
        );
      case 'Week Off':
      case 'Holiday':
        return (
          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-slate-500 text-white text-center shadow-2xs">
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-slate-200 text-slate-800">
            {status}
          </span>
        );
    }
  };

  // ── Export: uses visible columns only ──────────────────────────────────────
  const exportToCSV = () => {
    const headers = visibleCols
      .filter(c => c.key !== 'serial')
      .map(c => c.label);

    const rows = filteredData.map((r) =>
      visibleCols
        .filter(c => c.key !== 'serial')
        .map(c => {
          const val = getCellValue(r, c.key);
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        })
    );

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Get raw cell value for a given column key ──────────────────────────────
  const getCellValue = (row: AttendanceReportRow, key: string): string => {
    switch (key) {
      case 'date':              return row.date;
      case 'employeeName':      return row.employeeName;
      case 'employeeCode':      return row.employeeCode ?? '-';
      case 'departmentName':    return row.departmentName ?? '-';
      case 'day':               return row.day;
      case 'payrollCycle':      return row.payrollCycle;
      case 'shift':             return row.shift;
      case 'expTiming':         return row.expTiming;
      case 'actualTiming':      return row.actualTiming;
      case 'checkInTime':       return row.checkInTime ?? '-';
      case 'checkOutTime':      return row.checkOutTime ?? '-';
      // check_in_method / check_out_method not in AttendanceReportRow yet → stub
      case 'checkInMethod':     return '-';
      case 'checkOutMethod':    return '-';
      case 'expHours':          return row.expHours;
      case 'actualHours':       return row.actualHours;
      case 'shortHours':        return row.shortHours;
      case 'bufferMins':        return row.bufferMins;
      case 'lateMins':          return row.lateMins;
      case 'totalBreakHours':   return row.totalBreakHours;
      case 'actualWorkingHours':return row.actualWorkingHours;
      case 'overtimeMins':      return '-';
      case 'isLate':            return row.isLate;
      case 'isEarlyDeparture':  return '-';
      case 'isRegularized':     return '-';
      case 'dayStatus':         return row.dayStatus;
      case 'notes':             return '-';
      case 'checkInLocation':   return row.checkInLocation;
      case 'checkOutLocation':  return row.checkOutLocation;
      default:                  return '-';
    }
  };

  // ── Render a table cell ────────────────────────────────────────────────────
  const renderCell = (row: AttendanceReportRow, col: ColumnDef) => {
    const borderCls = 'border-r border-slate-200/50 dark:border-slate-800';
    const monoCls = 'font-mono text-slate-600 dark:text-slate-400';

    switch (col.key) {
      case 'employeeName':
        return (
          <td key={col.key} className={`py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap ${borderCls}`}>
            {row.employeeName}
          </td>
        );
      case 'employeeCode':
        return (
          <td key={col.key} className={`py-2.5 px-3 ${monoCls} whitespace-nowrap ${borderCls}`}>
            {row.employeeCode ?? '-'}
          </td>
        );
      case 'departmentName':
        return (
          <td key={col.key} className={`py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap ${borderCls}`}>
            {row.departmentName ?? '-'}
          </td>
        );
      case 'date':
        return (
          <td key={col.key} className={`py-2.5 px-3 font-medium whitespace-nowrap ${borderCls}`}>
            {row.date}
          </td>
        );
      case 'day':
        return (
          <td key={col.key} className={`py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap ${borderCls}`}>
            {row.day}
          </td>
        );
      case 'payrollCycle':
        return (
          <td key={col.key} className={`py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap ${borderCls}`}>
            {row.payrollCycle}
          </td>
        );
      case 'shift':
        return (
          <td key={col.key} className={`py-2.5 px-3 text-slate-800 dark:text-slate-200 whitespace-nowrap ${borderCls}`}>
            {row.shift}
          </td>
        );
      case 'expTiming':
        return (
          <td key={col.key} className={`py-2.5 px-3 ${monoCls} whitespace-nowrap ${borderCls}`}>
            {row.expTiming}
          </td>
        );
      case 'actualTiming':
        return (
          <td key={col.key} className={`py-2.5 px-3 font-mono font-medium whitespace-nowrap ${borderCls}`}>
            {row.actualTiming}
          </td>
        );
      case 'checkInTime':
        return (
          <td key={col.key} className={`py-2.5 px-3 font-mono font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap ${borderCls}`}>
            {row.checkInTime || '--'}
          </td>
        );
      case 'checkOutTime':
        return (
          <td key={col.key} className={`py-2.5 px-3 font-mono font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap ${borderCls}`}>
            {row.checkOutTime || '--'}
          </td>
        );
      case 'checkInMethod':
      case 'checkOutMethod':
        return (
          <td key={col.key} className={`py-2.5 px-3 ${monoCls} ${borderCls}`}>-</td>
        );
      case 'expHours':
        return (
          <td key={col.key} className={`py-2.5 px-3 ${monoCls} ${borderCls}`}>{row.expHours}</td>
        );
      case 'actualHours':
        return (
          <td key={col.key} className={`py-2.5 px-3 font-mono font-medium ${borderCls}`}>{row.actualHours}</td>
        );
      case 'shortHours':
        return (
          <td key={col.key} className={`py-2.5 px-3 ${monoCls} ${borderCls}`}>{row.shortHours}</td>
        );
      case 'bufferMins':
        return (
          <td key={col.key} className={`py-2.5 px-3 ${monoCls} ${borderCls}`}>{row.bufferMins}</td>
        );
      case 'lateMins':
        return (
          <td key={col.key} className={`py-2.5 px-3 ${monoCls} ${borderCls}`}>{row.lateMins}</td>
        );
      case 'totalBreakHours':
        return (
          <td key={col.key} className={`py-2.5 px-3 ${monoCls} ${borderCls}`}>{row.totalBreakHours}</td>
        );
      case 'actualWorkingHours':
        return (
          <td key={col.key} className={`py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100 ${borderCls}`}>{row.actualWorkingHours}</td>
        );
      case 'overtimeMins':
      case 'isEarlyDeparture':
      case 'isRegularized':
      case 'notes':
        return (
          <td key={col.key} className={`py-2.5 px-3 ${monoCls} ${borderCls}`}>-</td>
        );
      case 'isLate':
        return (
          <td key={col.key} className={`py-2.5 px-3 text-center font-medium ${borderCls}`}>
            <span className={cn('px-2 py-0.5 rounded text-[11px]', row.isLate === 'Yes' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold' : 'text-slate-500')}>
              {row.isLate}
            </span>
          </td>
        );
      case 'dayStatus':
        return (
          <td key={col.key} className={`py-2.5 px-3 text-center whitespace-nowrap ${borderCls}`}>
            {renderStatusBadge(row.dayStatus)}
          </td>
        );
      case 'checkInLocation':
        return (
          <td key={col.key} className={`py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[150px] ${borderCls}`}>{row.checkInLocation}</td>
        );
      case 'checkOutLocation':
        return (
          <td key={col.key} className={`py-2.5 px-3 text-slate-600 dark:text-slate-400 truncate max-w-[150px] ${borderCls}`}>{row.checkOutLocation}</td>
        );
      default:
        return <td key={col.key} className={`py-2.5 px-3 ${borderCls}`}>-</td>;
    }
  };

  return (
    <div className="bg-card border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden space-y-3">
      {/* Top Controls Bar */}
      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Left: Summary text */}
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Showing <span className="font-bold text-slate-900 dark:text-white">{startIndex + 1}</span> to{' '}
          <span className="font-bold text-slate-900 dark:text-white">{Math.min(startIndex + pageSize, totalEntries)}</span> of{' '}
          <span className="font-bold text-slate-900 dark:text-white">{totalEntries}</span> entries
          <span className="ml-2 font-normal text-muted-foreground">
            · {visibleCols.length} columns visible
          </span>
        </div>

        {/* Right: Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Page size */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 rounded border border-slate-300 dark:border-slate-700 bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>entries</span>
          </div>

          {/* Search */}
          <div className="relative w-44 sm:w-52">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 text-xs pl-8 bg-background border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* ── Column Customizer Button ── */}
          <ColumnCustomizer columns={columns} onChange={setColumns} />

          {/* Export */}
          <Button
            type="button"
            variant="outline"
            onClick={exportToCSV}
            className="h-8 text-xs px-3 font-semibold space-x-1.5 bg-background border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-xs text-left border-collapse" style={{ minWidth: `${visibleCols.length * 90 + 65}px` }}>
          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700 text-[11px]">
            <tr>
              {/* Serial always first */}
              <th className="py-2.5 px-3 w-8 text-center border-r border-slate-200 dark:border-slate-700">#</th>

              {/* Dynamic visible columns */}
              {visibleCols
                .filter(c => c.key !== 'serial')
                .map(col => (
                  <th
                    key={col.key}
                    className="py-2.5 px-3 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap"
                    style={col.minWidth ? { minWidth: col.minWidth } : undefined}
                  >
                    {col.label}
                  </th>
                ))}

              {/* Timeline always last */}
              <th className="py-2.5 px-3 text-center min-w-[65px]">Timeline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={visibleCols.length + 2} className="py-8 text-center text-slate-500 text-xs font-medium">
                  No matching attendance records found.
                </td>
              </tr>
            ) : (
              pageData.map((row, idx) => (
                <tr
                  key={row.id}
                  className={cn(
                    'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors',
                    idx % 2 === 1 ? 'bg-slate-50/50 dark:bg-slate-900/40' : 'bg-card'
                  )}
                >
                  {/* Serial # */}
                  <td className="py-2.5 px-3 text-center text-slate-500 font-mono border-r border-slate-200/50 dark:border-slate-800">
                    {startIndex + idx + 1}
                  </td>

                  {/* Dynamic visible cells (skip serial key) */}
                  {visibleCols
                    .filter(c => c.key !== 'serial')
                    .map(col => renderCell(row, col))}

                  {/* Timeline button always last */}
                  <td className="py-2.5 px-3 text-center">
                    <button
                      onClick={() => onOpenTimeline(row)}
                      title="View Timeline"
                      className="p-1 rounded border border-slate-300 dark:border-slate-700 hover:bg-primary/10 hover:text-primary transition-colors inline-flex items-center justify-center text-slate-600 dark:text-slate-400"
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/50 dark:bg-slate-900/50">
        <div className="text-slate-600 dark:text-slate-400">
          Showing Page <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span> of{' '}
          <span className="font-bold text-slate-900 dark:text-white">{totalPages}</span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="h-8 px-2.5 text-xs font-medium space-x-1 border-slate-300 dark:border-slate-700"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </Button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  'w-7 h-7 rounded font-medium text-xs transition-colors',
                  currentPage === page
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                )}
              >
                {page}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="h-8 px-2.5 text-xs font-medium space-x-1 border-slate-300 dark:border-slate-700"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
