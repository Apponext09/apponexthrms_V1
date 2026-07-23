import React from 'react';
import { Calendar, Clock, LogIn, LogOut, Coffee, CheckCircle2 } from 'lucide-react';
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

  const timelineEvents = [
    {
      time: '09:32 AM',
      title: 'Check-In Punch',
      description: `Punched in via ${row.checkInLocation}`,
      icon: LogIn,
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950',
    },
    {
      time: '01:00 PM',
      title: 'Lunch Break Start',
      description: 'Logged out for lunch break (60 mins)',
      icon: Coffee,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-950',
    },
    {
      time: '02:00 PM',
      title: 'Lunch Break Return',
      description: 'Logged in back from lunch break',
      icon: LogIn,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-950',
    },
    {
      time: '06:30 PM',
      title: 'Check-Out Punch',
      description: `Punched out via ${row.checkOutLocation}`,
      icon: LogOut,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-950',
    },
  ];

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
