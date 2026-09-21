import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type AttendancePageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: ReactNode;
  actions?: ReactNode;
};

export function AttendancePageHeader({ icon: Icon, title, description, badge, actions }: AttendancePageHeaderProps) {
  return (
    <header className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5 dark:border-border dark:bg-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Icon className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-balance text-xl font-bold text-[#0B2545] dark:text-foreground">{title}</h1>
              {badge}
            </div>
            <p className="mt-1 text-pretty text-sm text-[#4A6285] dark:text-muted-foreground">{description}</p>
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
