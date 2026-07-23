import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ClipboardList, Award, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SurveysPage() {
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === null) {
      toast.error('Please pick a rating score.');
      return;
    }
    toast.success('Thank you for completing the survey!');
    setSubmitted(true);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="pb-3 border-b">
        <h2 className="text-lg font-bold text-foreground">Employee Feedback Surveys</h2>
        <p className="text-xs text-muted-foreground">Share your opinions anonymously to help improve office culture.</p>
      </div>

      {!submitted ? (
        <Card className="border rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ClipboardList className="w-4.5 h-4.5 text-violet-500" /> Q2 Work Culture Survey
            </CardTitle>
            <CardDescription>Tell us about your experience with work-life balance and remote work infrastructure.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-foreground block">
                  1. How would you rate the current support for remote work tools and infrastructure? (1 to 5 Stars)
                </Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`h-10 w-10 rounded-xl border flex items-center justify-center font-bold text-sm transition-all ${
                        rating === star
                          ? 'bg-violet-600 border-violet-700 text-white shadow'
                          : 'bg-card text-foreground hover:bg-muted'
                      }`}
                    >
                      {star}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comment" className="text-xs font-bold text-foreground block">
                  2. What are the key improvements you would like to see in our monthly operations?
                </Label>
                <textarea
                  id="comment"
                  rows={4}
                  required
                  placeholder="Share constructive feedback here..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-5 rounded-xl shadow">
                Submit Survey
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="border rounded-2xl shadow-sm text-center py-8">
          <CardContent className="space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-foreground">Survey Completed!</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Your response has been saved anonymously. We appreciate your efforts to improve Apponext HRMS company policies.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
