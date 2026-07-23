import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AttendanceReportFilter } from '../components/AttendanceReportFilter';
import { AttendanceReportTable } from '../components/AttendanceReportTable';
import { AttendanceVisualization } from '../components/AttendanceVisualization';
import { MobileTrackingModal } from '../components/MobileTrackingModal';
import { EmployeeTimelineModal } from '../components/EmployeeTimelineModal';
import {
  AttendanceReportFilterParams,
  AttendanceReportRow,
  generateAttendanceReportData,
} from '../hooks/useAttendanceReports';

export function AttendanceReportsPage() {
  const navigate = useNavigate();

  // Filter submit state
  const [hasFiltered, setHasFiltered] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [currentFilters, setCurrentFilters] = useState<AttendanceReportFilterParams | null>(null);
  const [reportRows, setReportRows] = useState<AttendanceReportRow[]>([]);

  // Modals state
  const [isMobileTrackingOpen, setIsMobileTrackingOpen] = useState<boolean>(false);
  const [selectedTimelineRow, setSelectedTimelineRow] = useState<AttendanceReportRow | null>(null);

  const handleFilterSubmit = (filters: AttendanceReportFilterParams) => {
    setIsSubmitting(true);
    setCurrentFilters(filters);

    // Generate report dataset
    setTimeout(() => {
      const generated = generateAttendanceReportData(filters);
      setReportRows(generated);
      setHasFiltered(true);
      setIsSubmitting(false);
    }, 200);
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
              Filter employee attendance, view tabular shift timing logs, and audit mobile GPS check-in records.
            </p>
          </div>
        </div>
      </div>

      {/* Attendance Filter Form */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Attendance Filter Form */}
        <AttendanceReportFilter
          onFilterSubmit={handleFilterSubmit}
          onOpenMobileTracking={() => setIsMobileTrackingOpen(true)}
          isSubmitting={isSubmitting}
        />

        {/* Content Area: Empty State BEFORE Filter Submission */}
        {!hasFiltered ? (
          <div className="bg-card border border-dashed border-border/80 rounded-2xl p-12 text-center space-y-4 shadow-soft-xs">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
              <span className="text-2xl">📊</span>
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-bold text-foreground">No Attendance Report Filtered Yet</h3>
              <p className="text-xs text-muted-foreground">
                Select your parameters (Company, Location, Department, Employee, Date Range) above and click{' '}
                <span className="font-bold text-primary">'Filter'</span> to generate the attendance report.
              </p>
            </div>
          </div>
        ) : (
          /* Render Mode AFTER Filter Submission */
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            {currentFilters?.isTabularView ? (
              /* Tabular View Mode */
              <AttendanceReportTable
                data={reportRows}
                onOpenTimeline={(row) => setSelectedTimelineRow(row)}
              />
            ) : (
              /* Visualization View Mode */
              <AttendanceVisualization data={reportRows} />
            )}
          </div>
        )}
      </div>

      {/* Mobile Tracking Records Modal */}
      <MobileTrackingModal
        isOpen={isMobileTrackingOpen}
        onClose={() => setIsMobileTrackingOpen(false)}
      />

      {/* Employee Timeline Punch Detail Modal */}
      <EmployeeTimelineModal
        row={selectedTimelineRow}
        isOpen={!!selectedTimelineRow}
        onClose={() => setSelectedTimelineRow(null)}
      />
    </div>
  );
}
