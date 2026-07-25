import React from 'react';
import { Clock, Moon, CalendarRange, Zap, Edit2, Trash2, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ShiftTemplateCardProps {
  shift: any;
  onEdit?: (shift: any) => void;
  onDelete?: (shift: any) => void;
  onAssign?: (shift: any) => void;
  selected?: boolean;
}

const SHIFT_TYPE_ICONS: Record<string, React.ReactNode> = {
  fixed:    <Clock className="w-4 h-4" />,
  flexible: <Zap className="w-4 h-4" />,
  night:    <Moon className="w-4 h-4" />,
  roster:   <CalendarRange className="w-4 h-4" />,
};

const SHIFT_TYPE_LABELS: Record<string, string> = {
  fixed:    'Fixed',
  flexible: 'Flexible',
  night:    'Night Shift',
  roster:   'Roster',
};

export function ShiftTemplateCard({ shift, onEdit, onDelete, onAssign, selected }: ShiftTemplateCardProps) {
  // Support both camelCase (from Knex postProcessResponse) and snake_case (raw DB)
  const shiftName = shift.shiftName || shift.shift_name || 'Unnamed Shift';
  const shiftCode = shift.shiftCode || shift.shift_code || 'N/A';
  const shiftType = shift.shiftType || shift.shift_type || 'fixed';
  const startTime = shift.startTime || shift.start_time;
  const endTime = shift.endTime || shift.end_time;
  const durationHours = shift.durationHours ?? shift.duration_hours ?? 8;
  const gracePeriodMinutes = shift.gracePeriodMinutes ?? shift.grace_period_minutes ?? 0;
  const breakDurationMinutes = shift.breakDurationMinutes ?? shift.break_duration_minutes ?? 60;
  const isNightShift = shift.isNightShift ?? shift.is_night_shift ?? false;
  const isFlexible = shift.isFlexible ?? shift.is_flexible ?? false;
  const flexStart = shift.flexibleStartRangeStart || shift.flexible_start_range_start;
  const flexEnd = shift.flexibleStartRangeEnd || shift.flexible_start_range_end;
  const isDefault = shift.isDefault ?? shift.is_default ?? false;
  const status = shift.status || 'active';
  const shiftColor = shift.color || '#6366f1';
  const employeeCount = shift.employeeCount ?? shift.employee_count ?? 0;

  const typeIcon = SHIFT_TYPE_ICONS[shiftType] || <Clock className="w-4 h-4" />;
  const typeLabel = SHIFT_TYPE_LABELS[shiftType] || shiftType;

  const formatTime = (t: string | null | undefined) => {
    if (!t) return '--';
    const parts = t.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0]);
      const m = parts[1];
      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${h12}:${m} ${suffix}`;
    }
    return t;
  };

  const getTimingDisplay = () => {
    if (shiftType === 'roster') return 'Weekly Roster Plan';
    if (isFlexible) return `${formatTime(flexStart)} – ${formatTime(flexEnd)}`;
    if (startTime && endTime) return `${formatTime(startTime)} – ${formatTime(endTime)}`;
    return 'Flexible Timings';
  };

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden',
        selected && 'ring-2 ring-indigo-500'
      )}
    >
      {/* Color accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: shiftColor }} />

      <div className="p-5 pt-6">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-xl text-white flex-shrink-0"
              style={{ backgroundColor: shiftColor }}
            >
              {typeIcon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-foreground leading-tight">{shiftName}</h3>
                {isDefault && (
                  <span title="Default Shift" className="inline-flex items-center">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {shiftCode}
              </span>
            </div>
          </div>
          <Badge
            variant={status === 'active' ? 'default' : 'secondary'}
            className={cn(
              'text-[9px] font-bold uppercase tracking-wider rounded-full px-2',
              status === 'active'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-0'
                : 'bg-slate-100 text-slate-500 border-0'
            )}
          >
            {status}
          </Badge>
        </div>

        {/* Shift info grid */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">Timings</p>
            <p className="text-xs font-bold text-foreground truncate">
              {getTimingDisplay()}
            </p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">Duration</p>
            <p className="text-xs font-bold text-foreground">{durationHours}h</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">Grace</p>
            <p className="text-xs font-bold text-foreground">{gracePeriodMinutes} min</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-2.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">Break</p>
            <p className="text-xs font-bold text-foreground">{breakDurationMinutes} min</p>
          </div>
        </div>

        {/* Type badge row + employee count */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="text-[9px] font-semibold rounded-full px-2 gap-1 border-muted-foreground/30"
            >
              {typeIcon}
              {typeLabel}
            </Badge>
            {isNightShift && (
              <Badge variant="outline" className="text-[9px] font-semibold rounded-full px-2 border-indigo-300 text-indigo-600 dark:text-indigo-400">
                <Moon className="w-3 h-3 mr-1" />
                Night
              </Badge>
            )}
            {isFlexible && (
              <Badge variant="outline" className="text-[9px] font-semibold rounded-full px-2 border-violet-300 text-violet-600 dark:text-violet-400">
                <Zap className="w-3 h-3 mr-1" />
                Flex
              </Badge>
            )}
          </div>
          {Number(employeeCount) > 0 && (
            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {employeeCount} assigned
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onAssign && (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs font-bold rounded-xl text-white"
              style={{ backgroundColor: shiftColor }}
              onClick={() => onAssign(shift)}
            >
              Assign Shift
            </Button>
          )}
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 rounded-xl border-muted-foreground/25"
              onClick={() => onEdit(shift)}
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 rounded-xl border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => onDelete(shift)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
