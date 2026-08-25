import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Sun, Moon, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';
import { useNotificationStore } from '@/features/notifications/store/notificationStore';
import { NotificationDrawer } from '@/features/notifications/components/NotificationDrawer';
import { Toaster } from '@/components/ui/toast';
import { ConsultantSidebar } from './ConsultantSidebar';

// ── Page title helper ─────────────────────────────────────────────────────────
function getPageTitle(pathname: string): string {
  if (pathname.includes('/attendance'))       return 'My Attendance';
  if (pathname.includes('/leaves'))           return 'My Leaves';
  if (pathname.includes('/payslips'))         return 'My Payslips';
  if (pathname.includes('/expenses'))         return 'Expense Claims';
  if (pathname.includes('/travel'))           return 'Travel Requests';
  if (pathname.includes('/documents'))        return 'My Documents';
  if (pathname.includes('/holiday-calendar')) return 'Holiday Calendar';
  if (pathname.includes('/announcements'))    return 'Announcements';
  if (pathname.includes('/org-chart'))        return 'Organisation Chart';
  if (pathname.includes('/id-card'))          return 'My ID Card';
  if (pathname.includes('/profile'))          return 'My Profile';
  return 'Consultant Portal';
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function ConsultantLayout() {
  useNotificationSocket();
  const { unreadCount } = useNotifications();
  const setDrawerOpen = useNotificationStore((s) => s.setDrawerOpen);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [mounted, setMounted]         = useState(false);

  const location  = useLocation();
  const navigate  = useNavigate();
  const { user }  = useAuthStore();
  const { theme, setTheme } = useThemeStore();

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const currentTheme = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme;

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'CO';
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="flex h-dvh overflow-hidden bg-background font-sans text-foreground">

      {/* ── Desktop Sidebar ── */}
      <div className="z-30 hidden flex-shrink-0 md:block">
        <ConsultantSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      </div>

      {/* ── Mobile Sidebar Overlay ── */}
      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <div className="fixed inset-y-0 left-0 z-50 md:hidden">
            <ConsultantSidebar open onOpenChange={setMobileOpen} />
          </div>
        </>
      )}

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ── Topbar ── */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-card px-4 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </Button>

            {/* Desktop collapse toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            </Button>

            <div>
              <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
              <p className="hidden text-[10px] text-muted-foreground sm:block">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              title="Toggle theme"
            >
              {currentTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </Button>

            {/* Notifications bell */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setDrawerOpen(true)}
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </motion.span>
              )}
            </Button>

            {/* Avatar */}
            <Avatar
              className="h-8 w-8 cursor-pointer border-2 border-violet-300 dark:border-violet-700"
              onClick={() => navigate('/consultant/profile')}
              title="My Profile"
            >
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-violet-600 text-xs font-bold text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* ── Global UI ── */}
      <NotificationDrawer />
      <Toaster />
    </div>
  );
}
