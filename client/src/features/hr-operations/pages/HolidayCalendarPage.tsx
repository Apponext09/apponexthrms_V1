import { ComingSoonPage } from '@/features/common/components/ComingSoonPage';
import { Calendar } from 'lucide-react';

export function HolidayCalendarPage() {
  return (
    <ComingSoonPage
      title="Holiday Calendar"
      description="Manage company holidays and observances across all locations."
      icon={<Calendar className="h-16 w-16" />}
    />
  );
}
