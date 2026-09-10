import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MessageSquare, Award, Send, Users, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState([
    { id: 1, from: 'Aqil Jamadar', type: 'Appreciation', message: 'Outstanding work refactoring the profile components! The code is much cleaner.', date: '2026-07-22' },
    { id: 2, from: 'Asha Deshmukh', type: 'Review Comment', message: 'Good performance in Q1. Keep maintaining high standard deliverables.', date: '2026-07-15' },
  ]);

  const [form, setForm] = useState({
    recipient: '',
    message: '',
  });

  const handleSendAppreciation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipient || !form.message) {
      toast.error('Please fill in recipient email and appreciation message.');
      return;
    }

    toast.success(`Appreciation badge shared with ${form.recipient}!`);
    setForm({ recipient: '', message: '' });
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" /> Feedback Hub
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Peer Recognition
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Appreciate colleagues, request supervisor reviews, and read feedback logs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Send Peer Recognition Form */}
        <div className="lg:col-span-1">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
            <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Award className="w-4 h-4 text-primary" /> Share Kudos / Appreciation
              </CardTitle>
              <CardDescription className="text-xs">Recognize a coworker's efforts.</CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSendAppreciation} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="peerEmail" className="text-xs font-bold text-foreground">Recipient Email</Label>
                  <Input
                    id="peerEmail"
                    placeholder="colleague@apponext.com"
                    value={form.recipient}
                    onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                    className="h-9 text-xs font-semibold rounded-lg border-border bg-muted/50 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="kudosMsg" className="text-xs font-bold text-foreground">Appreciation Note</Label>
                  <textarea
                    id="kudosMsg"
                    rows={4}
                    placeholder="Tell them why they are awesome..."
                    className="flex w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground/60"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg gap-1.5 shadow-2xs">
                  <Send className="w-3.5 h-3.5" /> Send Kudos
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Feedback Feed */}
        <div className="lg:col-span-2">
          <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
            <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <MessageSquare className="w-4 h-4 text-primary" /> Received Feedback & Kudos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                {feedbacks.map((f) => (
                  <div key={f.id} className="p-3.5 bg-muted/20 border border-border/70 rounded-xl relative space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {f.from.split(' ').map(w => w[0]).join('')}
                        </div>
                        <span className="text-xs font-bold text-foreground">{f.from}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">{f.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-9">{f.message}</p>
                    <span className="absolute right-3.5 top-3.5 text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                      {f.type}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
