import React, { useState } from 'react';
import { Filter, RotateCcw, Info, Download, ChevronDown, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  useReportFilterOptions,
  generateTimelogMatrixData,
  TimelogMatrixRow,
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

export function TimelogReportView() {
  const { data: optionsData } = useReportFilterOptions();

  // Multi-select dropdown states
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedReportingOfficers, setSelectedReportingOfficers] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  // Base filter states matching screenshot defaults (2024-07-11 to 2024-07-31)
  const [fromDate, setFromDate] = useState('2024-07-11');
  const [toDate, setToDate] = useState('2024-07-31');
  const [status, setStatus] = useState('choose');
  const [lastDayOfWeek, setLastDayOfWeek] = useState('Sunday');
  const [viewStatusTable, setViewStatusTable] = useState(true);

  // Results state
  const [hasSubmitted, setHasSubmitted] = useState(true);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const dateList = getDatesInRange(fromDate, toDate);
  const rawMatrixData: TimelogMatrixRow[] = generateTimelogMatrixData(dateList);
  const [matrixLogs, setMatrixLogs] = useState<TimelogMatrixRow[]>(rawMatrixData);

  const toggleMultiSelect = (
    currentList: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    id: string
  ) => {
    if (currentList.includes(id)) {
      setList(currentList.filter((item) => item !== id));
    } else {
      setList([...currentList, id]);
    }
  };

  const handleReset = () => {
    setSelectedCompanies([]);
    setSelectedLocations([]);
    setSelectedDepartments([]);
    setSelectedReportingOfficers([]);
    setSelectedEmployees([]);
    setFromDate('2024-07-11');
    setToDate('2024-07-31');
    setStatus('choose');
    setLastDayOfWeek('Sunday');
    setViewStatusTable(true);
    setHasSubmitted(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dates = getDatesInRange(fromDate, toDate);
    setMatrixLogs(generateTimelogMatrixData(dates));
    setHasSubmitted(true);
  };

  const handleExportExcel = () => {
    const dates = getDatesInRange(fromDate, toDate);
    const headers = ['Location', 'Name', 'Employee Code', ...dates, 'Present Days', 'LWP', 'PL', 'PLV', 'W/O', 'Total Holiday', 'Payable Days'];

    const rows = matrixLogs.map((row) => {
      const dateCols = dates.map((d) => row.dailyStatus[d] || 'NP');
      return [
        `"${row.location}"`,
        `"${row.employeeName}"`,
        `"${row.employeeCode}"`,
        ...dateCols,
        row.presentDays,
        row.lwp,
        row.pl,
        row.plv,
        row.wo,
        row.totalHoliday,
        row.payableDays,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Timelog_Report_${fromDate}_to_${toDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMultiSelectDropdown = (
    label: string,
    selectedIds: string[],
    setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>,
    items: Array<{ id: string; name: string }>
  ) => {
    const isAllSelected = items.length > 0 && selectedIds.length === items.length;

    const handleToggleSelectAll = () => {
      if (isAllSelected) {
        setSelectedIds([]);
      } else {
        setSelectedIds(items.map((i) => i.id));
      }
    };

    const labelCountText = items.length > 0 && isAllSelected
      ? `${label} (All)`
      : `${label} (${selectedIds.length})`;

    return (
      <div className="flex flex-col space-y-1.5">
        <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between h-9 px-3 text-xs font-normal bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-800 border border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-md shadow-2xs transition-colors"
            >
              <span className="truncate">{labelCountText}</span>
              <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-60 text-slate-600 dark:text-slate-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-2 shadow-lg border border-slate-200 dark:border-slate-700 bg-popover" align="start">
            <div className="space-y-1 max-h-60 overflow-y-auto no-scrollbar">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground p-2">No options available</p>
              ) : (
                <>
                  {/* Select All / Check All Option */}
                  <div
                    onClick={handleToggleSelectAll}
                    className="flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-200 dark:border-slate-700 font-bold mb-1 pb-1.5"
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                        isAllSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-slate-400 dark:border-slate-600'
                      )}
                    >
                      {isAllSelected && <Check className="w-3 h-3" />}
                    </div>
                    <span className="truncate">Select All</span>
                  </div>

                  {items.map((item) => {
                    const isChecked = selectedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleMultiSelect(selectedIds, setSelectedIds, item.id)}
                        className={cn(
                          'flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
                          isChecked && 'bg-primary/10 font-semibold text-primary'
                        )}
                      >
                        <div
                          className={cn(
                            'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                            isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-slate-400 dark:border-slate-600'
                          )}
                        >
                          {isChecked && <Check className="w-3 h-3" />}
                        </div>
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

  return (
    <div className="space-y-6">
      {/* Timelog Report Filter Card */}
      <div className="bg-card border border-border/80 rounded-xl shadow-xs p-4 sm:p-5 space-y-5">
        <div className="pb-1 border-b border-border/50">
          <h2 className="text-sm font-extrabold text-foreground tracking-tight">
            <span>Timelog Report</span>
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Dropdowns with Check All - Company, Location, Department, Reporting Officer, Employee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {renderMultiSelectDropdown('Company', selectedCompanies, setSelectedCompanies, optionsData?.companies || [])}
            {renderMultiSelectDropdown('Location', selectedLocations, setSelectedLocations, optionsData?.locations || [])}
            {renderMultiSelectDropdown('Department', selectedDepartments, setSelectedDepartments, optionsData?.departments || [])}
            {renderMultiSelectDropdown('Reporting Officer', selectedReportingOfficers, setSelectedReportingOfficers, optionsData?.reportingOfficers || [])}
            {renderMultiSelectDropdown('Employee', selectedEmployees, setSelectedEmployees, optionsData?.employees || [])}
          </div>

          {/* Row 2: From Date *, To Date *, Status, Last Day Of Week, Select to view status table */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 items-end pt-1">
            {/* From Date * */}
            <div className="flex flex-col space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-0.5">
                <span>From Date</span>
                <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Input
                type="date"
                required
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 text-xs bg-slate-100/80 dark:bg-slate-800/80 border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* To Date * */}
            <div className="flex flex-col space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-0.5">
                <span>To Date</span>
                <span className="text-rose-500 font-bold">*</span>
              </Label>
              <Input
                type="date"
                required
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 text-xs bg-slate-100/80 dark:bg-slate-800/80 border-slate-300/80 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Status */}
            <div className="flex flex-col space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Status</Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-9 px-3 rounded-md border border-slate-300/80 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="choose">choose</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Last Day Of Week */}
            <div className="flex flex-col space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-200">Last Day Of Week</Label>
              <select
                value={lastDayOfWeek}
                onChange={(e) => setLastDayOfWeek(e.target.value)}
                className="h-9 px-3 rounded-md border border-slate-300/80 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Sunday">Sunday</option>
                <option value="Saturday">Saturday</option>
                <option value="Friday">Friday</option>
              </select>
            </div>

            {/* Select to view status table checkbox */}
            <div className="flex items-center space-x-2 h-9 pb-1">
              <Checkbox
                id="viewStatusTable"
                checked={viewStatusTable}
                onCheckedChange={(c) => setViewStatusTable(!!c)}
              />
              <label htmlFor="viewStatusTable" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none whitespace-nowrap">
                Select to view status table
              </label>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {/* Submit Blue Button */}
            <Button
              type="submit"
              className="bg-[#2b82b9] hover:bg-[#236d9c] text-white font-bold text-xs px-5 h-9 rounded-md shadow-2xs space-x-1.5 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Submit</span>
            </Button>

            {/* Reset Gray Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="bg-slate-200/80 hover:bg-slate-300/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 font-semibold text-xs px-4 h-9 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset</span>
            </Button>

            {/* Info Cyan Button */}
            <Button
              type="button"
              onClick={() => setIsInfoOpen(true)}
              className="bg-[#00c0ef] hover:bg-[#00acd6] text-white font-bold text-xs px-4 h-9 rounded-md shadow-2xs space-x-1.5 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Info</span>
            </Button>
          </div>
        </form>
      </div>

      {/* Info Modal */}
      <Dialog open={isInfoOpen} onOpenChange={setIsInfoOpen}>
        <DialogContent className="max-w-md bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-[#00c0ef]" />
              <span>Timelog Report Guide & Calculation Info</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-muted-foreground pt-2">
            <p>
              • <strong>From Date & To Date:</strong> Select the date range to generate the monthly attendance & timelog matrix.
            </p>
            <p>
              • <strong>Matrix Codes:</strong> NP = Not Present, P = Present, W/O = Week Off, PL = Paid Leave, PLV = Privilege Leave, LWP = Leave Without Pay.
            </p>
            <p>
              • <strong>Export:</strong> Download the full grid report in Excel / CSV format using the 'Export Excel' button.
            </p>
          </div>
          <div className="pt-4 flex justify-end">
            <Button variant="outline" onClick={() => setIsInfoOpen(false)} className="h-8 text-xs">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results State */}
      {!hasSubmitted ? (
        <div className="bg-card border border-dashed border-border/80 rounded-2xl p-12 text-center space-y-3 shadow-soft-xs">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
            <Clock className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-foreground">No Timelog Filtered Yet</h3>
            <p className="text-xs text-muted-foreground">
              Select company, location, department, employee, and date parameters above, then click{' '}
              <span className="font-bold text-primary">'Submit'</span> to view the Timelog Report.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Timelog Report Matrix Table matching user's screenshots */}
          <div className="bg-card border border-border/80 rounded-xl shadow-soft-md overflow-hidden">
            {/* Header row matching screenshot: Title on left, Export Excel on right */}
            <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-900/50 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-foreground tracking-tight">Timelog Report</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-8 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 space-x-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>Export Excel</span>
              </Button>
            </div>

            {/* Scrollable Matrix Table */}
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-xs border-collapse min-w-[1200px]">
                <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 font-extrabold border-b border-slate-300 dark:border-slate-700 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[90px]">
                      Location
                    </th>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[130px]">
                      Name
                    </th>
                    <th className="py-2.5 px-3 text-left border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[100px]">
                      Employee Code
                    </th>
                    {/* Dynamic date header columns */}
                    {dateList.map((d) => (
                      <th
                        key={d}
                        className="py-2.5 px-2 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap font-bold text-[11px]"
                      >
                        {d}
                      </th>
                    ))}
                    {/* Right side summary header columns matching screenshot */}
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[90px] font-bold">
                      Present Days
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[60px] font-bold">
                      LWP
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[50px] font-bold">
                      PL
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[55px] font-bold">
                      PLV
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[55px] font-bold">
                      W/O
                    </th>
                    <th className="py-2.5 px-3 text-center border-r border-slate-200 dark:border-slate-700 whitespace-nowrap min-w-[90px] font-bold">
                      Total Holiday
                    </th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap min-w-[95px] font-bold">
                      Payable Days
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 text-[11px]">
                  {matrixLogs.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-2.5 px-3 font-medium border-r border-slate-200 dark:border-slate-800">
                        {row.location}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 whitespace-nowrap">
                        {row.employeeName}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                        {row.employeeCode}
                      </td>

                      {/* Dynamic date status cells */}
                      {dateList.map((d) => {
                        const statusVal = row.dailyStatus[d] || 'NP';
                        return (
                          <td
                            key={d}
                            className={`py-2.5 px-2 text-center font-bold border-r border-slate-200 dark:border-slate-800 ${
                              statusVal === 'W/O'
                                ? 'text-slate-500 bg-slate-50/50 dark:bg-slate-900/30'
                                : statusVal === 'P'
                                ? 'text-emerald-600 font-extrabold'
                                : statusVal === 'PL' || statusVal === 'PLV'
                                ? 'text-purple-600'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {statusVal}
                          </td>
                        );
                      })}

                      {/* Summary count cells matching screenshot */}
                      <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">
                        {row.presentDays}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">
                        {row.lwp}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">
                        {row.pl}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">
                        {row.plv}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">
                        {row.wo}
                      </td>
                      <td className="py-2.5 px-3 text-center font-semibold border-r border-slate-200 dark:border-slate-800">
                        {row.totalHoliday}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-slate-100">
                        {row.payableDays}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
