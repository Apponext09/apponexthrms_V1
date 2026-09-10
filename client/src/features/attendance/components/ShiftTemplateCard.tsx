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
  fixed: <Clock className="w-3.5 h-3.5" />,
  flexible: <Zap className="w-3.5 h-3.5" />,
  night: <Moon className="w-3.5 h-3.5" />,
  roster: <CalendarRange className="w-3.5 h-3.5" />,
};

const SHIFT_TYPE_LABELS: Record<string, string> = {
  fixed: 'Fixed',
  flexible: 'Flexible',
  night: 'Night Shift',
  roster: 'Roster',
};

export function ShiftTemplateCard({ shift, onEdit, onDelete, onAssign, selected }: ShiftTemplateCardProps) {
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
  const shiftColor = shift.color || '#2563eb';
  const employeeCount = shift.employeeCount ?? shift.employee_count ?? 0;

  const typeIcon = SHIFT_TYPE_ICONS[shiftType] || <Clock className="w-3.5 h-3.5" />;
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
        'group relative rounded-xl border border-border/80 bg-card shadow-2xs hover:border-primary/40 transition-colors p-4 flex flex-col justify-between space-y-3.5',
        selected && 'ring-2 ring-primary border-primary'
      )}
    >
      {/* Accent Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: shiftColor }} />

      <div>
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-xs shrink-0 shadow-2xs"
              style={{ backgroundColor: shiftColor }}
            >
              {typeIcon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="text-xs font-bold text-foreground truncate">{shiftName}</h3>
                {Boolean(isDefault) && (
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                )}
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">
                {shiftCode}
              </span>
            </div>
          </div>

          <Badge
            className={cn(
              'text-[9px] font-bold py-0.5 px-2 border shrink-0',
              status === 'active'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-muted text-muted-foreground border-border'
            )}
          >
            {status}
          </Badge>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-lg border border-border/60">
          <div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Timings</p>
            <p className="mt-0.5 text-[11px] font-mono font-bold text-foreground truncate">{getTimingDisplay()}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Duration</p>
            <p className="mt-0.5 text-[11px] font-bold text-foreground">{durationHours} Hours</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Grace Period</p>
            <p className="mt-0.5 text-[11px] font-bold text-foreground">{gracePeriodMinutes} Mins</p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Break Duration</p>
            <p className="mt-0.5 text-[11px] font-bold text-foreground">{breakDurationMinutes} Mins</p>
          </div>
        </div>

        {/* Type badges */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[9px] font-semibold gap-1 px-2 py-0.5">
              {typeIcon}
              {typeLabel}
            </Badge>
            {Boolean(isNightShift) && (
              <Badge variant="outline" className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border-indigo-200 px-2 py-0.5">
                <Moon className="w-2.5 h-2.5 mr-0.5" /> Night
              </Badge>
            )}
            {Boolean(isFlexible) && (
              <Badge variant="outline" className="text-[9px] font-bold bg-purple-50 text-purple-700 border-purple-200 px-2 py-0.5">
                <Zap className="w-2.5 h-2.5 mr-0.5" /> Flex
              </Badge>
            )}
          </div>
          {Number(employeeCount) > 0 && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
              {employeeCount} Assigned
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1">
        {onAssign && shiftType !== 'roster' && (
          <Button
            size="sm"
            className="flex-1 h-7 text-[10px] font-bold bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => onAssign(shift)}
          >
            Assign Shift
          </Button>
        )}
        {onEdit && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(shift)}
            title="Edit Shift"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
            onClick={() => onDelete(shift)}
            title="Delete Shift"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
