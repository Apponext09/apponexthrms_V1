import { cn } from '@/lib/utils';
import './core-circular-loader.css';

interface CoreCircularLoaderProps {
  label?: string;
  className?: string;
}

/** Circular Core HR loading indicator using the application's teal accent. */
export function CoreCircularLoader({ label = 'Loading employee profile...', className }: CoreCircularLoaderProps) {
  return (
    <div
      className={cn('flex min-h-[42vh] flex-col items-center justify-center gap-6', className)}
      role="status"
      aria-live="polite"
    >
      <div className="core-circular-loader" aria-hidden="true" />
      {label && <p className="text-xs font-semibold text-muted-foreground">{label}</p>}
    </div>
  );
}
