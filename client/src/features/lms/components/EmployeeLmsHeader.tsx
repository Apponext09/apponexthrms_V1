import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  Award,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyLmsEnrollments, useMyLmsCertificates, useLmsCourses } from '../api/useLms';
import { useAuthStore } from '@/features/auth/store/authStore';

interface EmployeeLmsHeaderProps {
  title?: string;
  subtitle?: string;
}

export function EmployeeLmsHeader({
  title = 'Learning & Upskilling Academy',
  subtitle = 'Upgrade your professional skills, attend live instructor batches, and earn verified industry certificates.',
}: EmployeeLmsHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const employeeId = user?.employeeId ? Number(user.employeeId) : Number(user?.id);

  const { data: enrollments = [] } = useMyLmsEnrollments(employeeId);
  const { data: certificates = [] } = useMyLmsCertificates(employeeId);
  const { data: courses = [] } = useLmsCourses({ status: 'published' });

  const activeEnrollments = enrollments.filter((e) => e.status !== 'completed');
  const completedEnrollments = enrollments.filter((e) => e.status === 'completed');

  const navItems = [
    {
      label: 'My Learning & Live Classes',
      path: '/employee/lms/my-learning',
      icon: GraduationCap,
      count: activeEnrollments.length,
      countLabel: 'Active',
    },
    {
      label: 'Course Catalog & Enroll',
      path: '/employee/lms/catalog',
      icon: BookOpen,
      count: courses.length,
      countLabel: 'Available',
    },
    {
      label: 'Verified Certificates',
      path: '/employee/lms/certificates',
      icon: Award,
      count: certificates.length,
      countLabel: 'Earned',
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Academy Hero Banner ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-7 shadow-lg border border-indigo-700/40">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> Employee LMS Academy
              </span>
              {activeEnrollments.some((e) => Boolean(e.batchMeetingLink || (e as any).batch_meeting_link)) && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 flex items-center gap-1 animate-pulse">
                  <Video className="w-3 h-3" /> Live Batch Class Active
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">{title}</h1>
            <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed">{subtitle}</p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 shrink-0 bg-white/10 backdrop-blur-md p-2.5 rounded-xl border border-white/10">
            <div className="text-center px-3 py-1 border-r border-white/10">
              <p className="text-lg font-black text-white">{activeEnrollments.length}</p>
              <p className="text-[10px] font-medium text-indigo-200">In Progress</p>
            </div>
            <div className="text-center px-3 py-1 border-r border-white/10">
              <p className="text-lg font-black text-emerald-400">{completedEnrollments.length}</p>
              <p className="text-[10px] font-medium text-indigo-200">Completed</p>
            </div>
            <div className="text-center px-3 py-1">
              <p className="text-lg font-black text-amber-300">{certificates.length}</p>
              <p className="text-[10px] font-medium text-indigo-200">Certificates</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-Navigation Tabs ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-card border border-border/80 rounded-xl shadow-2xs">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Button
              key={item.path}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate(item.path)}
              className={`h-9 text-xs font-bold gap-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5 ${
                  isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {item.count}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
