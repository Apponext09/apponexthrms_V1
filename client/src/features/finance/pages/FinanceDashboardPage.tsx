import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileBarChart, CheckSquare, DollarSign, TrendingUp,
  Clock, AlertCircle, CheckCircle2, ChevronRight,
  Receipt, CreditCard, Wallet, BarChart3,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";

// -- Emerald palette -----------------------------------------------------------
const emerald = {
  primary:     "hsl(158, 64%, 40%)",
  primaryDark: "hsl(158, 64%, 32%)",
  bg:          "hsl(158, 64%, 40% / 0.08)",
  border:      "hsl(158, 64%, 40% / 0.25)",
};

// -- Quick actions -------------------------------------------------------------
const QUICK_ACTIONS = [
  { label: "View Reports",          icon: FileBarChart, href: "/finance/reports",          color: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400" },
  { label: "Pending Approvals",     icon: CheckSquare,  href: "/finance/approvals",         color: "bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 hover:border-sky-400" },
  { label: "My Attendance",         icon: Clock,        href: "/finance/attendance",         color: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800 hover:border-violet-400" },
  { label: "My Leaves",             icon: ChevronRight, href: "/finance/leaves",             color: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 hover:border-amber-400" },
];

// -- Stat card -----------------------------------------------------------------
function StatCard({ label, value, icon: Icon, sub, accent, trend }: {
  label: string; value: string | number; icon: any; sub?: string; accent?: string; trend?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          <p className={`mt-1 text-3xl font-bold ${accent || "text-foreground"}`}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="rounded-xl p-2.5" style={{ background: emerald.bg }}>
          <Icon size={20} style={{ color: emerald.primary }} />
        </div>
      </div>
      {trend && (
        <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">{trend}</p>
      )}
    </motion.div>
  );
}

// -- Main dashboard ------------------------------------------------------------
export function FinanceDashboardPage() {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  const firstName = user?.firstName || (user as any)?.first_name || "Finance";

  return (
    <div className="min-h-full bg-background p-6 space-y-8">

      {/* -- Header -- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-1"
      >
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {firstName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's your Finance Portal overview — manage reports, approvals and financial workflows.
        </p>
      </motion.div>

      {/* -- KPI Stats -- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending Approvals"  value="12" icon={CheckSquare}  accent="text-amber-600 dark:text-amber-400"  sub="Expense & reimbursement claims" trend="↑ 3 new since yesterday" />
        <StatCard label="Claims This Month"  value="47" icon={Receipt}      accent="text-sky-600 dark:text-sky-400"       sub="Total submitted claims"         trend="Across all categories" />
        <StatCard label="Payout Processed"   value="₹2.4L" icon={Wallet}   accent="text-emerald-600 dark:text-emerald-400" sub="This month"                    trend="↑ 12% from last month" />
        <StatCard label="Loan Requests"      value="5"  icon={CreditCard}  accent="text-violet-600 dark:text-violet-400" sub="Pending review"                  trend="2 urgent — review needed" />
      </div>

      {/* -- Quick Actions -- */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <motion.button
                key={a.href}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(a.href)}
                className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 text-sm font-semibold transition-all ${a.color}`}
              >
                <Icon size={22} className="text-current opacity-70" />
                {a.label}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* -- Pending Approvals Summary -- */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-foreground">Pending Approvals Summary</h2>
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {[
            { type: "Expense Claims",           count: 5, urgency: "high",   icon: Receipt,    path: "/finance/approvals" },
            { type: "Reimbursements",           count: 3, urgency: "medium", icon: Wallet,     path: "/finance/approvals" },
            { type: "Travel Advance Requests",  count: 2, urgency: "low",    icon: BarChart3,  path: "/finance/approvals" },
            { type: "Loan Requests",            count: 2, urgency: "high",   icon: CreditCard, path: "/finance/approvals" },
          ].map((item) => {
            const Icon = item.icon;
            const urgencyColor = item.urgency === "high" ? "text-red-500" : item.urgency === "medium" ? "text-amber-500" : "text-muted-foreground";
            return (
              <div
                key={item.type}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer"
                onClick={() => navigate(item.path)}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg p-2" style={{ background: emerald.bg }}>
                    <Icon size={16} style={{ color: emerald.primary }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.type}</p>
                    <p className={`text-xs font-medium ${urgencyColor}`}>
                      {item.urgency.charAt(0).toUpperCase() + item.urgency.slice(1)} priority
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                    {item.count} pending
                  </span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
