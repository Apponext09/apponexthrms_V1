import hrmsLogo from '@/assests/hrms.png';

interface PortalSidebarBrandProps {
  open: boolean;
  portalLabel?: string;
}

export function PortalSidebarBrand({ open, portalLabel }: PortalSidebarBrandProps) {
  return (
    <div className="flex h-20 flex-shrink-0 items-center border-b border-border px-4">
      {open ? (
        <div className="flex w-full items-center gap-3 overflow-hidden">
          <div className="flex size-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-slate-900/90 p-1 shadow-2xs ring-1 ring-border/70 dark:ring-white/10">
            <img src={hrmsLogo} alt="Apponext HRMS" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col justify-center overflow-hidden whitespace-nowrap leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-extrabold tracking-tight text-foreground">Apponext</span>
              <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary">HRMS</span>
            </div>
            {portalLabel && (
              <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{portalLabel}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <div className="flex size-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white dark:bg-slate-900/90 p-1 shadow-2xs ring-1 ring-border/70 dark:ring-white/10">
            <img src={hrmsLogo} alt="Apponext HRMS" className="size-full object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
