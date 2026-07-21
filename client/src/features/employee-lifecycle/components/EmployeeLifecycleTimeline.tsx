import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  UserPlus,
  FileText,
  Users,
  UserCheck,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  LogOut,
  Archive,
} from 'lucide-react';

interface LifecycleStage {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'completed' | 'current' | 'upcoming';
  date?: string;
  duration?: string;
}

interface EmployeeLifecycleTimelineProps {
  currentStage?: string;
  stages?: LifecycleStage[];
}

const defaultStages: LifecycleStage[] = [
  {
    id: 'recruitment',
    name: 'Recruitment',
    description: 'Job posting and candidate search',
    icon: <UserPlus className="h-5 w-5" />,
    status: 'completed',
    date: '2023-06-01',
    duration: '2 months',
  },
  {
    id: 'offer',
    name: 'Offer Letter',
    description: 'Offer created and accepted',
    icon: <FileText className="h-5 w-5" />,
    status: 'completed',
    date: '2023-08-15',
  },
  {
    id: 'preboarding',
    name: 'Preboarding',
    description: 'Pre-joining activities and documentation',
    icon: <Users className="h-5 w-5" />,
    status: 'completed',
    date: '2023-08-15',
    duration: '2 weeks',
  },
  {
    id: 'onboarding',
    name: 'Onboarding',
    description: 'First day and initial training',
    icon: <UserCheck className="h-5 w-5" />,
    status: 'completed',
    date: '2023-09-01',
    duration: '1 month',
  },
  {
    id: 'probation',
    name: 'Probation',
    description: 'Probation period and assessment',
    icon: <Clock className="h-5 w-5" />,
    status: 'completed',
    date: '2023-09-01',
    duration: '3 months',
  },
  {
    id: 'confirmation',
    name: 'Confirmation',
    description: 'Probation completion and confirmation',
    icon: <CheckCircle2 className="h-5 w-5" />,
    status: 'completed',
    date: '2023-12-01',
  },
  {
    id: 'active',
    name: 'Active Employee',
    description: 'Full-time employee status',
    icon: <TrendingUp className="h-5 w-5" />,
    status: 'current',
    date: '2023-12-01',
  },
  {
    id: 'growth',
    name: 'Growth & Development',
    description: 'Performance management and career growth',
    icon: <ArrowRight className="h-5 w-5" />,
    status: 'current',
  },
  {
    id: 'promotion',
    name: 'Promotion/Transfer',
    description: 'Career progression (optional)',
    icon: <ArrowRightLeft className="h-5 w-5" />,
    status: 'upcoming',
  },
  {
    id: 'exit',
    name: 'Exit',
    description: 'Resignation or retirement',
    icon: <LogOut className="h-5 w-5" />,
    status: 'upcoming',
  },
  {
    id: 'alumni',
    name: 'Alumni',
    description: 'Alumni network status',
    icon: <Archive className="h-5 w-5" />,
    status: 'upcoming',
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-success/10 text-success border-success/20';
    case 'current':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'upcoming':
      return 'bg-muted text-muted-foreground border-muted-foreground/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getIconColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-success';
    case 'current':
      return 'text-primary';
    case 'upcoming':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
};

const getBadgeVariant = (status: string) => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'current':
      return 'default';
    case 'upcoming':
      return 'secondary';
    default:
      return 'outline';
  }
};

export function EmployeeLifecycleTimeline({
  currentStage = 'active',
  stages = defaultStages,
}: EmployeeLifecycleTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Employee Lifecycle</CardTitle>
        <CardDescription>
          Complete journey from recruitment to alumni status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-success via-primary to-muted" />

          {/* Timeline items */}
          <div className="space-y-6">
            {stages.map((stage, index) => (
              <div key={stage.id} className="relative pl-16">
                {/* Timeline dot */}
                <div
                  className={`absolute left-0 top-1 w-12 h-12 rounded-full flex items-center justify-center border-4 border-background transition-all ${
                    stage.status === 'completed'
                      ? 'bg-success/10'
                      : stage.status === 'current'
                        ? 'bg-primary/10 ring-2 ring-primary ring-offset-2'
                        : 'bg-muted/10'
                  }`}
                >
                  <div className={getIconColor(stage.status)}>{stage.icon}</div>
                </div>

                {/* Timeline content */}
                <div className={`p-4 rounded-lg border-2 ${getStatusColor(stage.status)}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{stage.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{stage.description}</p>
                      {stage.date && (
                        <p className="text-xs text-muted-foreground mt-2">
                          📅 {new Date(stage.date).toLocaleDateString()}
                          {stage.duration && ` • ${stage.duration}`}
                        </p>
                      )}
                    </div>
                    <Badge variant={getBadgeVariant(stage.status) as any}>
                      {stage.status === 'completed' && 'Completed'}
                      {stage.status === 'current' && 'Current'}
                      {stage.status === 'upcoming' && 'Upcoming'}
                    </Badge>
                  </div>

                  {/* Status details */}
                  {stage.status === 'current' && (
                    <div className="mt-3 pt-3 border-t border-current/20 text-sm">
                      <p className="font-medium">Duration so far: 7+ months</p>
                    </div>
                  )}

                  {/* Action items for current stage */}
                  {stage.status === 'current' && index < stages.length - 1 && (
                    <div className="mt-3 pt-3 border-t border-current/20">
                      <p className="text-xs font-medium mb-2">Next steps:</p>
                      <ul className="text-xs space-y-1 text-muted-foreground">
                        {stage.id === 'active' && (
                          <>
                            <li>• Schedule performance review</li>
                            <li>• Plan professional development</li>
                            <li>• Track growth milestones</li>
                          </>
                        )}
                        {stage.id === 'growth' && (
                          <>
                            <li>• Consider promotion opportunities</li>
                            <li>• Evaluate project assignments</li>
                            <li>• Plan career path</li>
                          </>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
