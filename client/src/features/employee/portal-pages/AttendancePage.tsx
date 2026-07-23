import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, CheckCircle2, UserCheck, AlertCircle, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

export default function AttendancePage() {
  const [logs, setLogs] = useState([
    { date: '2026-07-22', checkIn: '09:15 AM', checkOut: '06:30 PM', status: 'Present', duration: '9h 15m' },
    { date: '2026-07-21', checkIn: '09:05 AM', checkOut: '06:05 PM', status: 'Present', duration: '9h 00m' },
    { date: '2026-07-20', checkIn: '09:28 AM', checkOut: '06:40 PM', status: 'Late', duration: '9h 12m' },
    { date: '2026-07-17', checkIn: '09:12 AM', checkOut: '06:15 PM', status: 'Present', duration: '9h 03m' },
  ]);

  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const handlePunch = () => {
    setCheckingIn(true);
    setTimeout(() => {
      setCheckingIn(false);
      setCheckedIn(!checkedIn);
      if (!checkedIn) {
        toast.success('Punched In successfully at ' + new Date().toLocaleTimeString());
        const today = new Date().toISOString().split('T')[0];
        setLogs([
          { date: today, checkIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), checkOut: '--', status: 'Present', duration: '--' },
          ...logs
        ]);
      } else {
        toast.success('Punched Out successfully at ' + new Date().toLocaleTimeString());
        // update checkout for today
        setLogs(prev => prev.map((log, index) => {
          if (index === 0) {
            return { ...log, checkOut: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), duration: '8h 30m' };
          }
          return log;
        }));
      }
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b">
        <div>
          <h2 className="text-lg font-bold text-foreground">My Attendance & Logs</h2>
          <p className="text-xs text-muted-foreground">Log your shift hours and check your monthly tracking logs.</p>
        </div>
        <Button 
          onClick={handlePunch}
          disabled={checkingIn}
          className={`font-bold px-6 py-5 rounded-xl shadow ${
            checkedIn ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'
          }`}
        >
          <Clock className="w-4 h-4 mr-2" />
          {checkingIn ? 'Processing...' : checkedIn ? 'Punch Out' : 'Punch In'}
        </Button>
      </div>

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Total Workdays</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">22</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Present Days</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">21</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Late Punch-ins</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">1</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border rounded-2xl shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Leave Deductions</span>
              <span className="text-2xl font-extrabold text-foreground mt-1 block">0</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card className="border rounded-2xl shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Clock className="w-4.5 h-4.5 text-violet-500" /> Recent Attendance History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Date</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Check In</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Check Out</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Duration</TableHead>
                <TableHead className="font-bold text-xs uppercase px-6 py-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log, i) => (
                <TableRow key={i}>
                  <TableCell className="px-6 py-4 text-xs font-semibold">{log.date}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-mono font-medium">{log.checkIn}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-mono font-medium">{log.checkOut}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold">{log.duration}</TableCell>
                  <TableCell className="px-6 py-4 text-xs">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      log.status === 'Present' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {log.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
