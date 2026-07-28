import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Palmtree, Sparkles, Smile, AlertCircle } from 'lucide-react';
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
        const res = await apiClient.get('/settings/holidays/my-calendar');
        if (res.data?.success) {
          setHolidays(res.data.data || []);
        }
      } catch (err) {
        console.error('Error fetching holiday calendar:', err);
        setError('Failed to load holidays.');
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, []);

  const getUpcomingCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return holidays.filter(h => new Date(h.holiday_date) >= today).length;
  };

  const getHolidayTypeDisplay = (type: string, isOptional: boolean) => {
    if (isOptional) return 'Restricted / Optional';
    switch (type) {
      case 'national': return 'National Holiday';
      case 'regional': return 'Regional Holiday';
      case 'company': return 'Company Holiday';
      default: return 'Public Holiday';
    }
  };

  const getHolidayBadgeColor = (type: string, isOptional: boolean) => {
    if (isOptional) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    switch (type) {
      case 'national': return 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300';
      case 'regional': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300';
      case 'company': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
      default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Holiday Calendar</h2>
          <p className="text-xs text-muted-foreground">List of official holidays for the financial year {new Date().getFullYear()}.</p>
        </div>
        <div className="flex items-center gap-1 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg border border-violet-200 text-xs font-bold">
          <Smile className="w-4 h-4" /> {!loading && getUpcomingCount()} Upcoming Holidays
        </div>
      </div>

      <Card className="border rounded-2xl shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-violet-500" /> Holiday Roster
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm font-medium animate-pulse">Loading calendar...</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500 flex flex-col items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : holidays.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Palmtree className="w-8 h-8 opacity-50" />
              <p className="text-sm font-medium">No holidays configured for your location yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Holiday Name</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Date</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Day</TableHead>
                  <TableHead className="font-bold text-xs uppercase px-6 py-4">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h, i) => {
                  const hDate = new Date(h.holiday_date);
                  const isPast = hDate < new Date(new Date().setHours(0,0,0,0));
                  return (
                    <TableRow key={h.id || i} className={isPast ? 'opacity-60 bg-muted/20' : ''}>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{h.holiday_name}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-mono font-medium">{hDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                      <TableCell className="px-6 py-4 text-xs font-semibold">{hDate.toLocaleDateString('en-US', { weekday: 'long' })}</TableCell>
                      <TableCell className="px-6 py-4 text-xs">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${getHolidayBadgeColor(h.holiday_type, h.is_optional)}`}>
                          {getHolidayTypeDisplay(h.holiday_type, h.is_optional)}
                        </span>
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
