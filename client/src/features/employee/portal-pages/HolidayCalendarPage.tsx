import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Palmtree, AlertCircle, Smile, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api';

export interface Holiday {
  id: number;
  holiday_name: string;
  holiday_date: string;
  holiday_type: 'national' | 'regional' | 'company' | 'restricted';
  is_optional: boolean;
}

export default function HolidayCalendarPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        setLoading(true);
        setError(null);
        let list: any[] = [];

        try {
          const res = await apiClient.get('/settings/holidays/my-calendar');
          if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
            list = res.data.data;
          }
        } catch (e) {
          console.warn('my-calendar endpoint error, trying leaves/calendar:', e);
        }

        if (list.length === 0) {
          try {
            const calRes = await apiClient.get('/leaves/calendar');
            if (calRes.data?.data?.holidays && Array.isArray(calRes.data.data.holidays)) {
              list = calRes.data.data.holidays;
            }
          } catch (e) {
            console.warn('leaves/calendar fallback error:', e);
          }
        }

        if (list.length === 0) {
          try {
            const masterRes = await apiClient.get('/master/holiday-calendars');
            const cals = Array.isArray(masterRes.data?.data) ? masterRes.data.data : (masterRes.data?.data?.items || []);
            if (cals.length > 0) {
              const activeCal = cals.find((c: any) => c.status === 'Published') || cals[0];
              if (activeCal?.id) {
                const detail = await apiClient.get(`/master/holiday-calendars/${activeCal.id}`);
                if (detail.data?.data?.holidays && Array.isArray(detail.data.data.holidays)) {
                  list = detail.data.data.holidays;
                }
              }
            }
          } catch (e) {
            console.warn('master calendars fallback error:', e);
          }
        }

        const normalized: Holiday[] = (list || []).map((h: any) => ({
          id: h.id,
          holiday_name: h.holiday_name || h.holidayName || h.name || 'Holiday',
          holiday_date: h.holiday_date || h.holidayDate || h.date,
          holiday_type: (h.holiday_type || h.holidayType || (h.is_optional ? 'restricted' : 'national')).toLowerCase(),
          is_optional: Boolean(h.is_optional ?? h.isOptional),
        }));

        setHolidays(normalized);
      } catch (err) {
        console.error('Error fetching holiday calendar:', err);
        setError('Failed to load holidays.');
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingCount = holidays.filter(h => new Date(h.holiday_date) >= today).length;

  const getHolidayTypeLabel = (type: string, isOptional: boolean) => {
    if (isOptional) return 'Restricted';
    switch (type) {
      case 'national': return 'National';
      case 'regional': return 'Regional';
      case 'company': return 'Company';
      default: return 'Public';
    }
  };

  const getTypeBadgeClass = (type: string, isOptional: boolean) => {
    if (isOptional) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
    switch (type) {
      case 'national': return 'bg-primary/10 text-primary border-primary/20';
      case 'regional': return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20';
      case 'company': return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20';
      default: return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Holiday Calendar
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Official holidays for the financial year {new Date().getFullYear()}.
          </p>
        </div>
        {!loading && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold shrink-0">
            <Smile className="w-3.5 h-3.5" />
            {upcomingCount} Upcoming
          </div>
        )}
      </div>

      {/* Stats Row */}
      {!loading && !error && holidays.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {[
            { label: 'Total Holidays', value: holidays.length, cls: 'text-foreground', bg: 'bg-muted/50 text-muted-foreground' },
            { label: 'Upcoming', value: upcomingCount, cls: 'text-primary', bg: 'bg-primary/10 text-primary' },
            { label: 'National', value: holidays.filter(h => h.holiday_type === 'national' && !h.is_optional).length, cls: 'text-primary', bg: 'bg-primary/10 text-primary' },
            { label: 'Optional', value: holidays.filter(h => h.is_optional).length, cls: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
          ].map(({ label, value, cls, bg }) => (
            <Card key={label} className="p-4 bg-card border border-border/80 rounded-xl shadow-2xs">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className={`text-xl font-black mt-0.5 ${cls}`}>{value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Holiday Roster Table */}
      <Card className="border border-border/80 rounded-xl shadow-2xs overflow-hidden bg-card">
        <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
            <Calendar className="w-4 h-4 text-primary" /> Holiday Roster
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin text-primary" />
              <p className="text-xs font-bold">Loading holiday calendar...</p>
            </div>
          ) : error ? (
            <div className="p-10 text-center text-rose-500 flex flex-col items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <p className="text-xs font-medium">{error}</p>
            </div>
          ) : holidays.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Palmtree className="w-8 h-8 opacity-40" />
              <p className="text-xs font-medium">No holidays configured for your location yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">#</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Holiday Name</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Day</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Type</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-muted-foreground px-4 py-3">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h, i) => {
                  const hDate = new Date(h.holiday_date);
                  const isPast = hDate < new Date(new Date().setHours(0, 0, 0, 0));
                  const isToday = hDate.toDateString() === new Date().toDateString();
                  return (
                    <TableRow
                      key={h.id || i}
                      className={`hover:bg-muted/20 transition-colors border-b border-border/50 ${isPast ? 'opacity-55' : ''}`}
                    >
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground font-mono">{i + 1}</TableCell>
                      <TableCell className="px-4 py-3 text-xs font-bold text-foreground">{h.holiday_name}</TableCell>
                      <TableCell className="px-4 py-3 text-xs font-mono font-semibold text-foreground">
                        {hDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs text-muted-foreground font-semibold">
                        {hDate.toLocaleDateString('en-US', { weekday: 'long' })}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${getTypeBadgeClass(h.holiday_type, h.is_optional)}`}>
                          {getHolidayTypeLabel(h.holiday_type, h.is_optional)}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-xs">
                        {isToday ? (
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary text-primary-foreground">Today</span>
                        ) : isPast ? (
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground">Past</span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">Upcoming</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
