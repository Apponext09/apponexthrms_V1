import { Moon, Sun, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { GlobalSearchButton } from '@/features/search/components/GlobalSearch';
import { CompanySelector } from './CompanySelector';
import { Button } from '@/components/ui/button';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { NotificationDrawer } from '@/features/notifications/components/NotificationDrawer';

export function Topbar({
  onMenuClick,
  sidebarOpen,
}: {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}) {
  const { theme, setTheme } = useThemeStore();

  // Initialise notification socket at the layout level so all users get live pushes
  useNotificationSocket();

  const currentTheme = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : theme;

  return (
    <>
      <header className="sticky top-0 z-40 h-16 flex-shrink-0 border-b border-border bg-card">
        <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="size-9 rounded-lg border border-border bg-muted/50 md:hidden"
              aria-label="Open navigation"
            >
              <Menu className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="hidden size-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </Button>

            <span className="hidden truncate text-base font-extrabold tracking-tight text-foreground md:inline">APPONEXTHRMS</span>

          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <GlobalSearchButton />

            {/* Organization & Sub-Company Context Switcher */}
            <CompanySelector />

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setTheme(currentTheme === 'dark' ? 'light' : 'dark')
              }
              className="size-9 rounded-lg border border-border bg-card hover:bg-muted"
              aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {currentTheme === 'dark' ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-foreground" />
              )}
            </Button>

            {/* Notifications — popup dropdown connected to live API + Socket.IO */}
            <NotificationBell className="size-9 rounded-lg border border-border bg-card hover:bg-muted" iconClassName="size-4" />
          </div>
        </div>
      </header>

      <NotificationDrawer />

    </>
  );
}
