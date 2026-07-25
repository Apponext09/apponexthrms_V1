import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import {
  Clock, MapPin, Building, ShieldAlert, Calendar, CheckCircle2, ChevronLeft, ChevronRight, LogOut
} from 'lucide-react';
import { toast } from 'sonner';

interface RosterDay {
  dayLabel: string;
  dateLabel: string;
  isActive?: boolean;
  dateStr: string;
}

export default function ShiftRosterPage() {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('2026-07-24');
  const [shiftInfo, setShiftInfo] = useState({
    name: 'Day Shift (09:00 AM - 06:00 PM)',
    location: 'Navi Mumbai Office',
    department: 'HR & Operations',
    role: 'HR Assistant',
    timings: '09:00 AM - 06:00 PM'
  });

  const rosterDays: RosterDay[] = [
    { dayLabel: 'Thu', dateLabel: '23rd', dateStr: '2026-07-23' },
    { dayLabel: 'Wednesday', dateLabel: 'July 24', isActive: true, dateStr: '2026-07-24' },
    { dayLabel: 'Fri', dateLabel: '25th', dateStr: '2026-07-25' },
    { dayLabel: 'Sat', dateLabel: '26th', dateStr: '2026-07-26' },
    { dayLabel: 'Sun', dateLabel: '27th', dateStr: '2026-07-27' },
    { dayLabel: 'Mon', dateLabel: '28th', dateStr: '2026-07-28' },
    { dayLabel: 'Tue', dateLabel: '29th', dateStr: '2026-07-29' }
  ];

  const upcomingShifts = [
    { id: 1, day: 'Thu', date: '25', month: 'Jul', shift: 'Evening Shift', time: '02:00 PM - 10:00 PM', location: 'Mumbai Office', status: 'pending' },
    { id: 2, day: 'Fri', date: '26', month: 'Jul', shift: 'Day Shift', time: '09:00 AM - 06:00 PM', location: 'Navi Mumbai Office', status: 'pending' },
    { id: 3, day: 'Mon', date: '29', month: 'Jul', shift: 'Day Shift', time: '09:00 AM - 06:00 PM', location: 'Remote', status: 'pending' }
  ];

  const handleAcknowledge = (id: number, shiftName: string) => {
    toast.success(`${shiftName} shift acknowledged successfully!`);
  };

  const handleClockOut = () => {
    toast.success('Successfully clocked out from shift!');
  };

  return (
    <div className="space-y-6">
      {/* Header banner */}
      <div className="pb-3 border-b flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-violet-600" /> My Shifts & Rosters
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your daily work shifts, check in/out schedules, and acknowledge upcoming rosters.
          </p>
        </div>
      </div>

      {/* Swipe or select days strip */}
      <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-black text-foreground uppercase tracking-wider">Swipe or select days</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-7 w-7 rounded-lg">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {rosterDays.map((d) => (
            <button
              key={d.dateStr}
              onClick={() => setSelectedDate(d.dateStr)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[80px] border transition-all ${
                selectedDate === d.dateStr
                  ? 'bg-violet-600 text-white border-violet-600 shadow-md scale-105'
                  : 'bg-muted/40 text-muted-foreground border-border/80 hover:bg-muted'
              }`}
            >
              <span className="text-[10px] font-bold block opacity-80 uppercase">{d.dayLabel}</span>
              <span className="text-sm font-black block mt-0.5">{d.dateLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Shift Detail Card */}
      <Card className="border rounded-3xl overflow-hidden shadow-md bg-card">
        {/* Banner header of current shift */}
        <div className="bg-emerald-500/10 dark:bg-emerald-950/20 border-b border-emerald-500/25 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Current Shift
            </h3>
            <p className="text-[11px] font-bold text-muted-foreground">Today • Wed 24 July</p>
          </div>
          <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono">
            {shiftInfo.timings}
          </span>
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Shift metadata grid */}
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Shift</span>
                  <span className="text-xs font-black text-foreground">{shiftInfo.name}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Location</span>
                  <span className="text-xs font-black text-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-violet-500" /> {shiftInfo.location}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Department</span>
                  <span className="text-xs font-black text-foreground">{shiftInfo.department}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Role</span>
                  <span className="text-xs font-black text-foreground">{shiftInfo.role}</span>
                </div>
              </div>

              {/* Status sub-badge */}
              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Active Shift • 03h 45m remaining
                </span>
              </div>
            </div>

            {/* Google Map design preview */}
            <div className="relative rounded-2xl overflow-hidden border border-border bg-slate-100 dark:bg-slate-900 h-44 flex flex-col justify-end p-3 shadow-inner">
              {/* Map grid lines simulation */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
              
              {/* Map routes lines simulation */}
              <div className="absolute left-1/4 top-1/2 w-1/2 h-1 bg-violet-400/40 rounded transform rotate-12" />
              <div className="absolute left-1/3 top-1/3 w-1 h-24 bg-amber-400/40 rounded" />

              {/* Pin marker */}
              <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="h-6 w-6 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center shadow-lg text-white">
                  <MapPin className="w-3 h-3" />
                </div>
                <span className="text-[9px] font-black text-rose-600 bg-white px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap">
                  Navi Mumbai Office
                </span>
              </div>

              {/* Watermarks */}
              <div className="z-10 flex justify-between items-center text-[10px] text-muted-foreground w-full font-semibold">
                <span className="font-black text-slate-400">Google</span>
                <span>Map data ©2026</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button
              onClick={handleClockOut}
              className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold px-6 rounded-xl gap-2 shadow-md h-10"
            >
              <LogOut className="w-4.5 h-4.5" /> Clock Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Shifts */}
      <div className="space-y-3">
        <h3 className="text-sm font-black text-foreground">Upcoming Shifts</h3>

        <div className="space-y-3">
          {upcomingShifts.map((s) => (
            <Card key={s.id} className="border rounded-2xl bg-card hover:border-violet-500/30 transition-all p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                  {/* Date badge */}
                  <div className="h-14 w-14 rounded-2xl bg-muted border flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{s.day}</span>
                    <span className="text-lg font-black text-foreground mt-0.5 leading-none">{s.date}</span>
                    <span className="text-[9px] font-bold text-muted-foreground mt-0.5 uppercase">{s.month}</span>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-foreground flex items-center gap-2">
                      {s.shift} <span className="text-[10px] font-mono text-violet-600 dark:text-violet-400">{s.time}</span>
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-muted-foreground" /> {s.location}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleAcknowledge(s.id, s.shift)}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs px-5 rounded-xl h-9 w-full sm:w-auto shrink-0 shadow-sm"
                >
                  Acknowledge
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
