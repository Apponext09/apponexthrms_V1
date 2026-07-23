import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar, Clock, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ShiftRosterPage() {
  const weeklyRoster = [
    { day: 'Monday', date: 'Jul 27', shift: 'General Shift', timing: '09:00 AM - 06:00 PM', status: 'Working' },
    { day: 'Tuesday', date: 'Jul 28', shift: 'General Shift', timing: '09:00 AM - 06:00 PM', status: 'Working' },
    { day: 'Wednesday', date: 'Jul 29', shift: 'General Shift', timing: '09:00 AM - 06:00 PM', status: 'Working' },
    { day: 'Thursday', date: 'Jul 30', shift: 'General Shift', timing: '09:00 AM - 06:00 PM', status: 'Working' },
    { day: 'Friday', date: 'Jul 31', shift: 'General Shift', timing: '09:00 AM - 06:00 PM', status: 'Working' },
    { day: 'Saturday', date: 'Aug 01', shift: 'Weekend Off', timing: '--', status: 'Weekly Off' },
    { day: 'Sunday', date: 'Aug 02', shift: 'Weekend Off', timing: '--', status: 'Weekly Off' },
  ];

  const handleRequestSwap = () => {
    toast.success('Shift swap request sent to your supervisor.');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center pb-3 border-b">
        <div>
          <h2 className="text-lg font-bold text-foreground">Shift & Roster</h2>
          <p className="text-xs text-muted-foreground">View your weekly rosters, shift schedules, and request swaps.</p>
        </div>
        <Button onClick={handleRequestSwap} className="bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1.5 rounded-xl shadow">
          <ArrowRightLeft className="w-4.5 h-4.5" /> Swap Shift
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Shift Info */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm bg-gradient-to-br from-violet-600 to-indigo-700 text-white border-0">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-4.5 h-4.5" /> Current Shift Settings
              </CardTitle>
              <CardDescription className="text-violet-100">Your assigned shift schedule settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-[10px] text-violet-200 uppercase tracking-widest font-bold block">Shift Code</span>
                <span className="text-lg font-bold">GEN-SH-PUNE</span>
              </div>
              <div>
                <span className="text-[10px] text-violet-200 uppercase tracking-widest font-bold block">Working Timings</span>
                <span className="text-lg font-bold">09:00 AM - 06:00 PM</span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/15 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-[10px] text-white/90 leading-normal">
                  Standard Grace time of 15 minutes is allowed. Late check-ins beyond 09:15 AM will trigger a half-day policy calculation.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Weekly Roster Calendar */}
        <div className="lg:col-span-2">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-violet-500" /> Weekly Roster Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {weeklyRoster.map((item) => (
                  <div key={item.day} className="flex justify-between items-center p-4">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{item.day}</h4>
                      <p className="text-[10px] text-muted-foreground">{item.date} • {item.shift}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-semibold text-foreground block">{item.timing}</span>
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                        item.status === 'Working' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-300'
                      }`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
