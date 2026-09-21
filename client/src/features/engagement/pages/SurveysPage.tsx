import { EmptyStateCard } from '@/features/common/components/EmptyStateCard';

export function SurveysPage() {
  return (
    <EmptyStateCard
      icon="📋"
      title="Employee Surveys Coming Soon"
      description="Gather feedback through customizable surveys, pulse checks, and engagement measurements to understand your team's needs."
      actionLabel="Notify Me"
      onAction={() => window.appAlert('Notification preference saved!')}
      docLink="https://docs.apponext.io/features/surveys"
    />
  );
}
