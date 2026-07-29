import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useManager } from '@/features/manager/hooks/useManager';
import {
  Users, Clock, CheckCircle2, Search, Mail, ShieldCheck, ChevronRight, UserCheck, Crown
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

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
    <div className="space-y-6 max-w-5xl pb-12">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">My Team</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {employees.length} team members under {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Manager'} ({teamLeadCount} Team Lead, {directEmployeeCount} Employees)
          </p>
        </div>
        <Button onClick={() => navigate('/manager/leaves/approvals')} className="bg-violet-600 hover:bg-violet-700 text-white text-sm">
          <CheckCircle2 className="h-4 w-4 mr-2" /> Leave Approvals
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Department Team', value: `${employees.length} Members`, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: 'Team Leads & Employees', value: `${teamLeadCount} Leads • ${directEmployeeCount} Emps`, icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Hierarchy Flow', value: 'Manager ➔ Lead ➔ Emp', icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-sm font-extrabold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by team lead, employee name, code, designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-input bg-card outline-none focus:border-violet-500 transition-colors shadow-2xs"
        />
      </div>

      {/* Team Member Cards displaying both Team Leads & Employees */}
      {isEmployeesLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading department team members...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No team members found matching search query.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp: any) => {
            const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
            const isLead = (emp.roleTag || '').toLowerCase().includes('lead') || (emp.designation || '').toLowerCase().includes('lead');
            
            const cardBg = isLead 
              ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-slate-900' 
              : 'border-border bg-card';
            
            const avatarStyle = isLead
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-indigo-100 text-indigo-800 border-indigo-200';

            return (
              <Card key={emp.id} className={`border shadow-sm hover:shadow-md transition-all ${cardBg}`}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0 border ${avatarStyle} shadow-2xs`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-bold text-base text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                        <Badge 
                          variant="secondary" 
                          className={`text-[9px] font-bold shrink-0 uppercase ${
                            isLead 
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                              : 'bg-indigo-100 text-indigo-900 border-indigo-200'
                          }`}
                        >
                          {isLead ? 'Team Lead' : 'Employee'}
                        </Badge>
                      </div>
                      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">{emp.designation || 'Sales Specialist'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{emp.departmentName || 'Sales & Marketing'}</p>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0 uppercase bg-slate-50 text-slate-700">
                          {emp.code || `EMP-${emp.id}`}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0.5 uppercase font-bold ${
                            (emp.status || 'active').toLowerCase() === 'active' 
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                              : 'border-slate-300 bg-slate-50 text-slate-600'
                          }`}
                        >
                          {emp.status || 'ACTIVE'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Manager ➔ Team Lead ➔ Employee Hierarchy Flow Banner */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-semibold flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-indigo-600" /> Hierarchy Position:
                      </span>
                      <span className="font-mono text-[10px] text-indigo-600 font-bold">{isLead ? 'Level-5 (Lead)' : 'Level-6 (Emp)'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-800 dark:text-slate-200 pt-0.5">
                      <span className="text-purple-700 dark:text-purple-300 font-bold">{user?.firstName || 'Manager'} (Mgr)</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">{isLead ? `${emp.firstName} (TL)` : `${emp.teamLeadName || 'TL'} (TL)`}</span>
                      {!isLead && (
                        <>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                          <span className="text-blue-700 dark:text-blue-300 font-bold">{emp.firstName} (Emp)</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{emp.email || `${emp.firstName?.toLowerCase()}@gmail.com`}</span>
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
