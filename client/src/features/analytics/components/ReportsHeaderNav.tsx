import React from 'react';
import { BarChart3, Clock, Calendar, DollarSign, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ReportTabType = 'attendance' | 'timelog' | 'leave' | 'payroll';

interface ReportsHeaderNavProps {
  activeTab: ReportTabType;
  onTabChange: (tab: ReportTabType) => void;
}

export function ReportsHeaderNav({ activeTab, onTabChange }: ReportsHeaderNavProps) {
  const tabs = [
    {
      id: 'attendance' as ReportTabType,
      label: 'Attendance Reports',
      icon: BarChart3,
      disabled: false,
    },
    {
      id: 'timelog' as ReportTabType,
      label: 'Timelog Report',
      icon: Clock,
      disabled: false,
    },
    {
      id: 'leave' as ReportTabType,
      label: 'Leave Reports',
      icon: Calendar,
      disabled: true,
      badge: 'COMING SOON',
    },
    {
      id: 'payroll' as ReportTabType,
      label: 'Payroll Reports',
      icon: DollarSign,
      disabled: true,
      badge: 'COMING SOON',
    },
  ];

  return (
    <div className="bg-card border border-border/80 rounded-2xl p-2.5 sm:p-3 shadow-2xs max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto no-scrollbar py-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                disabled={tab.disabled}
                onClick={() => !tab.disabled && onTabChange(tab.id)}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all shrink-0 focus:outline-none',
                  isActive
                    ? 'bg-[#4361ee] text-white shadow-sm'
                    : tab.disabled
                    ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-80'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400')} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="text-[10px] tracking-wider px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase border border-slate-300/50 dark:border-slate-700">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right side pill */}
        <div className="hidden lg:flex items-center space-x-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/90 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Real-time HR Analytics Hub</span>
        </div>
      </div>
    </div>
  );
}
