import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Info, Palmtree, Landmark, Building2, CalendarDays } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface UpcomingHoliday {
  id: number;
  holidayName?: string;
  holiday_name?: string;
  holidayDate?: string;
  holiday_date?: string;
  holidayType?: 'national' | 'regional' | 'company' | 'restricted';
  holiday_type?: 'national' | 'regional' | 'company' | 'restricted';
  isOptional?: boolean;
  is_optional?: boolean;
}

export function UpcomingHolidaysWidget() {
  const [holidays, setHolidays] = useState<UpcomingHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchHolidays = async () => {
      try {
        setLoading(true);
        // Using limit=5 to ensure we don't break the UI with too many rows
        const res = await apiClient.get('/settings/holidays/upcoming?limit=5');
        if (mounted && res.data?.success) {
          setHolidays(res.data.data || []);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          console.error('Error fetching upcoming holidays:', err);
          setError('Could not load upcoming holidays.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchHolidays();
    return () => { mounted = false; };
  }, []);

  const getDaysDiff = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const holidayDate = new Date(dateStr);
    holidayDate.setHours(0, 0, 0, 0);

    const diffTime = holidayDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCountdownLabel = (diffDays: number) => {
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} Days`;
  };

  const getHolidayIcon = (type: string) => {
    switch (type) {
      case 'national': return <Landmark className="w-4 h-4 text-rose-500" />;
      case 'regional': return <Palmtree className="w-4 h-4 text-emerald-500" />;
      case 'company': return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'restricted': return <CalendarDays className="w-4 h-4 text-amber-500" />;
      default: return <Calendar className="w-4 h-4 text-violet-500" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      full: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      day: date.toLocaleDateString('en-US', { weekday: 'long' })
    };
  };

  return (
    <Card className="shadow-sm border-border overflow-hidden h-full flex flex-col">
      <CardHeader className="bg-muted/30 pb-3 p-4 flex flex-row items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-600 rounded-lg">
            <Palmtree className="w-4 h-4" />
          </div>
          <CardTitle className="text-sm font-extrabold uppercase tracking-wide">
            Upcoming Holidays
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 items-center">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Info className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <p>{error}</p>
          </div>
        ) : holidays.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <p>No upcoming holidays found.</p>
          </div>
        ) : (
          <div className="divide-y">
            {holidays.map(holiday => {
              const rawDate = holiday.holidayDate || holiday.holiday_date || '';
              const diffDays = getDaysDiff(rawDate);
              const isPast = diffDays < 0;
              const { full: dateFormatted, day: dayName } = formatDate(rawDate);
              
              const hType = holiday.holidayType || holiday.holiday_type || 'company';
              const hName = holiday.holidayName || holiday.holiday_name;
              const isOpt = holiday.isOptional ?? holiday.is_optional ?? false;

              return (
                <div key={holiday.id} className={`p-4 flex items-center justify-between transition-colors hover:bg-muted/20 ${isPast ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                      {getHolidayIcon(hType)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        {hName}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium mt-0.5">
                        {dateFormatted} • {dayName}
                      </span>
                      {isOpt && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1 uppercase tracking-wider">
                          Restricted / Optional
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {!isPast && (
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={cn(
                        "font-mono font-black uppercase text-[10px] tracking-wider",
                        diffDays <= 3 ? "border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:border-violet-700 dark:text-violet-300" : "text-slate-500 border-slate-200 dark:border-slate-800"
                      )}>
                        {getCountdownLabel(diffDays)}
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
