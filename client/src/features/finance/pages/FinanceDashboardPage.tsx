import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileBarChart,
  CheckSquare,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Receipt,
  CreditCard,
  Wallet,
  BarChart3,
  ArrowUpRight,
  Plane,
  FileCheck2,
  Tags,
  ShieldCheck,
  Download,
  Settings,
  RefreshCw,
  IndianRupee,
  Layers,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { expenseApi, ExpenseSummary } from "@/features/expenses/api/expenseApi";

// -- Emerald palette -----------------------------------------------------------
const emerald = {
  primary:     "hsl(158, 64%, 40%)",
  primaryDark: "hsl(158, 64%, 32%)",
  bg:          "hsl(158, 64%, 40% / 0.08)",
  border:      "hsl(158, 64%, 40% / 0.25)",
};

export function FinanceDashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState("");
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const data = await expenseApi.getDashboardSummary();
      setSummary(data);
    } catch (err) {
      console.error("Failed to load expense dashboard summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    fetchSummary();
  }, []);

  const firstName = user?.firstName || (user as any)?.first_name || "Finance Manager";

  // Formatted currency helper
  const formatINR = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const quickActions = [
    {
      label: "Finance Verification",
      sub: "Audit & verify claims",
      icon: FileCheck2,
      href: "/finance/expenses/verification",
      badge: summary?.pendingCount ? `${summary.pendingCount} Pending` : undefined,
      color: "bg-amber-50 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Payouts & Disbursals",
      sub: "Batch NEFT & UTR disbursal",
      icon: Wallet,
      href: "/finance/expenses/reimbursements",
      badge: summary?.approvedCount ? `${summary.approvedCount} Ready` : undefined,
      color: "bg-emerald-50 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Travel Advances",
      sub: "Advance approvals & settlement",
      icon: Plane,
      href: "/finance/expenses/travel-advances",
      color: "bg-violet-50 hover:bg-violet-100/70 dark:bg-violet-950/30 dark:hover:bg-violet-900/40 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-200",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Approval Inbox",
      sub: "Multi-level review",
      icon: CheckSquare,
      href: "/finance/expenses/approvals",
      color: "bg-sky-50 hover:bg-sky-100/70 dark:bg-sky-950/30 dark:hover:bg-sky-900/40 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200",
      iconColor: "text-sky-600 dark:text-sky-400",
    },
    {
      label: "Expense Reports",
      sub: "Export audit CSV & XLSX",
      icon: Download,
      href: "/finance/expenses/reports",
      color: "bg-teal-50 hover:bg-teal-100/70 dark:bg-teal-950/30 dark:hover:bg-teal-900/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200",
      iconColor: "text-teal-600 dark:text-teal-400",
    },
    {
      label: "Financial Reports",
      sub: "Ledger & finance analytics",
      icon: FileBarChart,
      href: "/finance/reports",
      color: "bg-indigo-50 hover:bg-indigo-100/70 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200",
      iconColor: "text-indigo-600 dark:text-indigo-400",
    },
  ];

  return (
    <div className="min-h-full bg-background p-6 space-y-8">
      {/* -- Header -- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {greeting}, {firstName}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Sparkles size={12} /> Finance Control
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete overview of expense claims, verification queues, bank disbursements, and travel advances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchSummary}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm hover:bg-muted transition-colors disabled:opacity-50"
            title="Refresh dashboard stats"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-emerald-600" : "text-muted-foreground"} />
            Refresh
          </button>
          <button
            onClick={() => navigate("/finance/expenses/verification")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors shadow-emerald-600/20"
          >
            <FileCheck2 size={15} />
            Open Verification Queue
          </button>
        </div>
      </motion.div>

      {/* -- Primary KPI Stats -- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Pending Verification */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => navigate("/finance/expenses/verification")}
          className="group cursor-pointer rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 via-card to-card p-5 shadow-sm hover:shadow-md hover:border-amber-400 transition-all dark:border-amber-900/40"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Pending Verification
              </p>
              <p className="mt-1.5 text-3xl font-extrabold text-foreground">
                {summary?.pendingCount ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Amount: <span className="font-semibold text-amber-700 dark:text-amber-300">{formatINR(summary?.totalPendingAmount || 0)}</span>
              </p>
            </div>
            <div className="rounded-xl bg-amber-100/80 p-3 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Clock size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs font-medium text-amber-700 dark:text-amber-400">
            <span>Audit receipts & itemize</span>
            <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </motion.div>

        {/* Card 2: Ready for Disbursal */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => navigate("/finance/expenses/reimbursements")}
          className="group cursor-pointer rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-card to-card p-5 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all dark:border-emerald-900/40"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Ready for Disbursal
              </p>
              <p className="mt-1.5 text-3xl font-extrabold text-foreground">
                {summary?.approvedCount ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Payable: <span className="font-semibold text-emerald-700 dark:text-emerald-300">{formatINR(summary?.totalApprovedAmount || 0)}</span>
              </p>
            </div>
            <div className="rounded-xl bg-emerald-100/80 p-3 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Wallet size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span>Generate batch payout CSV</span>
            <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </motion.div>

        {/* Card 3: Total Disbursed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => navigate("/finance/expenses/reimbursements")}
          className="group cursor-pointer rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50/50 via-card to-card p-5 shadow-sm hover:shadow-md hover:border-sky-400 transition-all dark:border-sky-900/40"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
                Total Disbursed
              </p>
              <p className="mt-1.5 text-3xl font-extrabold text-foreground">
                {formatINR(summary?.totalReimbursedAmount || 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{summary?.reimbursedCount ?? 0}</span> claims settled
              </p>
            </div>
            <div className="rounded-xl bg-sky-100/80 p-3 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={22} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs font-medium text-sky-700 dark:text-sky-400">
            <span>View payment vouchers</span>
            <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </motion.div>

        {/* Card 4: Total Claims Volume */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate("/finance/expenses/dashboard")}
          className="group cursor-pointer rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-border transition-all"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Claims Volume
              </p>
              <p className="mt-1.5 text-3xl font-extrabold text-foreground">
                {summary?.totalClaims ?? 0}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Rejected: <span className="font-semibold text-rose-600">{summary?.rejectedCount ?? 0}</span>
              </p>
            </div>
            <div className="rounded-xl p-3" style={{ background: emerald.bg }}>
              <Receipt size={22} style={{ color: emerald.primary }} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs font-medium text-muted-foreground">
            <span>View monthly analytics</span>
            <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </motion.div>
      </div>

      {/* -- Quick Actions Hub -- */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Expense & Finance Workflows</h2>
            <p className="text-xs text-muted-foreground">Direct access to core Finance verification, disbursals, policies, and reports</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(action.href)}
                className={`flex flex-col justify-between text-left rounded-2xl border p-4 transition-all shadow-sm hover:shadow-md ${action.color}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`rounded-xl p-2.5 bg-white/70 dark:bg-black/30 shadow-xs ${action.iconColor}`}>
                    <Icon size={20} />
                  </div>
                  {action.badge && (
                    <span className="rounded-full bg-white dark:bg-black/40 px-2.5 py-0.5 text-[11px] font-bold shadow-xs">
                      {action.badge}
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-sm font-bold text-foreground">{action.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{action.sub}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* -- Pending Action Queues & Category Breakdown -- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pending Items List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Actionable Verification Queue</h2>
            <span className="text-xs font-medium text-muted-foreground">Click to navigate and take action</span>
          </div>

          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden shadow-sm">
            {[
              {
                title: "Claims Awaiting Finance Verification",
                sub: "Audit tax receipts, deduct policy violations & approve for disbursal",
                count: summary?.pendingCount ?? 0,
                urgency: "high",
                icon: FileCheck2,
                path: "/finance/expenses/verification",
                accent: "text-amber-600 dark:text-amber-400",
              },
              {
                title: "Approved Claims Ready for Bank Disbursal",
                sub: "Generate corporate bank NEFT/RTGS batch CSV and mark UTR numbers",
                count: summary?.approvedCount ?? 0,
                urgency: "medium",
                icon: Wallet,
                path: "/finance/expenses/reimbursements",
                accent: "text-emerald-600 dark:text-emerald-400",
              },
              {
                title: "Travel Advance Requests",
                sub: "Pre-trip advance disbursement and clearance vs actual bills",
                count: "Active",
                urgency: "low",
                icon: Plane,
                path: "/finance/expenses/travel-advances",
                accent: "text-violet-600 dark:text-violet-400",
              },
              {
                title: "Multi-Tier Approval Hub",
                sub: "Review Manager, Department Head and CEO tier escalated claims",
                count: "Review",
                urgency: "normal",
                icon: CheckSquare,
                path: "/finance/expenses/approvals",
                accent: "text-sky-600 dark:text-sky-400",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  onClick={() => navigate(item.path)}
                  className="flex items-center justify-between p-4.5 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="rounded-xl p-2.5 bg-muted group-hover:scale-105 transition-transform">
                      <Icon size={18} className={item.accent} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{item.sub}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-foreground border border-border">
                      {typeof item.count === "number" ? `${item.count} items` : item.count}
                    </span>
                    <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Spending Categories Widget (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Top Expense Categories</h2>
            <button
              onClick={() => navigate("/finance/expenses/reports")}
              className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
            >
              View Reports
            </button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
            {summary?.categoryBreakdown && summary.categoryBreakdown.length > 0 ? (
              summary.categoryBreakdown.slice(0, 5).map((cat, idx) => {
                const total = summary.totalApprovedAmount + summary.totalReimbursedAmount || 1;
                const pct = Math.min(100, Math.round((cat.amount / total) * 100)) || 10;
                return (
                  <div key={cat.category || idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{cat.category || "General"}</span>
                      <span className="font-bold text-muted-foreground">{formatINR(cat.amount)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Tags size={28} className="opacity-40 mb-2" />
                <p className="text-xs">No categorical expense data logged yet</p>
                <button
                  onClick={() => navigate("/finance/expenses/reports")}
                  className="mt-3 text-xs font-bold text-emerald-600 hover:underline"
                >
                  Open Expense Reports
                </button>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <button
                onClick={() => navigate("/finance/expenses/reports")}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <Download size={14} />
                Download Category Spending Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

