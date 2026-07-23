import * as React from 'react';
import { cn } from '@/lib/utils';

interface RadioGroupProps {
  children: React.ReactNode;
  className?: string;
}

function RadioGroup({ children, className }: RadioGroupProps) {
  return <div className={cn('space-y-2', className)}>{children}</div>;
}

interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm',
          className
        )}
        data-value={value}
        {...props}
      >
        <span className="h-4 w-4 rounded-full border border-current" />
        {children}
      </button>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
