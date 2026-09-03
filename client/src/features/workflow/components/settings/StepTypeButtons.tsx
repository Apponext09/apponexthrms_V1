import { User, Users, Building2, ShieldCheck, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const STEP_TYPES = [
  { type: 'reporting_officer' as const, icon: <User size={18} />, label: 'Reporting Officer', tooltip: 'Reporting Officer can be added' },
  { type: 'employee' as const, icon: <Users size={18} />, label: 'Employee', tooltip: 'Employee adding from here' },
  { type: 'department' as const, icon: <Building2 size={18} />, label: 'Department', tooltip: 'Select department option' },
  { type: 'role' as const, icon: <ShieldCheck size={18} />, label: 'Role', tooltip: 'Role are listed here' },
];

interface Props {
  onAddStep: (type: 'reporting_officer' | 'employee' | 'department' | 'role') => void;
  isLoading?: boolean;
}

export function StepTypeButtons({ onAddStep, isLoading }: Props) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 mt-2 ml-1">
        {/* Green + button */}
        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0">
          <Plus size={16} />
        </div>

        {/* 4 step-type icon buttons */}
        {STEP_TYPES.map(({ type, icon, label, tooltip }) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onAddStep(type)}
                disabled={isLoading}
                className="w-9 h-9 rounded-full border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center text-gray-600 hover:text-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                aria-label={label}
              >
                {icon}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}


