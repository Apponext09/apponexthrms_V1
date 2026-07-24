import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CleanLoaderProps {
  label?: string;
  className?: string;
  fullPage?: boolean;
}

export function CleanLoader({ label = 'Loading details...', className, fullPage = false }: CleanLoaderProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center p-8 gap-3 select-none text-center', className)}>
      <div className="relative flex items-center justify-center">
        {/* Animated Gradient Outer Pulse */}
        <div className="absolute h-12 w-12 rounded-full bg-gradient-to-tr from-primary/30 via-indigo-500/20 to-purple-500/30 animate-ping opacity-75" />
        
        {/* Spinning Ring */}
        <div className="relative h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        
        {/* Inner Icon */}
        <Sparkles className="absolute h-4 w-4 text-primary animate-pulse" />
      </div>

      <p className="text-xs font-semibold text-muted-foreground animate-pulse tracking-wide">
        {label}
      </p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] w-full flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
}
