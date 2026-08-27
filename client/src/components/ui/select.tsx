import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
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
  disabled?: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  positionStyle: React.CSSProperties;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined);

interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

function Select({ value, defaultValue, onValueChange, disabled, children }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
  const [isOpen, setIsOpen] = React.useState(false);
  const [itemsMap, setItemsMap] = React.useState<Record<string, string>>({});
  const [positionStyle, setPositionStyle] = React.useState<React.CSSProperties>({});
  
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const selectedValue = value !== undefined ? value : internalValue;

  const handleSelect = (nextValue: string) => {
    if (disabled) return;
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

  const updatePosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < 190 && spaceAbove > spaceBelow;

    const minWidth = Math.max(rect.width, 160);
    const maxDropdownWidth = 400;
    
    let left = rect.left;
    if (left + minWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - minWidth - 12);
    }

    setPositionStyle({
      position: 'fixed',
      top: openUpwards ? undefined : `${rect.bottom + 4}px`,
      bottom: openUpwards ? `${window.innerHeight - rect.top + 4}px` : undefined,
      left: `${left}px`,
      minWidth: `${minWidth}px`,
      maxWidth: `${Math.max(minWidth, maxDropdownWidth)}px`,
      zIndex: 999999,
    });
  }, []);

  // Position recalculation & event listeners
  React.useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScroll = (e: Event) => {
      if (contentRef.current && contentRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Click outside & Escape key listeners
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        contentRef.current &&
        !contentRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <SelectContext.Provider 
      value={{ 
        value: selectedValue, 
        isOpen, 
        setIsOpen, 
        onSelect: handleSelect, 
        registerItem, 
        itemsMap,
        disabled,
        triggerRef,
        contentRef,
        positionStyle,
      }}
    >
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, onClick, disabled, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    const isDisabled = disabled ?? context?.disabled;

    const handleRef = (node: HTMLButtonElement | null) => {
      if (context?.triggerRef) {
        (context.triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
      }
    };

    return (
      <button
        ref={handleRef}
        type="button"
        disabled={isDisabled}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-all duration-150',
          context?.isOpen && 'ring-2 ring-primary/40 border-primary shadow-xs',
          className
        )}
        onClick={(event) => {
          if (isDisabled) return;
          onClick?.(event);
          if (context) {
            context.setIsOpen(!context.isOpen);
          }
        }}
        {...props}
      >
        <span className="truncate flex-1 text-left">{children}</span>
        <ChevronDown 
          className={cn(
            "w-3.5 h-3.5 ml-1.5 opacity-50 shrink-0 transition-transform duration-200", 
            context?.isOpen && "rotate-180 opacity-90 text-primary"
          )} 
        />
      </button>
    );
  }
);
SelectTrigger.displayName = 'SelectTrigger';

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

function SelectValue({ placeholder, className, ...props }: SelectValueProps) {
  const context = React.useContext(SelectContext);
  const displayLabel = context?.value ? context.itemsMap[context.value] : '';
  return (
    <span className={cn("truncate block", className)} {...props}>
      {displayLabel || placeholder || ''}
    </span>
  );
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function SelectContent({ className, children, style, ...props }: SelectContentProps) {
  const context = React.useContext(SelectContext);
  if (!context?.isOpen) return null;

  const content = (
    <div 
      ref={context.contentRef}
      className={cn(
        "fixed max-h-60 overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xl text-slate-800 dark:text-slate-100 text-xs animate-in fade-in-0 zoom-in-95 duration-100",
        className
      )}
      style={{ ...context.positionStyle, ...style }}
      {...props}
    >
      <div className="space-y-0.5">{children}</div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
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

    const isSelected = context?.value === value;

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs outline-none hover:bg-slate-100 dark:hover:bg-slate-800 font-medium cursor-pointer text-left transition-colors',
          isSelected 
            ? 'bg-primary/10 text-primary font-bold hover:bg-primary/15' 
            : 'text-slate-700 dark:text-slate-200',
          className
        )}
        onClick={(event) => {
          onClick?.(event);
          context?.onSelect(value);
        }}
        {...props}
      >
        <span className="truncate flex-1">{children}</span>
        {isSelected && <Check className="w-3.5 h-3.5 ml-2 text-primary shrink-0" />}
      </button>
    );
  }
);
SelectItem.displayName = 'SelectItem';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
