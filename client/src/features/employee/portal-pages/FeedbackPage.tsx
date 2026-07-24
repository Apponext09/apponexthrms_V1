import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MessageSquare, Award, Send, Users, Check } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="pb-3 border-b flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-foreground">Feedback Hub</h2>
          <p className="text-xs text-muted-foreground">Appreciate colleagues, request supervisor reviews, and read feedback logs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Peer Recognition */}
        <div className="lg:col-span-1">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Award className="w-4.5 h-4.5 text-violet-500" /> Share Kudos / Appreciation
              </CardTitle>
              <CardDescription>Recognize a coworker's efforts publicly.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendAppreciation} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="peerEmail">Recipient Email</Label>
                  <Input
                    id="peerEmail"
                    placeholder="colleague@apponext.com"
                    value={form.recipient}
                    onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="kudosMsg">Appreciation Note</Label>
                  <textarea
                    id="kudosMsg"
                    rows={4}
                    placeholder="Tell them why they are awesome..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
                <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold gap-1">
                  <Send className="w-4 h-4" /> Send Kudos
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Feedback Feed */}
        <div className="lg:col-span-2">
          <Card className="border rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-violet-500" /> Received Feedback & Kudos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-4">
                {feedbacks.map((f) => (
                  <div key={f.id} className="p-4 bg-muted/40 border rounded-2xl relative">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-xs">
                          {f.from.split(' ').map(w => w[0]).join('')}
                        </div>
                        <span className="text-xs font-bold text-foreground">{f.from}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{f.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-3">{f.message}</p>
                    <span className="absolute right-4 top-4 text-[9px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
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
