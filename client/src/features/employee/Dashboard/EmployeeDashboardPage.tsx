import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import {
  Users, Calendar, FileText, Clock, CheckCircle2,
  Gift, Megaphone, Cake, Briefcase, CreditCard,
  Receipt, ArrowRight, ClipboardList, Check, User,
  Sparkles, Bot, Shield, Trophy, Flame, ChevronRight,
  Palmtree, Camera
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

  // Profile Photo Upload State
  const [avatar, setAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        toast.success('Profile photo updated successfully!');
      };
      reader.readAsDataURL(file);
    }
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
      toast.success('Punched In successfully! Have a great productive day.');
    } else if (checkInStatus === 'checked_in') {
      setCheckInStatus('completed');
      setCheckOutTime(formatTime(new Date()));
      toast.success('Punched Out successfully! Good job today.');
    }
  };

  // Static Data
  const leaveBalances = [
    { name: 'Casual Leave', count: 10, max: 12, color: 'bg-amber-500' },
    { name: 'Sick Leave', count: 8, max: 10, color: 'bg-emerald-500' },
    { name: 'Earned Leave', count: 15, max: 15, color: 'bg-violet-500' },
  ];

  // Resolve display values
  const employeeName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Employee';
  const designation = employee?.designation || 'Software Lead';
  const department = employee?.department || 'Engineering';
  const empCode = employee?.employeeCode || '#EMP12345';
  const initials = employeeName.split(' ').filter(Boolean).map(w => w.charAt(0)).join('').toUpperCase() || 'EMP';

  // Get current hour greeting
  const getGreeting = () => {
    const hrs = currentTime.getHours();
    if (hrs < 12) return 'GOOD MORNING';
    if (hrs < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Animated Glassmorphic Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-gradient-to-r from-violet-600 via-indigo-700 to-slate-900 p-8 shadow-2xl transition-all duration-300">
        {/* Animated Orbs Background */}
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-6">
            <div
              onClick={handleAvatarClick}
              className="h-20 w-20 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-extrabold text-white shadow-lg cursor-pointer overflow-hidden relative group transition-all duration-200"
              title="Click to upload profile photo"
            >
              {avatar ? (
                <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] tracking-wider uppercase font-extrabold text-violet-200 border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" /> {getGreeting()}
              </span>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1.5">Welcome back, {employeeName}!</h1>
              <p className="text-sm text-violet-100/80 font-medium">
                {designation} <span className="text-white/30 mx-2">•</span> {department} <span className="text-white/30 mx-2">•</span> <span className="font-mono bg-white/15 px-2 py-0.5 rounded text-xs text-white">{empCode}</span>
              </p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-4 min-w-[200px] text-center md:text-right shadow-inner">
            <p className="text-3xl font-mono font-bold tracking-wider text-white">{formatTime(currentTime)}</p>
            <p className="text-xs text-violet-200 uppercase tracking-widest font-bold mt-1.5">{formatDate(currentTime)}</p>
          </div>
        </div>
      </div>

      {/* 2. Key Action Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Widget: Glow Punch Desk */}
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border flex flex-col justify-between">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-5 text-white flex justify-between items-center">
            <div>
              <p className="text-[10px] text-white/80 font-extrabold uppercase tracking-wider">Attendance Console</p>
              <h3 className="text-base font-bold mt-0.5">Punch Desk</h3>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white border-0 py-1 px-3 text-xs font-bold uppercase tracking-wider">
              {checkInStatus === 'not_started' && 'Off Duty'}
              {checkInStatus === 'checked_in' && 'On Duty'}
              {checkInStatus === 'completed' && 'Duty Finished'}
            </Badge>
          </div>
          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-muted p-3 rounded-2xl border">
                <span className="text-[9px] text-muted-foreground font-extrabold uppercase block">Check In</span>
                <span className="text-sm font-mono font-extrabold text-foreground block mt-1.5">{checkInTime}</span>
              </div>
              <div className="bg-muted p-3 rounded-2xl border">
                <span className="text-[9px] text-muted-foreground font-extrabold uppercase block">Check Out</span>
                <span className="text-sm font-mono font-extrabold text-foreground block mt-1.5">{checkOutTime}</span>
              </div>
              <div className="bg-muted p-3 rounded-2xl border">
                <span className="text-[9px] text-muted-foreground font-extrabold uppercase block">Duration</span>
                <span className="text-sm font-mono font-extrabold text-foreground block mt-1.5">{workDuration}</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-4 space-y-3">
              <div className={`h-24 w-24 rounded-full border-4 flex items-center justify-center transition-all duration-500 shadow-lg ${checkInStatus === 'checked_in' ? 'border-violet-600 shadow-violet-500/20 animate-pulse' : 'border-slate-300'
                }`}>
                <Clock className={`w-10 h-10 ${checkInStatus === 'checked_in' ? 'text-violet-600' : 'text-slate-400'
                  }`} />
              </div>
              <p className="text-xs text-muted-foreground font-semibold">
                {checkInStatus === 'not_started' && 'Click below to check in'}
                {checkInStatus === 'checked_in' && 'You are currently active'}
                {checkInStatus === 'completed' && 'Work session closed'}
              </p>
            </div>

            {checkInStatus !== 'completed' && (
              <Button
                onClick={handleCheckInToggle}
                className="w-full py-6.5 rounded-2xl text-xs uppercase tracking-widest font-extrabold bg-violet-600 hover:bg-violet-700 text-white gap-2 shadow-lg"
              >
                {checkInStatus === 'not_started' ? 'Punch In' : 'Punch Out'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Center Widget: Quick Action Shortcuts */}
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border flex flex-col justify-between">
          <div className="p-5 border-b flex justify-between items-center">
            <div>
              <p className="text-[10px] text-muted-foreground font-extrabold uppercase tracking-wider">Fast Lane</p>
              <h3 className="text-base font-extrabold text-foreground">Quick Services</h3>
            </div>
          </div>
          <CardContent className="p-6 grid grid-cols-2 gap-4 flex-1">
            <button
              onClick={() => navigate('/employee/leaves')}
              className="flex flex-col justify-between items-start p-4 bg-muted/40 border hover:border-violet-500 rounded-2xl text-left transition-all duration-200 group"
            >
              <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Palmtree className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-bold text-foreground group-hover:text-violet-600 flex items-center gap-1">
                  Apply Leave <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Submit request</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/employee/payroll')}
              className="flex flex-col justify-between items-start p-4 bg-muted/40 border hover:border-violet-500 rounded-2xl text-left transition-all duration-200 group"
            >
              <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-bold text-foreground group-hover:text-violet-600 flex items-center gap-1">
                  My Payslips <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Download slips</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/employee/id-card')}
              className="flex flex-col justify-between items-start p-4 bg-muted/40 border hover:border-violet-500 rounded-2xl text-left transition-all duration-200 group"
            >
              <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-bold text-foreground group-hover:text-violet-600 flex items-center gap-1">
                  ID Badge <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Digital ID QR</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/employee/ai-assistant')}
              className="flex flex-col justify-between items-start p-4 bg-muted/40 border hover:border-violet-500 rounded-2xl text-left transition-all duration-200 group"
            >
              <div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div className="mt-4">
                <h4 className="text-xs font-bold text-foreground group-hover:text-violet-600 flex items-center gap-1">
                  HR Chatbot <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Ask questions</p>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* Right Widget: KPI Metric Cards */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Leaves Metric */}
          <Card className="border rounded-2xl shadow shadow-sm hover:border-violet-600 transition-colors flex-1 flex items-center p-4.5 gap-4">
            <div className="h-11 w-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Leave Balance</span>
              <h3 className="text-lg font-extrabold text-foreground mt-0.5">33 remaining days</h3>
            </div>
          </Card>

          {/* Appraisal Goal Metric */}
          <Card className="border rounded-2xl shadow shadow-sm hover:border-violet-600 transition-colors flex-1 flex items-center p-4.5 gap-4">
            <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Goals KRA</span>
              <h3 className="text-lg font-extrabold text-foreground mt-0.5">85% targets reached</h3>
            </div>
          </Card>

          {/* Assigned Assets Metric */}
          <Card className="border rounded-2xl shadow shadow-sm hover:border-violet-600 transition-colors flex-1 flex items-center p-4.5 gap-4">
            <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Active Assets</span>
              <h3 className="text-lg font-extrabold text-foreground mt-0.5">2 devices allocated</h3>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. Lower Widgets: Detailed Calendar view and balances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar visualizer */}
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border lg:col-span-1">
          <CardHeader className="pb-3 border-b flex flex-row justify-between items-center space-y-0">
            <div className="flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-violet-500" />
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider">Shift Calendar</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground font-bold">Jul 2026</span>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-7 gap-y-2 text-center text-xs">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                <span key={i} className="font-semibold text-muted-foreground mb-1">{d}</span>
              ))}
              <span className="text-muted-foreground/30"></span>
              <span className="text-muted-foreground/30"></span>
              <span className="text-muted-foreground/30"></span>
              <span className="relative flex items-center justify-center h-7 w-7 mx-auto rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                1
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
            <div className="flex flex-wrap justify-between items-center gap-2 mt-5 text-[10px] text-muted-foreground pt-4 border-t">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Present</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Absent</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500"></span>Leave</span>
            </div>
          </CardContent>
        </Card>

        {/* Leaves detailed breakdown */}
        <Card className="border rounded-3xl shadow-xl overflow-hidden bg-card border-border lg:col-span-2">
          <CardHeader className="pb-3 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-violet-500" />
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider">Leave Balance Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {leaveBalances.map((leave, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-foreground">{leave.name}</span>
                  <span className="font-mono text-muted-foreground">
                    <strong className="text-foreground">{leave.count}d</strong> / {leave.max}d
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${leave.color}`}
                    style={{ width: `${(leave.count / leave.max) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
