import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Layers,
  Sliders,
  Building,
  GraduationCap,
  Briefcase,
  UserCheck,
  Zap,
  HelpCircle,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  MapPin,
  Users,
  Calculator
} from 'lucide-react';

interface GuidedPayrollHubProps {
  activeTab?: string;
  onNavigateTab: (tab: string) => void;
}

export const GuidedPayrollHub: React.FC<GuidedPayrollHubProps> = ({
  activeTab = 'structures',
  onNavigateTab
}) => {
  return (
    <div className="space-y-4 mb-6">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 shadow-lg">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-xs px-2.5 py-0.5">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-300" /> Advanced Guided Payroll System
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              Intuitive Payroll Builder & Scope Engine
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/90 font-medium leading-relaxed">
              Define Salary Structures for <span className="text-amber-300 font-bold">Individual Employees</span>, <span className="text-amber-300 font-bold">Departments</span>, <span className="text-amber-300 font-bold">Locations</span>, or <span className="text-amber-300 font-bold">Employee Types</span> (Regular, Intern, Contract) using <span className="underline decoration-indigo-400">Fixed Amounts</span> or <span className="underline decoration-indigo-400">Derived Formulas</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => onNavigateTab('structures')}
              className="bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs px-4 h-9 shadow-md gap-1.5"
            >
              <Calculator className="w-4 h-4" /> Open Structure Designer
            </Button>
          </div>
        </div>
      </div>

      {/* 4-STEP VISUAL GUIDED CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* STEP 1: Pay Components */}
        <div
          onClick={() => onNavigateTab('components')}
          className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border ${
            activeTab === 'components'
              ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-md scale-[1.01]'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Step 1: Components
            </span>
            <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-600 border-slate-200">
              📌 Fixed / 🧮 Derived
            </Badge>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-500" /> Pay Components
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            Define Basic, HRA, Allowances, PF, PT, ESI, TDS rules.
          </p>
        </div>

        {/* STEP 2: Slabs & Location Rules */}
        <div
          onClick={() => onNavigateTab('slabs')}
          className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border ${
            activeTab === 'slabs'
              ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-md scale-[1.01]'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Step 2: State Slabs
            </span>
            <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200">
              <MapPin className="w-2.5 h-2.5 mr-0.5" /> State Rules
            </Badge>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-500" /> Tax & PT Slabs
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            Configure state PT slabs (MH, KA, DL) and Income Tax regimes.
          </p>
        </div>

        {/* STEP 3: Salary Structures */}
        <div
          onClick={() => onNavigateTab('structures')}
          className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border ${
            activeTab === 'structures'
              ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-md scale-[1.01]'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Step 3: Structures
            </span>
            <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 font-bold">
              Multi-Scope
            </Badge>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Building className="w-4 h-4 text-amber-500" /> Salary Structures
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            Assign CTC templates to Employee, Department, Location or Intern.
          </p>
        </div>

        {/* STEP 4: Monthly Run */}
        <div
          onClick={() => onNavigateTab('processing')}
          className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border ${
            activeTab === 'processing'
              ? 'bg-indigo-50/90 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-md scale-[1.01]'
              : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Step 4: Monthly Run
            </span>
            <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200">
              10-Step Flow
            </Badge>
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-indigo-500" /> Process Payroll
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
            Lock attendance, compute pro-rata salary & generate payslips.
          </p>
        </div>
      </div>
    </div>
  );
};
