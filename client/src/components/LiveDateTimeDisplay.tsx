import { useEffect, useState } from 'react';

/** A compact, locale-aware clock for portal headers. */
export function LiveDateTimeDisplay() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hidden min-w-[178px] rounded-xl border border-border bg-muted/40 px-3 py-1 text-center leading-tight lg:block" aria-live="polite">
      <p className="font-mono text-base font-bold tabular-nums text-foreground">
        {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
      </p>
      <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
        {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}
