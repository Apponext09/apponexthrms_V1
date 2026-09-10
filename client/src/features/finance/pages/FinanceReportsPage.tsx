import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileBarChart, DollarSign, Users, TrendingUp,
  Download, Filter, Calendar, Search, BarChart3,
  Receipt, Wallet, CreditCard, ChevronDown,
} from "lucide-react";

// -- Emerald palette -----------------------------------------------------------
const emerald = {
  primary:  "hsl(158, 64%, 40%)",
  bg:       "hsl(158, 64%, 40% / 0.08)",
  border:   "hsl(158, 64%, 40% / 0.25)",
};

// -- Report tab definitions ---------------------------------------------------
const REPORT_TABS = [
  { id: "expense",  label: "Expense & Claims",       icon: Receipt    },
  { id: "payroll",  label: "Payroll & Salary",        icon: DollarSign },
  { id: "overtime", label: "Overtime & Attendance",   icon: TrendingUp },
  { id: "custom",   label: "Custom Report Engine",    icon: BarChart3  },
];

// -- Sample table rows ---------------------------------------------------------
const SAMPLE_EXPENSE_ROWS = [
  { id: "EXP-001", employee: "Rohan Sharma",   category: "Travel",    amount: "₹4,500", status: "Approved",  date: "02 Sep 2026" },
  { id: "EXP-002", employee: "Priya Patel",    category: "Meals",     amount: "₹1,200", status: "Pending",   date: "01 Sep 2026" },
  { id: "EXP-003", employee: "Karan Mehta",    category: "Equipment", amount: "₹12,000",status: "Verified",  date: "31 Aug 2026" },
  { id: "EXP-004", employee: "Sunita Gupta",   category: "Travel",    amount: "₹7,800", status: "Rejected",  date: "30 Aug 2026" },
  { id: "EXP-005", employee: "Aditya Kumar",   category: "Training",  amount: "₹3,600", status: "Approved",  date: "29 Aug 2026" },
];

const STATUS_COLORS: Record<string, string> = {
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  Pending:  "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  Verified: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800",
};

// -- Tab content components ---------------------------------------------------
function ExpenseReport() {
  const [search, setSearch] = useState("");

  const filtered = SAMPLE_EXPENSE_ROWS.filter(
    (r) =>
      r.employee.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      r.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            placeholder="Search employee, category, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40 transition-colors">
          <Calendar size={14} /> Date Range <ChevronDown size={12} />
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40 transition-colors">
          <Filter size={14} /> Filter
        </button>
        <button className="flex items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-sm text-white hover:bg-emerald-700 transition-colors ml-auto">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Claims",   value: "47", color: "text-foreground" },
          { label: "Total Amount",   value: "₹2.4L", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Approved",       value: "32", color: "text-sky-600 dark:text-sky-400" },
          { label: "Pending Review", value: "12", color: "text-amber-600 dark:text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Claim ID", "Employee", "Category", "Amount", "Status", "Date"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((row, i) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="hover:bg-muted/30 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.id}</td>
                <td className="px-4 py-3 font-medium text-foreground">{row.employee}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.category}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{row.amount}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[row.status]}`}>{row.status}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.date}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No records found.</div>
        )}
      </div>
    </div>
  );
}

function PayrollReport() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Payroll",   value: "₹34.2L", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Employees Paid",  value: "128",    color: "text-foreground" },
          { label: "Net Deductions",  value: "₹4.1L",  color: "text-red-500" },
          { label: "Gross Payout",    value: "₹38.3L", color: "text-sky-600 dark:text-sky-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        <DollarSign size={32} className="mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Full payroll salary register is available here.</p>
        <p className="text-xs mt-1">Filter by department, month or employee to generate a detailed report.</p>
        <button className="mt-4 flex items-center gap-2 mx-auto rounded-lg border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 transition-colors">
          <Download size={14} /> Download Salary Register
        </button>
      </div>
    </div>
  );
}

function OvertimeReport() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
      <TrendingUp size={32} className="mx-auto mb-3 opacity-40" />
      <p className="text-sm font-medium">Overtime and attendance cost analytics.</p>
      <p className="text-xs mt-1">View overtime hours, attendance deductions and cost-per-hour analysis.</p>
    </div>
  );
}

function CustomReport() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
      <BarChart3 size={32} className="mx-auto mb-3 opacity-40" />
      <p className="text-sm font-medium">Custom Financial Report Engine</p>
      <p className="text-xs mt-1">Build custom reports by selecting fields, date ranges, departments and more.</p>
    </div>
  );
}

const TAB_CONTENT: Record<string, React.ReactNode> = {
  expense:  <ExpenseReport />,
  payroll:  <PayrollReport />,
  overtime: <OvertimeReport />,
  custom:   <CustomReport />,
};

// -- Main Page ----------------------------------------------------------------
export function FinanceReportsPage() {
  const [activeTab, setActiveTab] = useState("expense");

  return (
    <div className="min-h-full bg-background p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ background: emerald.bg }}>
            <FileBarChart size={22} style={{ color: emerald.primary }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Finance Reports</h1>
            <p className="text-xs text-muted-foreground">Expense claims, payroll registers, overtime analytics and custom reports</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-0">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-[1px] ${
                active
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {TAB_CONTENT[activeTab]}
      </motion.div>
    </div>
  );
}
