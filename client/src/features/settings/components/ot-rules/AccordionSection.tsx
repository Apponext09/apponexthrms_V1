import React, { useState } from 'react';
import { ChevronDown, Calendar, Sun, Palmtree } from 'lucide-react';
import type { Control } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { OTCalculationSection } from './OTCalculationSection';
import { OTDeductionSection } from './OTDeductionSection';
import { PaySection } from './PaySection';

interface AccordionSectionProps {
  title:     string;
  prefix:    'normalDay' | 'holiday' | 'weekend';
  control:   Control<any>;
  shiftType?: 'time_bound' | 'flexible';
}

const BADGE_THEMES: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  normalDay: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    icon: <Sun className="w-3 h-3" />,
    label: 'Normal Workdays',
  },
  holiday: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
    icon: <Palmtree className="w-3 h-3" />,
    label: 'Company Holidays',
  },
  weekend: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    icon: <Calendar className="w-3 h-3" />,
    label: 'Weekly Offs',
  },
};

export const AccordionSection: React.FC<AccordionSectionProps> = ({ title, prefix, control, shiftType }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = BADGE_THEMES[prefix] || BADGE_THEMES.normalDay;

  return (
    <div className="border border-border/80 rounded-2xl overflow-hidden bg-card transition-all">
      {/* Header Bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-left transition-colors cursor-pointer select-none",
          expanded ? "bg-muted/40 border-b border-border" : "hover:bg-muted/30"
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-foreground">
            {title}
          </span>
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold", theme.bg, theme.text)}>
            {theme.icon}
            {theme.label}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>

      {/* Accordion Content */}
      {expanded && (
        <div className="p-4 md:p-5 space-y-5 bg-card">
          {/* Calculate OT If */}
          <OTCalculationSection prefix={prefix} control={control} shiftType={shiftType} />

          {/* OT Deduction */}
          <OTDeductionSection prefix={prefix} control={control} />

          {/* Pay */}
          <PaySection prefix={prefix} control={control} />
        </div>
      )}
    </div>
  );
};
