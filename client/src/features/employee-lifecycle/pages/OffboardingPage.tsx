import { ComingSoonPage } from '@/features/common/components/ComingSoonPage';
import { UserMinus } from 'lucide-react';

export function OffboardingPage() {
  return (
    <ComingSoonPage
      title="Employee Offboarding"
      description="Manage exit interviews, asset returns, and knowledge transfer."
      icon={<UserMinus className="h-16 w-16" />}
    />
  );
}
