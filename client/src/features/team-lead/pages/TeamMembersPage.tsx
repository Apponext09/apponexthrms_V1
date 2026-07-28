import { useNavigate } from 'react-router-dom';
import { useTeam } from '../hooks/useTeam';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export function TeamMembersPage() {
  const navigate = useNavigate();
  const { members, isMembersLoading } = useTeam();
  const [search, setSearch] = useState('');

  const filtered = members.filter((emp: any) => {
    const q = search.toLowerCase();
    const name = `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.toLowerCase();
    const code = (emp.code || '').toLowerCase();
    const desig = (emp.designation || '').toLowerCase();
    const dept = (emp.department || '').toLowerCase();
    return !q || name.includes(q) || code.includes(q) || desig.includes(q) || dept.includes(q);
  });

  const colors = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Team Members</h1>
        <p className="text-sm text-muted-foreground mt-1">{members.length} members in your team</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-input bg-card outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {isMembersLoading ? (
        <p className="text-center py-12 text-sm text-muted-foreground">Loading team...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">No members found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((emp: any) => {
            const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();
            const colorIdx = (emp.id || 0) % colors.length;
            return (
              <Card key={emp.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${colors[colorIdx]}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-muted-foreground">{emp.designation || 'Employee'}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{emp.email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 uppercase font-semibold shrink-0 ${emp.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}
                  >
                    {emp.status || 'active'}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
