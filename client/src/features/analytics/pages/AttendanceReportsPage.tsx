import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { AttendanceReportFilter } from '../components/AttendanceReportFilter';
import { AttendanceReportTable } from '../components/AttendanceReportTable';
import { AttendanceVisualization } from '../components/AttendanceVisualization';
import { EmployeeTimelineModal } from '../components/EmployeeTimelineModal';
import {
  AttendanceReportFilterParams,
  AttendanceReportRow,
  useAttendanceReportQuery,
} from '../hooks/useAttendanceReports';

export function AttendanceReportsPage() {
  const navigate = useNavigate();

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const get14DaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  };

  // Initial Filter State (Auto-fetches database attendance records on load)
  const [currentFilters, setCurrentFilters] = useState<AttendanceReportFilterParams>({
    companies: [],
    locations: [],
    departments: [],
    reportingOfficers: [],
    employees: [],
    status: 'active',
    fromDate: get14DaysAgoStr(),
    toDate: getTodayStr(),
    isTabularView: true,
    workType: 'choose',
    statusFilters: {
      present: true,
      leave: true,
      absent: true,
      expected: true,
      lateMark: false,
      shortWorkingHour: false,
      breakLog: true,
      halfDay: true,
    },
  });

  const { data: fetchedRows, isLoading: isSubmitting, isError } = useAttendanceReportQuery(currentFilters);
  const reportRows = fetchedRows || [];

  // Modals state
  const [selectedTimelineRow, setSelectedTimelineRow] = useState<AttendanceReportRow | null>(null);

  const handleFilterSubmit = (filters: AttendanceReportFilterParams) => {
    setCurrentFilters(filters);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="px-4 sm:px-6 pt-4 space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Attendance Reports
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Live attendance time log report fetched directly from database attendance records.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Attendance Filter Form */}
        <AttendanceReportFilter
          onFilterSubmit={handleFilterSubmit}
          isSubmitting={isSubmitting}
        />

        {/* Content Area */}
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {isError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Could not load attendance report data. Please check your connection and try again.
            </div>
          )}
          {currentFilters?.isTabularView ? (
            <AttendanceReportTable
              data={reportRows}
              onOpenTimeline={(row) => setSelectedTimelineRow(row)}
            />
          ) : (
            <AttendanceVisualization data={reportRows} />
          )}
        </div>
      </div>

      {/* Employee Timeline Punch Detail Modal */}
      <EmployeeTimelineModal
        row={selectedTimelineRow}
        isOpen={!!selectedTimelineRow}
        onClose={() => setSelectedTimelineRow(null)}
      />
    </div>
  );
}

