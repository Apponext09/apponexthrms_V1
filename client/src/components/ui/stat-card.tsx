import * as React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from './card';

interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  className?: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaLabel = 'from last period',
  variant = 'default',
  className,
}: StatCardProps) {
  const variantClasses = {
    default: 'bg-gradient-to-br from-primary/5 to-primary/10',
    success: 'bg-gradient-to-br from-success/5 to-success/10',
    warning: 'bg-gradient-to-br from-warning/5 to-warning/10',
    danger: 'bg-gradient-to-br from-danger/5 to-danger/10',
    accent: 'bg-gradient-to-br from-sky-500/5 to-sky-500/10',
  };

  const deltaPositiveClass = 'text-success';
  const deltaNegativeClass = 'text-danger';

  return (
    <Card className={cn(variantClasses[variant], className)}>
      <div className="flex flex-col p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
          </div>
          {Icon && (
            <div className="ml-4 rounded-lg bg-primary/20 p-3">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>
        {delta !== undefined && (
          <div
            className={cn(
              'mt-4 flex items-center gap-1 text-sm font-medium',
              delta > 0 ? deltaPositiveClass : deltaNegativeClass
            )}
          >
            {delta > 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>
              {Math.abs(delta)}% {deltaLabel}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export { StatCard };
