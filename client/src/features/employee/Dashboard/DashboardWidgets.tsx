import React from 'react';
import {
  Palmtree, FileText, Shield, FolderOpen, CalendarCheck, ReceiptIndianRupee,
  ClipboardList, ArrowUpRight, ChevronRight, ArrowRight, WalletCards,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────────────────────────
 * Shared tone map – same palette the dashboard already uses
 * (amber / blue / emerald / violet), kept in one place.
 * ───────────────────────────────────────────────────────────────────────────── */

type Tone = 'amber' | 'blue' | 'emerald' | 'violet';

const TONES: Record<Tone, { chip: string; icon: string; text: string; bar: string; hover: string }> = {
  amber: {
    chip: 'bg-amber-100 dark:bg-amber-900/40',
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-700 dark:text-amber-400',
    bar: 'bg-amber-400',
    hover: 'hover:border-amber-300/80 dark:hover:border-amber-700/70',
  },
  blue: {
    chip: 'bg-blue-100 dark:bg-blue-900/40',
    icon: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-700 dark:text-blue-400',
    bar: 'bg-blue-500',
    hover: 'hover:border-blue-300/80 dark:hover:border-blue-700/70',
  },
  emerald: {
    chip: 'bg-emerald-100 dark:bg-emerald-900/40',
    icon: 'text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-400',
    bar: 'bg-emerald-400',
    hover: 'hover:border-emerald-300/80 dark:hover:border-emerald-700/70',
  },
  violet: {
    chip: 'bg-violet-100 dark:bg-violet-900/40',
    icon: 'text-violet-600 dark:text-violet-400',
    text: 'text-violet-700 dark:text-violet-400',
    bar: 'bg-violet-400',
    hover: 'hover:border-violet-300/80 dark:hover:border-violet-700/70',
  },
};

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40';

/* ─────────────────────────────────────────────────────────────────────────────
 * 1. KPI strip  (Leave quota · Goals · Assets)
 *    Three compact cards in one row – no more tall, empty stacked cards.
 * ───────────────────────────────────────────────────────────────────────────── */

interface KpiStripProps {
  leaveAvailable: number;
  leaveTotal?: number;          // total allocated days, enables the progress bar
  loadingLeaves?: boolean;
  presentDays?: number;
  totalExpense?: number;
  loadingExpenses?: boolean;
  formatAmount?: (amount: number) => string;
  onNavigate: (route: string) => void;
}

export function KpiStrip({
  leaveAvailable,
  leaveTotal = 0,
  loadingLeaves = false,
  presentDays = 0,
  totalExpense = 0,
  loadingExpenses = false,
  formatAmount = (amount) => `₹${amount.toLocaleString('en-IN')}`,
  onNavigate,
}: KpiStripProps) {
  const leavePct = leaveTotal > 0 ? Math.min(100, Math.round((leaveAvailable / leaveTotal) * 100)) : 0;

  const cards: Array<{
    key: string; tone: Tone; icon: React.ElementType; route: string;
    value: string; unit: string; label: string; progress?: number; footnote: string;
  }> = [
    {
      key: 'leave', tone: 'amber', icon: Palmtree, route: '/employee/leaves',
      value: loadingLeaves ? '…' : String(leaveAvailable), unit: 'days',
      label: 'Leave available', progress: leaveTotal > 0 ? leavePct : undefined,
      footnote: leaveTotal > 0 ? `of ${leaveTotal} days` : 'this year',
    },
    {
      key: 'present', tone: 'emerald', icon: CalendarCheck, route: '/employee/attendance',
      value: String(presentDays), unit: presentDays === 1 ? 'day' : 'days',
      label: 'Present this month',
      footnote: 'from attendance records',
    },
    {
      key: 'expenses', tone: 'blue', icon: ReceiptIndianRupee, route: '/employee/my-expenses',
      value: loadingExpenses ? '…' : formatAmount(totalExpense), unit: '',
      label: 'Total expenses',
      footnote: 'across all your claims',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map(({ key, tone, icon: Icon, route, value, unit, label, progress, footnote }) => {
        const t = TONES[tone];
        return (
          <button
            key={key}
            onClick={() => onNavigate(route)}
            className={cn(
              'group relative flex flex-col gap-3 p-4 rounded-2xl border border-border/70 bg-card text-left transition-colors',
              t.hover, FOCUS,
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center', t.chip)}>
                <Icon className={cn('w-[18px] h-[18px]', t.icon)} />
              </span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
            </div>

            <div>
              <p className="text-2xl font-bold text-foreground leading-none tabular-nums">
                {value}
                <span className="ml-1 text-xs font-medium text-muted-foreground">{unit}</span>
              </p>
              <p className="text-xs font-medium text-foreground/80 mt-1.5">{label}</p>
            </div>

            <div className="mt-auto">
              {progress !== undefined && (
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-1.5">
                  <div className={cn('h-full rounded-full transition-all', t.bar)} style={{ width: `${progress}%` }} />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">{footnote}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. Quick services
 *    Tiles keep their content anchored (icon + title on top, action footer
 *    at the bottom) so they look intentional even when the grid stretches to
 *    match the attendance console height.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface RecentExpenseClaim {
  id: number | string;
  title?: string;
  claimNumber?: string;
  claimDate?: string;
  createdAt?: string;
  totalClaimedAmount?: number;
  status?: string;
}

interface RecentExpenseClaimsCardProps {
  claims: RecentExpenseClaim[];
  loading: boolean;
  onViewAll: () => void;
  formatAmount?: (amount: number) => string;
}

const expenseStatusStyle = (status = '') => {
  const normalized = status.toLowerCase();
  if (normalized === 'paid' || normalized === 'approved') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-400';
  }
  if (normalized === 'rejected') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-400';
  }
  if (normalized === 'returned') {
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/35 dark:text-orange-400';
  }
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-400';
};

export function RecentExpenseClaimsCard({
  claims,
  loading,
  onViewAll,
  formatAmount = (amount) => `₹${amount.toLocaleString('en-IN')}`,
}: RecentExpenseClaimsCardProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
      <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between bg-muted/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
            <WalletCards className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Recent expense claims</p>
            <p className="text-[11px] text-muted-foreground">Your latest reimbursement requests</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className={cn('text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 rounded-md shrink-0', FOCUS)}
        >
          View all <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((item) => <div key={item} className="h-14 rounded-xl bg-muted" />)}
          </div>
        ) : claims.length === 0 ? (
          <div className="py-8 text-center">
            <ReceiptIndianRupee className="w-8 h-8 mx-auto text-muted-foreground/45" />
            <p className="mt-2 text-sm font-medium text-foreground">No expense claims yet</p>
            <button onClick={onViewAll} className={cn('mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline rounded-md', FOCUS)}>
              Create your first claim
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {claims.slice(0, 4).map((claim) => {
              const rawDate = claim.claimDate || claim.createdAt;
              const date = rawDate && !Number.isNaN(new Date(rawDate).getTime())
                ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                : '';
              const status = (claim.status || 'pending').replace(/_/g, ' ');
              return (
                <li key={claim.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                    <ReceiptIndianRupee className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{claim.title || claim.claimNumber || 'Expense claim'}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{date}{date && claim.claimNumber ? ' · ' : ''}{claim.claimNumber}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground tabular-nums">{formatAmount(Number(claim.totalClaimedAmount || 0))}</p>
                    <span className={cn('inline-flex mt-1 px-2 py-0.5 rounded-full text-[9px] font-semibold capitalize', expenseStatusStyle(claim.status))}>
                      {status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface QuickServicesProps {
  onNavigate: (route: string) => void;
  onOpenVault: () => void;
  leaveAvailable?: number;
  documentCount?: number;
}

export function QuickServices({ onNavigate, onOpenVault, leaveAvailable, documentCount }: QuickServicesProps) {
  const items: Array<{
    key: string; tone: Tone; icon: React.ElementType; title: string; desc: string;
    hint: string; onClick: () => void;
  }> = [
    {
      key: 'leave', tone: 'amber', icon: Palmtree, title: 'Apply leave',
      desc: 'Submit a new leave request',
      hint: leaveAvailable !== undefined ? `${leaveAvailable} days available` : 'Check your balance',
      onClick: () => onNavigate('/employee/leaves'),
    },
    {
      key: 'payslips', tone: 'blue', icon: FileText, title: 'My payslips',
      desc: 'View and download pay slips',
      hint: 'Monthly statements',
      onClick: () => onNavigate('/employee/payroll'),
    },
    {
      key: 'id', tone: 'emerald', icon: Shield, title: 'Digital ID',
      desc: 'Your employee QR card',
      hint: 'Show at entry points',
      onClick: () => onNavigate('/employee/id-card'),
    },
    {
      key: 'vault', tone: 'violet', icon: FolderOpen, title: 'Document vault',
      desc: 'Letters, tax and official files',
      hint: documentCount !== undefined ? `${documentCount} documents` : 'Verified documents',
      onClick: onOpenVault,
    },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card overflow-hidden flex flex-col flex-1">
      <div className="px-5 py-3 border-b border-border/60 bg-muted/10">
        <p className="text-sm font-semibold text-foreground">Quick services</p>
        <p className="text-[11px] text-muted-foreground">Jump straight to what you need</p>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 auto-rows-fr">
        {items.map(({ key, tone, icon: Icon, title, desc, hint, onClick }) => {
          const t = TONES[tone];
          return (
            <button
              key={key}
              onClick={onClick}
              className={cn(
                'group flex flex-col justify-between gap-4 p-4 rounded-xl border border-border/70 bg-background/40 text-left transition-colors hover:bg-muted/30',
                t.hover, FOCUS,
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', t.chip)}>
                  <Icon className={cn('w-5 h-5', t.icon)} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/60">
                <span className={cn('text-xs font-medium', t.text)}>{hint}</span>
                <span className="w-6 h-6 rounded-full border border-border/70 flex items-center justify-center text-muted-foreground group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-colors">
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * 3. Leave balances
 *    One summary bar (total available, split by leave type) + a clean list
 *    with a used / pending / available bar per type. No nested boxes.
 * ───────────────────────────────────────────────────────────────────────────── */

const num = (b: any, snake: string, camel: string, fb = 0) => {
  const v = b?.[snake] ?? b?.[camel];
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isNaN(n) ? fb : n;
};

const availableOf = (b: any) => {
  const raw = b?.available_balance ?? b?.availableBalance;
  if (raw !== undefined && raw !== null) {
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 0) return n;
  }
  return Math.max(
    0,
    num(b, 'allocated_balance', 'allocatedBalance') -
      num(b, 'consumed_balance', 'consumedBalance') -
      num(b, 'pending_approval_balance', 'pendingApprovalBalance'),
  );
};

const leaveAccent = (code: string, idx: number) => {
  const c = (code || '').toUpperCase();
  if (c === 'CL' || c.includes('CASUAL'))
    return { bar: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' };
  if (c === 'SL' || c.includes('SICK'))
    return { bar: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' };
  if (['EL', 'PL'].includes(c) || c.includes('EARNED') || c.includes('PAID'))
    return { bar: 'bg-violet-400', badge: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800' };
  const fallback = [
    { bar: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' },
    { bar: 'bg-indigo-400', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800' },
  ];
  return fallback[idx % fallback.length];
};

interface LeaveBalancesCardProps {
  balances: any[];
  loading: boolean;
  onApply: () => void;
  onRegularize: () => void;
}

export function LeaveBalancesCard({ balances, loading, onApply, onRegularize }: LeaveBalancesCardProps) {
  const rows = balances.map((b, i) => {
    const code = b?.leave_code || b?.leaveCode || 'LV';
    return {
      code,
      name: b?.leave_name || b?.leaveName || 'Leave',
      alloc: num(b, 'allocated_balance', 'allocatedBalance'),
      used: num(b, 'consumed_balance', 'consumedBalance'),
      pending: num(b, 'pending_approval_balance', 'pendingApprovalBalance'),
      avail: availableOf(b),
      accent: leaveAccent(code, i),
    };
  });

  const totalAvail = rows.reduce((a, r) => a + r.avail, 0);
  const totalAlloc = rows.reduce((a, r) => a + r.alloc, 0);

  return (
    <div className="rounded-2xl border border-border/70 bg-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/60 flex items-center justify-between bg-muted/10">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Leave balances</p>
            <p className="text-[11px] text-muted-foreground">Updated in real time</p>
          </div>
        </div>
        <button
          onClick={onApply}
          className={cn('text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 rounded-md', FOCUS)}
        >
          Apply <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="space-y-5 animate-pulse">
            <div className="h-10 bg-muted rounded-lg w-1/2" />
            {[1, 2, 3].map((n) => (
              <div key={n} className="space-y-2">
                <div className="h-3.5 bg-muted rounded w-2/3" />
                <div className="h-2 bg-muted rounded w-full" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No leave balances found.</p>
        ) : (
          <>
            {/* Summary */}
            <div className="mb-5">
              <div className="flex items-end justify-between">
                <p className="text-3xl font-bold text-foreground leading-none tabular-nums">
                  {totalAvail}
                  <span className="ml-1.5 text-sm font-medium text-muted-foreground">days available</span>
                </p>
                <p className="text-xs text-muted-foreground">of {totalAlloc} days</p>
              </div>

              {/* Stacked bar – each segment is one leave type's available days */}
              <div className="mt-3 flex h-2.5 w-full gap-0.5 rounded-full overflow-hidden bg-muted">
                {rows.map((r, i) =>
                  r.avail > 0 && totalAlloc > 0 ? (
                    <div
                      key={i}
                      className={cn('h-full first:rounded-l-full', r.accent.bar)}
                      style={{ width: `${(r.avail / totalAlloc) * 100}%` }}
                      title={`${r.name}: ${r.avail}d`}
                    />
                  ) : null,
                )}
              </div>
            </div>

            {/* Per-type list */}
            <ul className="divide-y divide-border/60 border-t border-border/60">
              {rows.map((r, i) => {
                const usedPct = r.alloc > 0 ? (r.used / r.alloc) * 100 : 0;
                const pendPct = r.alloc > 0 ? (r.pending / r.alloc) * 100 : 0;
                const availPct = r.alloc > 0 ? (r.avail / r.alloc) * 100 : 0;
                return (
                  <li key={i} className="py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn('inline-flex shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border', r.accent.badge)}>
                          {r.code}
                        </span>
                        <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums shrink-0">
                        {r.avail}
                        <span className="text-xs font-normal text-muted-foreground"> / {r.alloc} days</span>
                      </p>
                    </div>

                    {/* available · pending · used */}
                    <div className="mt-2.5 flex h-1.5 w-full rounded-full overflow-hidden bg-muted">
                      <div className={cn('h-full', r.accent.bar)} style={{ width: `${availPct}%` }} />
                      {r.pending > 0 && <div className="h-full bg-amber-300/80" style={{ width: `${pendPct}%` }} />}
                      {r.used > 0 && <div className="h-full bg-muted-foreground/30" style={{ width: `${usedPct}%` }} />}
                    </div>

                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Used {r.used}d
                      {r.pending > 0 && <span className="text-amber-600 dark:text-amber-400 font-medium">, {r.pending}d pending approval</span>}
                    </p>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border/60">
          <button
            onClick={onApply}
            className={cn('h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5', FOCUS)}
          >
            <Palmtree className="w-3.5 h-3.5" /> Apply leave
          </button>
          <button
            onClick={onRegularize}
            className={cn('h-9 rounded-xl border border-border/80 text-xs font-medium text-foreground hover:bg-muted/40 transition-colors', FOCUS)}
          >
            Regularize attendance
          </button>
        </div>
      </div>
    </div>
  );
}
