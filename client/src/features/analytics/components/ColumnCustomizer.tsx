import React, { useState, useRef, useCallback } from 'react';
import { Settings2, GripVertical, Eye, EyeOff, RotateCcw, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ─── All available columns sourced from DB fields ─────────────────────────────
// attendance_records: check_in_date, check_in_time, check_out_time,
//   duration_minutes, work_duration_minutes, break_time_minutes,
//   overtime_minutes, status, is_late, is_early_departure, is_regularized,
//   check_in_method, check_out_method, notes
// attendance_summaries: payroll cycle reference
// shift_templates (joined): shift name, expected timing
// From useAttendanceReports hook (client representation)

export interface ColumnDef {
  key: string;
  label: string;
  dbField: string;       // actual DB field name for reference
  group: 'identity' | 'timing' | 'hours' | 'flags' | 'location';
  required?: boolean;    // cannot be hidden (e.g. # and Name)
  visible: boolean;
  minWidth?: string;
}

export const DEFAULT_COLUMNS: ColumnDef[] = [
  // Identity
  { key: 'serial',            label: '#',                    dbField: 'row_number',              group: 'identity',  required: true, visible: true, minWidth: '32px'  },
  { key: 'date',              label: 'Date',                 dbField: 'check_in_date',            group: 'identity',  required: true, visible: true, minWidth: '90px'  },
  { key: 'employeeName',      label: 'Name',                 dbField: 'employee_id (joined)',     group: 'identity',  required: true, visible: true, minWidth: '130px' },
  { key: 'employeeCode',      label: 'Employee Code',        dbField: 'employee_code (joined)',   group: 'identity',  visible: false, minWidth: '100px' },
  { key: 'departmentName',    label: 'Department',           dbField: 'department_id (joined)',   group: 'identity',  visible: false, minWidth: '120px' },
  { key: 'day',               label: 'Day',                  dbField: 'DAYNAME(check_in_date)',   group: 'identity',  visible: true,  minWidth: '80px'  },
  // Timing
  { key: 'payrollCycle',      label: 'Payroll Cycle',        dbField: 'payroll_cycle (derived)',  group: 'timing',    visible: true   },
  { key: 'shift',             label: 'Shift',                dbField: 'shift_template_id (joined)', group: 'timing', visible: true,  minWidth: '140px' },
  { key: 'expTiming',         label: 'Exp Timing',           dbField: 'start_time / end_time',   group: 'timing',    visible: true   },
  { key: 'actualTiming',      label: 'Actual Timing',        dbField: 'check_in_time / check_out_time', group: 'timing', visible: true },
  { key: 'checkInMethod',     label: 'Check-In Method',      dbField: 'check_in_method',          group: 'timing',    visible: false  },
  { key: 'checkOutMethod',    label: 'Check-Out Method',     dbField: 'check_out_method',         group: 'timing',    visible: false  },
  // Hours
  { key: 'expHours',          label: 'Exp Hours',            dbField: 'expected_duration_minutes', group: 'hours',   visible: true   },
  { key: 'actualHours',       label: 'Actual Hours',         dbField: 'duration_minutes',         group: 'hours',     visible: true   },
  { key: 'shortHours',        label: 'Short Hours',          dbField: 'duration_minutes (diff)',  group: 'hours',     visible: true   },
  { key: 'bufferMins',        label: 'Buffer Mins',          dbField: 'buffer_minutes (policy)',  group: 'hours',     visible: true   },
  { key: 'lateMins',          label: 'Late Mins',            dbField: 'late_minutes (derived)',   group: 'hours',     visible: true   },
  { key: 'totalBreakHours',   label: 'Total Break Hours',    dbField: 'break_time_minutes',       group: 'hours',     visible: true   },
  { key: 'actualWorkingHours',label: 'Actual Working Hours', dbField: 'work_duration_minutes',    group: 'hours',     visible: true   },
  { key: 'overtimeMins',      label: 'Overtime Mins',        dbField: 'overtime_minutes',         group: 'hours',     visible: false  },
  // Flags
  { key: 'isLate',            label: 'Late',                 dbField: 'is_late',                  group: 'flags',     visible: true   },
  { key: 'isEarlyDeparture',  label: 'Early Departure',      dbField: 'is_early_departure',       group: 'flags',     visible: false  },
  { key: 'isRegularized',     label: 'Regularized',          dbField: 'is_regularized',           group: 'flags',     visible: false  },
  { key: 'dayStatus',         label: 'Day Status',           dbField: 'status',                   group: 'flags',     required: true, visible: true   },
  { key: 'notes',             label: 'Notes',                dbField: 'notes',                    group: 'flags',     visible: false  },
  // Location
  { key: 'checkInLocation',   label: 'Check-In Location',    dbField: 'check_in_location_id (joined)', group: 'location', visible: true, minWidth: '120px' },
  { key: 'checkOutLocation',  label: 'Check-Out Location',   dbField: 'check_out_location_id (joined)', group: 'location', visible: true, minWidth: '120px' },
];

const GROUP_LABELS: Record<ColumnDef['group'], string> = {
  identity: '👤 Identity',
  timing:   '⏱ Timing',
  hours:    '⏳ Hours',
  flags:    '🚩 Flags',
  location: '📍 Location',
};

const GROUP_COLORS: Record<ColumnDef['group'], string> = {
  identity: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  timing:   'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  hours:    'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  flags:    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  location: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
};

interface ColumnCustomizerProps {
  columns: ColumnDef[];
  onChange: (cols: ColumnDef[]) => void;
}

export function ColumnCustomizer({ columns, onChange }: ColumnCustomizerProps) {
  const [open, setOpen] = useState(false);
  const [localCols, setLocalCols] = useState<ColumnDef[]>(columns);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState<ColumnDef['group'] | 'all'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  const dragSrcRef = useRef<number | null>(null);

  // Sync local state whenever columns prop changes
  React.useEffect(() => {
    setLocalCols(columns);
  }, [columns]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const visibleCount = localCols.filter(c => c.visible).length;

  // ── Toggle visibility ────────────────────────────────────────────────────────
  const toggleCol = (key: string) => {
    setLocalCols(prev =>
      prev.map(c => (c.key === key && !c.required ? { ...c, visible: !c.visible } : c))
    );
  };

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragSrcRef.current = idx;
    setDraggingIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    const srcIdx = dragSrcRef.current;
    if (srcIdx === null || srcIdx === targetIdx) return;

    setLocalCols(prev => {
      const next = [...prev];
      const [moved] = next.splice(srcIdx, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });

    setDraggingIdx(null);
    setDragOverIdx(null);
    dragSrcRef.current = null;
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
    setDragOverIdx(null);
    dragSrcRef.current = null;
  };

  // ── Apply / Reset ────────────────────────────────────────────────────────────
  const handleApply = () => {
    onChange(localCols);
    setOpen(false);
  };

  const handleReset = () => {
    setLocalCols(DEFAULT_COLUMNS.map(c => ({ ...c })));
  };

  // Filtered display list
  const filteredCols = localCols.filter(c => {
    const matchSearch = !searchTerm || c.label.toLowerCase().includes(searchTerm.toLowerCase()) || c.dbField.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGroup = activeGroup === 'all' || c.group === activeGroup;
    return matchSearch && matchGroup;
  });

  const groups = ['all', ...Array.from(new Set(localCols.map(c => c.group)))] as Array<'all' | ColumnDef['group']>;

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'h-8 text-xs px-3 font-semibold gap-1.5 bg-background border-slate-300 dark:border-slate-700',
          'hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
          open && 'bg-primary/10 border-primary/40 text-primary'
        )}
        title="Customize Columns"
      >
        <Settings2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Columns</span>
        {visibleCount !== localCols.length && (
          <span className="bg-primary text-primary-foreground rounded-full text-[10px] font-bold px-1.5 py-0 min-w-[18px] text-center leading-5">
            {visibleCount}
          </span>
        )}
      </Button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className={cn(
            'absolute right-0 top-10 z-50',
            'w-[360px] max-h-[540px]',
            'bg-card border border-border rounded-xl shadow-xl',
            'flex flex-col overflow-hidden',
            'animate-in fade-in-0 zoom-in-95 duration-150'
          )}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 flex-shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Customize Columns</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {visibleCount} of {localCols.length} visible · Drag to reorder
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0">
            <input
              type="text"
              placeholder="Search columns..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-8 px-3 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Group Tabs */}
          <div className="px-3 pb-2 flex gap-1.5 flex-wrap flex-shrink-0">
            {groups.map(g => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors',
                  activeGroup === g
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                )}
              >
                {g === 'all' ? 'All' : GROUP_LABELS[g]}
              </button>
            ))}
          </div>

          {/* Column List */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0">
            {filteredCols.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">No columns match your search</div>
            ) : (
              filteredCols.map((col) => {
                const realIdx = localCols.findIndex(c => c.key === col.key);
                const isDragging = draggingIdx === realIdx;
                const isDragOver = dragOverIdx === realIdx;
                return (
                  <div
                    key={col.key}
                    draggable
                    onDragStart={e => handleDragStart(e, realIdx)}
                    onDragOver={e => handleDragOver(e, realIdx)}
                    onDrop={e => handleDrop(e, realIdx)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all cursor-default select-none',
                      col.visible
                        ? 'bg-card border-border hover:border-primary/30 hover:bg-muted/30'
                        : 'bg-muted/20 border-border/50 opacity-60',
                      isDragging && 'opacity-40 scale-95 border-dashed border-primary',
                      isDragOver && !isDragging && 'border-primary bg-primary/5 scale-[1.01]'
                    )}
                  >
                    {/* Drag Handle */}
                    <GripVertical
                      className="w-3.5 h-3.5 text-muted-foreground/60 cursor-grab active:cursor-grabbing flex-shrink-0"
                    />

                    {/* Group Badge */}
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase flex-shrink-0', GROUP_COLORS[col.group])}>
                      {col.group.slice(0, 3)}
                    </span>

                    {/* Column Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{col.label}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{col.dbField}</p>
                    </div>

                    {/* Required badge */}
                    {col.required && (
                      <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border flex-shrink-0">
                        Pinned
                      </span>
                    )}

                    {/* Toggle */}
                    <button
                      onClick={() => toggleCol(col.key)}
                      disabled={!!col.required}
                      title={col.required ? 'Required column (cannot hide)' : col.visible ? 'Hide column' : 'Show column'}
                      className={cn(
                        'flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-colors border',
                        col.required
                          ? 'opacity-30 cursor-not-allowed bg-muted border-border'
                          : col.visible
                          ? 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 cursor-pointer'
                          : 'bg-muted text-muted-foreground border-border hover:bg-muted/80 cursor-pointer'
                      )}
                    >
                      {col.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-border bg-muted/20 flex-shrink-0">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Default
            </button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-3"
                onClick={() => { setLocalCols(columns); setOpen(false); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs px-3 gap-1"
                onClick={handleApply}
              >
                <Check className="w-3 h-3" />
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
