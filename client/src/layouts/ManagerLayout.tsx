import { SectionRail } from '@/layouts/SectionNavigation';
import { SectionTabs } from '@/layouts/SectionNavigation';
import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { useSubscriptionStore } from '@/features/subscriptions/store/subscriptionStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserRoleAndDept } from '@/lib/userProfile';
import {
  LayoutDashboard, Users, Clock, CheckCircle2, Calendar,
  BarChart3, Bell, Sun, Moon, Menu,
  LogOut, Award, FileText, CreditCard, ChevronRight,
  ChevronDown, FileCheck, Building2, Scan, Percent, Navigation, Palmtree, TrendingUp, UserX, Shield, UserCheck, GitBranch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';
import { useNotificationStore } from '@/features/notifications/store/notificationStore';
import { NotificationDrawer } from '@/features/notifications/components/NotificationDrawer';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { PortalSidebarBrand } from './PortalSidebarBrand';
import { GlobalSearchButton } from '@/features/search/components/GlobalSearch';
import { SidebarProfileMenu } from './SidebarProfileMenu';

// ── Accent palette for Manager (violet/purple) ──────────────────────────────
const C = {
  dot: 'bg-primary',
  icon: 'text-primary',
  badge: 'border-primary/20 bg-primary/10 text-primary',
  activeBg: 'portal-sidebar-active',
  activeText: 'text-white dark:text-slate-950',
  hoverBg: 'hover:bg-muted',
  hoverText: 'hover:text-foreground',
  avatarBorder: 'border-primary/30',
  avatarBg: 'bg-primary',
  profileHover: 'group-hover:text-primary',
  notifDot: 'bg-primary',
  ring: 'ring-primary/20',
  sectionLabel: 'text-muted-foreground',
};

const MANAGER_NAV = [
  {
    label: 'Dashboard',
    subscriptionModule: null,
    items: [
      { name: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'CoreHR',
    subscriptionModule: 'Core HR & Directory',
    items: [
      {
        name: 'CoreHR',
        href: '/manager/dashboard',
        icon: Users,
        subItems: [
          { name: 'My Department', href: '/manager/team', icon: Building2 },
          { name: 'My Lifecycle', href: '/manager/lifecycle', icon: GitBranch },
          { name: 'Org Structure', href: '/manager/org-chart', icon: Building2 },
          { name: 'ID Card', href: '/manager/id-card', icon: Shield },
        ],
      },
    ],
  },
  {
    label: 'Leaves',
    subscriptionModule: 'Leave Management & Approvals',
    items: [
      {
        name: 'Leaves',
        href: '/manager/leaves',
        icon: Palmtree,
        subItems: [
          { name: 'My Leaves', href: '/manager/leaves', icon: Palmtree },
          { name: 'Leave Approvals', href: '/manager/leaves/approvals', icon: CheckCircle2 },
          { name: 'Approvals Dashboard', href: '/manager/leaves/approvals-dashboard', icon: LayoutDashboard },
        ],
      },
    ],
  },
  {
    label: 'Attendance',
    subscriptionModule: 'Attendance & Time Tracking',
    items: [
      {
        name: 'Attendance',
        href: '/manager/attendance',
        icon: Clock,
        subItems: [
          { name: 'Dashboard', href: '/manager/attendance', icon: LayoutDashboard },
          { name: 'Face Attendance', href: '/manager/face-attendance', icon: Scan },
          { name: 'My Attendance Log', href: '/manager/attendance-log', icon: Clock },
          { name: 'Live Tracking', href: '/manager/live-tracking', icon: Navigation },
          { name: 'My Shift', href: '/manager/my-shift', icon: Calendar },
          { name: 'Attendance Correction', href: '/manager/attendance-correction', icon: CheckCircle2 },
        ],
      },
    ],
  },
  {
    label: 'Payroll',
    subscriptionModule: 'Automated Payroll Processing',
    items: [
      {
        name: 'Payroll',
        href: '/manager/payroll',
        icon: CreditCard,
        subItems: [
          { name: 'My Payslips', href: '/manager/payslips', icon: FileCheck },
          { name: 'Team Exit Settlements', href: '/manager/settlements', icon: UserX },
        ],
      },
    ],
  },
  {
    label: 'Loans',
    subscriptionModule: 'Automated Payroll Processing',
    items: [
      {
        name: 'Loans',
        href: '/manager/loans',
        icon: Percent,
        subItems: [
          { name: 'Loan Request', href: '/manager/loans', icon: Percent },
        ],
      },
    ],
  },
  {
    label: 'Expenses',
    subscriptionModule: 'Expense Management',
    items: [
      {
        name: 'Expenses',
        href: '/manager/expenses/approvals',
        icon: FileText,
        subItems: [
          { name: 'Approvals', href: '/manager/expenses/approvals', icon: CheckCircle2 },
          { name: 'My Expenses', href: '/manager/expenses/my-expenses', icon: FileText },
          { name: 'Travel Requests', href: '/manager/expenses/travel-requests', icon: Clock },
          { name: 'Travel Advances', href: '/manager/expenses/travel-advances', icon: Percent },
          { name: 'Mileage Claims', href: '/manager/expenses/mileage-claims', icon: Navigation },
        ],
      },
    ],
  },
  {
    label: 'Performance',
    subscriptionModule: 'Performance & OKRs',
    items: [
      {
        name: 'Performance',
        href: '/manager/performance',
        icon: BarChart3,
        subItems: [
          { name: 'Dashboard', href: '/manager/performance', icon: BarChart3 },
          { name: 'Reviews', href: '/manager/performance/reviews', icon: Award },
          { name: 'Goals', href: '/manager/performance/goals', icon: CheckCircle2 },
        ],
      },
    ],
  },
  {
    label: 'Recruitment',
    subscriptionModule: 'Recruitment & ATS',
    items: [
      {
        name: 'Recruitment',
        href: '/manager/mrf-request',
        icon: Users,
        subItems: [
          { name: 'MRF Request', href: '/manager/mrf-request', icon: FileText },
          { name: 'IJP Approvals', href: '/manager/ijp-approvals', icon: UserCheck },
          { name: 'Interview Schedule', href: '/manager/interview-schedule', icon: Calendar },
        ],
      },
    ],
  },
  {
    label: 'Approvals',
    subscriptionModule: null,
    items: [
      {
        name: 'Approvals',
        href: '/manager/approvals',
        icon: Shield,
        subItems: [
          { name: 'My Approvals', href: '/manager/approvals', icon: CheckCircle2 },
          { name: 'Company Policies', href: '/manager/policies', icon: Shield },
        ],
      },
    ],
  },
];

const ALL_MANAGER_HREFS: string[] = [];
MANAGER_NAV.forEach(section => {
  section.items.forEach((item: any) => {
    if (item.href) ALL_MANAGER_HREFS.push(item.href);
    if (item.subItems) {
      item.subItems.forEach((sub: any) => {
        if (sub.href) ALL_MANAGER_HREFS.push(sub.href);
      });
    }
  });
});

function isItemActive(href: string, pathname: string, allHrefs: string[]): boolean {
  if (pathname === href) return true;
  if (!pathname.startsWith(href + '/')) return false;
  return !allHrefs.some(
    other => other !== href && other.length > href.length && (pathname === other || pathname.startsWith(other + '/'))
  );
}

interface ManagerSidebarNavContentProps {
  sidebarOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  openMenu: string | null;
  setOpenMenu: React.Dispatch<React.SetStateAction<string | null>>;
  pathname: string;
  user: any;
  roleInfo: any;
  initials: string;
  handleLogout: () => void;
  navigate: ReturnType<typeof useNavigate>;
}

function ManagerSidebarNavContent({
  sidebarOpen,
  setMobileOpen,
  openMenu,
  setOpenMenu,
  pathname,
  user,
  roleInfo,
  initials,
  handleLogout,
  navigate,
}: ManagerSidebarNavContentProps) {
  const { hasModule, isGatingEnabled } = useSubscriptionStore();
  const visibleNav = MANAGER_NAV.filter(sec => {
    if (!isGatingEnabled || !sec.subscriptionModule) return true;
    return hasModule(sec.subscriptionModule);
  });
  return (
    <div className="flex h-full flex-col bg-white text-foreground dark:bg-slate-950">
      {/* ── Logo ── */}
      <PortalSidebarBrand open={false} portalLabel="Manager Portal" />

      {/* ── Nav ── */}
      <SectionRail id="manager" groups={visibleNav.map(section => ({ ...section, label: section.items.length === 1 && (section.items[0] as any).subItems ? section.items[0].name : section.label, icon: section.items[0]?.icon }))} open={sidebarOpen} onNavigate={() => setMobileOpen(false)} />

      {/* ── User footer ── */}
      <div className="flex-shrink-0 border-t border-border bg-white p-2 dark:bg-slate-950">
        <SidebarProfileMenu profilePath="/manager/profile" onLogout={handleLogout} onProfileNavigate={() => setMobileOpen(false)}>
        <div
          className={cn(
            'group mx-auto flex size-11 cursor-pointer items-center justify-center rounded-xl border p-0.5 transition-colors',
            'border-border bg-card hover:bg-muted',
            !sidebarOpen && 'justify-center'
          )}
          title="View Profile"
        >
          <div className="relative flex-shrink-0">
            <Avatar className={cn('size-10 border shadow-soft-xs', C.avatarBorder)}>
              <AvatarImage src={user?.avatarUrl || (user as any)?.avatar || (user as any)?.profile_picture} alt="Profile" />
              <AvatarFallback className={cn(C.avatarBg, 'text-white font-bold text-xs')}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 border-2 border-card rounded-full" />
          </div>

        </div>
        </SidebarProfileMenu>
      </div>
    </div>
  );
}

export function ManagerLayout() {
  useNotificationSocket();
  const { unreadCount } = useNotifications();
  const setDrawerOpen = useNotificationStore(state => state.setDrawerOpen);
  const toggleDrawer = useNotificationStore(state => state.toggleDrawer);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const roleInfo = getUserRoleAndDept(user);
  const currentTheme = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme;
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const handleLogout = () => { logout(); navigate('/login'); };

  const renderSidebarContent = () => (
    <ManagerSidebarNavContent
      sidebarOpen={sidebarOpen}
      setMobileOpen={setMobileOpen}
      openMenu={openMenu}
      setOpenMenu={setOpenMenu}
      pathname={location.pathname}
      user={user}
      roleInfo={roleInfo}
      initials={initials}
      handleLogout={handleLogout}
      navigate={navigate}
    />
  );

  return (
    <div className="app-shell-reference flex h-dvh overflow-hidden bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className={cn('role-portal-sidebar relative hidden h-dvh flex-shrink-0 flex-col overflow-hidden border-r border-border bg-white dark:bg-slate-950 md:flex', sidebarOpen ? 'w-28' : 'w-[72px]')}>
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="absolute right-2 top-20 z-10 hidden size-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground md:flex"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
        {renderSidebarContent()}
      </aside>

      {/* ── Mobile Sidebar ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="role-portal-sidebar fixed inset-y-0 left-0 z-50 w-[calc(100vw-1.5rem)] max-w-72 border-r border-border bg-white shadow-xl dark:bg-slate-950 md:hidden"
            >
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center gap-3 border-b border-border bg-card px-3 sm:px-6">
          <Button
            variant="ghost" size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex h-8 w-8 rounded-lg"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={() => { setSidebarOpen(true); setMobileOpen(true); }}
            className="md:hidden h-8 w-8 rounded-lg"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <span className="hidden truncate text-base font-extrabold tracking-tight text-foreground md:inline">APPONEXTHRMS</span>

          <div className="ml-auto flex items-center gap-2">
            <GlobalSearchButton />
            <Button variant="ghost" size="icon" onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')} aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <NotificationBell className="size-8 rounded-lg" iconClassName="size-4" />

          </div>
        </header>
        <SectionTabs id="manager" />

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="min-h-full p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      <NotificationDrawer />
      <Toaster position="top-right" />
    </div>
  );
}
