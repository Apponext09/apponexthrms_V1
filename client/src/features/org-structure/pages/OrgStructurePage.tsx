import { useState, useMemo } from 'react';
import { useEmployees, useUpdateEmployee } from '@/features/employee/hooks/useEmployees';
import { EmployeeCreateModal } from '@/features/employee/components/EmployeeCreateModal';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  UserPlus,
  ExternalLink,
  Building2,
  Users,
  ShieldCheck,
  Crown,
  UserCheck,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Employee } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Role config
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; bg: string; border: string; text: string; Icon: React.ElementType }> = {
  hr_manager:      { label: 'HR Manager',   bg: 'bg-rose-50',    border: 'border-rose-300',   text: 'text-rose-700',   Icon: ShieldCheck },
  hr_admin:        { label: 'HR Admin',     bg: 'bg-rose-50',    border: 'border-rose-300',   text: 'text-rose-700',   Icon: ShieldCheck },
  department_head: { label: 'Dept Head',    bg: 'bg-violet-50',  border: 'border-violet-300', text: 'text-violet-700', Icon: Crown },
  team_lead:       { label: 'Team Lead',    bg: 'bg-amber-50',   border: 'border-amber-300',  text: 'text-amber-700',  Icon: UserCheck },
  employee:        { label: 'Employee',     bg: 'bg-slate-50',   border: 'border-slate-300',  text: 'text-slate-600',  Icon: Briefcase },
};
function roleCfg(role?: string) {
  return ROLE_CONFIG[role || 'employee'] || ROLE_CONFIG.employee;
}

const AVATAR_GRAD = [
  'from-sky-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-sky-600',
];
function avatarGrad(id?: number) { return AVATAR_GRAD[(id || 0) % AVATAR_GRAD.length]; }

