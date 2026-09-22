import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Info, Palmtree, Landmark, Building2, CalendarDays } from 'lucide-react';
import { fetchEmployeeHolidays, type EmployeeHoliday } from '../holidayData';

export function UpcomingHolidaysWidget() {
  const [holidays, setHolidays] = useState<EmployeeHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchHolidays = async () => {
      try {
        setLoading(true);
        const list = await fetchEmployeeHolidays();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcoming = list
          .filter((holiday) => new Date(`${holiday.holidayDate}T00:00:00`).getTime() >= today.getTime())
          .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate));
        if (mounted) {
          setHolidays(upcoming);
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
    const holidayDate = new Date(`${dateStr}T00:00:00`);
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
    const date = new Date(`${dateStr}T00:00:00`);
    return {
      full: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      day: date.toLocaleDateString('en-US', { weekday: 'long' })
    };
  };

  return (
    <Card className="border border-border/80 rounded-xl shadow-2xs bg-card overflow-hidden h-full flex flex-col">
      <CardHeader className="bg-muted/20 pb-3 p-3.5 flex flex-row items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
            <Palmtree className="w-4 h-4" />
          </div>
          <CardTitle className="text-xs font-bold text-foreground">
            Upcoming Holidays
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3.5 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-3 items-center">
                <Skeleton className="w-9 h-9 rounded-lg" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Info className="w-7 h-7 text-muted-foreground/40" />
            <p>{error}</p>
          </div>
        ) : holidays.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Calendar className="w-7 h-7 text-muted-foreground/40" />
            <p>No upcoming holidays found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {holidays.map(holiday => {
              const rawDate = holiday.holidayDate;
              const diffDays = getDaysDiff(rawDate);
              const isPast = diffDays < 0;
              const { full: dateFormatted, day: dayName } = formatDate(rawDate);
              
              const hType = holiday.holidayType;
              const hName = holiday.holidayName;
              const isOpt = holiday.isOptional;

              return (
                <div key={holiday.id} className={`p-3 sm:p-3.5 flex items-center justify-between transition-colors hover:bg-muted/30 ${isPast ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-muted rounded-lg shrink-0 mt-0.5">
                      {getHolidayIcon(hType)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-foreground">
                        {hName}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        {dateFormatted} • {dayName}
                      </span>
                      {isOpt && (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 uppercase tracking-wider">
                          Restricted / Optional
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20 shrink-0">
                    {getCountdownLabel(diffDays)}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
