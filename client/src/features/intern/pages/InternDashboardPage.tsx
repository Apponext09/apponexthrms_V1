import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Clock, Palmtree, FileText, User,
  Calendar, Megaphone, Building2, BookOpen, Briefcase,
  CheckCircle2, TrendingUp, Target, Bell, ChevronRight,
  GraduationCap, Timer, Award, Activity
} from 'lucide-react';

import { useAuthStore } from '@/features/auth/store/authStore';

// ── Amber accent palette ──────────────────────────────────────────────────────
const amber = {
  primary: 'hsl(38, 92%, 50%)',
  primaryDark: 'hsl(32, 90%, 42%)',
  bg: 'hsl(38, 92%, 50% / 0.08)',
  border: 'hsl(38, 92%, 50% / 0.25)',
  text: 'hsl(32, 90%, 38%)',
};

// ── Quick action cards ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Mark Attendance',   icon: Clock,       href: '/intern/attendance',       color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:border-amber-400' },
  { label: 'Apply Leave',       icon: Palmtree,    href: '/intern/leaves',           color: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 hover:border-sky-400' },
  { label: 'My Payslip',        icon: FileText,    href: '/intern/payslips',         color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400' },
  { label: 'My Documents',      icon: BookOpen,    href: '/intern/documents',        color: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 hover:border-violet-400' },
  { label: 'Holiday Calendar',  icon: Calendar,    href: '/intern/holiday-calendar', color: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 hover:border-rose-400' },
  { label: 'My Profile',        icon: User,        href: '/intern/profile',          color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 hover:border-orange-400' },
];

// ── Stat card component ───────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, sub, accent }: {
  label: string; value: string | number; icon: any; sub?: string; accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className={`mt-1 text-3xl font-bold ${accent || 'text-foreground'}`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="rounded-xl p-2.5" style={{ background: amber.bg }}>
          <Icon size={20} style={{ color: amber.primary }} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function InternshipProgress({ startDate, endDate }: { startDate: string; endDate: string }) {
  const start = new Date(startDate).getTime();
  const end   = new Date(endDate).getTime();
  const now   = Date.now();
  const pct   = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86_400_000));

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-semibold text-slate-700 dark:text-slate-200">Internship Progress</span>
        <span className="font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 rounded-full text-xs">
          {pct}% complete
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-amber-100/70 dark:bg-amber-950/40 p-0.5 overflow-hidden border border-amber-200/60 dark:border-amber-900/30">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600 shadow-sm"
        />
      </div>
      <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 pt-0.5 font-medium">
        <span>{new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        <span className="font-semibold text-amber-800 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/60 px-2.5 py-0.5 rounded-md">
          {daysLeft} days remaining
        </span>
        <span>{new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export function InternDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  const firstName = user?.firstName || 'Intern';

  // Placeholder internship dates — in real use these would come from the employee profile API
  const internStart = '2026-06-01';
  const internEnd   = '2026-12-31';

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">

      {/* ── Welcome Banner ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-background dark:from-amber-950/30 dark:via-card dark:to-card p-6 sm:p-7 shadow-sm"
      >
        {/* Soft decorative background circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-amber-400/10 dark:bg-amber-500/5 blur-2xl" />
        <div className="pointer-events-none absolute right-24 -bottom-12 h-44 w-44 rounded-full bg-amber-500/10 dark:bg-amber-500/5 blur-xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 text-slate-900 dark:text-slate-100">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider w-fit mb-1">
              <GraduationCap size={16} className="text-amber-600 dark:text-amber-400" />
              <span>Intern Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {greeting}, <span className="text-amber-600 dark:text-amber-400">{firstName}</span>! 👋
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">{today}</p>
          </div>

          <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm border border-amber-200/60 dark:border-amber-900/30 rounded-2xl p-4 shadow-sm">
            <InternshipProgress startDate={internStart} endDate={internEnd} />
          </div>
        </div>
      </motion.div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Days Present"    value={18}   icon={CheckCircle2} sub="This month"     accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Leaves Taken"    value={2}    icon={Palmtree}     sub="Remaining: 8"   accent="text-sky-600 dark:text-sky-400" />
        <StatCard label="Stipend"         value="₹12K" icon={TrendingUp}   sub="Last disbursed" accent="text-amber-600 dark:text-amber-400" />
        <StatCard label="Tasks Completed" value={7}    icon={Target}       sub="Out of 10 this week" accent="text-violet-600 dark:text-violet-400" />
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIONS.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(action.href)}
                className={`flex flex-col items-center gap-2.5 rounded-2xl border p-4 transition-all cursor-pointer ${action.color}`}
              >
                <div className="rounded-xl p-2.5 bg-white/60 dark:bg-white/10 shadow-sm">
                  <Icon size={20} className="text-foreground/80" />
                </div>
                <span className="text-xs font-semibold text-center text-foreground/80 leading-tight">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Internship Details card */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
            <Briefcase size={16} style={{ color: amber.primary }} />
            Internship Details
          </h3>
          {[
            { label: 'Department',       value: user?.departmentName || 'Engineering' },
            { label: 'Mentor',           value: 'Assigned by HR' },
            { label: 'Designation',      value: user?.designation || 'Intern' },
            { label: 'Start Date',       value: new Date(internStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
            { label: 'End Date',         value: new Date(internEnd).toLocaleDateString('en-IN',   { day: '2-digit', month: 'short', year: 'numeric' }) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b border-border/50 last:border-0 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground">{value}</span>
            </div>
          ))}
        </motion.div>

        {/* Today's Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-1 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
            <Timer size={16} style={{ color: amber.primary }} />
            Today's Schedule
          </h3>
          <div className="space-y-3">
            {[
              { time: '09:00 AM', title: 'Work Start', type: 'shift',   color: 'bg-emerald-500' },
              { time: '01:00 PM', title: 'Lunch Break', type: 'break',  color: 'bg-amber-500' },
              { time: '02:00 PM', title: 'Resume Work', type: 'shift',  color: 'bg-emerald-500' },
              { time: '06:00 PM', title: 'Shift End',   type: 'end',    color: 'bg-slate-400' },
            ].map((ev, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full flex-shrink-0 ${ev.color}`} />
                <span className="text-xs font-medium text-muted-foreground w-20">{ev.time}</span>
                <span className="text-sm font-medium text-foreground">{ev.title}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Announcements */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-1 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Megaphone size={16} style={{ color: amber.primary }} />
              Announcements
            </h3>
            <button
              onClick={() => navigate('/intern/announcements')}
              className="flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: amber.primary }}
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { title: 'Independence Day Holiday',         date: 'Aug 15',  badge: 'Holiday',      color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
              { title: 'Monthly Intern Feedback Session',  date: 'Aug 28',  badge: 'Meeting',      color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
              { title: 'Internship Completion Certificates', date: 'Dec 31', badge: 'Info',        color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
            ].map((ann, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="mt-0.5">
                  <Bell size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{ann.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{ann.date}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ann.color}`}>{ann.badge}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Milestones / Learning Goals ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
          <Award size={16} style={{ color: amber.primary }} />
          Internship Milestones
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Orientation Complete',      done: true  },
            { label: 'Project Assigned',          done: true  },
            { label: 'Mid-Term Review',           done: false },
            { label: 'Final Presentation',        done: false },
          ].map((m, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                m.done
                  ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'
                  : 'border-border bg-muted/30'
              }`}
            >
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                m.done ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
              }`}>
                {m.done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-sm font-medium ${m.done ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
                {m.label}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
