import { Bell, Moon, Sun, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { LiveDateTimeDisplay } from '@/components/LiveDateTimeDisplay';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';
import { useNotificationStore } from '@/features/notifications/store/notificationStore';
import { NotificationDrawer } from '@/features/notifications/components/NotificationDrawer';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

export function PlatformAdminTopbar({
  onMenuClick,
  sidebarOpen,
}: {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}) {
  useNotificationSocket();
  const { unreadCount } = useNotifications();
  const setDrawerOpen = useNotificationStore(state => state.setDrawerOpen);
  const { theme, setTheme } = useThemeStore();

  const currentTheme = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : theme;

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm shadow-soft-sm">
      <div className="px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden md:block text-lg font-semibold text-foreground">
            Platform Administration
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <LiveDateTimeDisplay />
          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setTheme(currentTheme === 'dark' ? 'light' : 'dark')
            }
          >
            {currentTheme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Notifications */}
          <NotificationBell className="size-9 rounded-lg" iconClassName="size-5" />
        </div>
      </div>
    </header>
    <NotificationDrawer />
    </>
  );
}
