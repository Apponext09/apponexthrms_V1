import { ComingSoonPage } from '@/features/common/components/ComingSoonPage';
import { Share2 } from 'lucide-react';

export function TransfersPage() {
  return (
    <ComingSoonPage
      title="Employee Transfers"
      description="Manage internal transfers, role changes, and department moves."
      icon={<Share2 className="h-16 w-16" />}
    />
  );
}
