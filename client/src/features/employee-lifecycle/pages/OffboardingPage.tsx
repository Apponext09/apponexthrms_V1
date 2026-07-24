import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  UserMinus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  IndianRupee,
  ClipboardList,
  BadgeCheck,
  ShieldCheck,
  Cpu,
  Briefcase,
  FileText,
  Plus,
} from 'lucide-react';

// ─── Types aligned with DB schema ─────────────────────────────────────────────
type ResignationStatus = 'submitted' | 'accepted' | 'rejected' | 'withdrawn';
type ResignationReason =
  | 'better_opportunity'
  | 'salary'
  | 'work_life_balance'
  | 'relocation'
  | 'family_reasons'
  | 'further_studies'
  | 'health_reasons'
  | 'other';
type ClearanceStatus = 'in_progress' | 'cleared' | 'pending';
type SettlementStatus = 'pending' | 'processed' | 'paid';

interface ResignationRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  position: string;
  resignation_date: string;
  last_working_day: string;
  notice_period_days: number;
  status: ResignationStatus;
  reason_for_resignation: string | null;
  reason_category: ResignationReason;
  resignation_letter_url: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  exit_interview_conducted: boolean;
  exit_interview_date: string | null;
  exit_feedback: string | null;
}

interface ExitClearanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  resignation_id: string;
  status: ClearanceStatus;
  clearance_date: string | null;
  // clearance checklist fields from exit_clearance table
  finance_cleared: boolean;
  it_cleared: boolean;
  operations_cleared: boolean;
  security_cleared: boolean;
  equipment_returned: boolean;
  documents_returned: boolean;
  access_revoked: boolean;
  remarks: string | null;
}

interface FinalSettlementRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  resignation_id: string;
  settlement_date: string;
  status: SettlementStatus;
  // financial fields from final_settlement table
  final_salary: number | null;
  gratuity: number | null;
  leave_encashment: number | null;
  bonus: number | null;
  other_benefits: number | null;
  deductions: number | null;
  net_amount: number | null;
  payment_mode: string | null;
  payment_date: string | null;
  transaction_id: string | null;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_RESIGNATIONS: ResignationRecord[] = [
  {
    id: 'res-001',
    employee_id: 'EMP-2021-0055',
    employee_name: 'Kavya Reddy',
    department: 'Engineering',
    position: 'Software Engineer II',
    resignation_date: '2024-07-01',
    last_working_day: '2024-07-31',
    notice_period_days: 30,
    status: 'accepted',
    reason_for_resignation: 'Received a senior role offer at a product company',
    reason_category: 'better_opportunity',
    resignation_letter_url: '/docs/res-001.pdf',
    accepted_by: 'HR Manager',
    accepted_at: '2024-07-03',
    exit_interview_conducted: true,
    exit_interview_date: '2024-07-28',
    exit_feedback: 'Positive experience, would recommend company to others',
  },
  {
    id: 'res-002',
    employee_id: 'EMP-2022-0033',
    employee_name: 'Rajan Tiwari',
    department: 'Sales',
    position: 'Sales Manager',
    resignation_date: '2024-07-10',
    last_working_day: '2024-08-09',
    notice_period_days: 30,
    status: 'submitted',
    reason_for_resignation: null,
    reason_category: 'salary',
    resignation_letter_url: null,
    accepted_by: null,
    accepted_at: null,
    exit_interview_conducted: false,
    exit_interview_date: null,
    exit_feedback: null,
  },
  {
    id: 'res-003',
    employee_id: 'EMP-2020-0019',
    employee_name: 'Sneha Bhat',
    department: 'HR',
    position: 'HR Business Partner',
    resignation_date: '2024-06-15',
    last_working_day: '2024-07-14',
    notice_period_days: 29,
    status: 'accepted',
    reason_for_resignation: 'Relocating to another city due to family reasons',
    reason_category: 'relocation',
    resignation_letter_url: '/docs/res-003.pdf',
    accepted_by: 'HR Head',
    accepted_at: '2024-06-17',
    exit_interview_conducted: true,
    exit_interview_date: '2024-07-10',
    exit_feedback: 'Management support was excellent. Left on good terms.',
  },
  {
    id: 'res-004',
    employee_id: 'EMP-2023-0077',
    employee_name: 'Aryan Gupta',
    department: 'Finance',
    position: 'Finance Analyst',
    resignation_date: '2024-07-20',
    last_working_day: '2024-08-19',
    notice_period_days: 30,
    status: 'submitted',
    reason_for_resignation: 'Pursuing MBA',
    reason_category: 'further_studies',
    resignation_letter_url: null,
    accepted_by: null,
    accepted_at: null,
    exit_interview_conducted: false,
    exit_interview_date: null,
    exit_feedback: null,
  },
];

