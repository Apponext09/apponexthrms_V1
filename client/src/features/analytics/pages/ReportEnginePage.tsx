import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Sparkles,
  Settings2,
  BookOpen,
  Save,
  Download,
  Play,
  CheckCircle2,
  Edit3,
  X,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Search,
  Trash2,
  RotateCcw,
  Columns3,
  Filter,
  Share2,
  Table2,
  Plus,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Lock,
  Globe,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { CleanLoader } from '@/components/ui/clean-loader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  useReportFields,
  useReportMetadata,
  useRunReport,
  useReportTemplates,
  useSaveTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  type ModuleType,
  type FieldDef,
  type ReportFilters,
  type ReportResult,
  type SavedTemplate,
  type CustomCondition,
  type ReportColumn,
} from '../hooks/useReportEngine';

// ─── Constants ─────────────────────────────────────────────────────────────

const MODULES: { key: ModuleType; label: string; color: string; icon: string }[] = [
  { key: 'all',        label: 'Master (All Tables)', color: 'bg-indigo-500/10 text-indigo-700 border-indigo-300 dark:text-indigo-400 dark:border-indigo-700', icon: '🌐' },
  { key: 'employee',   label: 'Employee',           color: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700', icon: '👤' },
  { key: 'attendance', label: 'Attendance',         color: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-400 dark:border-blue-700', icon: '🕐' },
  { key: 'leave',      label: 'Leave',              color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:text-emerald-400 dark:border-emerald-700', icon: '📅' },
  { key: 'payroll',    label: 'Payroll',            color: 'bg-violet-500/10 text-violet-700 border-violet-300 dark:text-violet-400 dark:border-violet-700', icon: '💰' },
];

const GROUP_LABELS: Record<string, string> = {
  emp_master:       '📋 Employees Master Table',
  emp_dept:         '🏢 Departments Table',
  emp_desig:        '💼 Designations Table',
  emp_company:      '🏢 Company Table',
  emp_location:     '📍 Office Locations Table',
  attendance_rec:   '🕐 Attendance Records Table',
  attendance_reg:   '⏱ Attendance Regularizations Table',
  attendance_break: '☕ Attendance Breaks Table',
  leave_app:        '📅 Leave Applications Table',
  leave_bal:        '⚖ Leave Balances Table',
  leave_encash:     '💵 Leave Encashments Table',
  payroll_slip:     '💰 Payroll & Payslips Table',
  payroll_loan:     '🏦 Employee Loans Table',
  asset_inv:        '💻 Company Assets Table',
  comp_off:         '⏳ Comp Off Balances Table',
  identity:         '👤 Identity',
  timing:           '⏱ Timing',
  hours:            '⏳ Hours',
  flags:            '🚩 Flags',
  location:         '📍 Location',
  payroll:          '💰 Payroll',
  leave:            '📅 Leave',
  employee:         '👤 Employee',
  recruitment:      '🎯 Recruitment',
};

const STATUS_OPTIONS: Record<string, { value: string; label: string }[]> = {
  all: [
    { value: 'present', label: 'Attendance: Present' },
    { value: 'absent', label: 'Attendance: Absent' },
    { value: 'half_day', label: 'Attendance: Half Day' },
    { value: 'approved', label: 'Leave: Approved' },
    { value: 'pending', label: 'Leave: Pending' },
    { value: 'rejected', label: 'Leave: Rejected' },
    { value: 'active', label: 'Employee: Active' },
    { value: 'inactive', label: 'Employee: Inactive' },
  ],
  attendance: [
    { value: 'present', label: 'Present' },
    { value: 'absent', label: 'Absent' },
    { value: 'half_day', label: 'Half Day' },
    { value: 'week_off', label: 'Week Off' },
  ],
  leave: [
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' },
  ],
  payroll: [
    { value: 'processed', label: 'Processed' },
    { value: 'draft', label: 'Draft' },
    { value: 'paid', label: 'Paid' },
  ],
  employee: [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ],
};

const SIGNATURE_LABEL = 'text-[10px] font-bold text-muted-foreground uppercase tracking-wider';

// ─── CSV Export Helper ──────────────────────────────────────────────────────

function exportToCSV(result: ReportResult, reportName: string) {
  if (!result.rows.length) return;
  const headers = result.columns.map((c) => `"${c.label}"`).join(',');
  const rows = result.rows.map((row) =>
    result.columns.map((col) => {
      const val = row[col.key];
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Slide-in Drawer shell ────────────────────────────────────────────────

function Drawer({
  open,
  onClose,
  title,
  icon: Icon,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <div
      className={cn('fixed inset-0 z-50', open ? 'pointer-events-auto' : 'pointer-events-none')}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0'
        )}
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full max-w-[400px] flex-col bg-card border-l border-border shadow-soft-xl transition-transform duration-300 motion-reduce:transition-none',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/70 px-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-primary" />}
            <h2 className="text-sm font-extrabold tracking-tight text-foreground">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
            aria-label="Close configure panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="custom-scrollbar flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="shrink-0 border-t border-border/70 bg-card p-3">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Field Picker ───────────────────────────────────────────────────────────

function FieldPicker({
  fields,
  selectedFields,
  onToggle,
  searchQuery,
}: {
  fields: FieldDef[];
  selectedFields: Set<string>;
  onToggle: (key: string) => void;
  searchQuery: string;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['identity', 'timing', 'employee', 'leave', 'payroll'])
  );

  const grouped = useMemo(() => {
    const filtered = searchQuery
      ? fields.filter((f) => f.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : fields;
    const map: Record<string, FieldDef[]> = {};
    for (const f of filtered) {
      if (!map[f.group]) map[f.group] = [];
      map[f.group].push(f);
    }
    return map;
  }, [fields, searchQuery]);

  const toggleGroup = (g: string) => {
    setExpandedGroups((prev) => {
      const n = new Set(prev);
      n.has(g) ? n.delete(g) : n.add(g);
      return n;
    });
  };

  const groupKeys = Object.keys(grouped);

  if (groupKeys.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Search className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-xs font-medium text-muted-foreground">No fields match “{searchQuery}”</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {groupKeys.map((group, gi) => {
        const items = grouped[group];
        const groupSelected = items.filter((f) => selectedFields.has(f.key)).length;
        const isExpanded = expandedGroups.has(group) || !!searchQuery;

        return (
          <div key={group}>
            {gi > 0 && <Separator className="my-1 bg-border/50" />}
            <button
              onClick={() => toggleGroup(group)}
              className="group flex w-full items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-muted/60"
            >
              <span className="flex items-center gap-1.5">
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="text-[11px] font-bold text-foreground">
                  {GROUP_LABELS[group] || group}
                </span>
              </span>
              {groupSelected > 0 && (
                <Badge className="h-4 min-w-[16px] justify-center px-1 text-[10px] leading-none">
                  {groupSelected}
                </Badge>
              )}
            </button>

            {isExpanded && (
              <div className="ml-1.5 space-y-0.5 pb-1">
                {items.map((field) => {
                  const isSelected = selectedFields.has(field.key);
                  return (
                    <div
                      key={field.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => onToggle(field.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onToggle(field.key);
                        }
                      }}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected
                          ? 'bg-primary/10 text-primary'
                          : 'text-foreground hover:bg-muted/60'
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        tabIndex={-1}
                        className="pointer-events-none h-3.5 w-3.5"
                      />
                      <span className="truncate text-xs font-medium">{field.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Filter Panel ───────────────────────────────────────────────────────────

function FilterPanel({
  filters,
  onChange,
  module,
  moduleFields = [],
}: {
  filters: ReportFilters;
  onChange: (f: ReportFilters) => void;
  module: ModuleType;
  moduleFields?: FieldDef[];
}) {
  const { data: meta } = useReportMetadata();
  const set = (key: keyof ReportFilters, val: any) => onChange({ ...filters, [key]: val });
  const statusOptions = STATUS_OPTIONS[module] ?? [];

  // Quick Date Preset Handler
  const applyDatePreset = (preset: string) => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    let from: string | undefined;
    let to: string | undefined;

    if (preset === 'today') {
      from = formatDate(today);
      to = formatDate(today);
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      from = formatDate(y);
      to = formatDate(y);
    } else if (preset === 'this_week') {
      const first = new Date(today);
      first.setDate(first.getDate() - first.getDay());
      from = formatDate(first);
      to = formatDate(today);
    } else if (preset === 'this_month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      from = formatDate(first);
      to = formatDate(today);
    } else if (preset === 'last_month') {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      from = formatDate(first);
      to = formatDate(last);
    } else if (preset === 'this_year') {
      const first = new Date(today.getFullYear(), 0, 1);
      from = formatDate(first);
      to = formatDate(today);
    }

    onChange({ ...filters, fromDate: from, toDate: to });
  };

  // Custom condition handlers
  const customConditions: CustomCondition[] = filters.customConditions || [];

  const addCustomCondition = () => {
    const defaultField = moduleFields[0]?.key || '';
    const newCond: CustomCondition = {
      fieldKey: defaultField,
      operator: 'equals',
      value: '',
    };
    set('customConditions', [...customConditions, newCond]);
  };

  const updateCustomCondition = (index: number, updated: Partial<CustomCondition>) => {
    const next = [...customConditions];
    next[index] = { ...next[index], ...updated };
    set('customConditions', next);
  };

  const removeCustomCondition = (index: number) => {
    const next = customConditions.filter((_, i) => i !== index);
    set('customConditions', next.length > 0 ? next : undefined);
  };

  return (
    <div className="space-y-4">
      {/* ── Company / Sub-Company Filter ──────────────────────────────────── */}
      <div>
        <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Company / Sub-Company</label>
        <Select
          value={
            filters.companyId
              ? String(filters.companyId)
              : filters.companies && filters.companies.length > 0
              ? String(filters.companies[0])
              : 'all'
          }
          onValueChange={(v) => {
            const val = v === 'all' ? undefined : Number(v);
            onChange({ ...filters, companyId: val, companies: val ? [val] : undefined });
          }}
        >
          <SelectTrigger className="h-9 font-medium">
            <SelectValue placeholder="All Companies (Active Switching)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies (or Active Switching)</SelectItem>
            {(meta?.companies || []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                🏢 {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Quick Date Presets ───────────────────────────────────────────── */}
      <div>
        <label className={cn(SIGNATURE_LABEL, 'mb-1.5 block')}>Quick Date Presets</label>
        <div className="flex flex-wrap gap-1">
          {[
            { key: 'today', label: 'Today' },
            { key: 'yesterday', label: 'Yesterday' },
            { key: 'this_week', label: 'This Week' },
            { key: 'this_month', label: 'This Month' },
            { key: 'last_month', label: 'Last Month' },
            { key: 'this_year', label: 'This Year' },
          ].map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyDatePreset(p.key)}
              className="rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-[10px] font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Date Range ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>From date</label>
          <Input
            type="date"
            value={filters.fromDate || ''}
            onChange={(e) => set('fromDate', e.target.value || undefined)}
            className="h-9 text-xs"
          />
        </div>
        <div>
          <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>To date</label>
          <Input
            type="date"
            value={filters.toDate || ''}
            onChange={(e) => set('toDate', e.target.value || undefined)}
            className="h-9 text-xs"
          />
        </div>
      </div>

      {/* ── Status Filter ───────────────────────────────────────────────── */}
      <div>
        <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Status</label>
        <Select
          value={filters.status || 'all'}
          onValueChange={(v) => set('status', v === 'all' ? undefined : v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Department Filter ───────────────────────────────────────────── */}
      <div>
        <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Department</label>
        <Select
          value={
            filters.departments && filters.departments.length > 0
              ? String(filters.departments[0])
              : 'all'
          }
          onValueChange={(v) => set('departments', v === 'all' ? undefined : [Number(v)])}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {(meta?.departments || []).map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Location / Branch Filter ───────────────────────────────────── */}
      <div>
        <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Location / Branch</label>
        <Select
          value={
            filters.locations && filters.locations.length > 0
              ? String(filters.locations[0])
              : 'all'
          }
          onValueChange={(v) => set('locations', v === 'all' ? undefined : [Number(v)])}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {(meta?.locations || []).map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Employee Filter ────────────────────────────────────────────── */}
      <div>
        <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Specific Employee</label>
        <Select
          value={
            filters.employees && filters.employees.length > 0
              ? String(filters.employees[0])
              : 'all'
          }
          onValueChange={(v) => set('employees', v === 'all' ? undefined : [Number(v)])}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {(meta?.employees || []).map((e) => (
              <SelectItem key={e.id} value={String(e.id)}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Leave Type Filter (Module === 'leave') ────────────────────── */}
      {module === 'leave' && (
        <div>
          <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Leave Type</label>
          <Select
            value={
              filters.leaveTypes && filters.leaveTypes.length > 0
                ? String(filters.leaveTypes[0])
                : 'all'
            }
            onValueChange={(v) => set('leaveTypes', v === 'all' ? undefined : [Number(v)])}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All Leave Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leave Types</SelectItem>
              {(meta?.leaveTypes || []).map((lt) => (
                <SelectItem key={lt.id} value={String(lt.id)}>
                  {lt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Salary Range Filter (Module === 'payroll') ─────────────────── */}
      {module === 'payroll' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Min Net Salary</label>
            <Input
              type="number"
              placeholder="0"
              value={filters.minSalary || ''}
              onChange={(e) => set('minSalary', e.target.value || undefined)}
              className="h-9 text-xs"
            />
          </div>
          <div>
            <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Max Net Salary</label>
            <Input
              type="number"
              placeholder="500000"
              value={filters.maxSalary || ''}
              onChange={(e) => set('maxSalary', e.target.value || undefined)}
              className="h-9 text-xs"
            />
          </div>
        </div>
      )}

      {/* ── Employment Type & Gender Filters (Module === 'employee') ────── */}
      {module === 'employee' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Employment Type</label>
            <Select
              value={filters.employmentType || 'all'}
              onValueChange={(v) => set('employmentType', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Gender</label>
            <Select
              value={filters.gender || 'all'}
              onValueChange={(v) => set('gender', v === 'all' ? undefined : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Genders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ── Custom Field Rules / Filter Builder ──────────────────────── */}
      <Separator className="my-2 bg-border/60" />
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={cn(SIGNATURE_LABEL, 'flex items-center gap-1 text-foreground')}>
            <SlidersHorizontal className="h-3 w-3 text-primary" /> Custom Filter Rules
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addCustomCondition}
            className="h-7 gap-1 px-2 text-[10px] font-bold"
          >
            <Plus className="h-3 w-3 text-primary" /> Add Condition
          </Button>
        </div>

        {customConditions.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic bg-muted/20 p-2.5 rounded-lg border border-dashed border-border/60">
            No custom rules added. Click "+ Add Condition" to filter by any specific field.
          </p>
        ) : (
          <div className="space-y-2">
            {customConditions.map((cond, i) => (
              <div key={i} className="rounded-lg border border-border/70 bg-muted/30 p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground">Rule #{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeCustomCondition(i)}
                    className="text-muted-foreground hover:text-rose-600 transition-colors p-0.5 rounded"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Field dropdown */}
                <Select
                  value={cond.fieldKey}
                  onValueChange={(fk) => updateCustomCondition(i, { fieldKey: fk })}
                >
                  <SelectTrigger className="h-8 text-xs bg-card">
                    <SelectValue placeholder="Select Field" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {moduleFields.map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label} ({f.group})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator dropdown */}
                <div className="grid grid-cols-2 gap-1.5">
                  <Select
                    value={cond.operator}
                    onValueChange={(op: any) => updateCustomCondition(i, { operator: op })}
                  >
                    <SelectTrigger className="h-8 text-xs bg-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Equals (=)</SelectItem>
                      <SelectItem value="not_equals">Not Equals (!=)</SelectItem>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="starts_with">Starts With</SelectItem>
                      <SelectItem value="greater_than">Greater Than (&gt;)</SelectItem>
                      <SelectItem value="less_than">Less Than (&lt;)</SelectItem>
                      <SelectItem value="greater_than_or_equal">Greater or Equal (&gt;=)</SelectItem>
                      <SelectItem value="less_than_or_equal">Less or Equal (&lt;=)</SelectItem>
                      <SelectItem value="is_empty">Is Empty</SelectItem>
                      <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Value input if operator requires value */}
                  {cond.operator !== 'is_empty' && cond.operator !== 'is_not_empty' && (
                    <Input
                      placeholder="Value..."
                      value={cond.value ?? ''}
                      onChange={(e) => updateCustomCondition(i, { value: e.target.value })}
                      className="h-8 text-xs bg-card"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'];

// ─── Report Visualization Panel ─────────────────────────────────────────────

function ReportVisualizationPanel({ result }: { result: ReportResult }) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  // Categorize columns for frontend validation & selectors
  const categoryCols = useMemo(
    () => result.columns.filter((c) => c.type === 'string' || c.type === 'date'),
    [result.columns]
  );

  const metricCols = useMemo(
    () => result.columns.filter((c) => c.type === 'number' || c.type === 'currency' || c.type === 'minutes'),
    [result.columns]
  );

  const [categoryKey, setCategoryKey] = useState<string>(() => categoryCols[0]?.key || '');
  const [metricKey, setMetricKey] = useState<string>(() => metricCols[0]?.key || '__count');

  // Auto-sync selection if columns change
  useEffect(() => {
    if (categoryCols.length > 0 && !categoryCols.some((c) => c.key === categoryKey)) {
      setCategoryKey(categoryCols[0].key);
    }
    if (metricCols.length > 0 && metricKey !== '__count' && !metricCols.some((c) => c.key === metricKey)) {
      setMetricKey(metricCols[0].key);
    }
  }, [categoryCols, metricCols, categoryKey, metricKey]);

  // Frontend Validation
  const validationError = useMemo(() => {
    if (result.rows.length === 0) return 'No report data available to visualize.';
    if (categoryCols.length === 0) {
      return 'Validation Error: Visualization requires at least 1 Category column (e.g. Department, Status, Name, Company). Add a Category column in Configure.';
    }
    if (!categoryKey) {
      return 'Please select a Category field for X-Axis / Grouping.';
    }
    return null;
  }, [result.rows, categoryCols, categoryKey]);

  // Aggregate Data
  const chartData = useMemo(() => {
    if (validationError || !categoryKey) return [];

    const map = new Map<string, number>();

    for (const row of result.rows) {
      const camelCatKey = categoryKey.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
      const catVal = String(row[categoryKey] !== undefined ? row[categoryKey] : (row[camelCatKey] ?? 'Unknown'));

      let numVal = 1;
      if (metricKey !== '__count') {
        const camelMetKey = metricKey.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        const rawNum = row[metricKey] !== undefined ? row[metricKey] : row[camelMetKey];
        numVal = Number(rawNum) || 0;
      }

      map.set(catVal, (map.get(catVal) || 0) + numVal);
    }

    return Array.from(map.entries()).map(([name, val]) => ({
      name,
      value: Math.round(val * 100) / 100,
    })).slice(0, 15);
  }, [result.rows, categoryKey, metricKey, validationError]);

  const metLabel = metricKey === '__count' ? 'Record Count' : metricCols.find((c) => c.key === metricKey)?.label || 'Value';

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs">
      {/* Panel Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-600 dark:text-indigo-400">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-foreground">Data Analytics Visualization</h3>
            <p className="text-[10px] text-muted-foreground">Interactive visual charts for report data</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart Type Selector */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
            <button
              onClick={() => setChartType('bar')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all',
                chartType === 'bar' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <BarChart3 className="h-3 w-3 text-indigo-500" /> Bar Chart
            </button>
            <button
              onClick={() => setChartType('line')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all',
                chartType === 'line' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LineChartIcon className="h-3 w-3 text-emerald-500" /> Line Chart
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all',
                chartType === 'pie' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <PieChartIcon className="h-3 w-3 text-amber-500" /> Donut Chart
            </button>
          </div>

          {/* Category Dropdown */}
          <Select value={categoryKey} onValueChange={setCategoryKey}>
            <SelectTrigger className="h-8 text-xs font-medium w-36 bg-card">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categoryCols.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Metric Dropdown */}
          <Select value={metricKey} onValueChange={setMetricKey}>
            <SelectTrigger className="h-8 text-xs font-medium w-36 bg-card">
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__count">🔢 Record Count</SelectItem>
              {metricCols.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  💰 {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Validation Warning Alert */}
      {validationError ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="font-medium">{validationError}</span>
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-xs text-muted-foreground italic">
          No data available for selected category.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" stroke="currentColor" className="text-[10px] text-muted-foreground" angle={-15} textAnchor="end" />
                <YAxis stroke="currentColor" className="text-[10px] text-muted-foreground" />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-border bg-card p-2 shadow-md text-xs">
                          <p className="font-bold text-foreground">{payload[0].payload.name}</p>
                          <p className="text-primary font-mono">{metLabel}: {payload[0].value?.toLocaleString()}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="name" stroke="currentColor" className="text-[10px] text-muted-foreground" angle={-15} textAnchor="end" />
                <YAxis stroke="currentColor" className="text-[10px] text-muted-foreground" />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-border bg-card p-2 shadow-md text-xs">
                          <p className="font-bold text-foreground">{payload[0].payload.name}</p>
                          <p className="text-emerald-600 font-mono">{metLabel}: {payload[0].value?.toLocaleString()}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            ) : (
              <PieChart>
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-border bg-card p-2 shadow-md text-xs">
                          <p className="font-bold text-foreground">{payload[0].payload.name}</p>
                          <p className="text-amber-600 font-mono">{metLabel}: {payload[0].value?.toLocaleString()}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Report Table ────────────────────────────────────────────────────────────

function ReportTable({ result, isMasked }: { result: ReportResult; isMasked?: boolean }) {
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const totalPages = Math.ceil(result.rows.length / pageSize);
  const pageRows = result.rows.slice(page * pageSize, (page + 1) * pageSize);

  // Reset to the first page whenever a new result is loaded.
  useEffect(() => setPage(0), [result]);

  const maskValue = (val: any, type: string) => {
    if (val === null || val === undefined) return '—';
    const s = String(val);
    if (type === 'currency' || type === 'number') return '₹ ••••••';
    if (s.includes('@')) {
      const parts = s.split('@');
      return `${parts[0].charAt(0)}••••@${parts[1]}`;
    }
    if (s.length > 4) {
      return `••••••••${s.slice(-4)}`;
    }
    return '••••••••';
  };

  const formatCell = (row: Record<string, any>, col: ReportColumn) => {
    const camelKey = col.key.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
    const value = row[col.key] !== undefined ? row[col.key] : row[camelKey];

    if (value === null || value === undefined) return <span className="text-muted-foreground/40">—</span>;

    if (isMasked && col.isSensitive) {
      return (
        <span className="font-mono text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[11px]">
          {maskValue(value, col.type)}
        </span>
      );
    }

    if (col.type === 'boolean') {
      return value ? (
        <span className="text-[10px] font-bold text-emerald-600">YES</span>
      ) : (
        <span className="text-[10px] font-bold text-rose-500">NO</span>
      );
    }
    if (col.type === 'minutes') {
      const n = Number(value);
      if (!n) return '00:00';
      const h = Math.floor(n / 60);
      const m = n % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    if (col.type === 'time') {
      if (typeof value === 'string' && value.includes('T')) {
        return value.split('T')[1].split('.')[0];
      }
      return String(value);
    }
    if (col.type === 'date') {
      if (typeof value === 'string' && value.includes('T')) {
        return value.split('T')[0];
      }
      return String(value);
    }
    if (col.type === 'currency') {
      const n = Number(value);
      return isNaN(n) ? String(value) : `₹ ${n.toLocaleString()}`;
    }
    if (col.type === 'number') {
      const n = Number(value);
      return isNaN(n) ? String(value) : n.toLocaleString();
    }
    return String(value);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="w-full overflow-hidden rounded-xl border border-border/80 bg-card shadow-2xs">
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40">
                <th className={cn('w-12 px-3 py-2.5 text-center', SIGNATURE_LABEL)}>#</th>
                {result.columns.map((col) => (
                  <th key={col.key} className={cn('whitespace-nowrap px-3 py-2.5', SIGNATURE_LABEL)}>
                    {col.label}
                    {col.isSensitive && <Lock className="h-3 w-3 inline text-amber-500 ml-1.5 shrink-0" />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {pageRows.map((row, idx) => (
                <tr key={idx} className="transition-colors hover:bg-muted/30">
                  <td className="px-3 py-2 text-center text-[11px] font-bold text-muted-foreground">
                    {page * pageSize + idx + 1}
                  </td>
                  {result.columns.map((col) => (
                    <td key={col.key} className="whitespace-nowrap px-3 py-2 text-xs font-medium text-foreground">
                      {formatCell(row, col)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/70 bg-muted/20 px-4 py-2.5">
            <span className="text-xs text-muted-foreground">
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, result.rows.length)} of{' '}
              {result.rows.length.toLocaleString()} rows
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="px-2 text-xs font-bold">
                {page + 1} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Templates Dialog ─────────────────────────────────────────────────────

function TemplatesDialog({
  open,
  onOpenChange,
  templates,
  loading,
  editingId,
  onLoad,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: SavedTemplate[];
  loading: boolean;
  editingId?: number;
  onLoad: (t: SavedTemplate) => void;
  onDelete: (id: number, name: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-4 w-4 text-primary" />
            Saved templates
          </DialogTitle>
          <DialogDescription>
            Select a template to load and run it instantly. Loading opens it for editing.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <CleanLoader label="Loading templates…" />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6 text-muted-foreground" />}
            title="No saved templates yet"
            description="Build a report, then use Save to reuse it later."
          />
        ) : (
          <div className="custom-scrollbar grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {templates.map((t) => {
              const mod = MODULES.find((m) => m.key === t.module);
              const active = editingId === t.id;
              return (
                <div
                  key={t.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onLoad(t)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onLoad(t);
                    }
                  }}
                  className={cn(
                    'group cursor-pointer rounded-xl border p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'border-amber-500/60 bg-amber-500/5'
                      : 'border-border/70 bg-card hover:border-primary/40 hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold text-foreground">{t.name}</p>
                        {active && (
                          <Badge className="border-amber-500/30 bg-amber-500/15 px-1.5 py-0 text-[9px] text-amber-700 dark:text-amber-300">
                            Active
                          </Badge>
                        )}
                      </div>
                      {t.description && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-1.5">
                        <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[9px] capitalize">
                          {mod?.icon} {t.module}
                        </Badge>
                        {(t.is_shared || t.isShared) && (
                          <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[9px]">
                            <Share2 className="h-2.5 w-2.5" />
                            Shared
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Delete ${t.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(t.id, t.name);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          e.preventDefault();
                          onDelete(t.id, t.name);
                        }
                      }}
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Save / Edit Template Dialog ────────────────────────────────────────────

function SaveTemplateModal({
  editingTemplate,
  onClose,
  onSaveNew,
  onUpdateExisting,
  isSaving,
}: {
  editingTemplate: SavedTemplate | null;
  onClose: () => void;
  onSaveNew: (name: string, desc: string, shared: boolean) => void;
  onUpdateExisting: (id: number, name: string, desc: string, shared: boolean) => void;
  isSaving: boolean;
}) {
  const [saveMode, setSaveMode] = useState<'update' | 'new'>(editingTemplate ? 'update' : 'new');
  const [name, setName] = useState(editingTemplate?.name || '');
  const [desc, setDesc] = useState(editingTemplate?.description || '');
  const [shared, setShared] = useState(editingTemplate?.is_shared || editingTemplate?.isShared || false);

  const handleConfirm = () => {
    if (!name.trim()) return;
    if (saveMode === 'update' && editingTemplate) {
      onUpdateExisting(editingTemplate.id, name.trim(), desc, shared);
    } else {
      onSaveNew(name.trim(), desc, shared);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Save className="h-4 w-4 text-primary" />
            {editingTemplate ? 'Manage report template' : 'Save report template'}
          </DialogTitle>
          <DialogDescription>
            Store the current fields and filters so you can rerun this report later.
          </DialogDescription>
        </DialogHeader>

        {editingTemplate && (
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-muted/50 p-1">
            <button
              onClick={() => { setSaveMode('update'); setName(editingTemplate.name); }}
              className={cn(
                'truncate rounded-md py-1.5 text-xs font-bold transition-all',
                saveMode === 'update' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Update “{editingTemplate.name}”
            </button>
            <button
              onClick={() => { setSaveMode('new'); setName(`${editingTemplate.name} (Copy)`); }}
              className={cn(
                'rounded-md py-1.5 text-xs font-bold transition-all',
                saveMode === 'new' ? 'bg-card text-primary shadow-xs' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Save as new
            </button>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Template name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Attendance Summary"
              className="h-9 text-xs font-medium"
              autoFocus
            />
          </div>
          <div>
            <label className={cn(SIGNATURE_LABEL, 'mb-1 block')}>Description (optional)</label>
            <Textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What does this report show?"
              rows={2}
              className="resize-none text-xs font-medium"
            />
          </div>
          <label className="flex cursor-pointer select-none items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            <span className="text-xs font-medium text-foreground">Share with entire organization</span>
            <Switch checked={shared} onCheckedChange={setShared} />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!name.trim() || isSaving}
            isLoading={isSaving}
            className="h-9 gap-1.5 text-xs font-bold"
          >
            {!isSaving && <Save className="h-3.5 w-3.5" />}
            {saveMode === 'update' ? 'Update template' : 'Save template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ReportEnginePage() {
  // State
  const [selectedModule, setSelectedModule] = useState<ModuleType>('all');
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ReportFilters>({});
  const [result, setResult] = useState<ReportResult | null>(null);
  const [reportName, setReportName] = useState('Custom Report');
  const [fieldSearch, setFieldSearch] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [configTab, setConfigTab] = useState<'fields' | 'filters'>('fields');
  const [isMasked, setIsMasked] = useState(false);
  const [showChart, setShowChart] = useState(true);

  // Currently loaded/active template being edited
  const [editingTemplate, setEditingTemplate] = useState<SavedTemplate | null>(null);

  // Hooks
  const { data: allFields = {} as Record<ModuleType, FieldDef[]>, isLoading: fieldsLoading } = useReportFields();
  const runReport = useRunReport();
  const { data: templates = [], isLoading: templatesLoading } = useReportTemplates();
  const saveTemplate = useSaveTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();

  const allFieldsFlat = useMemo<FieldDef[]>(() => {
    return Object.values(allFields).flat();
  }, [allFields]);

  const moduleFields = useMemo<FieldDef[]>(() => {
    if (selectedModule === 'all') {
      return allFieldsFlat;
    }
    return allFields[selectedModule] || [];
  }, [allFields, selectedModule, allFieldsFlat]);

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter(
        (v) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
      ).length,
    [filters]
  );

  const handleModuleChange = (m: ModuleType) => {
    setSelectedModule(m);
    // PRESERVE selectedFields so users can pick fields across Attendance, Leave, Payroll & Employee!
  };

  const toggleField = useCallback((key: string) => {
    setSelectedFields((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }, []);

  const handleSelectAll = () => {
    setSelectedFields((prev) => {
      const n = new Set(prev);
      moduleFields.forEach((f) => n.add(f.key));
      return n;
    });
  };

  const handleClearFields = () => {
    setSelectedFields(new Set());
  };

  const handleRun = async () => {
    if (selectedFields.size === 0) {
      toast.error('Select at least one field to run the report');
      return;
    }

    try {
      const data = await runReport.mutateAsync({
        module: selectedModule,
        fields: Array.from(selectedFields),
        filters,
      });
      setResult(data);
      if (data.total === 0) {
        toast.info('Report ran successfully — no records matched the filters');
      } else {
        toast.success(`Report generated — ${data.total} row${data.total !== 1 ? 's' : ''} found`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to run report');
    }
  };

  const handleLoadTemplate = (t: SavedTemplate) => {
    const fieldsRaw = t.selectedFields ?? t.selected_fields;
    const fields: string[] = Array.isArray(fieldsRaw)
      ? fieldsRaw
      : (typeof fieldsRaw === 'string' ? JSON.parse(fieldsRaw) : []);

    const filtersRaw = t.filters;
    const fltrs = filtersRaw
      ? (typeof filtersRaw === 'string' ? JSON.parse(filtersRaw) : filtersRaw)
      : {};

    setSelectedModule(t.module);
    setSelectedFields(new Set(fields));
    setFilters(fltrs);
    setReportName(t.name);
    setEditingTemplate({
      ...t,
      selected_fields: fields,
      selectedFields: fields,
      filters: fltrs,
    });
    setResult(null);
    setShowTemplates(false);
    toast.success(`Loaded template: “${t.name}” — add or remove columns as needed`);

    // Auto-run report upon loading template
    if (fields.length > 0) {
      runReport.mutateAsync({
        module: t.module,
        fields,
        filters: fltrs,
      }).then(setResult).catch(() => {});
    }
  };

  const handleSaveNew = async (name: string, desc: string, shared: boolean) => {
    try {
      const saved = await saveTemplate.mutateAsync({
        name,
        description: desc,
        module: selectedModule,
        selectedFields: Array.from(selectedFields),
        filters,
        isShared: shared,
      });
      toast.success('Template saved successfully');
      setShowSaveModal(false);
      const newT: SavedTemplate = {
        id: saved.id,
        uuid: '',
        name,
        description: desc,
        module: selectedModule,
        is_shared: shared,
        isShared: shared,
        created_by: 0,
        updated_at: new Date().toISOString(),
        selected_fields: Array.from(selectedFields),
        selectedFields: Array.from(selectedFields),
        filters,
      };
      setEditingTemplate(newT);
      handleRun();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    }
  };

  const handleUpdateExisting = async (id: number, name: string, desc: string, shared: boolean) => {
    try {
      await updateTemplate.mutateAsync({
        id,
        name,
        description: desc,
        module: selectedModule,
        selectedFields: Array.from(selectedFields),
        filters,
        isShared: shared,
      });
      toast.success(`Updated template “${name}”`);
      setShowSaveModal(false);
      setEditingTemplate((prev) => prev ? {
        ...prev,
        name,
        description: desc,
        is_shared: shared,
        isShared: shared,
        selected_fields: Array.from(selectedFields),
        selectedFields: Array.from(selectedFields),
        filters,
      } : null);
      handleRun();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update template');
    }
  };

  const handleQuickUpdate = async () => {
    if (!editingTemplate) return;
    try {
      await updateTemplate.mutateAsync({
        id: editingTemplate.id,
        name: editingTemplate.name,
        description: editingTemplate.description,
        module: selectedModule,
        selectedFields: Array.from(selectedFields),
        filters,
        isShared: editingTemplate.is_shared || editingTemplate.isShared || false,
      });
      toast.success(`Saved changes to template “${editingTemplate.name}”`);
      handleRun();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update template');
    }
  };

  const handleClearEditingTemplate = () => {
    setEditingTemplate(null);
    toast.info('Exited template edit mode');
  };

  const handleDeleteTemplate = async (id: number, name: string) => {
    if (!await window.appConfirm(`Delete template “${name}”?`)) return;
    try {
      await deleteTemplate.mutateAsync(id);
      if (editingTemplate?.id === id) setEditingTemplate(null);
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const selectedModuleInfo = MODULES.find((m) => m.key === selectedModule)!;

  return (
    <div className="flex h-full select-none flex-col bg-background">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-card/60 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold leading-none tracking-tight text-foreground">Report Engine</h1>
              {editingTemplate && (
                <Badge className="hidden gap-1 border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300 md:inline-flex">
                  <Edit3 className="h-3 w-3" />
                  Editing
                </Badge>
              )}
            </div>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              Build custom reports from any module — pick fields, filter, and run.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowTemplates(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Templates</span>
            {templates.length > 0 && (
              <Badge variant="secondary" className="h-4 min-w-[16px] justify-center px-1 text-[10px] leading-none">
                {templates.length}
              </Badge>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowConfig(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <Settings2 className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Configure</span>
            {selectedFields.size > 0 && (
              <Badge className="h-4 min-w-[16px] justify-center px-1 text-[10px] leading-none">
                {selectedFields.size}
              </Badge>
            )}
          </Button>

          <Separator orientation="vertical" className="mx-0.5 hidden h-6 sm:block" />

          {editingTemplate && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleQuickUpdate}
              isLoading={updateTemplate.isPending}
              disabled={selectedFields.size === 0}
              className="h-8 gap-1.5 border-amber-500/30 bg-amber-500/5 text-xs font-bold text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
            >
              {!updateTemplate.isPending && <CheckCircle2 className="h-3.5 w-3.5" />}
              <span className="hidden md:inline">Save changes</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSaveModal(true)}
            disabled={selectedFields.size === 0}
            className="h-8 gap-1.5 text-xs"
          >
            <Save className="h-3.5 w-3.5 text-primary" />
            <span className="hidden md:inline">{editingTemplate ? 'Save as…' : 'Save'}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => result && exportToCSV(result, reportName)}
            disabled={!result || result.rows.length === 0}
            className="h-8 gap-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            <span className="hidden md:inline">CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={handleRun}
            isLoading={runReport.isPending}
            disabled={selectedFields.size === 0}
            className="h-8 gap-1.5 text-xs font-bold"
          >
            {!runReport.isPending && <Play className="h-3.5 w-3.5" />}
            Run
          </Button>
        </div>
      </header>



      {/* ── Results (full width) ──────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {!result ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              className="w-full max-w-md"
              icon={<FileSpreadsheet className="h-6 w-6 text-muted-foreground" />}
              title="No report generated yet"
              description={
                selectedFields.size === 0
                  ? 'Open Configure to choose a module, pick fields, and set filters.'
                  : `${selectedFields.size} field${selectedFields.size !== 1 ? 's' : ''} selected — run the report to see results.`
              }
              action={
                selectedFields.size === 0 ? (
                  <Button size="sm" onClick={() => setShowConfig(true)} className="gap-1.5 font-bold">
                    <Settings2 className="h-4 w-4" />
                    Configure report
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleRun}
                    isLoading={runReport.isPending}
                    className="gap-1.5 font-bold"
                  >
                    {!runReport.isPending && <Play className="h-4 w-4" />}
                    Run report
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <>
            {/* Result header */}
            <div className="flex h-14 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-card/50 px-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-2 flex-wrap">
                <Badge className={cn('gap-1 border px-2 py-0.5 text-[10px] font-bold capitalize', selectedModuleInfo.color)}>
                  {selectedModuleInfo.icon} {selectedModuleInfo.label}
                </Badge>
                <Badge className="border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  {result.total.toLocaleString()} rows
                </Badge>
                <Badge variant="secondary" className="px-2 py-0.5 text-[10px] font-bold">
                  {result.columns.length} cols
                </Badge>

                {/* Save button placed directly next to the badges */}
                {editingTemplate ? (
                  <div className="flex items-center gap-1.5 ml-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleQuickUpdate}
                      isLoading={updateTemplate.isPending}
                      disabled={selectedFields.size === 0}
                      className="h-7 gap-1 border-amber-500/30 bg-amber-500/10 px-2.5 text-[11px] font-bold text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
                    >
                      {!updateTemplate.isPending && <CheckCircle2 className="h-3 w-3" />}
                      Save changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowSaveModal(true)}
                      disabled={selectedFields.size === 0}
                      className="h-7 gap-1 px-2.5 text-[11px] font-bold"
                    >
                      <Save className="h-3 w-3 text-primary" />
                      Save as…
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSaveModal(true)}
                    disabled={selectedFields.size === 0}
                    className="h-7 gap-1 ml-1 px-2.5 text-[11px] font-bold"
                  >
                    <Save className="h-3 w-3 text-primary" />
                    Save template
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Enable / Disable Visualization Switch */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowChart(!showChart)}
                  className={cn(
                    'h-8 gap-1.5 text-xs font-bold transition-colors',
                    showChart
                      ? 'border-indigo-400 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-extrabold'
                      : 'text-muted-foreground'
                  )}
                  title={showChart ? 'Click to hide chart visualization' : 'Click to show interactive chart visualization'}
                >
                  <BarChart3 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  {showChart ? 'Chart On' : 'Chart Off'}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsMasked(!isMasked)}
                  className={cn(
                    'h-8 gap-1.5 text-xs font-bold transition-colors',
                    isMasked
                      ? 'border-amber-400 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-extrabold'
                      : 'text-muted-foreground'
                  )}
                  title={isMasked ? 'Click to unmask sensitive values' : 'Click to mask sensitive salary, phone, email, and bank details'}
                >
                  {isMasked ? <EyeOff className="h-3.5 w-3.5 text-amber-600 shrink-0" /> : <Eye className="h-3.5 w-3.5 shrink-0" />}
                  {isMasked ? 'Masked' : 'Mask Data'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 gap-1 text-xs text-muted-foreground"
                  onClick={() => setResult(null)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleRun}
                  isLoading={runReport.isPending}
                >
                  {!runReport.isPending && <Play className="h-3.5 w-3.5" />}
                  Re-run
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => exportToCSV(result, reportName)}
                  disabled={result.rows.length === 0}
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
              </div>
            </div>

            {/* Table / Visualization / inner empty */}
            <div className="custom-scrollbar flex-1 overflow-y-auto bg-background p-4 sm:p-6 space-y-4">
              {showChart && <ReportVisualizationPanel result={result} />}
              {result.rows.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
                  <Table2 className="h-10 w-10 text-muted-foreground/20" />
                  <p className="text-sm font-bold text-muted-foreground">No records matched the filters</p>
                  <p className="text-xs text-muted-foreground">Try adjusting the date range or status filter</p>
                  <Button size="sm" variant="outline" className="mt-1 gap-1.5 text-xs" onClick={() => setShowConfig(true)}>
                    <Settings2 className="h-3.5 w-3.5" />
                    Adjust filters
                  </Button>
                </div>
              ) : (
                <ReportTable result={result} isMasked={isMasked} />
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Configure Drawer ──────────────────────────────────────────────── */}
      <Drawer
        open={showConfig}
        onClose={() => setShowConfig(false)}
        title="Configure report"
        icon={Settings2}
        footer={
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              {selectedFields.size} field{selectedFields.size !== 1 ? 's' : ''} selected
            </span>
            <Button
              size="sm"
              onClick={() => { handleRun(); setShowConfig(false); }}
              isLoading={runReport.isPending}
              disabled={selectedFields.size === 0}
              className="h-9 gap-1.5 px-4 text-xs font-bold"
            >
              {!runReport.isPending && <Play className="h-3.5 w-3.5" />}
              Run report
            </Button>
          </div>
        }
      >
        {/* Module selector */}
        <div className="border-b border-border/60 p-3">
          <p className={cn(SIGNATURE_LABEL, 'mb-1.5')}>Module</p>
          <div className="grid grid-cols-2 gap-1.5">
            {MODULES.map((m) => (
              <button
                key={m.key}
                onClick={() => handleModuleChange(m.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-bold transition-all',
                  selectedModule === m.key
                    ? m.color + ' shadow-sm'
                    : 'border-border/60 bg-muted/40 text-muted-foreground hover:border-border'
                )}
              >
                <span>{m.icon}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fields / Filters tabs */}
        <Tabs value={configTab} onValueChange={(v) => setConfigTab(v as 'fields' | 'filters')} className="p-3">
          <TabsList className="grid h-9 w-full grid-cols-2">
            <TabsTrigger value="fields" className="gap-1.5 text-xs">
              <Columns3 className="h-3.5 w-3.5" />
              Fields
              {selectedFields.size > 0 && (
                <Badge className="h-4 min-w-[16px] justify-center px-1 text-[10px] leading-none">
                  {selectedFields.size}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="filters" className="gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <Badge className="h-4 min-w-[16px] justify-center px-1 text-[10px] leading-none">
                  {activeFilterCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fields" className="mt-3 space-y-2 focus-visible:outline-none">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={fieldSearch}
                onChange={(e) => setFieldSearch(e.target.value)}
                placeholder="Search fields…"
                className="h-9 pl-8 text-xs"
              />
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <button onClick={handleSelectAll} className="font-bold text-primary hover:underline">
                  Select all
                </button>
                <span className="text-border">|</span>
                <button
                  onClick={handleClearFields}
                  className="font-bold text-muted-foreground hover:text-foreground hover:underline"
                >
                  Clear
                </button>
              </div>
              <span className="font-medium text-muted-foreground">
                {selectedFields.size} / {moduleFields.length}
              </span>
            </div>

            {fieldsLoading ? (
              <CleanLoader label="Loading fields…" />
            ) : (
              <FieldPicker
                fields={moduleFields}
                selectedFields={selectedFields}
                onToggle={toggleField}
                searchQuery={fieldSearch}
              />
            )}
          </TabsContent>

          <TabsContent value="filters" className="mt-3 focus-visible:outline-none">
            <FilterPanel filters={filters} onChange={setFilters} module={selectedModule} moduleFields={allFieldsFlat} />
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 h-8 w-full gap-1 text-xs text-muted-foreground"
                onClick={() => setFilters({})}
              >
                <RotateCcw className="h-3 w-3" />
                Clear filters
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </Drawer>

      {/* ── Templates Dialog ──────────────────────────────────────────────── */}
      <TemplatesDialog
        open={showTemplates}
        onOpenChange={setShowTemplates}
        templates={templates}
        loading={templatesLoading}
        editingId={editingTemplate?.id}
        onLoad={handleLoadTemplate}
        onDelete={handleDeleteTemplate}
      />

      {/* ── Save / Edit Dialog ────────────────────────────────────────────── */}
      {showSaveModal && (
        <SaveTemplateModal
          editingTemplate={editingTemplate}
          onClose={() => setShowSaveModal(false)}
          onSaveNew={handleSaveNew}
          onUpdateExisting={handleUpdateExisting}
          isSaving={saveTemplate.isPending || updateTemplate.isPending}
        />
      )}
    </div>
  );
}
