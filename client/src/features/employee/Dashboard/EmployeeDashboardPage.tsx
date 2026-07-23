import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { 
  Users, Calendar, FileText, Clock, CheckCircle2, 
  Gift, Megaphone, Cake, Briefcase, CreditCard, 
  Receipt, ArrowRight, ClipboardList, Check, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const employeeId = user?.employeeId || 0;

  // Fetch actual employee details if available
  const { employee, isLoading: isEmployeeLoading } = useEmployee(employeeId);

  // Time & Date State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).toLowerCase();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Clock-in/out State
  const [checkInStatus, setCheckInStatus] = useState<'not_started' | 'checked_in' | 'completed'>('not_started');
  const [checkInTime, setCheckInTime] = useState<string>('--');
  const [checkOutTime, setCheckOutTime] = useState<string>('--');
  const [workDuration, setWorkDuration] = useState<string>('--');
  const [durationSeconds, setDurationSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (checkInStatus === 'checked_in') {
      interval = setInterval(() => {
        setDurationSeconds(prev => {
          const next = prev + 1;
          const hrs = Math.floor(next / 3600).toString().padStart(2, '0');
          const mins = Math.floor((next % 3600) / 60).toString().padStart(2, '0');
          const secs = (next % 60).toString().padStart(2, '0');
          setWorkDuration(`${hrs}h ${mins}m ${secs}s`);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [checkInStatus]);

  const handleCheckInToggle = () => {
    if (checkInStatus === 'not_started') {
      setCheckInStatus('checked_in');
      setCheckInTime(formatTime(new Date()));
      setDurationSeconds(0);
      setWorkDuration('00h 00m 00s');
    } else if (checkInStatus === 'checked_in') {
      setCheckInStatus('completed');
      setCheckOutTime(formatTime(new Date()));
    }
  };

  // Static Data
  const leaveBalances = [
    { name: '2 Hours Short Break', count: 365, max: 365, color: 'bg-indigo-500' },
    { name: 'Bereavement', count: 5, max: 5, color: 'bg-emerald-500' },
    { name: 'Casual', count: 10, max: 10, color: 'bg-amber-500' },
    { name: 'Compensatory Off', count: 30, max: 30, color: 'bg-rose-500' },
    { name: 'Earned', count: 15, max: 15, color: 'bg-violet-500' },
    { name: 'Maternity', count: 90, max: 90, color: 'bg-blue-500' },
    { name: 'Paternity', count: 15, max: 15, color: 'bg-cyan-500' },
    { name: 'Sick', count: 10, max: 10, color: 'bg-emerald-500' },
    { name: 'Unpaid', count: 365, max: 365, color: 'bg-amber-500' },
    { name: 'Work From Home', count: 60, max: 60, color: 'bg-rose-500' },
  ];

  // Resolve display values
  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : `${user?.firstName} ${user?.lastName}`;
  const designation = employee?.designation || 'Employee';
  const department = employee?.department || 'Engineering';
  const empCode = employee?.employeeCode || '#EMP00100';
  const initials = employeeName.split(' ').map(w => w.charAt(0)).join('').toUpperCase();

  // Get current hour greeting
  const getGreeting = () => {
    const hrs = currentTime.getHours();
    if (hrs < 12) return 'GOOD MORNING,';
    if (hrs < 17) return 'GOOD AFTERNOON,';
    return 'GOOD EVENING,';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="w-full bg-gradient-to-r from-violet-600 via-violet-700 to-indigo-600 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-bold">
            {initials}
          </div>
          <div>
            <span className="text-xs text-white/70 uppercase tracking-widest font-semibold">{getGreeting()}</span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-0.5">{employeeName}</h1>
            <p className="text-sm text-white/80 mt-1 flex items-center gap-1.5">
              <span>{designation}</span>
              <span className="text-white/40">•</span>
              <span>{department}</span>
              <span className="text-white/40">•</span>
              <span className="font-mono bg-white/15 px-2 py-0.5 rounded text-xs">{empCode}</span>
            </p>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 min-w-[160px] text-center md:text-right shadow-inner">
          <p className="text-2xl font-mono font-bold tracking-wider">{formatTime(currentTime)}</p>
          <p className="text-xs text-white/70 uppercase tracking-wide font-medium mt-1">IST</p>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Attendance */}
        <div className="bg-emerald-600 rounded-2xl p-4 text-white shadow flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] bg-white/10 w-16 h-16 rounded-full group-hover:scale-110 transition-transform duration-300" />
          <div className="bg-white/15 h-8 w-8 rounded-lg flex items-center justify-center self-start border border-white/10">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-white/70 uppercase font-semibold block tracking-wider">Attendance</span>
            <span className="text-2xl font-extrabold tracking-tight">100%</span>
            <span className="text-[10px] text-white/60 block mt-0.5">2 of 2 days</span>
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="bg-card rounded-2xl p-4 border shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="bg-violet-100 dark:bg-violet-950/40 text-violet-600 h-8 w-8 rounded-lg flex items-center justify-center self-start">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Pending Leaves</span>
            <span className="text-2xl font-extrabold tracking-tight text-foreground">0</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">0 approved</span>
          </div>
        </div>

        {/* Salary */}
        <div className="bg-card rounded-2xl p-4 border shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="bg-amber-100 dark:bg-amber-950/40 text-amber-600 h-8 w-8 rounded-lg flex items-center justify-center self-start">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Last Net Salary</span>
            <span className="text-2xl font-extrabold tracking-tight text-foreground">₹0</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Jul 2026</span>
          </div>
        </div>

        {/* Projects */}
        <div className="bg-card rounded-2xl p-4 border shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="bg-blue-100 dark:bg-blue-950/40 text-blue-600 h-8 w-8 rounded-lg flex items-center justify-center self-start">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">My Projects</span>
            <span className="text-2xl font-extrabold tracking-tight text-foreground">0</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">Assigned projects</span>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-card rounded-2xl p-4 border shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="bg-rose-100 dark:bg-rose-950/40 text-rose-600 h-8 w-8 rounded-lg flex items-center justify-center self-start">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">Pending Expenses</span>
            <span className="text-2xl font-extrabold tracking-tight text-foreground">0</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">0 total</span>
          </div>
        </div>

        {/* Resignation */}
        <div className="bg-card rounded-2xl p-4 border shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="bg-purple-100 dark:bg-purple-950/40 text-purple-600 h-8 w-8 rounded-lg flex items-center justify-center self-start">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold block tracking-wider">My Resignation</span>
            <span className="text-lg font-extrabold tracking-tight text-foreground">None</span>
            <span className="text-[10px] text-muted-foreground block mt-0.5">No active request</span>
          </div>
        </div>
      </div>

      {/* 3. Lower Content Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Check-In & Calendar */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Work Desk (Check In Widget) */}
          <Card className="overflow-hidden border rounded-2xl shadow-sm">
            <div className="bg-gradient-to-r from-violet-500 to-indigo-500 p-4 text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Work Desk HRMS</p>
                <p className="text-lg font-bold mt-0.5">{formatTime(currentTime)}</p>
                <p className="text-[10px] text-white/70">{formatDate(currentTime)}</p>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-0 py-1 px-2.5 text-xs font-semibold">
                {checkInStatus === 'not_started' && 'Not Started'}
                {checkInStatus === 'checked_in' && 'Checked In'}
                {checkInStatus === 'completed' && 'Completed'}
              </Badge>
            </div>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted p-2 rounded-xl text-center border">
                  <span className="text-[9px] text-muted-foreground font-semibold block">CHECK IN</span>
                  <span className="text-xs font-mono font-bold text-foreground block mt-1">{checkInTime}</span>
                </div>
                <div className="bg-muted p-2 rounded-xl text-center border">
                  <span className="text-[9px] text-muted-foreground font-semibold block">CHECK OUT</span>
                  <span className="text-xs font-mono font-bold text-foreground block mt-1">{checkOutTime}</span>
                </div>
                <div className="bg-muted p-2 rounded-xl text-center border">
                  <span className="text-[9px] text-muted-foreground font-semibold block">DURATION</span>
                  <span className="text-xs font-mono font-bold text-foreground block mt-1">{workDuration}</span>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5 bg-muted/40 py-2 rounded-xl border border-dashed">
                <Clock className="w-3.5 h-3.5 text-violet-500" />
                <span>
                  {checkInStatus === 'not_started' && 'Today: Not Checked In'}
                  {checkInStatus === 'checked_in' && 'Today: Checked In'}
                  {checkInStatus === 'completed' && 'Today: Completed Work Session'}
                </span>
              </div>

              {checkInStatus !== 'completed' && (
                <Button 
                  onClick={handleCheckInToggle}
                  className="w-full py-6 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow"
                >
                  <ArrowRight className="w-4 h-4 rotate-45" />
                  {checkInStatus === 'not_started' ? 'Check In' : 'Check Out'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Monthly Calendar View */}
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row justify-between items-center space-y-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-violet-500" />
                <CardTitle className="text-sm font-bold">Monthly View</CardTitle>
              </div>
              <span className="text-xs text-muted-foreground font-bold">Jul 2026</span>
            </CardHeader>
            <CardContent className="p-4">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                  <span key={i} className="font-semibold text-muted-foreground mb-1">{d}</span>
                ))}
                {/* Pad empty spots */}
                <span className="text-muted-foreground/30"></span>
                <span className="text-muted-foreground/30"></span>
                <span className="text-muted-foreground/30"></span>
                {/* 1st July (Wed) is marked present */}
                <span className="relative flex items-center justify-center h-7 w-7 mx-auto rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                  1
                  <span className="absolute bottom-0 w-1 h-1 rounded-full bg-emerald-500"></span>
                </span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">2</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">3</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">4</span>
                
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">5</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">6</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">7</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">8</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">9</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">10</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">11</span>

                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">12</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">13</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">14</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">15</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">16</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">17</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">18</span>

                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">19</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">20</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full">21</span>
                {/* 22nd July is Highlighted Selected Day */}
                <span className="relative flex items-center justify-center h-7 w-7 mx-auto rounded-full bg-violet-600 text-white font-extrabold shadow-sm">
                  22
                </span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full text-muted-foreground/40">23</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full text-muted-foreground/40">24</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full text-muted-foreground/40">25</span>

                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full text-muted-foreground/40">26</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full text-muted-foreground/40">27</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full text-muted-foreground/40">28</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full text-muted-foreground/40">29</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full text-muted-foreground/40">30</span>
                <span className="flex items-center justify-center h-7 w-7 mx-auto rounded-full text-muted-foreground/40">31</span>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-between items-center gap-2 mt-5 text-[10px] text-muted-foreground pt-3 border-t">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Present</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Absent</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500"></span>Leave</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Late</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Attendance Trend Chart & Leave Balance List */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Attendance Trend Chart */}
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row justify-between items-center space-y-0">
              <CardTitle className="text-sm font-bold">Attendance Trend — Last 14 Days</CardTitle>
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Present: 1</Badge>
            </CardHeader>
            <CardContent className="p-4">
              {/* Custom SVG Trend Graph */}
              <div className="relative h-44 w-full">
                <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(226, 232, 240, 0.6)" strokeWidth="1" />
                  <line x1="0" y1="130" x2="500" y2="130" stroke="rgba(226, 232, 240, 0.6)" strokeWidth="1" />
                  
                  {/* Left Axis labels */}
                  <text x="5" y="25" fill="#94a3b8" fontSize="10" fontWeight="bold">P</text>
                  <text x="5" y="125" fill="#94a3b8" fontSize="10" fontWeight="bold">A</text>
                  
                  {/* Gradient Area under trend line */}
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Area Path */}
                  <path d="M 0 20 H 500 V 130 H 0 Z" fill="url(#areaGrad)" />
                  
                  {/* Attendance Trend line */}
                  <path 
                    d="M 0 20 L 500 20" 
                    fill="none" 
                    stroke="#8b5cf6" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                  />
                  
                  {/* Node points */}
                  <circle cx="0" cy="20" r="3.5" fill="#8b5cf6" stroke="white" strokeWidth="1.5" />
                  <circle cx="500" cy="20" r="3.5" fill="#8b5cf6" stroke="white" strokeWidth="1.5" />
                </svg>
                
                {/* X Axis dates */}
                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold mt-1 px-1">
                  <span>01 Jul</span>
                  <span>30 Jun</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leave Balances List */}
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader className="pb-3 border-b flex flex-row justify-between items-center space-y-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4.5 h-4.5 text-violet-500" />
                <CardTitle className="text-sm font-bold">Leave Balance</CardTitle>
              </div>
              <Button 
                onClick={() => toast.info('Leave Application form will be connected once HR leave policies are assigned.')}
                variant="ghost" 
                size="sm" 
                className="text-xs text-violet-600 hover:text-violet-700 bg-violet-50 font-bold hover:bg-violet-100 rounded-lg px-3 py-1.5 h-auto transition-colors"
              >
                Apply →
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-4">
                {leaveBalances.map((leave, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-foreground">{leave.name}</span>
                      <span className="font-mono text-muted-foreground">
                        <strong className="text-foreground">{leave.count}d</strong> / {leave.max}d
                      </span>
                    </div>
                    {/* Usage Progress Bar */}
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${leave.color}`}
                        style={{ width: `${(leave.count / leave.max) * 100}%` }}
                      ></div>
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
