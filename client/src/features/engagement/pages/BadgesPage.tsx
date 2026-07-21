import { ComingSoonPage } from '@/features/common/components/ComingSoonPage';
import { Badge as BadgeIcon } from 'lucide-react';

export function BadgesPage() {
  return (
    <ComingSoonPage
      title="Badges & Achievements"
      description="Recognize and celebrate employee achievements with digital badges."
      icon={<BadgeIcon className="h-16 w-16" />}
    />
  );
}
