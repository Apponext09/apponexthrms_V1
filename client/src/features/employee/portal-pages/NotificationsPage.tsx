import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Bell, Shield, Mail, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([
    { id: 1, text: 'Your reimbursement claim (TKT-101) was successfully approved by HR.', date: '2026-07-22', read: false },
    { id: 2, text: 'Attendance correction for 2026-07-15 is approved.', date: '2026-07-16', read: true },
  ]);

  const handleMarkAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    toast.success('All notifications marked as read.');
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Notifications</h2>
          <p className="text-xs text-muted-foreground">Monitor system alerts, status corrections, and announcements.</p>
        </div>
        <Button onClick={handleMarkAllRead} variant="outline" size="sm" className="font-bold gap-1 rounded-lg">
          <CheckCheck className="w-4 h-4" /> Mark all read
        </Button>
      </div>

      <div className="space-y-4">
        {notifs.map((n) => (
          <Card key={n.id} className={`border rounded-2xl shadow-sm hover:border-violet-600 transition-colors ${!n.read ? 'bg-violet-50/20 dark:bg-violet-950/20 border-violet-200' : ''}`}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                !n.read ? 'bg-violet-100 dark:bg-violet-950 text-violet-700' : 'bg-muted text-muted-foreground'
              }`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-foreground font-semibold leading-relaxed">{n.text}</p>
                <span className="text-[10px] text-muted-foreground mt-1 block">{n.date}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
