import React from 'react';
import { TimelogReportView } from '../components/TimelogReportView';

export function TimelogReportPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="px-4 sm:px-6 pt-4 space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Timelog Report
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Track project work logs, billable hours, and task status.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <TimelogReportView />
      </div>
    </div>
  );
}
