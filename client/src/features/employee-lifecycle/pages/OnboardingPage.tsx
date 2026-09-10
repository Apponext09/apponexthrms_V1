import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  UserCheck,
  Clock,
  CheckCircle2,
  Monitor,
  Search,
  Users,
  BookOpen,
  Package,
  UserPlus,
  Calendar,
  ChevronDown,
  Filter,
} from 'lucide-react';

// ─── Types aligned with DB schema ─────────────────────────────────────────────
interface OnboardingRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  position: string;
  status: 'initiated' | 'in_progress' | 'completed';
  start_date: string;
  completion_date: string | null;
  training_sessions: string[];
  equipment_assigned: string[];
  system_access_granted: boolean;
  buddy_name: string | null;
  buddy_id: string | null;
}

// ─── Mock data matching DB schema fields ──────────────────────────────────────
const MOCK_ONBOARDING: OnboardingRecord[] = [
  {
    id: 'ob-001',
    employee_id: 'EMP-2024-0112',
    employee_name: 'Arjun Mehta',
    department: 'Engineering',
    position: 'Software Engineer',
    status: 'in_progress',
    start_date: '2024-07-01',
    completion_date: null,
    training_sessions: ['Company Orientation', 'Tech Stack Overview', 'Security Training'],
    equipment_assigned: ['MacBook Pro', 'Monitor', 'Mouse & Keyboard'],
    system_access_granted: true,
    buddy_name: 'Sneha Kapoor',
    buddy_id: 'EMP-2023-0054',
  },
  {
    id: 'ob-002',
    employee_id: 'EMP-2024-0113',
    employee_name: 'Priya Sharma',
    department: 'Product',
    position: 'Product Manager',
    status: 'in_progress',
    start_date: '2024-07-03',
    completion_date: null,
    training_sessions: ['Company Orientation', 'Product Roadmap'],
    equipment_assigned: ['MacBook Air'],
    system_access_granted: false,
    buddy_name: 'Raj Patel',
    buddy_id: 'EMP-2023-0022',
  },
  {
    id: 'ob-003',
    employee_id: 'EMP-2024-0110',
    employee_name: 'Vikram Singh',
    department: 'Finance',
    position: 'Senior Accountant',
    status: 'completed',
    start_date: '2024-06-15',
    completion_date: '2024-06-30',
    training_sessions: ['Company Orientation', 'Finance Systems', 'Compliance Training'],
    equipment_assigned: ['Laptop', 'Monitor'],
    system_access_granted: true,
    buddy_name: 'Anita Roy',
    buddy_id: 'EMP-2022-0011',
  },
  {
    id: 'ob-004',
    employee_id: 'EMP-2024-0114',
    employee_name: 'Nisha Jain',
    department: 'HR',
    position: 'HR Specialist',
    status: 'initiated',
    start_date: '2024-07-10',
    completion_date: null,
    training_sessions: [],
    equipment_assigned: [],
    system_access_granted: false,
    buddy_name: null,
    buddy_id: null,
  },
  {
    id: 'ob-005',
    employee_id: 'EMP-2024-0109',
    employee_name: 'Karan Malhotra',
    department: 'Sales',
    position: 'Sales Executive',
    status: 'completed',
    start_date: '2024-06-10',
    completion_date: '2024-06-25',
    training_sessions: ['Company Orientation', 'Sales Methodology', 'CRM Training'],
    equipment_assigned: ['Laptop', 'Headset', 'Smartphone'],
    system_access_granted: true,
    buddy_name: 'Pooja Verma',
    buddy_id: 'EMP-2023-0078',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusConfig = {
  initiated: {
    label: 'Initiated',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    icon: UserPlus,
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
  },
};

function StatusBadge({ status }: { status: OnboardingRecord['status'] }) {
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
    <div
      className={`relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md`}
    >
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

// ─── Row Component ────────────────────────────────────────────────────────────
function OnboardingRow({ record }: { record: OnboardingRecord }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b border-border/50 transition-colors hover:bg-muted/30">
        <td className="py-3 px-4">
          <div>
            <p className="font-medium text-foreground text-sm">{record.employee_name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{record.employee_id}</p>
          </div>
        </td>
        <td className="py-3 px-4">
          <div>
            <p className="text-sm text-foreground">{record.position}</p>
            <p className="text-xs text-muted-foreground">{record.department}</p>
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5 text-sm text-foreground">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {new Date(record.start_date).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </td>
        <td className="py-3 px-4">
          <StatusBadge status={record.status} />
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${record.system_access_granted ? 'bg-emerald-500' : 'bg-red-400'}`}
            />
            <span className="text-sm text-foreground">
              {record.system_access_granted ? 'Granted' : 'Pending'}
            </span>
          </div>
        </td>
        <td className="py-3 px-4">
          {record.buddy_name ? (
            <div className="flex items-center gap-1.5">
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                {record.buddy_name.charAt(0)}
              </div>
              <span className="text-sm text-foreground">{record.buddy_name}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground italic">Not assigned</span>
          )}
        </td>
        <td className="py-3 px-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setExpanded(!expanded)}
          >
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </Button>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-muted/20 border-b border-border/50">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Training Sessions */}
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Training Sessions</span>
                  <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {record.training_sessions.length}
                  </span>
                </div>
                {record.training_sessions.length > 0 ? (
                  <ul className="space-y-1">
                    {record.training_sessions.map((t) => (
                      <li key={t} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        {t}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">None scheduled yet</p>
                )}
              </div>

              {/* Equipment Assigned */}
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Equipment Assigned</span>
                  <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {record.equipment_assigned.length}
                  </span>
                </div>
                {record.equipment_assigned.length > 0 ? (
                  <ul className="space-y-1">
                    {record.equipment_assigned.map((eq) => (
                      <li key={eq} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Package className="h-3 w-3 text-blue-400 flex-shrink-0" />
                        {eq}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">None assigned yet</p>
                )}
              </div>

              {/* Completion Info */}
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Completion Info</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">System Access</span>
                    <span
                      className={`font-medium ${record.system_access_granted ? 'text-emerald-500' : 'text-red-400'}`}
                    >
                      {record.system_access_granted ? '✓ Granted' : '✗ Pending'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Completion Date</span>
                    <span className="text-foreground">
                      {record.completion_date
                        ? new Date(record.completion_date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Buddy</span>
                    <span className="text-foreground">{record.buddy_name ?? '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Table ───────────────────────────────────────────────────────────────
function OnboardingTable({ records }: { records: OnboardingRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <UserCheck className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground font-medium">No onboarding records found</p>
        <p className="text-sm text-muted-foreground/70 mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Employee
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Position / Dept
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Start Date
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              System Access
            </th>
            <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Buddy
            </th>
            <th className="py-3 px-4 w-12" />
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <OnboardingRow key={record.id} record={record} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function OnboardingPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const stats = {
    total: MOCK_ONBOARDING.length,
    inProgress: MOCK_ONBOARDING.filter((r) => r.status === 'in_progress').length,
    completed: MOCK_ONBOARDING.filter((r) => r.status === 'completed').length,
    systemGranted: MOCK_ONBOARDING.filter((r) => r.system_access_granted).length,
  };

  const filtered = MOCK_ONBOARDING.filter((r) => {
    const matchSearch =
      !search ||
      r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      r.employee_id.toLowerCase().includes(search.toLowerCase()) ||
      r.department.toLowerCase().includes(search.toLowerCase());

    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'in_progress' && r.status === 'in_progress') ||
      (activeTab === 'initiated' && r.status === 'initiated') ||
      (activeTab === 'completed' && r.status === 'completed');

    return matchSearch && matchTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Employee Onboarding</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage new hire onboarding — training, equipment, system access, and buddy assignment
          </p>
        </div>
        <Button size="sm" className="gap-2 self-start sm:self-auto">
          <UserPlus className="h-4 w-4" />
          Initiate Onboarding
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Onboarding"
          value={stats.total}
          sub="all time"
          accent="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={stats.inProgress}
          sub="currently active"
          accent="bg-amber-500/10 text-amber-500"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed}
          sub="fully onboarded"
          accent="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          icon={Monitor}
          label="System Access"
          value={stats.systemGranted}
          sub="access granted"
          accent="bg-blue-500/10 text-blue-500"
        />
      </div>

      {/* Table Card */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-base font-semibold">Onboarding Records</CardTitle>
            <div className="flex items-center gap-2 sm:ml-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search employee..."
                  className="pl-8 h-8 text-sm w-56 bg-background"
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
                {[
                  { value: 'all', label: 'All', count: MOCK_ONBOARDING.length },
                  {
                    value: 'initiated',
                    label: 'Initiated',
                    count: MOCK_ONBOARDING.filter((r) => r.status === 'initiated').length,
                  },
                  {
                    value: 'in_progress',
                    label: 'In Progress',
                    count: MOCK_ONBOARDING.filter((r) => r.status === 'in_progress').length,
                  },
                  {
                    value: 'completed',
                    label: 'Completed',
                    count: MOCK_ONBOARDING.filter((r) => r.status === 'completed').length,
                  },
                ].map((tab) => (
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

            <TabsContent value={activeTab} className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <OnboardingTable records={filtered} />
              <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
                Showing {filtered.length} of {MOCK_ONBOARDING.length} records
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
