import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Megaphone, Calendar, Users, Star } from 'lucide-react';

export default function AnnouncementsPage() {
  const posts = [
    { id: 1, title: 'Independence Day Celebrations!', content: 'All employees are invited to join our annual flag hoisting ceremony followed by interactive cultural events and lunch on August 14th in the office cafeteria.', author: 'HR Department', date: '2026-07-22', badge: 'Event' },
    { id: 2, title: 'Quarterly Town Hall Meeting - Q1', content: 'Our Q1 Town Hall meeting is scheduled for July 30th at 03:00 PM. CEO Rajesh Sharma will cover organization growth, current roadmap accomplishments, and announce Q2 goal guidelines.', author: 'Management Office', date: '2026-07-18', badge: 'Meeting' },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="pb-3 border-b">
        <h2 className="text-lg font-bold text-foreground">Announcements</h2>
        <p className="text-xs text-muted-foreground">Keep updated with the latest company news, events, and leadership emails.</p>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="border rounded-2xl shadow-sm hover:border-violet-600 transition-colors">
            <CardHeader className="pb-2 flex flex-row justify-between items-start space-y-0">
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-snug">{post.title}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">By {post.author} • {post.date}</p>
                </div>
              </div>
              <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300 border border-violet-200">
                {post.badge}
              </span>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-xs text-muted-foreground leading-relaxed pl-12">{post.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
