import React, { useState, useCallback } from 'react';
import { Clock, Coffee, Download, Filter, RefreshCw, Calendar, Search, TrendingUp } from 'lucide-react';
import { apiClient } from '@/config/api';
import { useAttendance, type BreakTypeOption } from '../hooks/useAttendance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import { useCompanies } from '@/features/settings/hooks/useCompanies';

interface BreakLogRow {
  date: string;
  employeeId?: number;
  employee_id?: number;
  employeeName?: string;
  employee_name?: string;
  employeeCode?: string;
  employee_code?: string;
  breakTypeName?: string;
  break_type_name?: string;
  breakSettingId?: number;
  break_setting_id?: number;
  breakStartTime?: string;
  break_start_time?: string;
  breakEndTime?: string | null;
  break_end_time?: string | null;
  breakDurationMinutes?: number | null;
  break_duration_minutes?: number | null;
  status: string;
}

const getRowEmpName = (r: BreakLogRow) => r.employeeName || r.employee_name || 'Employee';
const getRowEmpCode = (r: BreakLogRow) => r.employeeCode || r.employee_code || '';
const getRowBreakType = (r: BreakLogRow) => r.breakTypeName || r.break_type_name || 'General Break';
const getRowStartTime = (r: BreakLogRow) => r.breakStartTime || r.break_start_time || null;
const getRowEndTime = (r: BreakLogRow) => r.breakEndTime || r.break_end_time || null;
const getRowDuration = (r: BreakLogRow) => r.breakDurationMinutes ?? r.break_duration_minutes ?? null;

const getTodayStr = () => new Date().toISOString().split('T')[0];
const get30DaysAgoStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split('T')[0];
};

