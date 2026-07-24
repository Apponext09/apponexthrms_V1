import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard, Users, CreditCard, Calendar, Clock,
  Target, Briefcase, BarChart3, Settings, LogOut,
  Bell, Sun, Moon, Menu, X, ChevronDown, UserPlus,
  FileText, RefreshCw, Percent, UserX, CheckCircle2,
  Building2, GitBranch
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const HR_NAV = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'Dashboard', href: '/hr/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'PEOPLE',
    items: [
      { name: 'All Employees', href: '/employees', icon: Users },
      { name: 'Onboarding', href: '/employees/onboarding', icon: UserPlus },
      { name: 'Org Structure', href: '/org-structure', icon: Building2 },
    ],
  },
  {
    label: 'PAYROLL',
    items: [
      { name: 'Payroll Dashboard', href: '/payroll', icon: CreditCard },
      { name: 'Processing', href: '/payroll/processing', icon: RefreshCw },
      { name: 'Salary Structure', href: '/payroll/salary-structure', icon: FileText },
      { name: 'Revisions', href: '/payroll/revisions', icon: BarChart3 },
      { name: 'Loans', href: '/payroll/loans', icon: Percent },
      { name: 'Settlements', href: '/payroll/settlements', icon: UserX },
    ],
  },
  {
    label: 'LEAVE & TIME',
    items: [
      { name: 'Attendance', href: '/attendance', icon: Clock },
      { name: 'Leave Approvals', href: '/leaves/approvals', icon: CheckCircle2 },
    ],
  },
  {
    label: 'RECRUITMENT',
    items: [
      { name: 'Dashboard', href: '/recruitment', icon: Target },
      { name: 'Jobs', href: '/recruitment/jobs', icon: Briefcase },
    ],
  },
  {
    label: 'PERFORMANCE',
    items: [
      { name: 'Overview', href: '/performance', icon: BarChart3 },
      { name: 'Reviews', href: '/performance/reviews', icon: CheckCircle2 },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { name: 'Workflows', href: '/workflow', icon: GitBranch },
      { name: 'Settings', href: '/settings', icon: Settings },
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

  const currentTheme = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme;

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  const handleLogout = () => { logout(); navigate('/login'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-5 py-5 border-b border-border flex-shrink-0',
        !sidebarOpen && 'justify-center'
      )}>
        <div className="h-9 w-9 rounded-xl bg-rose-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">HR</span>
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="font-bold text-sm text-foreground leading-tight">HR Portal</p>
              <p className="text-[10px] text-muted-foreground">Human Resources</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {HR_NAV.map((section) => (
          <div key={section.label}>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[10px] font-bold tracking-widest text-muted-foreground px-3 mb-1.5"
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
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group',
                      active
                        ? 'bg-rose-600 text-white font-medium shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      !sidebarOpen && 'justify-center px-2'
                    )}
                    title={!sidebarOpen ? item.name : undefined}
                  >
                    <Icon className={cn('h-4 w-4 flex-shrink-0', active ? 'text-white' : 'text-muted-foreground group-hover:text-foreground')} />
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="truncate">
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

      {/* User footer */}
      <div className={cn('border-t border-border/60 p-2 flex-shrink-0 bg-muted/20', !sidebarOpen && 'flex justify-center')}>
        <div
          onClick={() => navigate(user?.employeeId || user?.id ? `/employees/${user?.employeeId || user?.id}` : '/settings/company-profile')}
          className={cn(
            'flex items-center justify-between p-1.5 rounded-md border cursor-pointer transition group',
            location.pathname.startsWith('/settings/company-profile')
              ? 'bg-primary/10 border-primary/30 text-primary shadow-2xs'
              : 'bg-transparent hover:bg-muted/80 border-transparent'
          )}
          title="Click to view Profile"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            {/* <Avatar className="h-7 w-7 border border-primary/40 flex-shrink-0 shadow-2xs">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-[10px]">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar> */}
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0 leading-tight">
                  <p className="text-[12px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">{user?.firstName} {user?.lastName}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 h-6 w-6 rounded-md flex-shrink-0"
              title="Logout"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.div
        animate={{ width: sidebarOpen ? 240 : 68 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:flex flex-col h-screen bg-card border-r border-border shadow-sm flex-shrink-0 overflow-hidden"
      >
        <SidebarContent />
      </motion.div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ duration: 0.25 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border z-50"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur-sm shadow-sm px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden md:flex">
            <Menu className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="md:hidden">
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-sm font-semibold text-foreground hidden sm:block">HR Portal</span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}>
              {currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-rose-500 rounded-full" />
            </Button>
            <Avatar className="h-8 w-8 cursor-pointer ml-1">
              <AvatarFallback className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-xs font-bold">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="p-6"
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
