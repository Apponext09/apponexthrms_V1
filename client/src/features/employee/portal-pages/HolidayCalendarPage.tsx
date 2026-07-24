import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Palmtree, Sparkles, Smile } from 'lucide-react';

export default function HolidayCalendarPage() {
  const holidays = [
    { name: 'Independence Day', date: '2026-08-15', day: 'Saturday', type: 'National Holiday' },
    { name: 'Ganesh Chaturthi', date: '2026-09-14', day: 'Monday', type: 'Regional Holiday' },
    { name: 'Gandhi Jayanti', date: '2026-10-02', day: 'Friday', type: 'National Holiday' },
    { name: 'Diwali (Laxmi Puja)', date: '2026-11-08', day: 'Sunday', type: 'National Holiday' },
    { name: 'Christmas Day', date: '2026-12-25', day: 'Friday', type: 'National Holiday' },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Holiday Calendar</h2>
          <p className="text-xs text-muted-foreground">List of official holidays for the financial year 2026-27.</p>
        </div>
        <div className="flex items-center gap-1 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-lg border border-violet-200 text-xs font-bold">
          <Smile className="w-4 h-4" /> 5 Upcoming Holidays
        </div>
      </div>

      <Card className="border rounded-2xl shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-violet-500" /> Holiday Roster (Remaining)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
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
              {holidays.map((h, i) => (
                <TableRow key={i}>
                  <TableCell className="px-6 py-4 text-xs font-semibold">{h.name}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-mono font-medium">{new Date(h.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                  <TableCell className="px-6 py-4 text-xs font-semibold">{h.day}</TableCell>
                  <TableCell className="px-6 py-4 text-xs">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      h.type === 'National Holiday'
                        ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}>
                      {h.type}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