function fmtTime(ts: string | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function durationBadgeColor(mins: number | null): string {
  if (!mins) return 'bg-slate-100 text-slate-500';
  if (mins <= 15) return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
  if (mins <= 45) return 'bg-amber-100 text-amber-700 border border-amber-200';
  return 'bg-red-100 text-red-700 border border-red-200';
}

const breakTypeEmoji = (name?: string | null) => {
  if (!name) return '⏸️';
  const n = String(name).toLowerCase();
  if (n.includes('lunch')) return '🍽️';
  if (n.includes('tea') || n.includes('coffee')) return '☕';
  if (n.includes('prayer')) return '🕌';
  if (n.includes('personal')) return '🚶';
  return '⏸️';
};

export const BreakLogsPage: React.FC = () => {
  const { getBreakTypes } = useAttendance();
  const { data: companies = [] } = useCompanies();
  const [rows, setRows] = useState<BreakLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [breakTypes, setBreakTypes] = useState<BreakTypeOption[]>([]);
  const [loadedTypes, setLoadedTypes] = useState(false);

  // Master Filter Options
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: number; name: string; code?: string; reportingManagerId?: number }[]>([]);

  // Selected Filters
  const [startDate, setStartDate] = useState(get30DaysAgoStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedBreakType, setSelectedBreakType] = useState('');
  const [search, setSearch] = useState('');

  // Load master data dropdown lists
  const loadMasterFilters = useCallback(async () => {
    try {
      const [deptRes, empRes] = await Promise.all([
        apiClient.get('/settings/departments?pageSize=100').catch(() => ({ data: { data: [] } })),
        apiClient.get('/employees?pageSize=200').catch(() => ({ data: { data: [] } })),
      ]);

      const deptList = (deptRes.data?.data || deptRes.data?.items || []).map((d: any) => ({
        id: d.department_id ?? d.id,
        name: d.name || d.department_name || d.departmentName || `Department #${d.department_id || d.id}`,
      })).filter((d: any) => d.id != null);

      const empList = (empRes.data?.data || empRes.data?.items || []).map((e: any) => ({
        id: e.employee_id ?? e.id,
        name: e.first_name || e.firstName || e.lastName
          ? `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim()
          : (e.name || `Employee #${e.employee_id || e.id}`),
        code: e.employee_code || e.employeeCode,
      })).filter((e: any) => e.id != null);

      setDepartments(deptList);
      setEmployees(empList);
    } catch (err) {
      console.warn('Failed to load master filters:', err);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedCompanyId ? { companyId: selectedCompanyId } : {}),
        ...(selectedDepartmentId ? { departmentId: selectedDepartmentId } : {}),
        ...(selectedEmployeeId ? { employeeId: selectedEmployeeId } : {}),
        ...(selectedBreakType ? { breakTypeName: selectedBreakType } : {}),
      });
      const res = await apiClient.get(`/attendance/break-logs?${params}`);
      setRows(res.data?.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedCompanyId, selectedDepartmentId, selectedEmployeeId, selectedBreakType]);

  const loadBreakTypes = useCallback(async () => {
    if (loadedTypes) return;
    const types = await getBreakTypes();
    setBreakTypes(types);
    setLoadedTypes(true);
  }, [getBreakTypes, loadedTypes]);

  // Automatically re-fetch logs whenever any filter selection or date range changes
  React.useEffect(() => {
    loadBreakTypes();
    loadMasterFilters();
  }, [loadBreakTypes, loadMasterFilters]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredRows = rows.filter((r) => {
    if (!search) return true;
    const empName = getRowEmpName(r).toLowerCase();
    const empCode = getRowEmpCode(r).toLowerCase();
    const breakType = getRowBreakType(r).toLowerCase();
    const q = search.toLowerCase();
    return empName.includes(q) || empCode.includes(q) || breakType.includes(q);
  });

  // Summary stats
  const totalMinutes = filteredRows.reduce((acc, r) => acc + (getRowDuration(r) || 0), 0);
  const uniqueEmployees = new Set(filteredRows.map((r) => r.employeeId || r.employee_id)).size;
  const totalSessions = filteredRows.length;

  // Per-type breakdown for summary
  const byType = filteredRows.reduce<Record<string, number>>((acc, r) => {
    const type = getRowBreakType(r);
    const mins = getRowDuration(r) || 0;
    acc[type] = (acc[type] || 0) + mins;
    return acc;
  }, {});

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedCompanyId('');
    setSelectedDepartmentId('');
    setSelectedEmployeeId('');
    setSelectedBreakType('');
    setSearch('');
    setStartDate(get30DaysAgoStr());
    setEndDate(getTodayStr());
  };

  // CSV export
  const handleExportCSV = () => {
    const headers = ['Date', 'Employee', 'Code', 'Break Type', 'Start Time', 'End Time', 'Duration (min)'];
    const csvRows = filteredRows.map((r) => [
      r.date,
      getRowEmpName(r),
      getRowEmpCode(r),
      getRowBreakType(r),
      fmtTime(getRowStartTime(r)),
      fmtTime(getRowEndTime(r)),
      getRowDuration(r) ?? '',
    ]);
    const csv = [headers, ...csvRows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `break-logs-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground tracking-tight">Attendance Break Report</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprehensive employee break breakdown with Company, Location, Department, Officer & Employee filters
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" onClick={fetchLogs} className="h-8 text-xs font-semibold gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="h-8 text-xs font-semibold gap-1.5" disabled={filteredRows.length === 0}>
            <Download className="w-3.5 h-3.5 text-primary" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Sessions</p>
              <div className="text-2xl font-black text-foreground mt-1">{totalSessions}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{uniqueEmployees} employees</p>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
              <Coffee className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Total Break Time</p>
              <div className="text-2xl font-black text-foreground mt-1">
                {totalMinutes >= 60
                  ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
                  : `${totalMinutes}m`}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Combined all types</p>
            </div>
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-2xs">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">By Break Type</p>
            {Object.entries(byType).length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(byType).slice(0, 4).map(([type, mins]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                      <span>{breakTypeEmoji(type)}</span>
                      <span className="truncate max-w-[120px]">{type}</span>
                    </span>
                    <span className="text-[11px] font-black text-amber-600">{mins}m</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Filter Bar */}
      <div className="bg-card border border-border/80 p-4 rounded-xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">Report Filters</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-7 text-xs text-muted-foreground hover:text-foreground">
            Clear Filters
          </Button>
        </div>

        {/* Master Dropdowns Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Company Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground block">Company</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full h-9 text-xs rounded-lg border border-input bg-background px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground block">Department</label>
            <select
              value={selectedDepartmentId}
              onChange={(e) => setSelectedDepartmentId(e.target.value)}
              className="w-full h-9 text-xs rounded-lg border border-input bg-background px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Employee Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground block">Employee</label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full h-9 text-xs rounded-lg border border-input bg-background px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            >
              <option value="">All Employees</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name} {e.code ? `(${e.code})` : ''}</option>
              ))}
            </select>
          </div>

          {/* Break Type Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground block">Break Type</label>
            <select
              value={selectedBreakType}
              onChange={(e) => setSelectedBreakType(e.target.value)}
              className="w-full h-9 text-xs rounded-lg border border-input bg-background px-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
            >
              <option value="">All Break Types</option>
              {breakTypes.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range, Search & Apply Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-end justify-between gap-3 pt-3 border-t border-border/40">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground block">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs w-36"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-muted-foreground block">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs w-36"
              />
            </div>
          </div>

          <div className="flex-1 max-w-md space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground block">Search Record</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by employee name, code, or break type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-xs pl-9"
              />
            </div>
          </div>

          <Button size="sm" onClick={fetchLogs} disabled={loading} className="h-9 px-6 text-xs font-bold gap-2 shrink-0">
            <TrendingUp className="w-4 h-4" />
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Data table */}
      <div className="bg-card border border-border/80 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="text-left px-4 py-2.5 font-bold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-2.5 font-bold text-muted-foreground uppercase tracking-wider">Employee</th>
                <th className="text-left px-4 py-2.5 font-bold text-muted-foreground uppercase tracking-wider">Break Type</th>
                <th className="text-left px-4 py-2.5 font-bold text-muted-foreground uppercase tracking-wider">Start</th>
                <th className="text-left px-4 py-2.5 font-bold text-muted-foreground uppercase tracking-wider">End</th>
                <th className="text-right px-4 py-2.5 font-bold text-muted-foreground uppercase tracking-wider">Duration</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Loading break logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Coffee className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-muted-foreground">No break logs found</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Try adjusting your filters or date range</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const empName = getRowEmpName(row);
                  const empCode = getRowEmpCode(row);
                  const breakType = getRowBreakType(row);
                  const startTime = getRowStartTime(row);
                  const endTime = getRowEndTime(row);
                  const duration = getRowDuration(row);

                  return (
                    <tr
                      key={`${row.employeeId || row.employee_id || idx}-${startTime || idx}-${idx}`}
                      className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="font-semibold text-foreground">{fmtDate(row.date)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-foreground">{empName}</p>
                          {empCode && (
                            <p className="text-[10px] text-muted-foreground">{empCode}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold">
                          <span>{breakTypeEmoji(breakType)}</span>
                          <span>{breakType}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {fmtTime(startTime)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {fmtTime(endTime)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${durationBadgeColor(duration)}`}>
                          <Clock className="w-3 h-3" />
                          {duration != null ? `${duration}m` : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredRows.length > 0 && (
          <div className="px-4 py-3 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/10">
            <span>{filteredRows.length} records shown</span>
            <span>
              Total: <span className="font-black text-foreground">
                {totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
