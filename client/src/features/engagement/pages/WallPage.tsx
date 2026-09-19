import { EmptyStateCard } from '@/features/common/components/EmptyStateCard';

export function WallPage() {
  return (
    <EmptyStateCard
      icon="🎉"
      title="Employee Wall Coming Soon"
      description="Share updates, celebrate wins, and stay connected with your team through our social collaboration platform."
      actionLabel="Request Feature"
      onAction={() => window.appAlert('Feature request sent!')}
      docLink="https://docs.apponext.io/features/wall"
    />
  );
}
