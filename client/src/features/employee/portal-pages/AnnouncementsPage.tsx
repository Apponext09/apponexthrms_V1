import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Calendar, Users, Star } from 'lucide-react';

export default function AnnouncementsPage() {
  const posts = [
    { id: 1, title: 'Independence Day Celebrations!', content: 'All employees are invited to join our annual flag hoisting ceremony followed by interactive cultural events and lunch on August 14th in the office cafeteria.', author: 'HR Department', date: '2026-07-22', badge: 'Event' },
    { id: 2, title: 'Quarterly Town Hall Meeting - Q1', content: 'Our Q1 Town Hall meeting is scheduled for July 30th at 03:00 PM. CEO Rajesh Sharma will cover organization growth, current roadmap accomplishments, and announce Q2 goal guidelines.', author: 'Management Office', date: '2026-07-18', badge: 'Meeting' },
  ];

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" /> Announcements & Bulletins
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              News
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Stay updated with official company news, events, town halls, and leadership broadcasts.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="border border-border/80 rounded-xl shadow-2xs bg-card hover:border-primary/40 transition-colors">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-5 flex flex-row justify-between items-start space-y-0">
              <div className="flex gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-snug">{post.title}</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">By {post.author} • {post.date}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20">
                {post.badge}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-2">
              <p className="text-xs text-muted-foreground leading-relaxed pl-12">{post.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
