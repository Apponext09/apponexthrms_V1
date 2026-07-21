import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
}

const Breadcrumb = React.forwardRef<HTMLDivElement, BreadcrumbProps>(
  (
    {
      items,
      className,
      separator = <ChevronRight className="h-4 w-4 mx-1 text-muted-foreground" />,
    },
    ref
  ) => {
    if (!items || items.length === 0) return null;

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-0 text-sm', className)}
        role="navigation"
        aria-label="Breadcrumb"
      >
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && separator}
            {item.href || item.onClick ? (
              <a
                href={item.href || '#'}
                onClick={(e) => {
                  if (item.onClick) {
                    e.preventDefault();
                    item.onClick();
                  }
                }}
                className={cn(
                  'hover:text-foreground transition-colors',
                  item.active ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </a>
            ) : (
              <span
                className={cn(
                  item.active ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }
);
Breadcrumb.displayName = 'Breadcrumb';

export { Breadcrumb, type BreadcrumbProps, type BreadcrumbItem };