// ─────────────────────────────────────────────────────────────────────────────
// SVG connector line helper
// ─────────────────────────────────────────────────────────────────────────────
function VConnector({ height = 28 }: { height?: number }) {
  return (
    <div className="flex justify-center">
      <div style={{ width: 2, height }} className="bg-slate-300 dark:bg-slate-600" />
    </div>
  );
}
function HBracket({ count }: { count: number }) {
  if (count <= 1) return <VConnector height={16} />;
  return (
    <div className="flex justify-center">
      <div style={{ width: 2, height: 16 }} className="bg-slate-300 dark:bg-slate-600" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini Employee Card (leaf node)
// ─────────────────────────────────────────────────────────────────────────────
interface EmpCardProps {
  emp: Employee;
  highlight: boolean;
  onClick: () => void;
}
function EmpCard({ emp, highlight, onClick }: EmpCardProps) {
  const name = [emp.firstName, emp.lastName].filter(Boolean).join(' ');
  const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
  const grad = avatarGrad(emp.id);
  const role = roleCfg((emp as any).accessRole);
  const RIcon = role.Icon;

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1.5 bg-white dark:bg-slate-900
        border rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5
        cursor-pointer px-3 pt-4 pb-3 min-w-[140px] max-w-[155px]
        ${highlight ? 'border-sky-400 ring-2 ring-sky-300' : 'border-slate-200 dark:border-slate-700'}`}
    >
      {/* Role badge */}
      <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-0.5
        text-[8px] font-bold px-2 py-0.5 rounded-full border ${role.bg} ${role.border} ${role.text}`}>
        <RIcon className="w-2 h-2" />{role.label}
      </span>

      <Avatar className={`h-10 w-10 border-2 border-white dark:border-slate-800 shadow bg-gradient-to-br ${grad}`}>
        <AvatarImage src={(emp as any).avatarUrl || undefined} alt={name} />
        <AvatarFallback className={`bg-gradient-to-br ${grad} text-white text-xs font-bold`}>{initials}</AvatarFallback>
      </Avatar>

      <div className="bg-[#0096dc] text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-sm truncate max-w-[130px] text-center">
        {name}
      </div>

      {emp.designation || emp.jobTitle ? (
        <span className="text-[8px] text-slate-400 truncate max-w-[130px] text-center leading-tight">
          {emp.designation || emp.jobTitle}
        </span>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Group (inside a dept): groups employees by their accessRole
// ─────────────────────────────────────────────────────────────────────────────
const ROLE_ORDER = ['hr_manager', 'hr_admin', 'department_head', 'team_lead', 'employee'];

interface RoleGroupProps {
  role: string;
  emps: Employee[];
  highlight: Set<number>;
  onSelect: (e: Employee) => void;
}
function RoleGroup({ role, emps, highlight, onSelect }: RoleGroupProps) {
  const cfg = roleCfg(role);
  const Icon = cfg.Icon;
  return (
    <div className="flex flex-col items-center">
      {/* Role header node */}
      <div className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border shadow-sm ${cfg.bg} ${cfg.border}`}>
        <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
        <span className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
          {emps.length}
        </span>
      </div>

      <VConnector height={20} />

      {/* Horizontal spread of emp cards */}
      <div className="relative flex gap-3 items-start">
        {emps.length > 1 && (
          <div
            className="absolute top-0 h-px bg-slate-300 dark:bg-slate-600"
            style={{ left: '77px', right: '77px' }}
          />
        )}
        {emps.map((emp) => (
          <div key={emp.id} className="flex flex-col items-center">
            {emps.length > 1 && <VConnector height={12} />}
            <EmpCard
              emp={emp}
              highlight={highlight.has(emp.id!)}
              onClick={() => onSelect(emp)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Department Node
// ─────────────────────────────────────────────────────────────────────────────
const DEPT_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  engineering:       { bg: 'bg-sky-100',     border: 'border-sky-400',    text: 'text-sky-800',    icon: '⚙️' },
  'human resources': { bg: 'bg-rose-100',    border: 'border-rose-400',   text: 'text-rose-800',   icon: '🤝' },
  hr:                { bg: 'bg-rose-100',    border: 'border-rose-400',   text: 'text-rose-800',   icon: '🤝' },
  finance:           { bg: 'bg-emerald-100', border: 'border-emerald-400',text: 'text-emerald-800',icon: '💰' },
  sales:             { bg: 'bg-amber-100',   border: 'border-amber-400',  text: 'text-amber-800',  icon: '📈' },
  marketing:         { bg: 'bg-violet-100',  border: 'border-violet-400', text: 'text-violet-800', icon: '📣' },
  operations:        { bg: 'bg-cyan-100',    border: 'border-cyan-400',   text: 'text-cyan-800',   icon: '🏭' },
};

function getDeptStyle(name: string) {
  return DEPT_COLORS[name.toLowerCase()] || { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-800', icon: '🏢' };
}

interface DeptNodeProps {
  name: string;
  employees: Employee[];
  highlight: Set<number>;
  onSelect: (e: Employee) => void;
}
function DeptNode({ name, employees, highlight, onSelect }: DeptNodeProps) {
  const style = getDeptStyle(name);

  // Group by role
  const byRole: Record<string, Employee[]> = {};
  for (const emp of employees) {
    const r = (emp as any).accessRole || 'employee';
    if (!byRole[r]) byRole[r] = [];
    byRole[r].push(emp);
  }
  const roleKeys = ROLE_ORDER.filter((r) => byRole[r] && byRole[r].length > 0);

  return (
    <div className="flex flex-col items-center">
      {/* Department header */}
      <div className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 shadow-md ${style.bg} ${style.border}`}>
        <span className="text-base">{style.icon}</span>
        <span className={`font-bold text-sm ${style.text}`}>{name}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text}`}>
          {employees.length}
        </span>
      </div>

      <VConnector height={24} />

      {/* Role groups side by side */}
      <div className="relative flex gap-8 items-start">
        {roleKeys.length > 1 && (
          <div
            className="absolute top-0 h-px bg-slate-300 dark:bg-slate-600"
            style={{ left: '50%', right: '50%', transform: 'none' }}
          />
        )}
        {roleKeys.map((role, idx) => (
          <div key={role} className="flex flex-col items-center relative">
            {roleKeys.length > 1 && <VConnector height={12} />}
            <RoleGroup
              role={role}
              emps={byRole[role]}
              highlight={highlight}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin Root Node
// ─────────────────────────────────────────────────────────────────────────────
interface AdminNodeProps { name: string; email: string }
function AdminNode({ name, email }: AdminNodeProps) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex flex-col items-center bg-gradient-to-br from-[#0096dc] to-indigo-600
        text-white rounded-2xl shadow-xl px-8 py-4 border-2 border-white/30 min-w-[220px]">
        {/* Glow */}
        <div className="absolute inset-0 rounded-2xl bg-white/10 blur-sm pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-1">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 border-2 border-white/40 mb-1">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div className="text-xs font-semibold tracking-widest uppercase opacity-80">Organization Admin</div>
          <div className="text-base font-extrabold tracking-tight">{name}</div>
          <div className="text-[10px] opacity-70">{email}</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export function OrgStructurePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { employees, isLoading, refetch } = useEmployees({ pageSize: 1000 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [managerEditId, setManagerEditId] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { updateEmployee, isLoading: isUpdatingManager } = useUpdateEmployee(selectedEmp?.id || 0);

  // Build department → employee map
  const deptGroups = useMemo(() => {
    if (!employees?.length) return [];
    const map = new Map<string, Employee[]>();
    for (const emp of employees as Employee[]) {
      const dept = emp.department || 'Unassigned';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(emp);
    }
    // Sort: named depts first, Unassigned last
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
      })
      .map(([name, emps]) => ({ name, emps }));
  }, [employees]);

  // Search highlight set
  const highlightIds = useMemo(() => {
    if (!searchTerm.trim()) return new Set<number>();
    const term = searchTerm.toLowerCase();
    return new Set<number>(
      (employees as Employee[])
        .filter((e) =>
          [e.firstName, e.lastName, e.email, e.designation, e.department]
            .join(' ').toLowerCase().includes(term)
        )
        .map((e) => e.id!)
    );
  }, [searchTerm, employees]);

  const handleManagerChange = async (newManagerId: string) => {
    if (!selectedEmp?.id) return;
    try {
      await updateEmployee({ reportingManagerId: newManagerId ? parseInt(newManagerId, 10) : null } as any);
      setSelectedEmp(null);
      refetch();
    } catch (err) { console.error(err); }
  };

  const adminName = user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Organization Admin';
  const adminEmail = user?.email || '';

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3
        bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#0096dc]" />
            Organization Chart
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin → Departments → Roles → Employees
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-1.5 mr-2">
            {(['hr_manager','department_head','team_lead','employee'] as const).map((r) => {
              const c = roleCfg(r); const I = c.Icon;
              return (
                <span key={r} className={`flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-full border ${c.bg} ${c.border} ${c.text}`}>
                  <I className="w-2.5 h-2.5"/>{c.label}
                </span>
              );
            })}
          </div>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, dept, role…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-[#0096dc] hover:bg-sky-600"
            onClick={() => setIsCreateModalOpen(true)}>
            <UserPlus className="w-3.5 h-3.5" /> Add Employee
          </Button>
        </div>
      </div>

      {/* ── Chart Canvas ── */}
      <div className="flex-1 overflow-auto bg-slate-50/60 dark:bg-slate-950/60 border rounded-xl shadow-inner">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-3 text-muted-foreground text-sm">
              <div className="w-8 h-8 border-2 border-[#0096dc] border-t-transparent rounded-full animate-spin" />
              Loading organization chart…
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Users className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="font-semibold">No employees yet</p>
            <p className="text-sm text-muted-foreground mb-4">Add employees to build the org chart.</p>
            <Button onClick={() => setIsCreateModalOpen(true)} size="sm" className="gap-2 bg-[#0096dc] hover:bg-sky-600">
              <UserPlus className="w-4 h-4" /> Add First Employee
            </Button>
          </div>
        ) : (
          <div className="py-10 px-8 min-w-max flex flex-col items-center">

            {/* ❶ Admin root node */}
            <AdminNode name={adminName} email={adminEmail} />

            {/* ❷ Connector down */}
            <VConnector height={32} />

            {/* ❸ "Departments" label bar */}
            <div className="flex items-center gap-2 mb-1 px-5 py-1.5 bg-white dark:bg-slate-900
              border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">Departments</span>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                {deptGroups.length}
              </span>
            </div>

            <VConnector height={16} />

            {/* ❹ Horizontal line across dept count */}
            {deptGroups.length > 1 && (
              <div className="relative w-full flex justify-center">
                <div
                  className="h-px bg-slate-300 dark:bg-slate-600"
                  style={{
                    width: `calc(100% - 200px)`,
                    maxWidth: `${deptGroups.length * 420}px`,
                  }}
                />
              </div>
            )}

            {/* ❺ Dept columns */}
            <div className="flex gap-10 items-start mt-0 pt-0">
              {deptGroups.map(({ name, emps }) => {
                const visibleEmps = searchTerm
                  ? emps.filter((e) => highlightIds.has(e.id!))
                  : emps;
                if (searchTerm && visibleEmps.length === 0) return null;
                return (
                  <div key={name} className="flex flex-col items-center">
                    <VConnector height={16} />
                    <DeptNode
                      name={name}
                      employees={searchTerm ? visibleEmps : emps}
                      highlight={highlightIds}
                      onSelect={(e) => { setSelectedEmp(e); setManagerEditId(String(e.reportingManagerId || '')); }}
                    />
                  </div>
                );
              })}
            </div>

          </div>
        )}
      </div>

      {/* ── Employee Detail Dialog ── */}
      {selectedEmp && (
        <Dialog open onOpenChange={() => setSelectedEmp(null)}>
          <DialogContent className="sm:max-w-[460px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Avatar className={`h-11 w-11 border-2 border-white shadow bg-gradient-to-br ${avatarGrad(selectedEmp.id)}`}>
                  <AvatarImage src={(selectedEmp as any)?.avatarUrl || undefined} />
                  <AvatarFallback className={`bg-gradient-to-br ${avatarGrad(selectedEmp.id)} text-white font-bold`}>
                    {selectedEmp.firstName?.[0]}{selectedEmp.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-lg font-bold">{selectedEmp.firstName} {selectedEmp.lastName}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(() => {
                      const cfg = roleCfg((selectedEmp as any).accessRole);
                      const Icon = cfg.Icon;
                      return (
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
                          <Icon className="w-2.5 h-2.5" />{cfg.label}
                        </span>
                      );
                    })()}
                    <span className="text-xs text-muted-foreground">{selectedEmp.employeeCode}</span>
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription>Employee profile &amp; reporting structure</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3 text-xs bg-muted/40 p-3 rounded-lg border">
                {[
                  ['Department', selectedEmp.department || '—'],
                  ['Designation', selectedEmp.designation || selectedEmp.jobTitle || '—'],
                  ['Email', selectedEmp.email],
                  ['Mobile', selectedEmp.mobile || selectedEmp.phone || '—'],
                  ['Joined', selectedEmp.dateOfJoining ? new Date(selectedEmp.dateOfJoining).toLocaleDateString() : '—'],
                  ['Employment', selectedEmp.employmentType?.replace('_',' ') || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span className="text-muted-foreground block font-medium">{label}</span>
                    <span className="font-semibold truncate block capitalize">{value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-bold block">Change Reporting Manager</label>
                <div className="flex gap-2">
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={managerEditId}
                    onChange={(e) => setManagerEditId(e.target.value)}
                  >
                    <option value="">— No Manager (Reports to Admin) —</option>
                    {(employees as Employee[])
                      .filter((e) => e.id !== selectedEmp.id)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName} ({e.employeeCode})
                        </option>
                      ))}
                  </select>
                  <Button size="sm" className="h-9 text-xs bg-[#0096dc] hover:bg-sky-600"
                    onClick={() => handleManagerChange(managerEditId)} disabled={isUpdatingManager}>
                    {isUpdatingManager ? 'Saving…' : 'Update'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"
                onClick={() => { navigate(`/employees/${selectedEmp.id}`); setSelectedEmp(null); }}>
                <ExternalLink className="w-3.5 h-3.5" /> View Full Profile
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedEmp(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <EmployeeCreateModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => { setIsCreateModalOpen(false); refetch(); }}
      />
    </div>
  );
}
