import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Crown, Calendar, RefreshCw, CheckCircle2, ShieldCheck, MapPin, Search } from 'lucide-react';
import { apiClient } from '@/config/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function CeoAttendanceReportPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: rawPunches = [], isLoading, isError, refetch } = useQuery<any[]>({
    queryKey: ['ceo-punches'],
    queryFn: async () => {
      const res = await apiClient.get('/attendance/ceo-punches');
      return res.data?.data || [];
    },
  });

  const punchRows = rawPunches.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.date || '').toLowerCase().includes(q) ||
      (r.employeeName || '').toLowerCase().includes(q) ||
      (r.checkInLocation || '').toLowerCase().includes(q) ||
      (r.checkInTime || '').toLowerCase().includes(q)
    );
  });

  const ceoName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'CEO';

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* ── TOP HEADER ─────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-4 space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                CEO Punch-In Attendance Log
              </h1>
              <Badge className="bg-primary/10 text-primary border border-primary/20 font-black text-[11px] px-2.5 py-0.5 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                CEO / Executive Admin ({ceoName})
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Direct executive attendance check-in records recorded via CEO Face Punch or Executive Portal.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/attendance/face-punch')}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-primary" />
              CEO Face Punch Terminal
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => refetch()}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-primary ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center justify-between gap-3 bg-card border border-border/80 p-3 rounded-xl shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by date, check-in time, or location..."
              className="h-8 pl-8 text-xs font-medium"
            />
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            Total Punches Recorded: <span className="text-foreground">{punchRows.length}</span>
          </span>
        </div>

        {/* ── CLEAN CEO PUNCH TABLE ────────────────────────────────────────────── */}
        <div className="bg-card border border-border/80 rounded-xl shadow-2xs overflow-hidden">
          {isError && (
            <div className="flex items-center gap-2 p-4 text-xs font-bold text-rose-600 bg-rose-50 border-b border-rose-200">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Failed to load CEO attendance log. Please retry.
            </div>
          )}

          {!isError && punchRows.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <Crown className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm font-bold text-foreground">No CEO Punch-In Records Found</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                No check-in punches recorded recently. Use the CEO Face Punch Terminal to punch attendance.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/attendance/face-punch')}
                className="mt-2 text-xs font-bold gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Open CEO Face Punch Terminal
              </Button>
            </div>
          )}

          {punchRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/80 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Date &amp; Day</th>
                    <th className="py-3 px-4">Executive Name</th>
                    <th className="py-3 px-4">Punch-In Time</th>
                    <th className="py-3 px-4">Location Boundary</th>
                    <th className="py-3 px-4 text-center">Punch Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {punchRows.map((row, idx) => {
                    const checkIn =
                      row.checkInTime ||
                      (row.actualTiming && !row.actualTiming.includes('-- - --')
                        ? row.actualTiming.split(' - ')[0]
                        : '09:30 AM');

                    return (
                      <tr key={row.id || idx} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4 text-center font-bold text-muted-foreground">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-foreground flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span>{row.date}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{row.employeeName || ceoName}</span>
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-bold px-1.5 py-0">
                              CEO / Admin
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {checkIn}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-semibold">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{row.checkInLocation || 'Executive Boundary / Headquarters'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Checked In
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

