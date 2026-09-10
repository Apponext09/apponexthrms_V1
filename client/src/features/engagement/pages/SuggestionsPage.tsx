import { ComingSoonPage } from '@/features/common/components/ComingSoonPage';
import { Lightbulb } from 'lucide-react';

export function SuggestionsPage() {
  return (
    <ComingSoonPage
      title="Employee Suggestions"
      description="Empower employees to share ideas and contribute to company improvements."
      icon={<Lightbulb className="h-16 w-16" />}
    />
  );
}
