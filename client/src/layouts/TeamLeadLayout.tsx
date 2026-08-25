
import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserRoleAndDept } from '@/lib/userProfile';
import {
  LayoutDashboard, Users, Clock, CheckCircle2, Calendar,
  BarChart3, Bell, Sun, Moon, Menu, Award, LogOut,
  CreditCard, Percent, FileText, ChevronLeft, ChevronRight, ChevronDown, FileCheck, Building2, Scan, Navigation, Palmtree, TrendingUp, UserX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';
import { useNotificationStore } from '@/features/notifications/store/notificationStore';
import { NotificationDrawer } from '@/features/notifications/components/NotificationDrawer';
import { Button } from '@/components/ui/button';
import { PortalSidebarBrand } from './PortalSidebarBrand';

// ── Accent palette for Team Lead (emerald/teal) ───────────────────────────────
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
  sectionLabel: 'text-muted-foreground',
};

const TEAM_LEAD_NAV = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'My Dashboard', href: '/team-lead/dashboard', icon: LayoutDashboard },
      { name: 'My Leaves', href: '/team-lead/leaves', icon: Palmtree },
    ],
  },
  {
    label: 'MY TEAM',
    items: [
      { name: 'Team Members', href: '/team-lead/members', icon: Users },
      {
        name: 'Attendance',
        href: '/team-lead/attendance',
        icon: Clock,
        subItems: [
          { name: 'Attendance Dashboard', href: '/team-lead/attendance', icon: LayoutDashboard },
          { name: 'Live Employee Tracking', href: '/team-lead/live-tracking', icon: Navigation },
          { name: 'Face Attendance', href: '/team-lead/face-attendance', icon: Scan },
        ],
      },
      { name: 'Leave Approvals', href: '/team-lead/leaves/approvals', icon: CheckCircle2 },
    ],
  },
  {
    label: 'MY PAYROLL',
    items: [
      {
        name: 'My Payroll',
        href: '/team-lead/payroll',
        icon: CreditCard,
        subItems: [
          { name: 'My Payslips', href: '/team-lead/payslips', icon: FileCheck },
          { name: 'Salary Revisions', href: '/team-lead/salary-revisions', icon: TrendingUp },
          { name: 'Team Exit Clearances', href: '/team-lead/settlements', icon: UserX },
        ],
      },
    ],
  },
  {
    label: 'LOAN MANAGEMENT',
    items: [
      { name: 'Loan Requests', href: '/team-lead/loans', icon: Percent },
    ],
  },
  {
    label: 'EXPENSE MANAGEMENT',
    items: [
      { name: 'Expense Claims', href: '/team-lead/expenses', icon: FileText },
    ],
  },
  {
    label: 'TRAVEL MANAGEMENT',
    items: [
      { name: 'Travel Requests', href: '/team-lead/travel', icon: Clock },
    ],
  },
  {
    label: 'PERFORMANCE',
    items: [
      { name: 'Team Goals', href: '/performance/goals', icon: BarChart3 },
      { name: 'Reviews', href: '/performance/reviews', icon: Award },
    ],
  },
  {
    label: 'HIRING',
    items: [
      { name: 'MRF Request', href: '/manager/mrf-request', icon: FileText },
      { name: 'Interview Schedule', href: '/team-lead/interview-schedule', icon: Calendar },
    ],
  },
  {
    label: 'APPROVALS',
    items: [
      { name: 'My Approvals', href: '/approvals', icon: CheckCircle2 },
    ],
  },
];

