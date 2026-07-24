import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { Bell, HelpCircle, Building2, CheckCircle, ChevronRight, X, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/config/api';
import { useThemeStore } from '@/features/settings/store/themeStore';

interface NotificationItem {
  id: number;
  clientName: string;
  companyName: string;
  planInterest: string;
  message: string;
  createdAt: string;
}

export function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();

  const currentTheme = theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  const location = useLocation();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/superadmin/helpdesk/notifications');
      if (res.data?.data) {
        setUnreadCount(res.data.data.unreadCount || 0);
        setNotifications(res.data.data.notifications || []);
      }
    } catch (err) {
      console.log('Using default notification count');
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const getPageTitle = () => {
    if (location.pathname.includes('/organization')) return 'Organization Management';
    if (location.pathname.includes('/subscription')) return 'Subscription & Licensing';
    if (location.pathname.includes('/helpdesk')) return 'SuperAdmin Help Desk';
    if (location.pathname.includes('/profile')) return 'SuperAdmin Profile & Security';
    return 'SuperAdmin Analytics Dashboard';
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* SuperAdmin Sidebar */}
      <div className="flex-shrink-0">
        <SuperAdminSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Topbar Header */}
        <header className="h-16 border-b border-border/80 bg-card/90 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 shadow-2xs relative z-30">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground tracking-tight">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-2 relative">
            {/* Theme Toggle option directly left side of Notification Bell */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg h-9 w-9"
              title={currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {currentTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </Button>

            {/* Dynamic Notification Bell Icon */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg relative h-9 w-9"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-md animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {/* Notifications Dropdown Panel */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border shadow-2xl z-50 text-foreground overflow-hidden">
                  <div className="p-3.5 bg-muted/40 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-500" />
                      <span className="font-bold text-xs text-foreground">Client HelpDesk Notifications</span>
                    </div>
                    <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[10px]">
                      {unreadCount} New
                    </Badge>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
                    {notifications.length > 0 ? (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => {
                            setIsNotifOpen(false);
                            navigate('/superadmin/helpdesk');
                          }}
                          className="p-3 hover:bg-muted/70 transition cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground">{item.clientName}</span>
                            <Badge variant="outline" className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/30">
                              {item.planInterest}
                            </Badge>
                          </div>

                          <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground/70" /> {item.companyName}
                          </p>

                          <p className="text-[11px] text-foreground/80 line-clamp-1 italic">
                            "{item.message}"
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        No unread HelpDesk purchase queries.
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 bg-muted/40 border-t border-border text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsNotifOpen(false);
                        navigate('/superadmin/helpdesk');
                      }}
                      className="w-full text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-muted text-xs font-semibold h-8"
                    >
                      View All HelpDesk Queries <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="flex-1 overflow-auto p-6 bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
