import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useManager } from '@/features/manager/hooks/useManager';
import {
  Users, Clock, CheckCircle2, Search, Mail, ShieldCheck, ChevronRight, UserCheck
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
    const q = search.toLowerCase();
    return (
      !q ||
      emp.firstName?.toLowerCase().includes(q) ||
      emp.lastName?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q) ||
      emp.code?.toLowerCase().includes(q) ||
      emp.teamLeadName?.toLowerCase().includes(q) ||
      emp.roleTag?.toLowerCase().includes(q)
    );
  });

  const teamLeadCount = employees.filter((e: any) => (e.roleTag || '').toLowerCase().includes('lead') || (e.designation || '').toLowerCase().includes('lead')).length;
  const directEmployeeCount = employees.length - teamLeadCount;

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">My Team</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {employees.length} department members under {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Manager'} ({teamLeadCount} Team Lead, {directEmployeeCount} Employees)
          </p>
        </div>
        <Button onClick={() => navigate('/manager/leave-approvals')} size="sm" className="rounded-xl font-bold text-xs gap-1.5 shadow-sm">
          <CheckCircle2 className="h-3.5 w-3.5" /> Leave Approvals
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Department Team', value: `${employees.length} Members`, icon: Users, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10', border: 'border-violet-100 dark:border-violet-500/20' },
          { label: 'Team Leads & Employees', value: `${teamLeadCount} Leads • ${directEmployeeCount} Emps`, icon: Clock, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' },
          { label: 'Hierarchy Flow', value: 'Manager ➔ Lead ➔ Emp', icon: ShieldCheck, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-100 dark:border-indigo-500/20' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className={cn('border shadow-none', stat.border, stat.bg)}>
              <CardContent className="p-4 flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-card/70 dark:bg-card/40 flex items-center justify-center border border-white/60 dark:border-white/10 shadow-sm flex-shrink-0">
                  <Icon className={cn('h-4 w-4', stat.color)} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <p className="text-sm font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by team lead, employee name, code, designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-input bg-card text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-2xs"
        />
      </div>

      {/* Team Member Cards */}
      {isEmployeesLoading ? (
        <div className="text-center py-12 text-muted-foreground text-xs">Loading department team members...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-xs">No team members found matching search query.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp: any) => {
            const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
            const isLead = (emp.roleTag || '').toLowerCase().includes('lead') || (emp.designation || '').toLowerCase().includes('lead');
            
            const avatarStyle = isLead
              ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
              : 'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/30';

            return (
              <Card key={emp.id} className="border border-border bg-card shadow-none hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5">
                <CardContent className="p-4 space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 border shadow-2xs', avatarStyle)}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-sm text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                        <Badge 
                          className={cn(
                            'text-[9px] font-bold shrink-0 uppercase border px-1.5 py-0.5',
                            isLead 
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' 
                              : 'bg-primary/10 text-primary border-primary/20'
                          )}
                        >
                          {isLead ? 'Team Lead' : 'Employee'}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium text-primary truncate mt-0.5">{emp.designation || 'Specialist'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{emp.departmentName || 'Department'}</p>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[9px] font-mono shrink-0 uppercase bg-muted/60 text-muted-foreground border-border">
                          {emp.code || `EMP-${emp.id}`}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] px-1.5 py-0.5 uppercase font-bold',
                            (emp.status || 'active').toLowerCase() === 'active' 
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                              : 'border-border bg-muted text-muted-foreground'
                          )}
                        >
                          {emp.status || 'ACTIVE'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Hierarchy Flow Banner */}
                  <div className="bg-muted/40 dark:bg-muted/20 p-2.5 rounded-xl border border-border/60 space-y-1">
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

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate text-[11px]">{emp.email || `${emp.firstName?.toLowerCase()}@gmail.com`}</span>
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

