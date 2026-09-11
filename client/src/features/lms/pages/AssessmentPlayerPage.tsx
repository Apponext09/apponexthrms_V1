import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  useLmsAssessment,
  useLmsCourse,
  useSubmitLmsAssessment,
  useLmsAttempts,
} from '../api/useLms';
import { useAuthStore } from '@/features/auth/store/authStore';
import { toast } from 'sonner';

export function AssessmentPlayerPage() {
  const { courseId, id } = useParams<{ courseId?: string; id?: string }>();
  const [searchParams] = useSearchParams();
  const enrollmentId = searchParams.get('enrollmentId') ? Number(searchParams.get('enrollmentId')) : undefined;

  const navigate = useNavigate();
  const location = useLocation();
  const isLmsAdmin = location.pathname.startsWith('/lms');
  const user = useAuthStore((s) => s.user);
  const employeeId = user?.employeeId ? Number(user.employeeId) : Number(user?.id);

  const cId = Number(courseId || id);
  const { data: assessment, isLoading } = useLmsAssessment(cId);
  const { data: course } = useLmsCourse(cId);
  const { data: attempts = [] } = useLmsAttempts(assessment?.id || 0, employeeId);

  const submitMutation = useSubmitLmsAssessment();

  // Test Player State
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(1800);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resultSummary, setResultSummary] = useState<any>(null);

  // Initialize timer
  useEffect(() => {
    if (assessment?.timerSeconds) {
      setTimeLeft(assessment.timerSeconds);
    }
  }, [assessment]);

  // Countdown timer
  useEffect(() => {
    if (isSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isSubmitted]);

  const questions = assessment?.questions || [];
  const currentQ = questions[currentQIndex];

  const handleSelectOption = (qId: string | number, optIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [String(qId)]: optIdx,
    }));
  };

  const handleSubmit = async () => {
    if (!assessment) return;

    try {
      const res = await submitMutation.mutateAsync({
        assessmentId: assessment.id,
        enrollmentId: enrollmentId || null,
        answers: selectedAnswers,
        employeeId,
      });

      setResultSummary(res);
      setIsSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit test');
    }
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  if (isLoading) {
    return <div className="p-12 text-center text-xs text-muted-foreground">Loading test questions...</div>;
  }

  if (!assessment || questions.length === 0) {
    return (
      <div className="p-12 text-center bg-card border border-border rounded-xl max-w-md mx-auto mt-12 space-y-3">
        <HelpCircle className="w-12 h-12 text-muted-foreground/40 mx-auto" />
        <h3 className="text-base font-bold text-foreground">No Assessment Available</h3>
        <p className="text-xs text-muted-foreground">
          This course does not currently require an MCQ assessment or it is being updated.
        </p>
        <Button size="sm" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 bg-background">
      {/* Test Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold mb-1">
            {course?.title || 'Knowledge Assessment'}
          </Badge>
          <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" /> {assessment.title || 'Course Examination'}
          </h2>
          <p className="text-xs text-muted-foreground">
            Passing Score: <span className="font-bold text-foreground">{assessment.passPercentage || 60}%</span> •{' '}
            Attempt Limit: <span className="font-bold text-foreground">{assessment.attemptLimit || 3}</span>
          </p>
        </div>

        {/* Live Timer */}
        <div className="flex items-center gap-3 bg-muted/40 border border-border/80 rounded-xl p-3 px-4">
          <Clock className={`w-5 h-5 ${timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-primary'}`} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Time Remaining</p>
            <p className={`text-lg font-black font-mono ${timeLeft < 300 ? 'text-rose-600' : 'text-foreground'}`}>
              {formatTimer(timeLeft)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Question Content (Left) + Question Navigator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Question Panel (2 Cols) */}
        <Card className="lg:col-span-2 border border-border/80 rounded-xl shadow-2xs bg-card flex flex-col justify-between">
          <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-center justify-between">
            <Badge variant="secondary" className="text-xs font-bold">
              Question {currentQIndex + 1} of {questions.length}
            </Badge>
            <span className="text-[11px] text-muted-foreground font-semibold">
              {answeredCount} of {questions.length} Answered
            </span>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {currentQ && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-foreground leading-relaxed">
                  {currentQ.question}
                </h3>

                {/* Options List */}
                <div className="space-y-2.5 pt-2">
                  {currentQ.options?.map((opt: string, optIdx: number) => {
                    const qId = currentQ.id !== undefined ? String(currentQ.id) : String(currentQIndex);
                    const isSelected = selectedAnswers[qId] === optIdx;

                    return (
                      <div
                        key={optIdx}
                        onClick={() => handleSelectOption(qId, optIdx)}
                        className={`p-3.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-foreground font-bold shadow-xs'
                            : 'bg-muted/20 border-border/70 hover:bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full border text-[11px] font-bold flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'border-border bg-card text-muted-foreground'
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <span>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Previous / Next / Submit Action */}
            <div className="pt-6 border-t border-border/60 flex items-center justify-between">
              <Button
                size="sm"
                variant="outline"
                disabled={currentQIndex === 0}
                onClick={() => setCurrentQIndex(currentQIndex - 1)}
                className="text-xs font-bold gap-1 rounded-lg"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Previous
              </Button>

              {currentQIndex < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setCurrentQIndex(currentQIndex + 1)}
                  className="text-xs font-bold gap-1 rounded-lg bg-primary"
                >
                  Next Question <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  className="text-xs font-bold gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4" /> Submit Assessment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Palette / Navigator (1 Col) */}
        <Card className="border border-border/80 rounded-xl shadow-2xs bg-card h-fit">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-sm font-bold text-foreground">Question Navigator</CardTitle>
            <CardDescription className="text-[11px]">Click a question number to jump</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const qId = q.id !== undefined ? String(q.id) : String(idx);
                const isAnswered = selectedAnswers[qId] !== undefined;
                const isCurrent = currentQIndex === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQIndex(idx)}
                    className={`h-9 rounded-lg text-xs font-bold border transition-all ${
                      isCurrent
                        ? 'ring-2 ring-primary ring-offset-2 bg-primary text-primary-foreground'
                        : isAnswered
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-border/60 space-y-1.5 text-[11px] text-muted-foreground font-semibold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span>Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-muted border border-border" />
                <span>Unanswered ({questions.length - answeredCount})</span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={handleSubmit}
              className="w-full text-xs font-bold gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4" /> Finish & Submit Test
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Test Result Summary Modal ─────────────────────────── */}
      <Dialog open={isSubmitted} onOpenChange={() => {}}>
        <DialogContent className="max-w-md text-center p-6 space-y-4">
          <div className="mx-auto p-4 rounded-2xl w-fit bg-primary/10">
            {resultSummary?.passed ? (
              <Award className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-amber-500" />
            )}
          </div>

          <DialogHeader>
            <DialogTitle className="text-xl font-black text-foreground">
              {resultSummary?.passed ? 'Congratulations! You Passed!' : 'Assessment Complete'}
            </DialogTitle>
          </DialogHeader>

          <div className="p-4 bg-muted/20 border border-border/80 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground">Final Score</span>
              <span className="text-lg font-black text-foreground">{resultSummary?.score}%</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Required Pass Mark</span>
              <span>{assessment.passPercentage || 60}%</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Questions Answered Correctly</span>
              <span>
                {resultSummary?.earnedMarks} / {resultSummary?.totalMarks}
              </span>
            </div>
          </div>

          {resultSummary?.passed ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              🎉 Your verified digital certificate has been automatically issued and added to your profile!
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              You did not meet the passing percentage. Review the course lessons and try again.
            </p>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-center pt-2 w-full">
            {resultSummary?.passed ? (
              <Button
                onClick={() => navigate(isLmsAdmin ? '/lms/certificates' : '/employee/lms/certificates')}
                className="w-full text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
              >
                <Award className="w-4 h-4" /> View & Download Certificate
              </Button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => navigate(isLmsAdmin ? '/lms/my-learning' : '/employee/lms/my-learning')}
                  className="flex-1 text-xs font-bold gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> Return to Lessons
                </Button>
                <Button
                  onClick={() => {
                    setIsSubmitted(false);
                    setSelectedAnswers({});
                    setCurrentQIndex(0);
                    if (assessment?.timerSeconds) {
                      setTimeLeft(assessment.timerSeconds);
                    }
                  }}
                  className="flex-1 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-md"
                >
                  <RotateCcw className="w-4 h-4" /> Retake Test Now
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
