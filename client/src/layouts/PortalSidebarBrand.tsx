import hrmsLogo from '@/assests/hrms.png';

interface PortalSidebarBrandProps {
  open: boolean;
  portalLabel?: string;
}

export function PortalSidebarBrand({ open, portalLabel }: PortalSidebarBrandProps) {
  return (
    <div className="flex h-16 flex-shrink-0 items-center justify-center border-b border-border px-1 select-none overflow-hidden">
      {open ? (
        <div className="flex w-full items-center gap-2.5 overflow-hidden px-1">
          <div className="flex size-11 flex-shrink-0 items-center justify-center overflow-hidden">
            <img src={hrmsLogo} alt="Apponext HRMS" className="size-full object-contain scale-125" />
          </div>
          <div className="flex flex-col justify-center overflow-hidden whitespace-nowrap leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold tracking-tight text-foreground">Apponext</span>
              <span className="rounded-md border border-primary/20 bg-primary/10 px-1 py-0.2 text-[8.5px] font-extrabold uppercase tracking-wider text-primary">HRMS</span>
            </div>
            {portalLabel && (
              <span className="truncate text-[10px] font-semibold tracking-tight text-muted-foreground">{portalLabel}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center size-full min-h-0 overflow-hidden">
          <img 
            src={hrmsLogo} 
            alt="Apponext HRMS" 
            className="h-12 w-auto max-w-[85%] object-contain scale-[1.35] origin-center drop-shadow-xs" 
          />
        </div>
      )}
    </div>
  );
}