const MOCK_CLEARANCES: ExitClearanceRecord[] = [
  {
    id: 'clr-001',
    employee_id: 'EMP-2021-0055',
    employee_name: 'Kavya Reddy',
    department: 'Engineering',
    resignation_id: 'res-001',
    status: 'cleared',
    clearance_date: '2024-07-30',
    finance_cleared: true,
    it_cleared: true,
    operations_cleared: true,
    security_cleared: true,
    equipment_returned: true,
    documents_returned: true,
    access_revoked: true,
    remarks: 'All clearances complete. Full & Final initiated.',
  },
  {
    id: 'clr-002',
    employee_id: 'EMP-2020-0019',
    employee_name: 'Sneha Bhat',
    department: 'HR',
    resignation_id: 'res-003',
    status: 'in_progress',
    clearance_date: null,
    finance_cleared: true,
    it_cleared: true,
    operations_cleared: false,
    security_cleared: false,
    equipment_returned: true,
    documents_returned: false,
    access_revoked: true,
    remarks: 'Operations and security clearance pending',
  },
  {
    id: 'clr-003',
    employee_id: 'EMP-2022-0033',
    employee_name: 'Rajan Tiwari',
    department: 'Sales',
    resignation_id: 'res-002',
    status: 'pending',
    clearance_date: null,
    finance_cleared: false,
    it_cleared: false,
    operations_cleared: false,
    security_cleared: false,
    equipment_returned: false,
    documents_returned: false,
    access_revoked: false,
    remarks: null,
  },
];

