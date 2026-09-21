import { SectionRail } from '@/layouts/SectionNavigation';
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
import { SidebarProfileMenu } from "@/layouts/SidebarProfileMenu";

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
      { name: "Payment Cycle Reports",   href: "/finance/expenses/reimbursements", icon: CreditCard },
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
      { name: "My Documents",     href: "/finance/documents",        icon: FileBarChart },
    ],
  },
  {
    label: "ORGANISATION",
    items: [
      { name: "Announcements", href: "/finance/announcements", icon: Megaphone },
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
        "flex h-full flex-col border-r border-border bg-white transition-all duration-300 ease-in-out dark:bg-slate-950",
        open ? "w-[calc(100vw-1.5rem)] max-w-72 md:w-28" : "w-[72px]"
      )}
    >
      {/* -- Brand -- */}
      <PortalSidebarBrand open={false} portalLabel="Finance Portal" />

      {/* -- Nav -- */}
      <SectionRail id="finance" groups={FINANCE_NAV} open={open} onNavigate={() => { if (window.innerWidth < 768) onOpenChange(false); }} />

      {/* -- User Footer -- */}
      <div className="border-t border-border bg-white p-3 dark:bg-slate-950">
        <SidebarProfileMenu profilePath="/finance/profile" onLogout={handleLogout} onProfileNavigate={() => { if (window.innerWidth < 768) onOpenChange(false); }}>
        <div
          className="mx-auto flex size-12 cursor-pointer items-center justify-center rounded-xl border border-border bg-white p-1.5 transition-colors hover:bg-muted dark:bg-slate-950"
          title="View Profile"
        >
          <Avatar className={cn('h-8 w-8 flex-shrink-0 border-2', C.avatarBorder)}>
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className={cn('text-xs font-bold text-white', C.avatarBg)}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        </SidebarProfileMenu>
      </div>
    </div>
  );
}
