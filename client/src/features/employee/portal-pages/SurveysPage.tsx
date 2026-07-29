import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ClipboardList, CheckCircle2, MessageSquare } from 'lucide-react';
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
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> Feedback Surveys
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-bold">
              Anonymous
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Share your thoughts to help shape team culture and workplace policies.
          </p>
        </div>
      </div>

      {!submitted ? (
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card">
          <CardHeader className="pb-3 pt-4 px-4 sm:px-5 border-b border-border/60">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <ClipboardList className="w-4 h-4 text-primary" /> Q2 Work Culture Survey
            </CardTitle>
            <CardDescription className="text-xs">
              Tell us about your experience with work-life balance and infrastructure.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2.5">
                <Label className="text-xs font-bold text-foreground block">
                  1. How would you rate the current support for remote work tools and infrastructure? (1 to 5 Stars)
                </Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`h-9 w-9 rounded-lg border font-bold text-xs transition-all ${
                        rating === star
                          ? 'bg-primary border-primary text-primary-foreground shadow-2xs'
                          : 'bg-muted/50 border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      {star}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="comment" className="text-xs font-bold text-foreground block">
                  2. What are the key improvements you would like to see in our monthly operations?
                </Label>
                <textarea
                  id="comment"
                  rows={4}
                  required
                  placeholder="Share constructive feedback here..."
                  className="flex w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-muted-foreground/60"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-lg shadow-2xs">
                Submit Survey Response
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card text-center py-10">
          <CardContent className="space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Survey Completed!</h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Your response has been recorded anonymously. Thank you for helping us build a better workplace culture.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
