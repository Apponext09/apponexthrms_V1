import {
  LayoutDashboard,
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
  Scan,
  FileCheck2,
  CreditCard,
  CheckCircle2,
  ReceiptIndianRupee,
  Compass,
  IndianRupee,
  Navigation,
  Layers,
  LineChart,
  Sliders,
  ChevronDown,
  FileText,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useLocation, useNavigate, NavLink } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { PortalSidebarBrand } from "@/layouts/PortalSidebarBrand";

// -- Emerald accent styling constants -------------------------------------------
const C = {
  activeBg: "bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-600/20",
  activeText: "text-white",
  hoverBg: "hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300",
  icon: "text-emerald-600 dark:text-emerald-400",
  sectionLabel: "text-muted-foreground",
  avatarBg: "bg-emerald-600",
  avatarBorder: "border-emerald-400 dark:border-emerald-600",
};

// -- Finance Portal Navigation Structure ---------------------------------------
const FINANCE_NAV = [
  {
    label: "OVERVIEW",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", href: "/finance/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "EXPENSES & DISBURSALS",
    icon: Wallet,
    items: [
      { name: "Finance Verification",     href: "/finance/expenses/verification",   icon: FileCheck2 },
      { name: "Reimbursements & Payouts", href: "/finance/expenses/reimbursements", icon: CreditCard },
      { name: "Travel Advances",          href: "/finance/expenses/travel-advances", icon: IndianRupee },
      { name: "Expense Approvals",        href: "/finance/expenses/approvals",      icon: CheckCircle2 },
      { name: "Expense Reports",          href: "/finance/expenses/reports",        icon: LineChart },
      { name: "Travel Requests",          href: "/finance/expenses/travel-requests", icon: Compass },
      { name: "Mileage Claims",           href: "/finance/expenses/mileage-claims", icon: Navigation },
      { name: "Expense Categories",       href: "/finance/expenses/categories",     icon: Layers },
      { name: "Expense Policies",         href: "/finance/expenses/policies",       icon: Sliders },
    ],
  },
  {
    label: "FINANCE & AUDIT",
    icon: FileBarChart,
    items: [
      { name: "Financial Reports",    href: "/finance/reports",    icon: FileBarChart },
      { name: "Approval Inbox",       href: "/finance/approvals",  icon: CheckSquare },
      { name: "Face Punch Terminal",  href: "/finance/face-punch", icon: Scan },
    ],
  },
  {
    label: "MY SELF SERVICE",
    icon: User,
    items: [
      { name: "My Attendance",        href: "/finance/attendance",           icon: Clock },
      { name: "My Lifecycle",         href: "/finance/lifecycle",            icon: RefreshCw },
      { name: "My Leaves",            href: "/finance/leaves",               icon: Palmtree },
      { name: "My Payslips",          href: "/finance/payslips",             icon: DollarSign },
      { name: "My Expenses",          href: "/finance/expenses/my-expenses", icon: ReceiptIndianRupee },
      { name: "My Documents",         href: "/finance/documents",            icon: FileText },
      { name: "Holiday Calendar",     href: "/finance/holiday-calendar",     icon: Calendar },
    ],
  },
  {
    label: "ORGANISATION",
    icon: Building2,
    items: [
      { name: "Announcements",        href: "/finance/announcements", icon: Megaphone },
      { name: "Org Chart",            href: "/finance/org-chart",     icon: Building2 },
      { name: "My Profile",           href: "/finance/profile",       icon: User },
    ],
  },
];

// Flat list of all registered finance route hrefs for precise route matching
const ALL_FINANCE_HREFS: string[] = [];
FINANCE_NAV.forEach((section) => {
  section.items.forEach((item) => {
    if (item.href && !ALL_FINANCE_HREFS.includes(item.href)) {
      ALL_FINANCE_HREFS.push(item.href);
    }
  });
});

/**
 * Longest-prefix matching: guarantees distinct routes don't highlight simultaneously
 * e.g. /finance/expenses/approvals will NEVER activate /finance/approvals
 */
function isItemActive(href: string, pathname: string, allHrefs: string[]): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  return !allHrefs.some(
    (other) =>
      other !== href &&
      other.length > href.length &&
      (pathname === other || pathname.startsWith(other + "/"))
  );
}

