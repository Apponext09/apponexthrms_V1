import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckSquare, Receipt, Wallet, CreditCard, DollarSign,
  AlertCircle, CheckCircle2, XCircle, Clock, ChevronRight,
  User, Calendar, MessageSquare, Check, X,
} from "lucide-react";

// -- Emerald palette -----------------------------------------------------------
const emerald = {
  primary:  "hsl(158, 64%, 40%)",
  bg:       "hsl(158, 64%, 40% / 0.08)",
};

// -- Approval tab definitions -------------------------------------------------
const APPROVAL_TABS = [
  { id: "expenses",    label: "Expense Claims",       icon: Receipt,      count: 5 },
  { id: "reimbursement", label: "Reimbursements",     icon: Wallet,       count: 3 },
  { id: "travel",      label: "Travel Advances",      icon: DollarSign,   count: 2 },
  { id: "loans",       label: "Loan Requests",        icon: CreditCard,   count: 2 },
  { id: "salary",      label: "Salary Revisions",     icon: CheckSquare,  count: 0 },
  { id: "settlement",  label: "F&F Settlements",      icon: AlertCircle,  count: 0 },
];

// -- Sample data ---------------------------------------------------------------
const SAMPLE_APPROVALS = [
  { id: "EXP-101", employee: "Rohan Sharma",   dept: "Engineering",  amount: "₹4,500",  type: "Travel",    date: "02 Sep 2026", status: "pending_finance", note: "Conference travel – Mumbai" },
  { id: "EXP-102", employee: "Priya Patel",    dept: "Marketing",    amount: "₹1,200",  type: "Meals",     date: "01 Sep 2026", status: "pending_finance", note: "Client lunch at Taj" },
  { id: "EXP-103", employee: "Karan Mehta",    dept: "Operations",   amount: "₹12,000", type: "Equipment", date: "31 Aug 2026", status: "pending_finance", note: "External hard drive purchase" },
  { id: "EXP-104", employee: "Sunita Gupta",   dept: "Finance",      amount: "₹7,800",  type: "Travel",    date: "30 Aug 2026", status: "pending_finance", note: "Audit travel – Pune" },
  { id: "EXP-105", employee: "Aditya Kumar",   dept: "HR",           amount: "₹3,600",  type: "Training",  date: "29 Aug 2026", status: "pending_finance", note: "Online course subscription" },
];

const SAMPLE_LOANS = [
  { id: "LOAN-001", employee: "Meena Roy",   dept: "Engineering", amount: "₹50,000",  tenure: "12 months", date: "01 Sep 2026", status: "pending", reason: "Medical emergency" },
  { id: "LOAN-002", employee: "Vijay Nair",  dept: "Sales",       amount: "₹25,000",  tenure: "6 months",  date: "31 Aug 2026", status: "pending", reason: "Home renovation" },
];

// -- Claim Card ---------------------------------------------------------------
function ClaimCard({ claim, onApprove, onReject }: { claim: typeof SAMPLE_APPROVALS[0]; onApprove: (id: string) => void; onReject: (id: string) => void; }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
            {claim.employee.split(" ").map((n) => n[0]).join("")}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{claim.employee}</p>
            <p className="text-xs text-muted-foreground">{claim.dept} · {claim.date}</p>
            <p className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 inline-block">{claim.note}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className="text-base font-bold text-foreground">{claim.amount}</span>
          <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{claim.type}</span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <span className="text-xs font-mono text-muted-foreground flex-1">{claim.id}</span>
        <button
          onClick={() => onReject(claim.id)}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
        >
          <X size={12} /> Reject
        </button>
        <button
          onClick={() => onApprove(claim.id)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          <Check size={12} /> Approve
        </button>
      </div>
    </motion.div>
  );
}

// -- Tab panels ---------------------------------------------------------------
function ExpenseClaimsTab() {
  const [claims, setClaims] = useState(SAMPLE_APPROVALS);

  const handleApprove = (id: string) => {
    setClaims((prev) => prev.filter((c) => c.id !== id));
  };
  const handleReject = (id: string) => {
    setClaims((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-3">
      {claims.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
          <p className="font-medium">All caught up!</p>
          <p className="text-xs mt-1">No expense claims pending finance verification.</p>
        </div>
      ) : (
        claims.map((c) => (
          <ClaimCard key={c.id} claim={c} onApprove={handleApprove} onReject={handleReject} />
        ))
      )}
    </div>
  );
}

function LoanRequestsTab() {
  const [loans, setLoans] = useState(SAMPLE_LOANS);

  return (
    <div className="space-y-3">
      {loans.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
          <p className="font-medium">No pending loan requests.</p>
        </div>
      ) : (
        loans.map((loan, i) => (
          <motion.div
            key={loan.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{loan.employee}</p>
                <p className="text-xs text-muted-foreground">{loan.dept} · {loan.date}</p>
                <p className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 inline-block">{loan.reason}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-foreground">{loan.amount}</p>
                <p className="text-xs text-muted-foreground">{loan.tenure}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <span className="text-xs font-mono text-muted-foreground flex-1">{loan.id}</span>
              <button
                onClick={() => setLoans((prev) => prev.filter((l) => l.id !== loan.id))}
                className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
              >
                <X size={12} /> Reject
              </button>
              <button
                onClick={() => setLoans((prev) => prev.filter((l) => l.id !== loan.id))}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <Check size={12} /> Approve
              </button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

function EmptyApprovalTab({ label }: { label: string }) {
  return (
    <div className="py-16 text-center text-sm text-muted-foreground">
      <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
      <p className="font-medium">No pending {label}.</p>
      <p className="text-xs mt-1">All requests have been processed.</p>
    </div>
  );
}

const TAB_CONTENT: Record<string, React.ReactNode> = {
  expenses:      <ExpenseClaimsTab />,
  reimbursement: <EmptyApprovalTab label="reimbursement requests" />,
  travel:        <EmptyApprovalTab label="travel advance requests" />,
  loans:         <LoanRequestsTab />,
  salary:        <EmptyApprovalTab label="salary revision approvals" />,
  settlement:    <EmptyApprovalTab label="F&F settlement approvals" />,
};

// -- Main Page ----------------------------------------------------------------
export function FinanceApprovalsPage() {
  const [activeTab, setActiveTab] = useState("expenses");

  return (
    <div className="min-h-full bg-background p-6 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5" style={{ background: emerald.bg }}>
            <CheckSquare size={22} style={{ color: emerald.primary }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Finance Approvals</h1>
            <p className="text-xs text-muted-foreground">Verify and approve expense claims, reimbursements, travel advances, loans and settlements</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-border pb-0">
        {APPROVAL_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-[1px] ${
                active
                  ? "border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon size={13} />
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-1.5 py-0 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {tab.count}
                </span>
              )}
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
