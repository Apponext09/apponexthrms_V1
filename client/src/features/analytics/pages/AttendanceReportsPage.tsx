import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Filter } from 'lucide-react';
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

  // Initial Filter State is null so that no data is fetched or displayed on page load.
  // Data is only fetched after the user clicks "Apply Filter".
  const [currentFilters, setCurrentFilters] = useState<AttendanceReportFilterParams | null>(null);

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
              Select company and filter criteria to generate database attendance records.
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
        {!currentFilters ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-border/80 rounded-xl shadow-2xs space-y-3 my-4">
            <div className="p-3 bg-primary/10 rounded-full text-primary">
              <Filter className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Filter Applied</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Please select your company and filter criteria above, then click <strong className="text-foreground">Apply Filter</strong> to generate the attendance report.
            </p>
          </div>
        ) : (
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
        )}
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

