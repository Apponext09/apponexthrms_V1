import React from 'react';
import { Calendar, Clock, LogIn, LogOut, Coffee, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AttendanceReportRow } from '../hooks/useAttendanceReports';

interface EmployeeTimelineModalProps {
  row: AttendanceReportRow | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EmployeeTimelineModal({ row, isOpen, onClose }: EmployeeTimelineModalProps) {
  if (!row) return null;

  // Build real dynamic timeline events strictly from actual record data
  const buildRealTimelineEvents = () => {
    const events = [];

    // Parse shift timing bounds
    let shiftStart = '';
    let shiftEnd = '';
    if (row.expTiming && row.expTiming.includes('-')) {
      const parts = row.expTiming.split('-');
      shiftStart = parts[0]?.trim() || '';
      shiftEnd = parts[1]?.trim() || '';
    }

    // Parse actual timing bounds
    let actualIn = row.checkInTime || '';
    let actualOut = row.checkOutTime || '';

    if (!actualIn && row.actualTiming && row.actualTiming.includes('-')) {
      const parts = row.actualTiming.split('-');
      if (parts[0] && parts[0] !== '00:00' && parts[0] !== '--') {
        actualIn = parts[0].trim();
      }
    }

    if (!actualOut && row.actualTiming && row.actualTiming.includes('-')) {
      const parts = row.actualTiming.split('-');
      if (parts[1] && parts[1] !== '00:00' && parts[1] !== '--' && parts[1] !== 'Active') {
        actualOut = parts[1].trim();
      }
    }

    // Handle Absent / Leave / Week Off / Holiday case
    if (
      row.dayStatus === 'Absent' ||
      row.dayStatus === 'Leave' ||
      row.dayStatus === 'Week Off' ||
      row.dayStatus === 'Holiday'
    ) {
      events.push({
        time: '-- : --',
        title: `${row.dayStatus} Recorded`,
        description: `Employee was marked as ${row.dayStatus} on ${row.date}. No punch logs recorded.`,
        icon: AlertCircle,
        color:
          row.dayStatus === 'Leave'
            ? 'text-purple-600 bg-purple-100 dark:bg-purple-950'
            : 'text-rose-600 bg-rose-100 dark:bg-rose-950',
      });
      return events;
    }

    // 1. Shift Schedule Start
    if (shiftStart) {
      events.push({
        time: shiftStart,
        title: 'Shift Schedule Start',
        description: `Scheduled shift start time (${row.shift || 'Assigned Shift'})`,
        icon: Clock,
        color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-950',
      });
    }

    // 2. Check-In Punch
    if (actualIn) {
      events.push({
        time: actualIn,
        title: row.isLate === 'Yes' ? 'Check-In Punch (Late Mark)' : 'Check-In Punch',
        description: `Punched in via ${
          row.checkInLocation && row.checkInLocation !== '-' ? row.checkInLocation : 'Primary Location Access'
        }`,
        icon: LogIn,
        color:
          row.isLate === 'Yes'
            ? 'text-amber-600 bg-amber-100 dark:bg-amber-950'
            : 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950',
      });
    }

    // 3. Recorded Break Duration (only if break time exists and > 00:00)
    if (row.totalBreakHours && row.totalBreakHours !== '00:00' && row.totalBreakHours !== '0') {
      events.push({
        time: 'Logged',
        title: 'Break & Lunch Duration',
        description: `Total cumulative break time recorded: ${row.totalBreakHours} hours`,
        icon: Coffee,
        color: 'text-amber-600 bg-amber-100 dark:bg-amber-950',
      });
    }

    // 4. Check-Out Punch
    if (actualOut) {
      events.push({
        time: actualOut,
        title: 'Check-Out Punch',
        description: `Punched out via ${
          row.checkOutLocation && row.checkOutLocation !== '-' ? row.checkOutLocation : 'Primary Location Access'
        }`,
        icon: LogOut,
        color: 'text-purple-600 bg-purple-100 dark:bg-purple-950',
      });
    } else if (actualIn) {
      events.push({
        time: 'Active',
        title: 'Shift In Progress',
        description: 'Employee currently checked in. Pending Check-Out.',
        icon: RefreshCw,
        color: 'text-blue-600 bg-blue-100 dark:bg-blue-950',
      });
    }

    // 5. Shift Schedule End
    if (shiftEnd) {
      events.push({
        time: shiftEnd,
        title: 'Shift Schedule End',
        description: 'Scheduled shift end time',
        icon: Clock,
        color: 'text-slate-600 bg-slate-100 dark:bg-slate-900',
      });
    }

    return events;
  };

  const timelineEvents = buildRealTimelineEvents();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg sm:rounded-2xl p-0 overflow-hidden bg-card">
        {/* Header */}
        <div className="bg-primary text-primary-foreground px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">Daily Punch Timeline</DialogTitle>
              <p className="text-xs text-primary-foreground/80 mt-0.5">
                {row.employeeName} • {row.date} ({row.day})
              </p>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border border-border text-center text-xs">
            <div>
              <p className="text-muted-foreground">Expected</p>
              <p className="font-bold text-foreground font-mono mt-0.5">{row.expHours}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Actual Work</p>
              <p className="font-bold text-emerald-600 font-mono mt-0.5">{row.actualWorkingHours}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="font-bold text-primary mt-0.5">{row.dayStatus}</p>
            </div>
          </div>

          {/* Timeline Steps */}
          <div className="space-y-4 relative pl-4 before:content-[''] before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
            {timelineEvents.map((evt, i) => {
              const Icon = evt.icon;
              return (
                <div key={i} className="flex items-start space-x-3 relative z-10">
                  <div className={`p-2 rounded-full border border-border ${evt.color} shrink-0 shadow-xs`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="bg-card p-3 rounded-xl border border-border/80 flex-1 shadow-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">{evt.title}</h4>
                      <span className="text-[11px] font-mono font-semibold text-muted-foreground">{evt.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{evt.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
          <Button variant="outline" onClick={onClose} className="h-9 text-xs px-5">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
