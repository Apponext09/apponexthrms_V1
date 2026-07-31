// ============================================================
// LiveTrackingFilterBar
// client/src/features/Livetracking/components/LiveTrackingFilterBar.tsx
// Supports light and dark mode matching system theme
// ============================================================
import React from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import type { LiveTrackingFilters, LiveEmployee } from '../types/livetracking.types';

interface Props {
  filters: LiveTrackingFilters;
  onChange: (filters: LiveTrackingFilters) => void;
  employees: LiveEmployee[];
}

export const LiveTrackingFilterBar: React.FC<Props> = ({ filters, onChange, employees }) => {
  const departments = Array.from(
    new Set(employees.map((e) => e.department?.trim()).filter(Boolean) as string[])
  ).sort();
  const designations = Array.from(
    new Set(employees.map((e) => e.designation?.trim()).filter(Boolean) as string[])
  ).sort();
  const managers = Array.from(
    new Set(employees.map((e) => e.reporting_manager?.trim()).filter(Boolean) as string[])
  ).sort();

  const update = (patch: Partial<LiveTrackingFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap gap-2.5 p-3.5 bg-card/80 border border-border/80 rounded-2xl shadow-2xs backdrop-blur-md">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search employee by name or ID..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="w-full pl-9 pr-4 py-2 bg-background border border-border/80 rounded-xl text-xs font-semibold text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
        />
      </div>

      {/* Department */}
      <select
        value={filters.department}
        onChange={(e) => update({ department: e.target.value })}
        className="px-3 py-2 bg-background border border-border/80 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
      >
        <option value="">All Departments ({departments.length})</option>
        {departments.map((d) => (
          <option key={d} value={d!}>
            {d}
          </option>
        ))}
      </select>

      {/* Designation */}
      <select
        value={filters.designation}
        onChange={(e) => update({ designation: e.target.value })}
        className="px-3 py-2 bg-background border border-border/80 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
      >
        <option value="">All Designations ({designations.length})</option>
        {designations.map((d) => (
          <option key={d} value={d!}>
            {d}
          </option>
        ))}
      </select>

      {/* Reporting Manager */}
      <select
        value={filters.reportingManager}
        onChange={(e) => update({ reportingManager: e.target.value })}
        className="px-3 py-2 bg-background border border-border/80 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
      >
        <option value="">All Reporting Managers ({managers.length})</option>
        {managers.map((m) => (
          <option key={m!} value={m!}>
            {m}
          </option>
        ))}
      </select>

      {/* Connection Status */}
      <select
        value={filters.connectionStatus}
        onChange={(e) =>
          update({ connectionStatus: e.target.value as LiveTrackingFilters['connectionStatus'] })
        }
        className="px-3 py-2 bg-background border border-border/80 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
      >
        <option value="all">Online + Offline</option>
        <option value="ONLINE">Online Only</option>
        <option value="OFFLINE">Offline Only</option>
      </select>

      {/* Location Status */}
      <select
        value={filters.locationStatus}
        onChange={(e) =>
          update({ locationStatus: e.target.value as LiveTrackingFilters['locationStatus'] })
        }
        className="px-3 py-2 bg-background border border-border/80 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
      >
        <option value="all">Location ON + OFF</option>
        <option value="ON">Location ON</option>
        <option value="OFF">Location OFF</option>
      </select>

      {/* Attendance Status */}
      <select
        value={filters.attendanceStatus}
        onChange={(e) => update({ attendanceStatus: e.target.value })}
        className="px-3 py-2 bg-background border border-border/80 rounded-xl text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
      >
        <option value="">All Attendance</option>
        <option value="present">Present</option>
        <option value="absent">Absent</option>
        <option value="work_from_home">WFH</option>
        <option value="on_leave">On Leave</option>
      </select>

      {/* Reset */}
      <button
        onClick={() =>
          onChange({
            search: '',
            department: '',
            designation: '',
            reportingManager: '',
            attendanceStatus: '',
            connectionStatus: 'all',
            locationStatus: 'all',
          })
        }
        className="flex items-center gap-1.5 px-3.5 py-2 bg-muted hover:bg-muted/80 border border-border/80 rounded-xl text-xs font-bold text-foreground transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Reset
      </button>
    </div>
  );
};
