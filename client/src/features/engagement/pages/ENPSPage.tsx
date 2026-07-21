import { EmptyStateCard } from '@/features/common/components/EmptyStateCard';

export function ENPSPage() {
  return (
    <EmptyStateCard
      icon="😊"
      title="eNPS Survey Coming Soon"
      description="Measure employee satisfaction and engagement through Net Promoter Score surveys to identify areas for improvement and celebrate successes."
      actionLabel="Schedule Setup"
      onAction={() => alert('Setup scheduled!')}
      docLink="https://docs.apponext.io/features/enps"
    />
  );
}
