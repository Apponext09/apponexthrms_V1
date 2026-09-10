import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Clock, FileText, User, Calendar, Megaphone, Building2,
  BookOpen, ChevronRight, Briefcase, Timer, Bell,
  CheckCircle2, TrendingUp, Activity, ReceiptIndianRupee, Target,
  CreditCard, ListTodo
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/authStore';

// ── Violet accent palette ─────────────────────────────────────────────────────
const violet = {
  primary: 'hsl(262, 80%, 60%)',
  primaryDark: 'hsl(258, 78%, 50%)',
  bg: 'hsl(262, 80%, 60% / 0.08)',
  border: 'hsl(262, 80%, 60% / 0.25)',
  text: 'hsl(258, 78%, 45%)',
};

// ── Quick action cards ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'Log Hours',        icon: Clock,      href: '/consultant/attendance',  color: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 hover:border-violet-400' },
  { label: 'Submit Expense',   icon: ReceiptIndianRupee,    href: '/consultant/expenses',    color: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400' },
  { label: 'Apply Leave',      icon: Calendar,   href: '/consultant/leaves',      color: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 hover:border-sky-400' },
  { label: 'My Payslips',      icon: CreditCard, href: '/consultant/payslips',    color: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:border-amber-400' },
  { label: 'My Documents',     icon: BookOpen,   href: '/consultant/documents',   color: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400' },
  { label: 'My Profile',       icon: User,       href: '/consultant/profile',     color: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 hover:border-rose-400' },
];

// ── Stat card ─────────────────────────────────────────────────────────────────
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
        <div className="rounded-xl p-2.5" style={{ background: violet.bg }}>
          <Icon size={20} style={{ color: violet.primary }} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Contract progress bar ─────────────────────────────────────────────────────
function ContractProgress({ startDate, endDate }: { startDate: string; endDate: string }) {
  const start    = new Date(startDate).getTime();
  const end      = new Date(endDate).getTime();
  const now      = Date.now();
  const pct      = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  const daysLeft = Math.max(0, Math.ceil((end - now) / 86_400_000));

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center text-sm">
        <span className="font-semibold text-slate-700 dark:text-slate-200">Contract Progress</span>
        <span className="font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 px-2.5 py-0.5 rounded-full text-xs">
          {pct}% elapsed
        </span>
      </div>
      <div className="h-3 w-full rounded-full bg-violet-100/70 dark:bg-violet-950/40 p-0.5 overflow-hidden border border-violet-200/60 dark:border-violet-900/30">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-600 shadow-sm"
        />
      </div>
      <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 pt-0.5 font-medium">
        <span>{new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        <span className="font-semibold text-violet-800 dark:text-violet-200 bg-violet-100/80 dark:bg-violet-950/60 border border-violet-200/80 dark:border-violet-800/60 px-2.5 py-0.5 rounded-md">
          {daysLeft} days remaining
        </span>
        <span>{new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export function ConsultantDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
  }, []);

  const firstName = user?.firstName || 'Consultant';

  // Placeholder contract dates
  const contractStart = '2026-04-01';
  const contractEnd   = '2027-03-31';

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">

      {/* ── Welcome Banner ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-violet-200/80 dark:border-violet-900/40 bg-gradient-to-br from-violet-500/10 via-violet-50/50 to-background dark:from-violet-950/30 dark:via-card dark:to-card p-6 sm:p-7 shadow-sm"
      >
        {/* Soft decorative background circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-violet-400/10 dark:bg-violet-500/5 blur-2xl" />
        <div className="pointer-events-none absolute right-24 -bottom-12 h-44 w-44 rounded-full bg-violet-500/10 dark:bg-violet-500/5 blur-xl" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 text-slate-900 dark:text-slate-100">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-800 dark:text-violet-300 text-xs font-semibold uppercase tracking-wider w-fit mb-1">
              <Briefcase size={16} className="text-violet-600 dark:text-violet-400" />
              <span>Consultant Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {greeting}, <span className="text-violet-600 dark:text-violet-400">{firstName}</span>! 👋
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm font-medium">{today}</p>
          </div>

          <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm border border-violet-200/60 dark:border-violet-900/30 rounded-2xl p-4 shadow-sm">
            <ContractProgress startDate={contractStart} endDate={contractEnd} />
          </div>
        </div>
      </motion.div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Hours Logged"       value={142}  icon={Clock}      sub="This month"           accent="text-violet-600 dark:text-violet-400" />
        <StatCard label="Expenses"           value="₹8.4K" icon={ReceiptIndianRupee}   sub="Pending approval: 2" accent="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Active Projects"    value={3}    icon={ListTodo}   sub="On track: 2"          accent="text-sky-600 dark:text-sky-400" />
        <StatCard label="Payslips"           value={4}    icon={CreditCard} sub="Last: Jul 2026"       accent="text-amber-600 dark:text-amber-400" />
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

        {/* Engagement Details */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
            <Briefcase size={16} style={{ color: violet.primary }} />
            Engagement Details
          </h3>
          {[
            { label: 'Department',     value: user?.departmentName || 'Technology' },
            { label: 'Engagement Type', value: 'Time & Material' },
            { label: 'Client POC',     value: 'Assigned by HR' },
            { label: 'Billing Rate',   value: 'As per contract' },
            { label: 'Contract Start', value: new Date(contractStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
            { label: 'Contract End',   value: new Date(contractEnd).toLocaleDateString('en-IN',   { day: '2-digit', month: 'short', year: 'numeric' }) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-2 border-b border-border/50 last:border-0 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium text-foreground">{value}</span>
            </div>
          ))}
        </motion.div>

        {/* Active Deliverables */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-1 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
            <Target size={16} style={{ color: violet.primary }} />
            Active Deliverables
          </h3>
          <div className="space-y-3">
            {[
              { title: 'API Integration Module',   status: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
              { title: 'UAT Testing Support',      status: 'Pending',     color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
              { title: 'Documentation Review',     status: 'Completed',   color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
              { title: 'Security Audit Report',    status: 'In Progress', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
            ].map((d, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: violet.primary }} />
                  <span className="text-sm font-medium text-foreground truncate">{d.title}</span>
                </div>
                <span className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${d.color}`}>
                  {d.status}
                </span>
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
              <Megaphone size={16} style={{ color: violet.primary }} />
              Announcements
            </h3>
            <button
              onClick={() => navigate('/consultant/announcements')}
              className="flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: violet.primary }}
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { title: 'Independence Day Holiday',          date: 'Aug 15', badge: 'Holiday', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
              { title: 'Expense Submission Deadline',       date: 'Aug 30', badge: 'Finance', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
              { title: 'Consultant Feedback Form — Q2',     date: 'Sep 01', badge: 'Action',  color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
            ].map((ann, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                <Bell size={14} className="mt-0.5 text-muted-foreground flex-shrink-0" />
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

      {/* ── Monthly Timesheet Summary ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground mb-4">
          <Activity size={16} style={{ color: violet.primary }} />
          This Week — Timesheet Summary
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {[
            { day: 'Mon', hours: 8.5, done: true  },
            { day: 'Tue', hours: 9.0, done: true  },
            { day: 'Wed', hours: 8.0, done: true  },
            { day: 'Thu', hours: 7.5, done: true  },
            { day: 'Fri', hours: 0,   done: false },
          ].map((d, i) => (
            <div
              key={i}
              className={`flex flex-col items-center rounded-xl border p-3 gap-2 transition-colors ${
                d.done
                  ? 'border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30'
                  : 'border-border bg-muted/30'
              }`}
            >
              <span className="text-xs font-bold text-muted-foreground uppercase">{d.day}</span>
              <span className={`text-xl font-bold ${d.done ? 'text-violet-700 dark:text-violet-400' : 'text-muted-foreground'}`}>
                {d.done ? d.hours : '—'}
              </span>
              <span className="text-[10px] text-muted-foreground">hrs</span>
              {d.done && <CheckCircle2 size={12} className="text-emerald-500" />}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
