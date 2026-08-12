import React, { useState, useEffect, useRef } from 'react';
import { Square, AlertTriangle, Coffee } from 'lucide-react';
import { useAttendanceStore } from '../store/attendanceStore';
import { BreakTypeSelectModal } from './BreakTypeSelectModal';
import { cn } from '@/lib/utils';

/**
 * BreakOverlay — Full-screen overlay shown when employee is on break.
 * Clean, minimal structure matched to application design system (light/dark mode).
 */
export const BreakOverlay: React.FC = () => {
  const {
    breakStartTime,
    assignedBreakMinutes,
    totalUsedMinutes,
    remainingBreakMinutes,
  } = useAttendanceStore();

  const [elapsed, setElapsed] = useState(0); // seconds
  const [showModal, setShowModal] = useState(false);
  const [dotCount, setDotCount] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Compute elapsed seconds from breakStartTime
  useEffect(() => {
    if (!breakStartTime) return;

    const start = new Date(breakStartTime).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      setElapsed(diff);
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [breakStartTime]);

  // Animated dots for "Break in Progress..."
  useEffect(() => {
    dotRef.current = setInterval(() => {
      setDotCount((d) => (d >= 3 ? 1 : d + 1));
    }, 600);
    return () => {
      if (dotRef.current) clearInterval(dotRef.current);
    };
  }, []);

  // Remaining quota countdown in seconds (from the moment break started)
  const quotaSeconds = remainingBreakMinutes * 60;
  const isOvertime = elapsed > quotaSeconds && quotaSeconds > 0;

  const formatTime = (totalSecs: number) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const elapsedFormatted = formatTime(elapsed);
  const usedTotalMinutes = totalUsedMinutes + Math.floor(elapsed / 60);
  const quotaUsedPercent = Math.min(100, Math.round((usedTotalMinutes / assignedBreakMinutes) * 100));

  const handleStopBreakClick = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleBreakConfirmed = () => {
    setShowModal(false);
  };

  return (
    <>
      {/* Full-screen backdrop — theme matched, blurred overlay */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in-50 duration-200">
        
        {/* Central Minimal Card */}
        <div className="relative z-10 w-full max-w-sm bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-center">
          
          {/* Subtle Top Indicator Accent */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-extrabold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Break in Progress{'.'.repeat(dotCount)}
            </span>
          </div>

          {/* Coffee Icon & Timer */}
          <div className="space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Coffee className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                Time Elapsed
              </span>
              <div
                className={cn(
                  "text-6xl font-mono font-black tabular-nums tracking-tight",
                  isOvertime ? "text-rose-500 dark:text-rose-400" : "text-foreground"
                )}
              >
                {elapsedFormatted}
              </div>
            </div>
          </div>

          {/* Overtime Alert */}
          {isOvertime && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Break quota exceeded! Please stop now.</span>
            </div>
          )}

          {/* Quota Progress */}
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-muted-foreground">Break Quota</span>
              <span className={cn(quotaUsedPercent >= 100 ? "text-rose-500" : "text-foreground")}>
                {Math.min(usedTotalMinutes, assignedBreakMinutes)} / {assignedBreakMinutes} min
              </span>
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  quotaUsedPercent >= 100 ? "bg-rose-500" : "bg-amber-500"
                )}
                style={{ width: `${quotaUsedPercent}%` }}
              />
            </div>

            {!isOvertime && remainingBreakMinutes > 0 && (
              <p className="text-[10px] text-muted-foreground text-center font-medium">
                {remainingBreakMinutes} min remaining in today's balance
              </p>
            )}
          </div>

          {/* Action Button */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={handleStopBreakClick}
              className="w-full h-12 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-white" />
              Stop Break
            </button>

            <p className="text-[10px] text-muted-foreground/70 font-medium">
              Screen locked during break session
            </p>
          </div>
        </div>
      </div>

      {/* Break Type Selection Modal */}
      {showModal && (
        <BreakTypeSelectModal
          onClose={handleModalClose}
          onConfirm={handleBreakConfirmed}
        />
      )}
    </>
  );
};