interface FinanceSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FinanceSidebar({ open, onOpenChange }: FinanceSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  // Multi-section accordion state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    OVERVIEW: true,
    "EXPENSES & DISBURSALS": true,
    "FINANCE & AUDIT": true,
    "MY SELF SERVICE": true,
    ORGANISATION: true,
  });

  // Automatically keep the active section expanded whenever the route changes
  useEffect(() => {
    const activeSection = FINANCE_NAV.find((s) =>
      s.items.some((item) => isItemActive(item.href, location.pathname, ALL_FINANCE_HREFS))
    );
    if (activeSection) {
      setExpandedSections((prev) => ({
        ...prev,
        [activeSection.label]: true,
      }));
    }
  }, [location.pathname]);

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "FI";

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-border bg-card transition-all duration-300 ease-in-out select-none",
        open ? "w-64" : "w-[72px]"
      )}
    >
      {/* -- Brand -- */}
      <PortalSidebarBrand open={open} portalLabel="Finance Portal" />

      {/* -- Navigation -- */}
      <nav className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {FINANCE_NAV.map((section) => {
          const SectionIcon = section.icon || section.items[0]?.icon || LayoutDashboard;
          const isOverview = section.label === "OVERVIEW";
          const isSectionOpen = expandedSections[section.label] ?? true;
          const hasActiveChild = section.items.some((item) =>
            isItemActive(item.href, location.pathname, ALL_FINANCE_HREFS)
          );

          return (
            <div key={section.label} className="space-y-1">
              {/* Section Header (if not overview) */}
              {!isOverview && (
                <div>
                  {open ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.label)}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[11px] font-bold tracking-wider uppercase transition-colors",
                        hasActiveChild
                          ? "text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground/80 hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <SectionIcon
                          size={14}
                          className={cn(
                            "flex-shrink-0 transition-colors",
                            hasActiveChild ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/70"
                          )}
                        />
                        <span className="truncate">{section.label}</span>
                      </span>
                      <ChevronDown
                        size={14}
                        className={cn(
                          "text-muted-foreground transition-transform duration-200",
                          isSectionOpen ? "rotate-0" : "-rotate-90"
                        )}
                      />
                    </button>
                  ) : (
                    <div className="my-1 border-t border-border/40" />
                  )}
                </div>
              )}

              {/* Section Items */}
              {(isOverview || !open || isSectionOpen) && (
                <div className={cn("space-y-0.5", !isOverview && open && "pl-1")}>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isItemActive(item.href, location.pathname, ALL_FINANCE_HREFS);

                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        end
                        title={!open ? item.name : undefined}
                        className={cn(
                          "group relative flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-all duration-150",
                          active
                            ? C.activeBg
                            : cn("text-muted-foreground font-medium", C.hoverBg, "hover:text-foreground"),
                          !open && "justify-center px-2 min-h-10"
                        )}
                      >
                        <Icon
                          size={16}
                          className={cn(
                            "flex-shrink-0 transition-colors",
                            active
                              ? "text-white"
                              : "text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                          )}
                        />
                        {open && (
                          <span className="truncate font-semibold tracking-tight">{item.name}</span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* -- User Footer -- */}
      <div className="flex-shrink-0 border-t border-border bg-card p-3">
        <div
          onClick={() => navigate("/finance/profile")}
          className={cn(
            "group flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-2 transition-all hover:bg-muted/80 hover:border-border",
            !open && "justify-center p-1.5 border-transparent bg-transparent"
          )}
          title="View My Profile"
        >
          <Avatar className={cn("h-8 w-8 flex-shrink-0 border-2", C.avatarBorder)}>
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className={cn("text-xs font-bold text-white", C.avatarBg)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-1 items-center justify-between overflow-hidden"
              >
                <div className="min-w-0 pr-1">
                  <p className="truncate text-xs font-bold text-foreground leading-tight group-hover:text-emerald-600 transition-colors">
                    {(() => {
                      const fName = (user?.firstName || (user as any)?.first_name || "").trim();
                      let lName = (user?.lastName || (user as any)?.last_name || "").trim();
                      if (lName.toLowerCase() === "user") lName = "";
                      const full = `${fName} ${lName}`.trim();
                      return full || fName || "Finance Manager";
                    })()}
                  </p>
                  <p className="truncate text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Finance Portal</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
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
