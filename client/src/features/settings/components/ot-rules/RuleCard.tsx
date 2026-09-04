import React from 'react';
import { Clock, Trash2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RuleCardProps {
  title: string;
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

export const RuleCard: React.FC<RuleCardProps> = ({
  title,
  selected = false,
  onClick,
  onDelete,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none",
        selected
          ? "bg-primary/5 border-primary shadow-xs"
          : "bg-background border-border/80 hover:border-border hover:bg-muted/30"
      )}
    >
      {/* Selected Indicator Bar */}
      {selected && (
        <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
      )}

      <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            selected
              ? "bg-primary text-primary-foreground shadow-xs"
              : "bg-muted text-muted-foreground group-hover:bg-muted/80"
          )}
        >
          <Clock className="w-4 h-4 stroke-[2.5]" />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <span
            className={cn(
              "text-xs font-bold truncate leading-tight",
              selected ? "text-primary" : "text-foreground"
            )}
          >
            {title}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-2.5 h-2.5" />
              Active
            </span>
          </div>
        </div>
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
          title="Delete OT Rule"
        >
          <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      )}
    </div>
  );
};