export function TeamLeadLayout() {
  useNotificationSocket();
  const { unreadCount } = useNotifications();
  const setDrawerOpen = useNotificationStore(state => state.setDrawerOpen);
  const toggleDrawer = useNotificationStore(state => state.toggleDrawer);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(true);
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <PortalSidebarBrand open={sidebarOpen} portalLabel="Team Lead Portal" />

      {/* ── Nav ── */}
      <nav className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {TEAM_LEAD_NAV.map((section) => (
          <div key={section.label}>
            <AnimatePresence>
              {sidebarOpen && !(section.items.length === 1 && (section.items[0] as any).subItems) && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className={cn('mb-1 px-3 text-[9px] font-bold uppercase', C.sectionLabel)}
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-0.5">
              {section.items.map((item: any) => {
                const Icon = item.icon;
                const hasSubItems = item.subItems && item.subItems.length > 0;

                if (hasSubItems) {
                  const isSubActive = item.subItems.some((sub: any) =>
                    location.pathname === sub.href || location.pathname.startsWith(sub.href + '/')
                  );
                  const isOpen = payrollOpen || isSubActive;

                  return (
                    <div key={item.href} className="space-y-1">
                      <button
                        onClick={() => setPayrollOpen(!payrollOpen)}
                        className={cn(
                          'group flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors',
                          isSubActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          !sidebarOpen && 'justify-center px-2'
                        )}
                        title={!sidebarOpen ? item.name : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn('size-4 flex-shrink-0', isSubActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                          {sidebarOpen && <span>{item.name}</span>}
                        </div>
                        {sidebarOpen && (
                          <ChevronDown
                            className={cn('h-4 w-4 transition-transform duration-200 text-muted-foreground', isOpen && 'rotate-180')}
                          />
                        )}
                      </button>

                      {isOpen && sidebarOpen && (
                        <div className="ml-3 mt-1 space-y-1 border-l border-border pl-3">
                          {item.subItems.map((sub: any) => {
                            const SubIcon = sub.icon;
                            const active = location.pathname === sub.href || location.pathname.startsWith(sub.href + '/');
                            return (
                              <NavLink
                                key={sub.href}
                                to={sub.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                  'flex min-h-9 items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                                  active
                                    ? 'portal-sidebar-active font-bold text-white dark:text-slate-950'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                              >
                                <SubIcon className={cn('size-3.5 flex-shrink-0', active ? 'text-white dark:text-slate-950' : 'text-muted-foreground')} />
                                <span className="truncate">{sub.name}</span>
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }

                const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={!sidebarOpen ? item.name : undefined}
                    className={cn(
                      'group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[12px] transition-colors',
                      active
                        ? cn(C.activeBg, C.activeText, 'font-semibold shadow-md')
                        : cn('text-muted-foreground font-medium', C.hoverBg, C.hoverText),
                      !sidebarOpen && 'justify-center px-2'
                    )}
                  >
                    <Icon className={cn(
                      'size-4 flex-shrink-0 transition-colors',
                      active ? 'text-white dark:text-slate-950' : 'text-muted-foreground'
                    )} />
                    <AnimatePresence initial={false}>
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="truncate leading-none"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                );
              })}
            </div>
          </div >
        ))
        }
      </nav >

      {/* ── User footer ── */}
      < div className="flex-shrink-0 border-t border-border bg-card p-3" >
        <div
          onClick={() => navigate('/team-lead/profile')}
          className={cn(
            'group flex min-h-14 cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition-colors',
            'border-border bg-card hover:bg-muted',
            !sidebarOpen && 'justify-center'
          )}
          title="View Profile"
        >
          <div className="relative flex-shrink-0">
            <Avatar className={cn('size-9 border shadow-soft-xs', C.avatarBorder)}>
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className={cn(C.avatarBg, 'text-white font-bold text-[10px]')}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 border-2 border-card rounded-full" />
          </div>

          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 min-w-0 leading-tight"
              >
                <p className={cn('text-[12px] font-bold text-foreground truncate transition-colors', C.profileHover)}>
                  {(() => {
  const fName = (user?.firstName || (user as any)?.first_name || '').trim();
  let lName = (user?.lastName || (user as any)?.last_name || '').trim();
  if (lName.toLowerCase() === 'user') lName = '';
  const full = `${fName} ${lName}`.trim();
  return full || fName || 'User';
})()}
                </p>
                <p className={cn('text-[10px] font-medium truncate', C.icon)}>
                  {roleInfo.roleTitle}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              className="h-6 w-6 rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-500/10 flex-shrink-0 transition-colors"
              title="Logout"
              aria-label="Log out"
            >
              <LogOut className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div >
    </div >
  );

  return (
    <div className="app-shell-reference flex h-dvh overflow-hidden bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className={cn('role-portal-sidebar relative hidden h-dvh flex-shrink-0 flex-col overflow-hidden border-r border-border bg-card md:flex', sidebarOpen ? 'w-64' : 'w-[72px]')}>
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute right-2 top-20 z-10 hidden size-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground md:flex"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
        <SidebarContent />
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
              className="role-portal-sidebar fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card shadow-2xl md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="sticky top-0 z-30 flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-md px-4 h-14 flex items-center gap-3">
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

          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', C.dot)} />
            <span className="text-sm font-bold text-foreground hidden sm:block">Team Lead Portal</span>
            <span className={cn(
              'hidden md:inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border',
              C.badge
            )}>
              {roleInfo.roleTitle} · {roleInfo.departmentName}
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Organization Name Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold text-emerald-700 dark:text-emerald-300 shadow-sm mr-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>{user?.organizationName || user?.organizationCode || (user as any)?.organization?.name || 'Organization'}</span>
            </div>

            <Button variant="ghost" size="icon" onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')} aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg relative" aria-label="Open notifications" onClick={() => setDrawerOpen(true)}>
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-violet-600 text-[9px] font-bold text-white shadow-sm ring-1 ring-background">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            <button
              onClick={() => navigate('/team-lead/profile')}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors"
            >
              <Avatar className={cn('h-7 w-7 border', C.avatarBorder)}>
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className={cn(C.avatarBg, 'text-white text-[10px] font-bold')}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left leading-tight">
                <p className="text-[12px] font-semibold text-foreground">{(() => {
  const fName = (user?.firstName || (user as any)?.first_name || '').trim();
  let lName = (user?.lastName || (user as any)?.last_name || '').trim();
  if (lName.toLowerCase() === 'user') lName = '';
  const full = `${fName} ${lName}`.trim();
  return full || fName || 'User';
})()}</p>
                <p className={cn('text-[10px] font-medium', C.icon)}>{roleInfo.departmentName}</p>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
      <NotificationDrawer />
      <Toaster position="bottom-right" />
    </div >
  );
}
