import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/50 py-12 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
          {/*
            `typeof Icon === 'function'` misclassifies forwardRef-wrapped
            components (e.g. lucide-react icons in this project's version,
            which are `{ $$typeof, render }` objects, not functions) — those
            fell through to being rendered as a raw object and crashed the
            tree. isValidElement is the correct test for "already a
            rendered node" vs. "a component reference to invoke".
          */}
          {React.isValidElement(Icon) ? (
            Icon
          ) : (
            (() => {
              const IconComp = Icon as LucideIcon;
              return <IconComp className="h-6 w-6 text-muted-foreground" />;
            })()
          )}
        </div>
      )}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export { EmptyState };
