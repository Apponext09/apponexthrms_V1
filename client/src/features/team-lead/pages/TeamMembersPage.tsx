import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTeam } from '../hooks/useTeam';
import {
  Users, Clock, CheckCircle2, Search, Mail, ShieldCheck, ChevronRight, UserCheck, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function TeamMembersPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { members, isMembersLoading } = useTeam();
  const [search, setSearch] = useState('');

  const filtered = members.filter((emp: any) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const name = `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.toLowerCase();
    const code = (emp.code || '').toLowerCase();
    const desig = (emp.designation || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    return name.includes(q) || code.includes(q) || desig.includes(q) || dept.includes(q);
  });

  const activeCount = members.filter((e: any) => (e.status || 'active').toLowerCase() === 'active').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-6 rounded-2xl shadow-2xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Team Members Roster</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {members.length} assigned team members reporting under {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Team Lead'} ({activeCount} Active)
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => navigate('/leaves/approvals')}
            size="sm"
            className="rounded-xl font-bold text-xs gap-2 shadow-2xs bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Leave Approvals
          </Button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Total Team Roster',
            value: `${members.length} Members`,
            sub: 'Direct report staff',
            icon: Users,
            accentBg: 'bg-primary/10 text-primary border-primary/20',
          },
          {
            label: 'Active Status',
            value: `${activeCount} / ${members.length} Active`,
            sub: 'Operational readiness',
            icon: Clock,
            accentBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
          },
          {
            label: 'Hierarchy Flow',
            value: 'Manager ➔ Lead ➔ Emp',
            sub: 'Team lead supervision',
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

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by member name, employee code, designation, or department..."
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

      {/* Team Member Cards Grid */}
      {isMembersLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border/80 rounded-2xl">
          <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center mb-3 animate-pulse">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground">Loading assigned team members...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border/80 rounded-2xl px-4">
          <div className="h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-3">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-bold text-foreground">No team members found</p>
          <p className="text-xs text-muted-foreground mt-1">No staff members matching query "{search}"</p>
          <Button variant="outline" size="sm" onClick={() => setSearch('')} className="mt-4 text-xs font-bold rounded-xl">
            Clear Search Filter
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp: any) => {
            const firstName = emp.first_name || emp.firstName || '';
            const lastName = emp.last_name || emp.lastName || '';
            const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
            const isActive = (emp.status || 'active').toLowerCase() === 'active';

            return (
              <Card
                key={emp.id}
                className="border border-border/80 bg-card shadow-2xs hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Top Header */}
                  <div className="flex items-start gap-3.5">
                    <div className="h-11 w-11 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 border shadow-2xs bg-primary/10 text-primary border-primary/20">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <h3 className="font-black text-sm text-foreground truncate">{firstName} {lastName}</h3>
                        <Badge
                          className="text-[9px] font-bold shrink-0 uppercase border px-2 py-0.5 rounded-full bg-primary/10 text-primary border-primary/20"
                        >
                          Team Member
                        </Badge>
                      </div>
                      <p className="text-xs font-bold text-primary truncate mt-0.5">{emp.designation || 'Specialist'}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{emp.department || 'Department'}</p>

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
                        <UserCheck className="w-3 h-3 text-primary" /> Hierarchy Trail:
                      </span>
                      <span className="font-mono text-[9px] text-primary font-bold">Level-6 (Emp)</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-foreground pt-0.5 truncate">
                      <span className="text-foreground/80 font-bold">Dept Head (Mgr)</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-primary font-bold truncate">{user?.firstName || 'Team Lead'} (TL)</span>
                      <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground font-bold truncate">{firstName} (Emp)</span>
                    </div>
                  </div>

                  {/* Contact Row */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                      <span className="truncate text-[11px] font-medium">{emp.email || `${firstName.toLowerCase()}@company.com`}</span>
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
