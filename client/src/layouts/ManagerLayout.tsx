import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserRoleAndDept } from '@/lib/userProfile';
import {
  LayoutDashboard, Users, Clock, CheckCircle2,
  BarChart3, Briefcase, Bell, Sun, Moon, Menu,
  LogOut, Settings, Award, RefreshCw, Percent, FileText, CreditCard,
  ChevronDown, FileCheck, Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const MANAGER_NAV = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'My Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'MY DEPARTMENT',
    items: [
      { name: 'My Team', href: '/manager/team', icon: Users },
      { name: 'Attendance', href: '/attendance', icon: Clock },
      { name: 'Leave Approvals', href: '/leaves/approvals', icon: CheckCircle2 },
    ],
  },
  {
    label: 'DEPARTMENT PAYROLL',
    items: [
      {
        name: 'Payroll Module',
        href: '/manager/payroll',
        icon: CreditCard,
        subItems: [
          { name: 'Payroll Processing', href: '/manager/payroll', icon: RefreshCw },
          { name: 'Team Loans', href: '/manager/loans', icon: Percent },
          { name: 'Team Payslips', href: '/manager/payslips', icon: FileText },
          { name: 'Tax Declarations', href: '/hr/tax-declaration', icon: FileCheck },
          { name: 'Salary Structure', href: '/hr/salary-structure', icon: Building2 },
        ],
      },
    ],
  },
  {
    label: 'PERFORMANCE',
    items: [
      { name: 'Performance', href: '/performance', icon: BarChart3 },
      { name: 'Reviews', href: '/performance/reviews', icon: Award },
      { name: 'Goals', href: '/performance/goals', icon: CheckCircle2 },
    ],
  },
  {
    label: 'HIRING',
    items: [
      { name: 'Hiring Requests', href: '/manager/hiring', icon: Briefcase },
    ],
  },
  {
    label: 'APPROVALS',
    items: [
      { name: 'My Approvals', href: '/approvals', icon: CheckCircle2 },
    ],
  },
];

export function ManagerLayout() {
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
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-5 py-5 border-b border-border flex-shrink-0',
        !sidebarOpen && 'justify-center'
      )}>
        <div className="h-9 w-9 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs font-mono">MGR</span>
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="font-bold text-sm text-foreground leading-tight">Manager Portal</p>
              <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 truncate">{roleInfo.departmentName}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {MANAGER_NAV.map((section) => (
          <div key={section.label}>
            <AnimatePresence>
              {sidebarOpen && !(section.items.length === 1 && (section.items[0] as any).subItems) && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[10px] font-bold tracking-widest text-muted-foreground px-3 mb-1.5"
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
                          'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group font-semibold',
                          isSubActive
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          !sidebarOpen && 'justify-center px-2'
                        )}
                        title={!sidebarOpen ? item.name : undefined}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn('h-4 w-4 flex-shrink-0', isSubActive ? 'text-purple-600' : 'text-muted-foreground group-hover:text-foreground')} />
                          {sidebarOpen && <span>{item.name}</span>}
                        </div>
                        {sidebarOpen && (
                          <ChevronDown
                            className={cn('h-4 w-4 transition-transform duration-200 text-muted-foreground', isOpen && 'rotate-180')}
                          />
                        )}
                      </button>

                      {isOpen && sidebarOpen && (
                        <div className="pl-4 ml-3 border-l-2 border-purple-300 dark:border-purple-800/60 space-y-0.5 mt-1">
                          {item.subItems.map((sub: any) => {
                            const SubIcon = sub.icon;
                            const active = location.pathname === sub.href || location.pathname.startsWith(sub.href + '/');
                            return (
                              <NavLink
                                key={sub.href}
                                to={sub.href}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs transition-all font-medium',
                                  active
                                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )}
                              >
                                <SubIcon className={cn('h-3.5 w-3.5 flex-shrink-0', active ? 'text-white' : 'text-muted-foreground')} />
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
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group',
                      active
                        ? 'bg-purple-600 text-white font-medium shadow-sm'
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
            'flex items-center justify-between p-2 rounded-lg border cursor-pointer transition group',
            location.pathname.startsWith('/settings/company-profile')
              ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/20 dark:border-purple-900'
              : 'bg-card hover:bg-muted/80 border-border/60'
          )}
          title="Click to view Profile"
        >
          <div className="flex items-center gap-2 overflow-hidden min-w-0">
            <Avatar className="h-8 w-8 border border-purple-500/40 flex-shrink-0 shadow-2xs">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-purple-600 text-white font-bold text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0 leading-tight">
                  <p className="text-[12px] font-bold text-foreground truncate group-hover:text-purple-600 transition-colors">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 truncate">
                    {roleInfo.roleTitle}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate">
                    {roleInfo.departmentName}
                  </p>
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
              className="text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 h-7 w-7 rounded-md flex-shrink-0"
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
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            <span className="text-sm font-bold text-foreground hidden sm:block">Manager Portal</span>
            <Badge variant="outline" className="text-[10px] border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-300 font-semibold hidden md:inline-flex">
              {roleInfo.roleTitle} • {roleInfo.departmentName}
            </Badge>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Organization Name Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 text-xs font-bold text-purple-700 dark:text-purple-300 shadow-sm mr-1">
              <Building2 className="w-3.5 h-3.5 text-purple-500" />
              <span>{user?.organizationName || user?.organizationCode || (user as any)?.organization?.name || 'Organization'}</span>
            </div>

            <Button variant="ghost" size="icon" onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}>
              {currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-purple-500 rounded-full" />
            </Button>
            <div className="flex items-center gap-2 border-l border-border pl-3 ml-1">
              <Avatar className="h-8 w-8 cursor-pointer" onClick={() => navigate('/employee/profile')}>
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left text-xs leading-tight">
                <p className="font-semibold text-foreground">{user?.firstName} {user?.lastName}</p>
                <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">{roleInfo.departmentName}</p>
              </div>
            </div>
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
