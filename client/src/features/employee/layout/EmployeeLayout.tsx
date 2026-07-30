import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { EmployeeSidebar } from './EmployeeSidebar';
import { Bell, Sun, Moon, Building2, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { Toaster } from '@/components/ui/toast';
import { useEmployeeLocationTracker } from '@/features/Livetracking';

export function EmployeeLayout() {
  useNotificationSocket();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const currentTheme = theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  const employeeId = user?.employeeId || 0;
  const { employee } = useEmployee(employeeId);

  // Silent background GPS tracker — no map UI shown to employee
  useEmployeeLocationTracker({
    token: localStorage.getItem('accessToken'),
    enabled: true,
  });


  const getPageTitle = () => {
    if (location.pathname.includes('/attendance')) return 'My Attendance & Time Log';
    if (location.pathname.includes('/leaves/apply')) return 'Apply Leave Request';
    if (location.pathname.includes('/leaves/balance')) return 'My Leave Balances';
    if (location.pathname.includes('/leaves')) return 'My Leave History';
    if (location.pathname.includes('/payroll/payslips')) return 'My Monthly Payslips';
    if (location.pathname.includes('/payroll/tax-declaration')) return 'Tax & Investment Declarations';
    if (location.pathname.includes('/performance/goals')) return 'Goals & OKR Tracking';
    if (location.pathname.includes('/performance/appraisals')) return 'Performance Appraisals';
    if (location.pathname.includes('/performance')) return 'Performance Reviews & Feedback';
    if (location.pathname.includes('/assets')) return 'My Assigned Company Assets';
    if (location.pathname.includes('/approvals')) return 'Approval Inbox';
    return 'Employee Self Service Portal';
  };

  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`;
  const getInitials = () => {
    return employeeName.split(' ').map(w => w[0]).join('').toUpperCase() || 'EMP';
  };

  return (
    <div className="app-shell-reference flex h-dvh overflow-hidden bg-background font-sans text-foreground">
      {/* Dedicated Employee Sidebar */}
      <div className="z-30 hidden flex-shrink-0 md:block">
        <EmployeeSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <EmployeeSidebar open onOpenChange={setMobileOpen} />
          </div>
        </>
      )}

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Header */}
        <header className="relative z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="size-9 rounded-lg border border-border bg-muted/50 md:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </Button>
            <h1 className="truncate text-balance text-base font-extrabold text-foreground md:text-lg">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Organization Name Badge */}
            <div className="mr-1 hidden h-9 max-w-48 items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 text-xs font-bold text-foreground sm:inline-flex">
              <Building2 className="size-3.5 flex-shrink-0 text-primary" />
              <span className="truncate">{user?.organizationName || user?.organizationCode || (user as any)?.organization?.name || 'Organization'}</span>
            </div>

            {/* Dark & Light Mode Theme Toggle Button */}
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={toggleTheme}
              title={currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {currentTheme === 'dark' ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-foreground" />
              )}
            </Button>

            {/* Notifications Button */}
            <Button
              variant="ghost"
              size="icon"
              className="relative size-9 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => navigate('/notifications')}
              aria-label="Open notifications"
            >
              <Bell className="size-4" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger ring-2 ring-card" />
            </Button>

            {/* Profile Avatar Badge */}
            <button
              type="button"
              onClick={() => navigate('/employee/profile')}
              className="flex items-center gap-2 pl-2 border-l border-border hover:opacity-80 transition-opacity"
            >
              <Avatar className="size-8 border border-primary/30">
                <AvatarImage src={employee?.avatarUrl || user?.avatarUrl} />
                <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold text-foreground hidden md:inline-block truncate max-w-[120px]">
                {employeeName}
              </span>
            </button>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="app-shell-scroll flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
