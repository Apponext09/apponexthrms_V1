import { Moon, Sun, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { GlobalSearchButton } from '@/features/search/components/GlobalSearch';
import { CompanySelector } from './CompanySelector';
import { Button } from '@/components/ui/button';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { NotificationDrawer } from '@/features/notifications/components/NotificationDrawer';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function Topbar({
  onMenuClick,
  sidebarOpen,
}: {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}) {
  const { theme, setTheme } = useThemeStore();
  const { user } = useAuthStore();
  const firstName = user?.firstName || (user as any)?.first_name || 'there';
  const fullName = `${firstName} ${user?.lastName || (user as any)?.last_name || ''}`.trim();
  const initials = fullName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  // Initialise notification socket at the layout level so all users get live pushes
  useNotificationSocket();

  const currentTheme = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : theme;

  return (
    <>
      <header className="sticky top-0 z-40 h-[72px] flex-shrink-0 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
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

            <div className="hidden min-w-0 md:block">
              <p className="truncate text-[15px] font-extrabold tracking-tight text-foreground">Welcome back, {firstName} <span aria-hidden="true">👋</span></p>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">Here’s what’s happening with your workforce today.</p>
            </div>

          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
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

            <div className="ml-1 hidden items-center gap-2.5 border-l border-border pl-3 sm:flex">
              <Avatar className="size-9 border border-primary/15">
                <AvatarImage src={user?.avatarUrl || (user as any)?.avatar || (user as any)?.profile_picture} />
                <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">{initials || 'HR'}</AvatarFallback>
              </Avatar>
              <div className="hidden max-w-28 leading-tight lg:block">
                <p className="truncate text-[11px] font-bold text-foreground">{fullName}</p>
                <p className="truncate text-[9px] font-medium text-muted-foreground">HR Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <NotificationDrawer />

    </>
  );
}
