import hrmsLogo from '@/assests/hrms.png';

interface PortalSidebarBrandProps {
  open: boolean;
  portalLabel?: string;
}

export function PortalSidebarBrand({ open, portalLabel }: PortalSidebarBrandProps) {
  return (
    <div className="flex h-16 flex-shrink-0 items-center border-b border-border px-2 sm:px-3">
      {open ? (
        <div className="flex w-full items-center gap-2.5 overflow-hidden">
          <div className="flex size-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-slate-900/90 p-1 shadow-2xs ring-1 ring-border/70 dark:ring-white/10">
            <img src={hrmsLogo} alt="Apponext HRMS" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col justify-center overflow-hidden whitespace-nowrap leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-foreground">Apponext</span>
              <span className="rounded-md border border-primary/20 bg-primary/10 px-1 py-0.2 text-[8.5px] font-extrabold uppercase tracking-wider text-primary">HRMS</span>
            </div>
            {portalLabel && (
              <span className="truncate text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">{portalLabel}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <div className="flex size-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-slate-900/90 p-1 shadow-2xs ring-1 ring-border/70 dark:ring-white/10">
            <img src={hrmsLogo} alt="Apponext HRMS" className="size-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

