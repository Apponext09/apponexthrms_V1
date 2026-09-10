import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  ArrowRightLeft,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Building2,
  UserRound,
  ChevronRight,
  Plus,
} from 'lucide-react';

// ─── Types aligned with DB schema ─────────────────────────────────────────────
type TransferType = 'lateral' | 'internal_mobility' | 'relocation';
type TransferStatus = 'pending' | 'approved' | 'rejected';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

interface TransferRecord {
  id: string;
  employee_id: string;
  employee_name: string;

  // from_* and to_* fields from transfers table
  from_department: string;
  to_department: string;
  from_branch: string | null;
  to_branch: string | null;
  from_business_unit: string | null;
  to_business_unit: string | null;
  from_reporting_manager: string | null;
  to_reporting_manager: string | null;

  transfer_date: string;
  status: TransferStatus;
  reason: string | null;
  transfer_type: TransferType;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_TRANSFERS: TransferRecord[] = [
  {
    id: 'tr-001',
    employee_id: 'EMP-2022-0044',
    employee_name: 'Rahul Desai',
    from_department: 'Engineering',
    to_department: 'Product',
    from_branch: 'Mumbai HQ',
    to_branch: 'Mumbai HQ',
    from_business_unit: 'Platform',
    to_business_unit: 'Growth',
    from_reporting_manager: 'Ankit Shah',
    to_reporting_manager: 'Meera Nair',
    transfer_date: '2024-07-15',
    status: 'approved',
    reason: 'Cross-functional move aligned with product expansion goals',
    transfer_type: 'internal_mobility',
    approval_status: 'approved',
    approved_by: 'Suresh Kumar (HR Head)',
    approved_at: '2024-07-08',
  },
  {
    id: 'tr-002',
    employee_id: 'EMP-2021-0032',
    employee_name: 'Aisha Khan',
    from_department: 'Sales',
    to_department: 'Sales',
    from_branch: 'Delhi NCR',
    to_branch: 'Bangalore',
    from_business_unit: null,
    to_business_unit: null,
    from_reporting_manager: 'Vikram Nair',
    to_reporting_manager: 'Deepa Iyer',
    transfer_date: '2024-08-01',
    status: 'pending',
    reason: 'Employee relocation request - personal reasons',
    transfer_type: 'relocation',
    approval_status: 'pending',
    approved_by: null,
    approved_at: null,
  },
  {
    id: 'tr-003',
    employee_id: 'EMP-2023-0067',
    employee_name: 'Suresh Pillai',
    from_department: 'Finance',
    to_department: 'Operations',
    from_branch: 'Chennai',
    to_branch: 'Chennai',
    from_business_unit: 'Accounts',
    to_business_unit: 'Procurement',
    from_reporting_manager: 'Lata Krishnan',
    to_reporting_manager: 'Ravi Menon',
    transfer_date: '2024-07-20',
    status: 'approved',
    reason: 'Skill-based redeployment for operations strengthening',
    transfer_type: 'lateral',
    approval_status: 'approved',
    approved_by: 'Priya Sharma (HR)',
    approved_at: '2024-07-12',
  },
  {
    id: 'tr-004',
    employee_id: 'EMP-2022-0089',
    employee_name: 'Deepika Rao',
    from_department: 'Marketing',
    to_department: 'HR',
    from_branch: 'Hyderabad',
    to_branch: 'Hyderabad',
    from_business_unit: null,
    to_business_unit: null,
    from_reporting_manager: 'Amit Gupta',
    to_reporting_manager: 'Nandita Das',
    transfer_date: '2024-09-01',
    status: 'pending',
    reason: null,
    transfer_type: 'lateral',
    approval_status: 'pending',
    approved_by: null,
    approved_at: null,
  },
  {
    id: 'tr-005',
    employee_id: 'EMP-2020-0015',
    employee_name: 'Mohit Agarwal',
    from_department: 'Engineering',
    to_department: 'Engineering',
    from_branch: 'Pune',
    to_branch: 'Bangalore',
    from_business_unit: 'Backend',
    to_business_unit: 'Frontend',
    from_reporting_manager: 'Sandeep Joshi',
    to_reporting_manager: 'Tarun Sinha',
    transfer_date: '2024-06-01',
    status: 'rejected',
    reason: 'Project dependency — team cannot afford attrition currently',
    transfer_type: 'internal_mobility',
    approval_status: 'rejected',
    approved_by: 'Rajesh Menon (VP Eng)',
    approved_at: '2024-05-25',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const transferTypeConfig: Record<
  TransferType,
  { label: string; className: string }
> = {
  lateral: {
    label: 'Lateral',
    className:
      'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  internal_mobility: {
    label: 'Internal Mobility',
    className:
      'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  relocation: {
    label: 'Relocation',
    className:
      'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  },
};

const statusConfig: Record<
  TransferStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    className:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    className:
      'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
};

function TypeBadge({ type }: { type: TransferType }) {
  const cfg = transferTypeConfig[type];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: TransferStatus }) {
  const cfg = statusConfig[status];
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

// ─── Transfer Card ─────────────────────────────────────────────────────────────
function TransferCard({ record }: { record: TransferRecord }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md hover:border-border/80">
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
            {record.employee_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{record.employee_name}</p>
            <p className="text-xs text-muted-foreground">{record.employee_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <TypeBadge type={record.transfer_type} />
          <StatusBadge status={record.status} />
        </div>
      </div>

      {/* Department Flow */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">From</span>
          </div>
          <p className="text-sm font-medium text-foreground truncate">{record.from_department}</p>
          {record.from_branch && (
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground">{record.from_branch}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/15">
            <ChevronRight className="h-4 w-4 text-primary" />
          </div>
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-1.5 mb-0.5 justify-end">
            <span className="text-xs text-muted-foreground">To</span>
            <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          </div>
          <p className="text-sm font-medium text-foreground truncate">{record.to_department}</p>
          {record.to_branch && (
            <div className="flex items-center gap-1 mt-0.5 justify-end">
              <span className="text-xs text-muted-foreground">{record.to_branch}</span>
              <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </div>
          )}
        </div>
      </div>

      {/* Manager change */}
      {(record.from_reporting_manager || record.to_reporting_manager) && (
        <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
          <UserRound className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">
            {record.from_reporting_manager} → {record.to_reporting_manager ?? '—'}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Effective:{' '}
          <span className="text-foreground font-medium">
            {new Date(record.transfer_date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
        {record.approved_by && (
          <span className="text-xs truncate max-w-[140px]">
            By: <span className="text-foreground">{record.approved_by}</span>
          </span>
        )}
      </div>

      {/* Reason */}
      {record.reason && (
        <p className="mt-3 text-xs text-muted-foreground bg-muted/30 rounded-lg p-2.5 border border-border/40 line-clamp-2">
          "{record.reason}"
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function TransfersPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const stats = {
    total: MOCK_TRANSFERS.length,
    pending: MOCK_TRANSFERS.filter((r) => r.status === 'pending').length,
    approved: MOCK_TRANSFERS.filter((r) => r.status === 'approved').length,
    relocation: MOCK_TRANSFERS.filter((r) => r.transfer_type === 'relocation').length,
  };

  const filtered = MOCK_TRANSFERS.filter((r) => {
    const matchSearch =
      !search ||
      r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      r.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      r.from_department.toLowerCase().includes(search.toLowerCase()) ||
      r.to_department.toLowerCase().includes(search.toLowerCase());

    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'pending' && r.status === 'pending') ||
      (activeTab === 'approved' && r.status === 'approved') ||
      (activeTab === 'rejected' && r.status === 'rejected');

    return matchSearch && matchTab;
  });

  const tabDefs = [
    { value: 'all', label: 'All Transfers', count: MOCK_TRANSFERS.length },
    {
      value: 'pending',
      label: 'Pending',
      count: MOCK_TRANSFERS.filter((r) => r.status === 'pending').length,
    },
    {
      value: 'approved',
      label: 'Approved',
      count: MOCK_TRANSFERS.filter((r) => r.status === 'approved').length,
    },
    {
      value: 'rejected',
      label: 'Rejected',
      count: MOCK_TRANSFERS.filter((r) => r.status === 'rejected').length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Employee Transfers</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage internal transfers, department moves, branch relocations, and reporting changes
          </p>
        </div>
        <Button size="sm" className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" />
          Initiate Transfer
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ArrowRightLeft}
          label="Total Transfers"
          value={stats.total}
          sub="all time"
          accent="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Clock}
          label="Pending Approval"
          value={stats.pending}
          sub="awaiting action"
          accent="bg-amber-500/10 text-amber-500"
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved"
          value={stats.approved}
          sub="transfers complete"
          accent="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          icon={MapPin}
          label="Relocations"
          value={stats.relocation}
          sub="branch changes"
          accent="bg-orange-500/10 text-orange-500"
        />
      </div>

      {/* Content Card */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-base font-semibold">Transfer Records</CardTitle>
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

            <TabsContent
              value={activeTab}
              className="mt-0 focus-visible:outline-none focus-visible:ring-0 p-6"
            >
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ArrowRightLeft className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground font-medium">No transfer records found</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Try adjusting your search or filter
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((record) => (
                    <TransferCard key={record.id} record={record} />
                  ))}
                </div>
              )}
              <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                Showing {filtered.length} of {MOCK_TRANSFERS.length} records
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
