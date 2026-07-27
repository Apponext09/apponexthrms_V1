import * as React from 'react';
import { cn } from '@/lib/utils';

// Recursive helper to safely extract raw string content from React children
const getChildrenText = (children: React.ReactNode): string => {
  if (children === null || children === undefined) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(getChildrenText).join('');
  if (React.isValidElement(children)) return getChildrenText((children.props as any).children);
  return '';
};

interface SelectContextValue {
  value?: string;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSelect: (value: string) => void;
  registerItem: (value: string, label: string) => void;
  itemsMap: Record<string, string>;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
  const [isOpen, setIsOpen] = React.useState(false);
  const [itemsMap, setItemsMap] = React.useState<Record<string, string>>({});
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedValue = value !== undefined ? value : internalValue;

  const handleSelect = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
    setIsOpen(false);
  };

  const registerItem = React.useCallback((val: string, label: string) => {
    setItemsMap(prev => {
      if (prev[val] === label) return prev;
      return { ...prev, [val]: label };
    });
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <SelectContext.Provider 
      value={{ 
        value: selectedValue, 
        isOpen, 
        setIsOpen, 
        onSelect: handleSelect, 
        registerItem, 
        itemsMap
      }}
    >
      <div ref={containerRef} className={cn("relative", isOpen ? "z-40" : "z-10")}>{children}</div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, onClick, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        onClick={(event) => {
          onClick?.(event);
          if (context) {
            context.setIsOpen(!context.isOpen);
          }
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

interface SelectValueProps {
  placeholder?: string;
}

function SelectValue({ placeholder }: SelectValueProps) {
  const context = React.useContext(SelectContext);
  const displayLabel = context?.value ? context.itemsMap[context.value] : '';
  return <span className="truncate">{displayLabel || placeholder || ''}</span>;
}

interface SelectContentProps {
  children: React.ReactNode;
}

function SelectContent({ children }: SelectContentProps) {
  const context = React.useContext(SelectContext);
  if (!context?.isOpen) return null;
  
  return (
    <div 
      className="absolute mt-1 min-w-full max-h-60 overflow-y-auto rounded-md border bg-background p-1 shadow-lg"
      style={{ zIndex: 9999 }}
    >
      {children}
    </div>
  );
}

interface SelectItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

const SelectItem = React.forwardRef<HTMLButtonElement, SelectItemProps>(
  ({ value, className, children, onClick, ...props }, ref) => {
    const context = React.useContext(SelectContext);

    const labelText = React.useMemo(() => {
      return getChildrenText(children).trim();
    }, [children]);

    React.useEffect(() => {
      if (context) {
        context.registerItem(value, labelText);
      }
    }, [value, labelText, context]);

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted text-left',
          className
        )}
        onClick={(event) => {
          onClick?.(event);
          context?.onSelect(value);
        }}
        {...props}
      >
        {children}
      </button>
    );
  }
);
SelectItem.displayName = 'SelectItem';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
