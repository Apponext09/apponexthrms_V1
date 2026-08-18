import React, { useState } from 'react';
import { Filter, RotateCcw, Info, Download, ChevronDown, Check, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useReportFilterOptions,
  useTimelogMatrixQuery,
} from '../hooks/useAttendanceReports';
import { cn } from '@/lib/utils';

function getDatesInRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const partsStart = startStr.split('-');
  const partsEnd = endStr.split('-');
  if (partsStart.length !== 3 || partsEnd.length !== 3) return dates;
  const start = new Date(parseInt(partsStart[0]), parseInt(partsStart[1]) - 1, parseInt(partsStart[2]));
  const end = new Date(parseInt(partsEnd[0]), parseInt(partsEnd[1]) - 1, parseInt(partsEnd[2]));
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return dates;
  const curr = new Date(start);
  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
}

interface WeekChunk { weekNum: number; dates: string[]; }
function getWeekChunks(dateList: string[]): WeekChunk[] {
  const chunks: WeekChunk[] = [];
  for (let i = 0; i < dateList.length; i += 7) {
    chunks.push({ weekNum: Math.floor(i / 7) + 1, dates: dateList.slice(i, i + 7) });
  }
  return chunks;
}

export function TimelogReportView() {
  const { data: optionsData } = useReportFilterOptions();

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedReportingOfficers, setSelectedReportingOfficers] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const get14DaysAgoStr = () => { const d = new Date(); d.setDate(d.getDate() - 14); return d.toISOString().split('T')[0]; };

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [fromDate, setFromDate] = useState(get14DaysAgoStr());
  const [toDate, setToDate] = useState(getTodayStr());
  const [status, setStatus] = useState('choose');
  const [lastDayOfWeek, setLastDayOfWeek] = useState('Sunday');
  // false = timings view (default), true = status table view
  const [viewStatusTable, setViewStatusTable] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(true);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const [queryParams, setQueryParams] = useState<{
    fromDate: string; toDate: string; employees?: string[]; locations?: string[];
    departments?: string[]; reportingOfficers?: string[]; status?: string;
  }>({ fromDate: get14DaysAgoStr(), toDate: getTodayStr() });

  React.useEffect(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const newFrom = formatDate(firstDay);
    const newTo = formatDate(lastDay);

    setFromDate(newFrom);
    setToDate(newTo);
    setQueryParams({
      fromDate: newFrom,
      toDate: newTo,
      status: 'choose'
    });
  }, [currentMonthDate]);

  const prevMonth = () => {
    setCurrentMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const nextMonth = () => {
    setCurrentMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const { data: fetchedMatrixData, isLoading: isMatrixLoading } = useTimelogMatrixQuery(queryParams);

  const dateList = getDatesInRange(fromDate, toDate);
  const weekChunks = getWeekChunks(dateList);
  const matrixLogs = fetchedMatrixData || [];

  const toggleMultiSelect = (currentList: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, id: string) => {
    setList(currentList.includes(id) ? currentList.filter(i => i !== id) : [...currentList, id]);
  };

  const handleReset = () => {
    setSelectedCompanies([]); setSelectedLocations([]); setSelectedDepartments([]);
    setSelectedReportingOfficers([]); setSelectedEmployees([]);
    setFromDate(get14DaysAgoStr()); setToDate(getTodayStr());
    setStatus('choose'); setLastDayOfWeek('Sunday'); setViewStatusTable(false);
    setQueryParams({ fromDate: get14DaysAgoStr(), toDate: getTodayStr() });
    setHasSubmitted(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQueryParams({ fromDate, toDate, employees: selectedEmployees, locations: selectedLocations, departments: selectedDepartments, reportingOfficers: selectedReportingOfficers, status });
    setHasSubmitted(true);
  };

  const handleExportExcel = () => {
    const dates = getDatesInRange(fromDate, toDate);
    const chunks = getWeekChunks(dates);
    let headers: string[], rows: string[];
    if (!viewStatusTable) {
      headers = ['Location', 'Name', 'Employee Code', ...dates, 'Present Days', 'LWP', 'PL', 'PLV', 'W/O', 'Total Holiday', 'Payable Days'];
      rows = matrixLogs.map(row => [
        `"${row.location}"`, `"${row.employeeName}"`, `"${row.employeeCode}"`,
        ...dates.map(d => row.dailyStatus[d] || 'NP'),
        row.presentDays, row.lwp, row.pl, row.plv, row.wo, row.totalHoliday, row.payableDays,
      ].join(','));
    } else {
      const mid: string[] = [];
      chunks.forEach(c => { c.dates.forEach(d => mid.push(d)); mid.push(`Weekly Total Working Hours for ${c.weekNum} week`); mid.push(`Weekly Average Working Hours for ${c.weekNum} week`); });
      headers = ['Location', 'Name', 'Employee Code', ...mid, 'Total', 'Average', 'Total Break Hours', 'Actual Work Hours'];
      rows = matrixLogs.map(row => {
        const midCols: string[] = [];
        chunks.forEach(c => { c.dates.forEach(d => midCols.push(row.dailyTimings?.[d] || row.dailyStatus[d] || 'NP')); midCols.push(row.weeklyTotalHours?.[c.weekNum] || '00:00'); midCols.push(row.weeklyAvgHours?.[c.weekNum] || '00:00'); });
        return [`"${row.location}"`, `"${row.employeeName}"`, `"${row.employeeCode}"`, ...midCols, row.grandTotal || '00:00', row.grandAverage || '00:00', row.totalBreakHours || '00:00', row.actualWorkHours || '00:00'].join(',');
      });
    }
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Timelog_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const renderMultiSelectDropdown = (label: string, selectedIds: string[], setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>, items: Array<{ id: string; name: string }>) => {
    const isAllSelected = items.length > 0 && selectedIds.length === items.length;
    const labelCountText = items.length > 0 && isAllSelected ? `${label} (All)` : `${label} (${selectedIds.length})`;
    return (
      <div className="flex flex-col space-y-1.5">
        <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between h-9 px-3 text-xs font-normal bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md shadow-2xs transition-colors">
              <span className="truncate">{labelCountText}</span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-60 text-slate-600 dark:text-slate-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2 shadow-lg border border-slate-200 dark:border-slate-700 bg-popover" align="start">
            <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
              {items.length === 0 ? <p className="text-xs text-muted-foreground p-2">No options available</p> : (
                <>
                  <div onClick={() => isAllSelected ? setSelectedIds([]) : setSelectedIds(items.map(i => i.id))} className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-700 font-bold mb-1 pb-1.5">
                    <div className={cn('w-4 h-4 rounded border flex items-center justify-center transition-colors', isAllSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-slate-400 dark:border-slate-600')}>{isAllSelected && <Check className="w-3 h-3" />}</div>
                    <span className="truncate">Select All</span>
                  </div>
                  {items.map(item => {
                    const isChecked = selectedIds.includes(item.id);
                    return (
                      <div key={item.id} onClick={() => toggleMultiSelect(selectedIds, setSelectedIds, item.id)} className={cn('flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors', isChecked && 'bg-primary/10 font-semibold text-primary')}>
                        <div className={cn('w-4 h-4 rounded border flex items-center justify-center transition-colors', isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-slate-400 dark:border-slate-600')}>{isChecked && <Check className="w-3 h-3" />}</div>
                        <span className="truncate">{item.name}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  // -- TIMINGS VIEW -------------------------------------------------------------
  // Default (checkbox unchecked): shows HH:MM-HH:MM / Week-Off per date
  // ─────────────────────────────────────────────────────────────────────────────
  // TABLE RENDERERS
  // ─────────────────────────────────────────────────────────────────────────────

  // Shared loading / empty state rows
  const renderLoadingRow = (colSpan: number) => (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Loading data from database…
        </div>
      </td>
    </tr>
  );

  const renderEmptyRow = (colSpan: number) => (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-xs text-muted-foreground">
        No records found for the selected filters and date range.
      </td>
    </tr>
  );

  const renderTimingsTable = () => (
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 font-extrabold border-b border-slate-300 dark:border-slate-700 text-[11px]">
          <tr>
            <th className="py-2.5 px-3 text-left border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[90px]">Location</th>
            <th className="py-2.5 px-3 text-left border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[130px]">Name</th>
            <th className="py-2.5 px-3 text-left border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[100px]">Employee Code</th>
            {weekChunks.map(chunk => (
              <React.Fragment key={`th-wk-${chunk.weekNum}`}>
                {chunk.dates.map(d => (
                  <th key={d} className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-bold text-[11px] min-w-[106px]">{d}</th>
                ))}
                <th className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-700 font-bold text-[10px] min-w-[130px] bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 leading-tight">
                  Weekly Total Working<br />Hours for {chunk.weekNum} week
                </th>
                <th className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-700 font-bold text-[10px] min-w-[140px] bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400 leading-tight">
                  Weekly Average Working<br />Hours for {chunk.weekNum} week
                </th>
              </React.Fragment>
            ))}
            <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[70px] font-bold bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-[10px]">Total</th>
            <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[80px] font-bold bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-[10px]">Average</th>
            <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[110px] font-bold bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-[10px]">Total Break Hours</th>
            <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[110px] font-bold bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 text-[10px]">Actual Work Hours</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 text-[11px]">
          {matrixLogs.map(row => (
            <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
              <td className="py-2 px-3 font-medium border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">{row.location}</td>
              <td className="py-2 px-3 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">{row.employeeName}</td>
              <td className="py-2 px-3 font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">{row.employeeCode}</td>
              {weekChunks.map(chunk => (
                <React.Fragment key={`td-wk-${chunk.weekNum}`}>
                  {chunk.dates.map(d => {
                    const timing = row.dailyTimings?.[d] || '';
                    const statusVal = row.dailyStatus[d] || 'NP';
                    const display = timing || statusVal;
                    const isWeekOff = display === 'Week-Off' || statusVal === 'W/O';
                    const isZero = display === '00:00-00:00';
                    return (
                      <td key={d} className={`py-2 px-2 text-center font-medium border-r border-slate-200 dark:border-slate-800 whitespace-nowrap ${isWeekOff ? 'text-slate-500 dark:text-slate-500 bg-slate-50/60 dark:bg-slate-900/40' : isZero ? 'text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-200'}`}>
                        {display}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/20 whitespace-nowrap">
                    {row.weeklyTotalHours?.[chunk.weekNum] || '00:00'}
                  </td>
                  <td className="py-2 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-900/20 whitespace-nowrap">
                    {row.weeklyAvgHours?.[chunk.weekNum] || '00:00'}
                  </td>
                </React.Fragment>
              ))}
              <td className="py-2 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-900/20 whitespace-nowrap">{row.grandTotal || '00:00'}</td>
              <td className="py-2 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-900/20 whitespace-nowrap">{row.grandAverage || '00:00'}</td>
              <td className="py-2 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-900/20 whitespace-nowrap">{row.totalBreakHours || '00:00'}</td>
              <td className="py-2 px-3 text-center font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-900/20 whitespace-nowrap">{row.actualWorkHours || '00:00'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // -- STATUS TABLE VIEW ---------------------------------------------------------
  // Checkbox checked: shows NP/P/W/O status codes per date + summary count columns
  const renderStatusTable = () => (
    <div className="overflow-x-auto no-scrollbar">
      <table className="w-full text-xs border-collapse">
        <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 font-extrabold border-b border-slate-300 dark:border-slate-700 text-[11px]">
          <tr>
            <th className="py-2.5 px-3 text-left border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[90px]">Location</th>
            <th className="py-2.5 px-3 text-left border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[130px]">Name</th>
            <th className="py-2.5 px-3 text-left border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[100px]">Employee Code</th>
            {dateList.map(d => (
              <th key={d} className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-bold text-[11px] min-w-[72px]">{d}</th>
            ))}
            <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[90px] font-bold">Present Days</th>
            <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[50px] font-bold">LWP</th>
            <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[45px] font-bold">PL</th>
            <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[45px] font-bold">PLV</th>
            <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[50px] font-bold">W/O</th>
            <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[90px] font-bold">Total Holiday</th>
            <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[90px] font-bold">Payable Days</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 text-[11px]">
          {matrixLogs.map(row => (
            <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
              <td className="py-2.5 px-3 font-medium border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">{row.location}</td>
              <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">{row.employeeName}</td>
              <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">{row.employeeCode}</td>
              {dateList.map(d => {
                const s = row.dailyStatus[d] || 'NP';
                return (
                  <td key={d} className={`py-2.5 px-2 text-center font-bold border-r border-slate-200 dark:border-slate-800 ${
                    s === 'W/O' ? 'text-slate-500 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/30'
                    : s === 'P' ? 'text-emerald-600 dark:text-emerald-400'
                    : s === 'PL' || s === 'PLV' ? 'text-purple-600 dark:text-purple-400'
                    : s === 'LWP' ? 'text-rose-500 dark:text-rose-400'
                    : s === 'HD' ? 'text-amber-600 dark:text-amber-400'
                    : 'text-blue-600 dark:text-blue-400'
                  }`}>{s}</td>
                );
              })}
              <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">{row.presentDays}</td>
              <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">{row.lwp}</td>
              <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">{row.pl}</td>
              <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">{row.plv}</td>
              <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">{row.wo}</td>
              <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">{row.totalHoliday}</td>
              <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-slate-100">{row.payableDays}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Info Modal */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-[#00c0ef]" /><span>Timelog Report Guide & Calculation Info</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground pt-2">
            <p>ï¿½ <strong>Timings View (default):</strong> Shows actual check-in/out times per day with weekly total & average working hours, plus grand Total, Average, Total Break Hours, Actual Work Hours.</p>
            <p>ï¿½ <strong>Status Table View (checkbox checked):</strong> Shows attendance codes ï¿½ NP = Not Present, P = Present, W/O = Week Off, PL = Paid Leave, PLV = Privilege Leave, LWP = Leave Without Pay ï¿½ with summary counts.</p>
            <p>ï¿½ <strong>Export:</strong> Download the current view in CSV format using 'Export Excel'.</p>
          </div>
          <div className="pt-4 flex justify-end"><Button variant="outline" onClick={() => setIsInfoOpen(false)} className="h-8 text-xs">Close</Button></div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 animate-in fade-in-50 duration-200">
        <div className="bg-card border border-border/80 rounded-xl shadow-soft-md overflow-hidden">
          <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-900/50 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-extrabold text-foreground tracking-tight whitespace-nowrap">
                Timelog Report
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsInfoOpen(true)}
                className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Info className="w-4 h-4" />
              </Button>
            </div>

            {/* Month Navigation Controls */}
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={prevMonth} className="h-7 w-7 p-0 rounded-lg">
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-muted rounded-lg text-foreground min-w-[120px] text-center">
                {currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="outline" size="sm" onClick={nextMonth} className="h-7 w-7 p-0 rounded-lg">
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentMonthDate(new Date())}
                className="text-xs text-primary font-bold ml-1 h-7 px-2"
              >
                Today
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Checkbox status toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox id="viewStatusTable" checked={viewStatusTable} onCheckedChange={c => setViewStatusTable(!!c)} />
                <label htmlFor="viewStatusTable" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none whitespace-nowrap">
                  View Status Table
                </label>
              </div>

              <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 space-x-1.5 shadow-2xs">
                <Download className="w-3.5 h-3.5 text-primary" /><span>Export Excel</span>
              </Button>
            </div>
          </div>
          {viewStatusTable ? renderTimingsTable() : renderStatusTable()}
        </div>
      </div>
    </div>
  );
}


