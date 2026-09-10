import { ComingSoonPage } from '@/features/common/components/ComingSoonPage';
import { Package } from 'lucide-react';

export function MyAssetsPage() {
  return (
    <ComingSoonPage
      title="My Assets"
      description="View assets assigned to you and request returns or changes."
      icon={<Package className="h-16 w-16" />}
    />
  );
}
