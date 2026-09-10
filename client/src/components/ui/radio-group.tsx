import * as React from 'react';
import { cn } from '@/lib/utils';

interface RadioGroupProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

function RadioGroup({ children, value, onValueChange, className }: RadioGroupProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            groupValue: value,
            onGroupChange: onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
}

interface RadioGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  groupValue?: string;
  onGroupChange?: (value: string) => void;
}

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ className, value, groupValue, onGroupChange, children, onClick, ...props }, ref) => {
    const isChecked = groupValue === value;
    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isChecked}
        onClick={(e) => {
          if (onGroupChange) onGroupChange(value);
          if (onClick) onClick(e);
        }}
        className={cn(
          'flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm transition-colors',
          isChecked ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'bg-transparent',
          className
        )}
        data-value={value}
        {...props}
      >
        <span className={cn('h-4 w-4 rounded-full border border-current flex items-center justify-center', isChecked && 'border-indigo-600')}>
          {isChecked && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
        </span>
        {children}
      </button>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