const MOCK_SETTLEMENTS: FinalSettlementRecord[] = [
  {
    id: 'set-001',
    employee_id: 'EMP-2021-0055',
    employee_name: 'Kavya Reddy',
    department: 'Engineering',
    resignation_id: 'res-001',
    settlement_date: '2024-07-31',
    status: 'paid',
    final_salary: 85000,
    gratuity: 12000,
    leave_encashment: 18500,
    bonus: 5000,
    other_benefits: 2000,
    deductions: 8000,
    net_amount: 114500,
    payment_mode: 'bank_transfer',
    payment_date: '2024-08-05',
    transaction_id: 'TXN-2024-0801',
  },
  {
    id: 'set-002',
    employee_id: 'EMP-2020-0019',
    employee_name: 'Sneha Bhat',
    department: 'HR',
    resignation_id: 'res-003',
    settlement_date: '2024-07-14',
    status: 'processed',
    final_salary: 95000,
    gratuity: 18000,
    leave_encashment: 22000,
    bonus: null,
    other_benefits: null,
    deductions: 5000,
    net_amount: 130000,
    payment_mode: 'bank_transfer',
    payment_date: null,
    transaction_id: null,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const resignationStatusConfig: Record<
  ResignationStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  submitted: {
    label: 'Submitted',
    icon: Clock,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  accepted: {
    label: 'Accepted',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
  withdrawn: {
    label: 'Withdrawn',
    icon: AlertCircle,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

const clearanceStatusConfig: Record<
  ClearanceStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  in_progress: {
    label: 'In Progress',
    icon: AlertCircle,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  cleared: {
    label: 'Cleared',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
};

const settlementStatusConfig: Record<
  SettlementStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  processed: {
    label: 'Processed',
    icon: AlertCircle,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle2,
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
};

const reasonLabels: Record<ResignationReason, string> = {
  better_opportunity: 'Better Opportunity',
  salary: 'Salary',
  work_life_balance: 'Work-Life Balance',
  relocation: 'Relocation',
  family_reasons: 'Family Reasons',
  further_studies: 'Further Studies',
  health_reasons: 'Health Reasons',
  other: 'Other',
};

function StatusBadge<T extends string>({
  status,
  config,
}: {
  status: T;
  config: Record<string, { label: string; icon: React.ElementType; className: string }>;
}) {
  const cfg = config[status];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}
    >
      <cfg.icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function formatCurrency(val: number | null) {
  if (val === null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

// ─── Resignation Card ─────────────────────────────────────────────────────────
function ResignationCard({ record }: { record: ResignationRecord }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center text-sm font-bold text-rose-500 flex-shrink-0">
            {record.employee_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{record.employee_name}</p>
            <p className="text-xs text-muted-foreground">
              {record.position} · {record.department}
            </p>
          </div>
        </div>
        <StatusBadge status={record.status} config={resignationStatusConfig} />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-muted/30 border border-border/50 p-2.5">
          <p className="text-xs text-muted-foreground mb-1">Resignation Date</p>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">
              {new Date(record.resignation_date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
        <div className="rounded-lg bg-muted/30 border border-border/50 p-2.5">
          <p className="text-xs text-muted-foreground mb-1">Last Working Day</p>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-rose-400" />
            <span className="text-xs font-medium text-foreground">
              {new Date(record.last_working_day).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Reason & Notice */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground">
          {reasonLabels[record.reason_category]}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground">
          Notice: {record.notice_period_days} days
        </span>
        {record.exit_interview_conducted && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Exit Interview Done
          </span>
        )}
      </div>

      {record.reason_for_resignation && (
        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5 border border-border/40 line-clamp-2">
          "{record.reason_for_resignation}"
        </p>
      )}
    </div>
  );
}

// ─── Clearance Card ───────────────────────────────────────────────────────────
function ClearanceCard({ record }: { record: ExitClearanceRecord }) {
  const checks = [
    { label: 'Finance', icon: IndianRupee, done: record.finance_cleared },
    { label: 'IT', icon: Cpu, done: record.it_cleared },
    { label: 'Operations', icon: Briefcase, done: record.operations_cleared },
    { label: 'Security', icon: ShieldCheck, done: record.security_cleared },
    { label: 'Equipment', icon: ClipboardList, done: record.equipment_returned },
    { label: 'Documents', icon: FileText, done: record.documents_returned },
    { label: 'Access', icon: BadgeCheck, done: record.access_revoked },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const progress = Math.round((completedCount / checks.length) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="font-semibold text-foreground text-sm">{record.employee_name}</p>
          <p className="text-xs text-muted-foreground">{record.department}</p>
        </div>
        <StatusBadge status={record.status} config={clearanceStatusConfig} />
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Clearance Progress</span>
          <span className="font-medium text-foreground">
            {completedCount}/{checks.length} cleared
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              progress === 100
                ? 'bg-emerald-500'
                : progress >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-2">
        {checks.map(({ label, icon: Icon, done }) => (
          <div
            key={label}
            className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${
              done
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted/20 border-border text-muted-foreground'
            }`}
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{label}</span>
            {done ? (
              <CheckCircle2 className="h-3 w-3 ml-auto flex-shrink-0" />
            ) : (
              <Clock className="h-3 w-3 ml-auto flex-shrink-0 opacity-50" />
            )}
          </div>
        ))}
      </div>

      {record.remarks && (
        <p className="mt-3 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5 border border-border/40">
          {record.remarks}
        </p>
      )}
    </div>
  );
}

// ─── Settlement Card ──────────────────────────────────────────────────────────
function SettlementCard({ record }: { record: FinalSettlementRecord }) {
  const lineItems = [
    { label: 'Final Salary', value: record.final_salary, positive: true },
    { label: 'Gratuity', value: record.gratuity, positive: true },
    { label: 'Leave Encashment', value: record.leave_encashment, positive: true },
    { label: 'Bonus', value: record.bonus, positive: true },
    { label: 'Other Benefits', value: record.other_benefits, positive: true },
    { label: 'Deductions', value: record.deductions, positive: false },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <p className="font-semibold text-foreground text-sm">{record.employee_name}</p>
          <p className="text-xs text-muted-foreground">{record.department}</p>
        </div>
        <StatusBadge status={record.status} config={settlementStatusConfig} />
      </div>

      {/* Line Items */}
      <div className="space-y-2 mb-4">
        {lineItems
          .filter((item) => item.value !== null)
          .map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span
                className={`font-medium tabular-nums ${
                  item.positive ? 'text-foreground' : 'text-rose-500'
                }`}
              >
                {item.positive ? '' : '− '}
                {formatCurrency(item.value)}
              </span>
            </div>
          ))}
      </div>

      {/* Net Amount */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Net Payable</span>
        </div>
        <span className="text-lg font-bold text-primary">{formatCurrency(record.net_amount)}</span>
      </div>

      {/* Payment Info */}
      <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <span>Mode: </span>
          <span className="text-foreground capitalize">
            {record.payment_mode?.replace('_', ' ') ?? '—'}
          </span>
        </div>
        <div>
          <span>TXN: </span>
          <span className="text-foreground">{record.transaction_id ?? '—'}</span>
        </div>
        <div className="col-span-2">
          <span>Payment Date: </span>
          <span className="text-foreground">
            {record.payment_date
              ? new Date(record.payment_date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function OffboardingPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('resignations');

  const stats = {
    activeResignations: MOCK_RESIGNATIONS.filter((r) =>
      ['submitted', 'accepted'].includes(r.status)
    ).length,
    pendingClearance: MOCK_CLEARANCES.filter((r) => r.status !== 'cleared').length,
    processedSettlements: MOCK_SETTLEMENTS.filter((r) =>
      ['processed', 'paid'].includes(r.status)
    ).length,
    exitInterviews: MOCK_RESIGNATIONS.filter((r) => r.exit_interview_conducted).length,
  };

  const filteredResignations = MOCK_RESIGNATIONS.filter(
    (r) =>
      !search ||
      r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      r.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase())
  );

  const filteredClearances = MOCK_CLEARANCES.filter(
    (r) =>
      !search ||
      r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSettlements = MOCK_SETTLEMENTS.filter(
    (r) =>
      !search ||
      r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase())
  );

  const tabDefs = [
    { value: 'resignations', label: 'Resignations', count: MOCK_RESIGNATIONS.length },
    { value: 'clearance', label: 'Exit Clearance', count: MOCK_CLEARANCES.length },
    { value: 'settlement', label: 'Final Settlement', count: MOCK_SETTLEMENTS.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Employee Offboarding</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage resignations, exit clearances, and full & final settlements
          </p>
        </div>
        <Button size="sm" className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Record Resignation
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={UserMinus}
          label="Active Resignations"
          value={stats.activeResignations}
          sub="in progress"
          accent="bg-rose-500/10 text-rose-500"
        />
        <StatCard
          icon={ClipboardList}
          label="Pending Clearance"
          value={stats.pendingClearance}
          sub="needs attention"
          accent="bg-amber-500/10 text-amber-500"
        />
        <StatCard
          icon={IndianRupee}
          label="Settlements"
          value={stats.processedSettlements}
          sub="processed or paid"
          accent="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          icon={BadgeCheck}
          label="Exit Interviews"
          value={stats.exitInterviews}
          sub="conducted"
          accent="bg-blue-500/10 text-blue-500"
        />
      </div>

      {/* Content Card */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-base font-semibold">Offboarding Records</CardTitle>
            <div className="flex items-center gap-2 sm:ml-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee or department..."
                  className="pl-8 h-8 text-sm w-64 bg-background"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Filter className="h-3.5 w-3.5" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-6 border-b border-border">
              <TabsList className="h-auto p-0 bg-transparent gap-0">
                {tabDefs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="relative rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {tab.label}
                    <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-medium">
                      {tab.count}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Resignations Tab */}
            <TabsContent
              value="resignations"
              className="mt-0 focus-visible:outline-none focus-visible:ring-0 p-6"
            >
              {filteredResignations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <UserMinus className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-medium">No resignation records found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredResignations.map((r) => (
                    <ResignationCard key={r.id} record={r} />
                  ))}
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                Showing {filteredResignations.length} of {MOCK_RESIGNATIONS.length} records
              </div>
            </TabsContent>

            {/* Exit Clearance Tab */}
            <TabsContent
              value="clearance"
              className="mt-0 focus-visible:outline-none focus-visible:ring-0 p-6"
            >
              {filteredClearances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-medium">No clearance records found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredClearances.map((r) => (
                    <ClearanceCard key={r.id} record={r} />
                  ))}
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                Showing {filteredClearances.length} of {MOCK_CLEARANCES.length} records
              </div>
            </TabsContent>

            {/* Final Settlement Tab */}
            <TabsContent
              value="settlement"
              className="mt-0 focus-visible:outline-none focus-visible:ring-0 p-6"
            >
              {filteredSettlements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <IndianRupee className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-medium">No settlement records found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredSettlements.map((r) => (
                    <SettlementCard key={r.id} record={r} />
                  ))}
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                Showing {filteredSettlements.length} of {MOCK_SETTLEMENTS.length} records
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
