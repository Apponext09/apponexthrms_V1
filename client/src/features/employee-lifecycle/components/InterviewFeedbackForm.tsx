import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Star } from 'lucide-react';

interface Interview {
  id: string;
  candidateName: string;
  interviewType: string;
  roundNumber: number;
}

interface InterviewFeedbackFormProps {
  interview: Interview;
  onSubmit: (data: any) => void;
}

export function InterviewFeedbackForm({ interview, onSubmit }: InterviewFeedbackFormProps) {
  const [formData, setFormData] = useState({
    feedback: '',
    rating: 3,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.feedback.trim()) {
      newErrors.feedback = 'Feedback is required';
    } else if (formData.feedback.length < 10) {
      newErrors.feedback = 'Feedback must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      feedback: formData.feedback,
      rating: formData.rating,
    });

    setFormData({
      feedback: '',
      rating: 3,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Interview Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Candidate</p>
              <p className="font-semibold text-foreground">{interview.candidateName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Interview Type</p>
              <p className="font-semibold text-foreground capitalize">{interview.interviewType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Round</p>
              <p className="font-semibold text-foreground">Round {interview.roundNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rating Section */}
      <div className="space-y-3">
        <Label>Overall Rating</Label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormData({ ...formData, rating: value })}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  value <= formData.rating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              />
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">1 = Poor, 5 = Excellent</p>
      </div>

      {/* Feedback Section */}
      <div className="space-y-2">
        <Label htmlFor="feedback">Detailed Feedback</Label>
        <Textarea
          id="feedback"
          placeholder="Share your detailed feedback about the candidate's performance, strengths, areas for improvement, technical skills, communication, culture fit, etc."
          value={formData.feedback}
          onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
          rows={6}
          className={errors.feedback ? 'border-red-500' : ''}
        />
        <div className="flex justify-between text-xs">
          <div>
            {errors.feedback && <p className="text-red-500">{errors.feedback}</p>}
          </div>
          <p className="text-muted-foreground">{formData.feedback.length}/5000</p>
        </div>
      </div>


      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="text-sm text-blue-900 space-y-1">
              <p className="font-semibold">Important</p>
              <p>Your feedback will be recorded in the candidate's profile and reviewed by the hiring team. Please be objective and specific.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 pt-4">
        <Button type="submit" size="lg" className="flex-1">
          Submit Feedback
        </Button>
      </div>
    </form>
  );
}
