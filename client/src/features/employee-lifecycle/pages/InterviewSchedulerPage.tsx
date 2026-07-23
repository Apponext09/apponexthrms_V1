import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Phone,
  Code2,
  Users2,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InterviewScheduleForm } from '../components/InterviewScheduleForm';
import { InterviewFeedbackForm } from '../components/InterviewFeedbackForm';

interface Interview {
  id: number | string;
  applicantId: number;
  applicantName: string;
  interviewType: string;
  interviewDate: string;
  status: string;
  rating?: number;
  roundNumber: number;
  recommendation?: 'pass' | 'fail';
}

const MOCK_INTERVIEWS: Interview[] = [
  {
    id: 1,
    applicantId: 101,
    applicantName: 'John Doe',
    interviewType: 'phone_screen_screen',
    interviewDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    roundNumber: 1,
  },
  {
    id: 2,
    applicantId: 102,
    applicantName: 'Jane Smith',
    interviewType: 'technical',
    interviewDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    roundNumber: 2,
  },
  {
    id: 3,
    applicantId: 103,
    applicantName: 'Alex Johnson',
    interviewType: 'hr',
    interviewDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
    rating: 4,
    roundNumber: 1,
  },
  {
    id: 4,
    applicantId: 104,
    applicantName: 'Sarah Wilson',
    interviewType: 'final',
    interviewDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'scheduled',
    roundNumber: 3,
  },
];

const INTERVIEW_TYPE_ICONS = {
  phone_screen: Phone,
  technical: Code2,
  hr: Users2,
  manager: User,
  final: Zap,
};

const STATUS_COLORS = {
  scheduled: 'warning',
  completed: 'success',
  rejected: 'danger',
  passed: 'success',
  cancelled: 'muted',
};

export function InterviewSchedulerPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>(MOCK_INTERVIEWS);
  const [activeTab, setActiveTab] = useState('scheduled');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const scheduledInterviews = interviews.filter((i) => i.status === 'scheduled');
  const completedInterviews = interviews.filter((i) => i.status === 'completed');

  const getInterviewTypeIcon = (type: string) => {
    const Icon = INTERVIEW_TYPE_ICONS[type as keyof typeof INTERVIEW_TYPE_ICONS] || Calendar;
    return Icon;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const isToday = date.toDateString() === today.toDateString();
      const isTomorrow = date.toDateString() === tomorrow.toDateString();

      if (isToday) {
        return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      }
      if (isTomorrow) {
        return `Tomorrow, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
      }
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  const handleCreateInterview = (data: {
    applicantName: string;
    applicantId: number;
    jobOpeningId: number;
    interviewType: string;
    roundNumber: number;
    interviewDate: string;
    interviewerId: number;
  }) => {
    const newInterview: Interview = {
      id: Math.random().toString(),
      applicantId: data.applicantId,
      applicantName: data.applicantName,
      interviewType: data.interviewType,
      interviewDate: data.interviewDate,
      roundNumber: data.roundNumber,
      status: 'scheduled',
    };
    setInterviews([...interviews, newInterview]);
    setIsCreateOpen(false);
  };

  const handleSubmitFeedback = (data: { feedback: string; rating: number }) => {
    if (!selectedInterview) return;

    setInterviews(
      interviews.map((i) =>
        i.id === selectedInterview.id
          ? {
              ...i,
              status: 'completed',
              rating: data.rating,
              recommendation: data.rating >= 4 ? 'pass' : 'fail',
            }
          : i
      )
    );
    setIsFeedbackOpen(false);
    setSelectedInterview(null);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Interview Scheduler</h1>
          <p className="text-muted-foreground mt-1">Schedule, manage, and track candidate interviews</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Interview
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Interview</DialogTitle>
              <DialogDescription>Create a new interview with a candidate</DialogDescription>
            </DialogHeader>
            <InterviewScheduleForm onSubmit={handleCreateInterview} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Scheduled Interviews</p>
              <p className="text-3xl font-bold">{scheduledInterviews.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Completed Interviews</p>
              <p className="text-3xl font-bold">{completedInterviews.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Avg Rating</p>
              <p className="text-3xl font-bold">
                {completedInterviews.length > 0
                  ? (
                      completedInterviews.reduce((sum, i) => sum + (i.rating || 0), 0) / completedInterviews.length
                    ).toFixed(1)
                  : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Pass Rate</p>
              <p className="text-3xl font-bold">
                {completedInterviews.length > 0
                  ? `${Math.round((completedInterviews.filter((i) => i.recommendation === 'pass').length / completedInterviews.length) * 100)}%`
                  : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interview Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scheduled">Scheduled ({scheduledInterviews.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedInterviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4">
          {scheduledInterviews.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Scheduled Interviews"
              description="Schedule interviews to track candidate progress"
              action={
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule First Interview
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {scheduledInterviews.map((interview) => {
                const TypeIcon = getInterviewTypeIcon(interview.interviewType);
                return (
                  <Card key={interview.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 flex-1">
                          <div className="flex-shrink-0">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                              <TypeIcon className="h-6 w-6 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{interview.applicantName}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              Round {interview.roundNumber} - {interview.interviewType.charAt(0).toUpperCase() + interview.interviewType.slice(1)}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-3">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {formatDate(interview.interviewDate)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{interview.status}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedInterview(interview);
                              setIsFeedbackOpen(true);
                            }}
                          >
                            Add Feedback
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedInterviews.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No Completed Interviews"
              description="Completed interviews will appear here"
            />
          ) : (
            <div className="space-y-4">
              {completedInterviews.map((interview) => {
                const TypeIcon = getInterviewTypeIcon(interview.interviewType);

                return (
                  <Card key={interview.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4 flex-1">
                          <div className="flex-shrink-0">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                              <TypeIcon className="h-6 w-6 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{interview.applicantName}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              Round {interview.roundNumber} - {interview.interviewType.charAt(0).toUpperCase() + interview.interviewType.slice(1)}
                            </p>
                            <div className="flex flex-wrap gap-3 mt-3">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {formatDate(interview.interviewDate)}
                              </div>
                              {interview.rating && (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm">Rating:</span>
                                  <Badge variant="outline">{interview.rating}/5</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <CheckCircle2 className={`h-5 w-5 text-success`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Feedback Dialog */}
      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Interview Feedback</DialogTitle>
            <DialogDescription>
              Provide feedback and rating for {selectedInterview?.applicantName}
            </DialogDescription>
          </DialogHeader>
          {selectedInterview && (
            <InterviewFeedbackForm interview={selectedInterview} onSubmit={handleSubmitFeedback} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
