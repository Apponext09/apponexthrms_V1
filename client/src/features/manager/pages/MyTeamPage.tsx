import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useManager } from '@/features/manager/hooks/useManager';
import {
  Users, Clock, CheckCircle2, Search, Mail, ShieldCheck, ChevronRight, UserCheck, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function MyTeamPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { employees, isEmployeesLoading } = useManager();
  const [search, setSearch] = useState('');

  const filtered = employees.filter((emp: any) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      emp.firstName?.toLowerCase().includes(q) ||
      emp.lastName?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q) ||
      emp.code?.toLowerCase().includes(q) ||
      emp.teamLeadName?.toLowerCase().includes(q) ||
      emp.roleTag?.toLowerCase().includes(q) ||
      emp.departmentName?.toLowerCase().includes(q)
    );
  });

  const teamLeadCount = employees.filter((e: any) =>
    (e.roleTag || '').toLowerCase().includes('lead') || (e.designation || '').toLowerCase().includes('lead')
  ).length;
  const directEmployeeCount = Math.max(0, employees.length - teamLeadCount);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-6 rounded-2xl shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">My Team Roster</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {employees.length} department members reporting to {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Department Head'} ({teamLeadCount} Team Leads · {directEmployeeCount} Employees)
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => navigate('/manager/leave-approvals')}
            size="sm"
            className="rounded-xl font-bold text-xs gap-2 shadow-2xs"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Leave Approvals
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Department Members',
            value: `${employees.length} Members`,
            sub: 'Direct & nested hierarchy',
            icon: Users,
            accentBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
          },
          {
            label: 'Role Breakdown',
            value: `${teamLeadCount} Leads · ${directEmployeeCount} Staff`,
            sub: 'Multi-tier department roles',
            icon: Clock,
            accentBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          },
          {
            label: 'Reporting Structure',
            value: 'Manager ➔ Lead ➔ Emp',
            sub: 'Department hierarchy flow',
            icon: ShieldCheck,
            accentBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border border-border/80 bg-card shadow-2xs">
              <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 shadow-2xs', stat.accentBg)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <p className="text-sm font-black text-foreground truncate mt-0.5">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground/70 truncate">{stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by team lead, employee name, code, designation, or department..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-10 py-3 text-xs sm:text-sm rounded-xl border border-input bg-card text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-2xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Roster Cards Grid */}
      {isEmployeesLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border/80 rounded-2xl">
          <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center mb-3 animate-pulse">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground">Loading department team members...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border/80 rounded-2xl px-4">
          <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-bold text-foreground">No team members found</p>
          <p className="text-xs text-muted-foreground mt-1">No department staff matching query "{search}"</p>
          <Button variant="outline" size="sm" onClick={() => setSearch('')} className="mt-4 text-xs font-bold rounded-xl">
            Clear Search Filter
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp: any) => {
            const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
            const isLead = (emp.roleTag || '').toLowerCase().includes('lead') || (emp.designation || '').toLowerCase().includes('lead');
            const isActive = (emp.status || 'active').toLowerCase() === 'active';

            const avatarStyle = isLead
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30';

            return (
              <Card
                key={emp.id}
                className="border border-border/80 bg-card shadow-2xs hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Top Info */}
                  <div className="flex items-start gap-3.5">
                    <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 border shadow-2xs', avatarStyle)}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <h3 className="font-black text-sm text-foreground truncate">{emp.firstName} {emp.lastName}</h3>
                        <Badge
                          className={cn(
                            'text-[9px] font-bold shrink-0 uppercase border px-2 py-0.5 rounded-full',
                            isLead
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                              : 'bg-primary/10 text-primary border-primary/20'
                          )}
                        >
                          {isLead ? 'Team Lead' : 'Employee'}
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-primary truncate mt-0.5">{emp.designation || 'Specialist'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{emp.departmentName || 'Department'}</p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <Badge variant="outline" className="text-[9px] font-mono shrink-0 uppercase bg-muted/60 text-muted-foreground border-border/80 px-2 py-0.5">
                          {emp.code || `EMP-${emp.id}`}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] px-2 py-0.5 uppercase font-bold rounded-full',
                            isActive
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'border-border bg-muted text-muted-foreground'
                          )}
                        >
                          {emp.status || 'ACTIVE'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Hierarchy Banner */}
                  <div className="bg-muted/40 dark:bg-muted/20 p-3 rounded-xl border border-border/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground font-semibold flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-primary" /> Hierarchy Position:
                      </span>
                      <span className="font-mono text-[9px] text-primary font-bold">{isLead ? 'Level-5 (Lead)' : 'Level-6 (Emp)'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-foreground pt-0.5 truncate">
                      <span className="text-violet-600 dark:text-violet-400 font-bold">{user?.firstName || 'Manager'} (Mgr)</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold truncate">{isLead ? `${emp.firstName} (TL)` : `${emp.teamLeadName || 'TL'} (TL)`}</span>
                      {!isLead && (
                        <>
                          <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-blue-600 dark:text-blue-400 font-bold truncate">{emp.firstName} (Emp)</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Contact Row */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate text-[11px] font-medium">{emp.email || `${emp.firstName?.toLowerCase()}@company.com`}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
