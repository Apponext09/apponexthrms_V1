import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useManager } from '@/features/manager/hooks/useManager';
import {
  Users, Clock, CheckCircle2, BarChart3,
  ArrowRight, Search, Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      emp.designation?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">My Team</h1>
          <p className="text-sm text-muted-foreground mt-1">{employees.length} members in your department</p>
        </div>
        <Button onClick={() => navigate('/leaves/approvals')} className="bg-violet-600 hover:bg-violet-700 text-white text-sm">
          <CheckCircle2 className="h-4 w-4 mr-2" /> Leave Approvals
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Members', value: employees.length, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: 'Present Today', value: Math.max(0, employees.length - 2), icon: Clock, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'On Leave', value: '2', icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
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
                  <p className="text-xl font-extrabold text-foreground">{stat.value}</p>
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
          placeholder="Search by name or designation..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-input bg-card outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {/* Team Member Cards */}
      {isEmployeesLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading team...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No team members found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp: any) => {
            const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
            const colors = ['bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-blue-100 text-blue-700', 'bg-rose-100 text-rose-700'];
            const colorIdx = (emp.id || 0) % colors.length;

            return (
              <Card key={emp.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${colors[colorIdx]} dark:opacity-80`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.designation || 'Employee'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 uppercase font-semibold ${emp.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                        >
                          {emp.status || 'active'}
                        </Badge>
                        {emp.employmentType && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 uppercase font-semibold">
                            {emp.employmentType}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <p className="text-[10px] text-muted-foreground truncate flex-1">{emp.email}</p>
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
