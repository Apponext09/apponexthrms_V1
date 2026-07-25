import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserRoleAndDept } from '@/lib/userProfile';
import {
  LayoutDashboard, Users, CreditCard, Calendar, Clock,
  Target, Briefcase, BarChart3, Settings, LogOut,
  Bell, Sun, Moon, Menu, UserPlus,
  FileText, RefreshCw, Percent, UserX, CheckCircle2,
  Building2, GitBranch, FileCheck, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ── Accent palette for HR (rose/pink) ────────────────────────────────────────
const C = {
  dot:         'bg-rose-500',
  icon:        'text-rose-600 dark:text-rose-400',
  badge:       'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300',
  activeBg:    'bg-gradient-to-r from-rose-600 to-pink-600',
  activeText:  'text-white',
  hoverBg:     'hover:bg-rose-50 dark:hover:bg-rose-950/20',
  hoverText:   'hover:text-rose-700 dark:hover:text-rose-300',
  avatarBorder:'border-rose-400/50',
  avatarBg:    'bg-gradient-to-br from-rose-500 to-pink-600',
  logoBg:      'bg-gradient-to-br from-rose-600 to-pink-700',
  logoGlow:    'shadow-rose-500/30',
  profileHover:'group-hover:text-rose-600 dark:group-hover:text-rose-400',
  notifDot:    'bg-rose-500',
  sectionLabel:'text-rose-400/70 dark:text-rose-500/50',
};

const HR_NAV = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'PEOPLE & DEPARTMENTS',
    items: [
      { name: 'All Employees', href: '/hr/employees', icon: Users },
      { name: 'Departments', href: '/hr/departments', icon: Building2 },
      { name: 'Onboarding', href: '/hr/employees/onboarding', icon: UserPlus },
      { name: 'Org Structure', href: '/hr/org-structure', icon: Building2 },
    ],
  },
  {
    label: 'PAYROLL',
    items: [
      { name: 'Payroll Dashboard', href: '/hr/payroll', icon: CreditCard },
      { name: 'Processing', href: '/hr/payroll-processing', icon: RefreshCw },
      { name: 'My Payslips', href: '/hr/payslips', icon: FileText },
      { name: 'Salary Structure', href: '/hr/salary-structure', icon: FileText },
      { name: 'Loans', href: '/hr/loans', icon: Percent },
      { name: 'Tax Declaration', href: '/hr/tax-declaration', icon: FileCheck },
      { name: 'Settlements', href: '/hr/settlements', icon: UserX },
    ],
  },
  {
    label: 'LEAVE & TIME',
    items: [
      { name: 'Attendance', href: '/hr/attendance', icon: Clock },
      { name: 'Leave Approvals', href: '/hr/leaves/approvals', icon: CheckCircle2 },
    ],
  },
  {
    label: 'RECRUITMENT',
    items: [
      { name: 'Dashboard', href: '/hr/recruitment', icon: Target },
      { name: 'Jobs', href: '/hr/recruitment/jobs', icon: Briefcase },
    ],
  },
  {
    label: 'PERFORMANCE',
    items: [
      { name: 'Overview', href: '/hr/performance', icon: BarChart3 },
      { name: 'Reviews', href: '/hr/performance/reviews', icon: CheckCircle2 },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Workflows', href: '/hr/workflow', icon: GitBranch },
      { name: 'Settings', href: '/hr/settings', icon: Settings },
    ],
  },
];

export function HRLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
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
      <div className={cn(
        'relative flex items-center gap-3 px-4 py-4 flex-shrink-0',
        !sidebarOpen && 'justify-center px-3'
      )}>
        <div className={cn(
          'relative h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg',
          C.logoBg, C.logoGlow
        )}>
          <span className="text-white font-black text-sm tracking-tight">HR</span>
          <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
        </div>
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}
            >
              <p className="font-bold text-[13px] text-foreground leading-tight tracking-tight">HR Portal</p>
              <p className={cn('text-[10px] font-semibold truncate', C.icon)}>{roleInfo.departmentName}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-card border border-border shadow-sm hidden md:flex items-center justify-center text-muted-foreground hover:text-foreground transition z-10"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-4 flex-shrink-0" />

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin">
        {HR_NAV.map((section) => (
          <div key={section.label}>
            <AnimatePresence initial={false}>
              {sidebarOpen && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className={cn('text-[9px] font-bold tracking-[0.12em] uppercase px-3 mb-1', C.sectionLabel)}
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    title={!sidebarOpen ? item.name : undefined}
                    className={cn(
                      'relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group',
                      active
                        ? cn(C.activeBg, C.activeText, 'font-semibold shadow-md')
                        : cn('text-muted-foreground font-medium', C.hoverBg, C.hoverText),
                      !sidebarOpen && 'justify-center px-2'
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="hr-active-pill"
                        className={cn('absolute inset-0 rounded-lg', C.activeBg)}
                        style={{ zIndex: -1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <Icon className={cn(
                      'h-[15px] w-[15px] flex-shrink-0 transition-colors',
                      active ? 'text-white' : cn('text-muted-foreground/70', C.icon)
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
          </div>
        ))}
      </nav>

      {/* ── User footer ── */}
      <div className="flex-shrink-0 p-2">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-2" />
        <div
          onClick={() => navigate(user?.employeeId || user?.id ? `/employees/${user?.employeeId || user?.id}` : '/settings/company-profile')}
          className={cn(
            'group flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all duration-150',
            'bg-muted/40 hover:bg-muted/80 border-border/50 hover:border-border',
            !sidebarOpen && 'justify-center'
          )}
          title="View Profile"
        >
          <div className="relative flex-shrink-0">
            <Avatar className={cn('h-8 w-8 border-2 shadow-sm', C.avatarBorder)}>
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
                  {user?.firstName} {user?.lastName}
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
            >
              <LogOut className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Desktop Sidebar ── */}
      <motion.aside
        animate={{ width: sidebarOpen ? 232 : 60 }}
        transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="hidden md:flex flex-col h-screen bg-card border-r border-border flex-shrink-0 overflow-hidden relative"
      >
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute -right-3 top-12 h-6 w-6 rounded-full bg-card border border-border shadow-sm hidden md:flex items-center justify-center text-muted-foreground hover:text-foreground transition z-10"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
        <SidebarContent />
      </motion.aside>

      {/* ── Mobile Sidebar ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-[232px] bg-card border-r border-border z-50 shadow-2xl"
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
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={() => setMobileOpen(true)}
            className="md:hidden h-8 w-8 rounded-lg"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <div className={cn('h-2 w-2 rounded-full', C.dot)} />
            <span className="text-sm font-bold text-foreground hidden sm:block">HR Portal</span>
            <span className={cn(
              'hidden md:inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border',
              C.badge
            )}>
              {roleInfo.roleTitle} · {roleInfo.departmentName}
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost" size="icon"
              onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              className="h-8 w-8 rounded-lg"
            >
              {currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg relative">
              <Bell className="h-4 w-4" />
              <span className={cn('absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full', C.notifDot)} />
            </Button>

            <div className="w-px h-5 bg-border mx-1" />

            <button
              onClick={() => navigate('/employee/profile')}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors"
            >
              <Avatar className={cn('h-7 w-7 border', C.avatarBorder)}>
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className={cn(C.avatarBg, 'text-white text-[10px] font-bold')}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left leading-tight">
                <p className="text-[12px] font-semibold text-foreground">{user?.firstName} {user?.lastName}</p>
                <p className={cn('text-[10px] font-medium', C.icon)}>{roleInfo.departmentName}</p>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="p-6 min-h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
