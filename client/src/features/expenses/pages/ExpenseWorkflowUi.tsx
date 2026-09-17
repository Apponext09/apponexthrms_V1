import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export const expenseUi = {
  page: 'p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-slate-100',
  card: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl',
  input: 'w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50',
  primary: 'inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed',
  secondary: 'inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold disabled:opacity-50',
  danger: 'inline-flex items-center justify-center gap-2 px-4 py-2 border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-semibold disabled:opacity-50',
  label: 'block text-xs font-semibold text-slate-600 dark:text-slate-400 space-y-1.5',
  error: 'rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-xs text-rose-700 dark:text-rose-300',
  info: 'rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-xs text-blue-800 dark:text-blue-300 text-pretty',
  table: 'w-full text-left text-xs tabular-nums [&_th]:px-4 [&_th]:py-3 [&_th]:font-semibold [&_td]:px-4 [&_td]:py-3',
  head: 'bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase',
};
export const expenseError = (e: any, fallback: string) => e.response?.data?.message || e.response?.data?.error?.message || fallback;

export function ExpenseWorkflowDialog({ open, onClose, title, description, children, compact, alert }: {
  open: boolean; onClose: () => void; title: string; description: string; children: React.ReactNode; compact?: boolean; alert?: boolean;
}) {
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}><DialogContent role={alert ? 'alertdialog' : 'dialog'} className={cn('max-h-[85dvh] overflow-y-auto rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100', compact ? 'max-w-md' : 'max-w-3xl')}>
    <DialogHeader><DialogTitle className="text-balance text-base font-bold">{title}</DialogTitle><DialogDescription className="text-pretty text-xs text-slate-500 dark:text-slate-400">{description}</DialogDescription></DialogHeader>{children}
  </DialogContent></Dialog>;
}
