import {
  LayoutDashboard,
  BarChart2,
  CheckSquare,
  Clock,
  Calendar,
  Palmtree,
  User,
  Megaphone,
  Building2,
  LogOut,
  DollarSign,
  FileBarChart,
  TrendingUp,
  Scan,
  FileCheck2,
  CreditCard,
  CheckCircle2,
  ReceiptIndianRupee,
  Compass,
  IndianRupee,
  Navigation,
  Layers,
  ShieldCheck,
  LineChart,
  Sliders,
  ChevronDown,
  GitBranch,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { PortalSidebarBrand } from "@/layouts/PortalSidebarBrand";

// -- Emerald accent constants ---------------------------------------------------
const C = {
  activeBg: "bg-primary",
  activeText: "text-white",
  hoverBg: "hover:bg-muted", hoverText: "hover:text-foreground", icon: "text-primary",
  sectionLabel: "text-muted-foreground",
  avatarBg: "bg-primary", avatarBorder: "border-primary/30",
};

// -- Nav definitions ------------------------------------------------------------
const FINANCE_NAV = [
  {
    label: "OVERVIEW",
    items: [
      { name: "Dashboard", href: "/finance/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "EXPENSE & DISBURSAL",
    items: [
      { name: "Finance Verification",     href: "/finance/expenses/verification",   icon: FileCheck2 },
      { name: "Reimbursements & Payouts", href: "/finance/expenses/reimbursements", icon: CreditCard },
      { name: "Travel Advances",          href: "/finance/expenses/travel-advances", icon: IndianRupee },
      { name: "Expense Approvals",        href: "/finance/expenses/approvals",      icon: CheckCircle2 },
      { name: "Expense Reports",          href: "/finance/expenses/reports",        icon: LineChart },
    ],
  },
  {
    label: "EMPLOYEE CORE",
    items: [
      { name: "My Lifecycle", href: "/finance/lifecycle", icon: GitBranch },
      { name: "Org Structure", href: "/finance/org-chart", icon: Building2 },
      { name: "ID Card", href: "/finance/id-card", icon: ShieldCheck },
    ],
  },
  {
    label: "ATTENDANCE",
    items: [
      { name: "Face Punch", href: "/finance/face-punch", icon: Scan },
      { name: "My Attendance Log", href: "/finance/attendance", icon: Clock },
      { name: "My Shifts", href: "/finance/shift-roster", icon: Calendar },
      { name: "Attendance Correction", href: "/finance/attendance-regularization", icon: RefreshCw },
    ],
  },
  {
    label: "FINANCE & AUDIT",
    items: [
      { name: "Financial Reports", href: "/finance/reports",   icon: FileBarChart },
      { name: "Approval Inbox",    href: "/finance/approvals", icon: CheckSquare },
    ],
  },
  {
    label: "MY SELF SERVICE",
    items: [
      { name: "My Leaves",        href: "/finance/leaves",           icon: Palmtree },
      { name: "My Payslips",      href: "/finance/payslips",         icon: DollarSign },
      { name: "Holiday Calendar", href: "/finance/holiday-calendar", icon: Calendar },
    ],
  },
  {
    label: "ORGANISATION",
    items: [
      { name: "Announcements", href: "/finance/announcements", icon: Megaphone },
      { name: "Org Chart",     href: "/finance/org-chart",     icon: Building2 },
    ],
  },
];

interface FinanceSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FinanceSidebar({ open, onOpenChange }: FinanceSidebarProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "FI";

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
        open ? "w-64" : "w-[72px]"
      )}
    >
      {/* -- Brand -- */}
      <PortalSidebarBrand open={open} portalLabel="Finance Portal" />

      {/* -- Nav -- */}
      <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {FINANCE_NAV.map((section) => (
          <div key={section.label}>
            {section.label === "OVERVIEW" ? <div className="space-y-0.5">{section.items.map((item) => { const Icon = item.icon; const active = isActive(item.href); return <button key={item.href} onClick={() => navigate(item.href)} title={!open ? item.name : undefined} className={cn("group flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all", active ? `${C.activeBg} ${C.activeText} shadow-sm` : `text-muted-foreground ${C.hoverBg} ${C.hoverText}`, !open && "justify-center px-2")}><Icon size={16} className={cn("flex-shrink-0", active ? "text-white" : C.icon)} />{open && <span className="truncate">{item.name}</span>}</button>; })}</div> : (() => { const SectionIcon = section.items[0].icon; const hasActiveItem = section.items.some((item) => isActive(item.href)); const isOpen = openMenu === section.label || hasActiveItem; return <div className="space-y-1"><button type="button" onClick={() => setOpenMenu(isOpen ? null : section.label)} title={!open ? section.label : undefined} className={cn("group flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors", hasActiveItem ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400" : `text-muted-foreground ${C.hoverBg} ${C.hoverText}`, !open && "justify-center px-2")}><span className="flex items-center gap-3"><SectionIcon size={16} className={C.icon} />{open && <span>{section.label}</span>}</span>{open && <ChevronDown size={16} className={cn("transition-transform", isOpen && "rotate-180")} />}</button>{open && isOpen && <div className="ml-3 space-y-1 border-l border-border pl-3">{section.items.map((item) => { const Icon = item.icon; const active = isActive(item.href); return <button key={item.href} onClick={() => navigate(item.href)} className={cn("flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors", active ? `${C.activeBg} ${C.activeText} font-bold` : `text-muted-foreground ${C.hoverBg} ${C.hoverText}`)}><Icon size={14} className={active ? "text-white" : C.icon} /><span className="truncate">{item.name}</span></button>; })}</div>}</div>; })()}
          </div>
        ))}
      </nav>

      {/* -- User Footer -- */}
      <div className="border-t border-border p-3">
        <div
          onClick={() => navigate('/finance/profile')}
          className={cn('flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-2.5 hover:bg-muted transition-colors', !open && 'justify-center')}
          title="View Profile"
        >
          <Avatar className={cn('h-8 w-8 flex-shrink-0 border-2', C.avatarBorder)}>
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className={cn('text-xs font-bold text-white', C.avatarBg)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-1 items-center justify-between overflow-hidden"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {(() => {
                      const fName = (user?.firstName || (user as any)?.first_name || '').trim();
                      let lName  = (user?.lastName  || (user as any)?.last_name  || '').trim();
                      if (lName.toLowerCase() === 'user') lName = '';
                      const full = `${fName} ${lName}`.trim();
                      return full || fName || 'User';
                    })()}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">Finance</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  title="Sign out"
                >
                  <LogOut size={13} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
