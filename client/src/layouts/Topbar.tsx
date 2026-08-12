import { useState } from 'react';
import { Moon, Sun, Menu, Building2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { getBreadcrumbsForHref } from '@/config/navigation';
import { GlobalSearchButton } from '@/features/search/components/GlobalSearch';
import { CompanySelector } from './CompanySelector';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';
import { useNotificationStore } from '@/features/notifications/store/notificationStore';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { NotificationDrawer } from '@/features/notifications/components/NotificationDrawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLicensedFeatures } from '@/features/licensing/api/useLicensing';
import { useRbac } from '@/lib/rbac';
import { getVisibleSections } from '@/config/navigation';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import * as LucideIcons from 'lucide-react';

export function Topbar({
  onMenuClick,
  sidebarOpen,
}: {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const { user } = useAuthStore();
  const { roles } = useRbac();
  const { data: licensedFeatures } = useLicensedFeatures();
  const navigate = useNavigate();
  const location = useLocation();

  // Initialise notification socket at the layout level so all users get live pushes
  useNotificationSocket();
  const { setDrawerOpen } = useNotificationStore();

  const visibleSections = getVisibleSections(roles, licensedFeatures);
  const breadcrumbs = getBreadcrumbsForHref(location.pathname);

  const currentTheme = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : theme;

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-5 w-5" /> : null;
  };

  return (
    <>
      <header className="sticky top-0 z-40 h-16 flex-shrink-0 border-b border-border bg-card">
        <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileDrawerOpen(true)}
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

            <div className="hidden min-w-0 items-center gap-4 md:flex">
              <div className="whitespace-nowrap text-[15px] font-extrabold tracking-tight text-foreground">
                ApponextHRMS
              </div>
              {breadcrumbs.length > 1 && (
                <>
                  <div className="h-6 w-px bg-border" />
                  <Breadcrumb
                    items={breadcrumbs.map((item) => ({
                      label: item.label,
                      onClick: () => navigate(item.href),
                      active: item.href === location.pathname,
                    }))}
                  />
                </>
              )}
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className="hidden 2xl:block">
              <GlobalSearchButton />
            </div>

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

            {/* Notifications — live bell connected to real API + Socket.IO */}
            <div className="relative">
              <NotificationBell onClick={() => setDrawerOpen(true)} />
            </div>
          </div>
        </div>
      </header>

      <NotificationDrawer />

      {/* Mobile Navigation Drawer */}
      <Dialog open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <DialogContent className="max-h-dvh max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Navigation</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pr-4">
            {visibleSections.map((section) => {
              if (section.items.length === 1) {
                const item = section.items[0];
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      navigate(item.href);
                      setMobileDrawerOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-all',
                      location.pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {getIconComponent(item.icon)}
                    {item.name}
                  </button>
                );
              }

              return (
                <Collapsible key={section.id} defaultOpen={true}>
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted rounded-md">
                    <div className="flex items-center gap-3 text-sm font-medium">
                      {section.icon && getIconComponent(section.icon)}
                      {section.label}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 space-y-1 mt-1">
                    {section.items.map((item) => (
                      <button
                        key={item.href}
                        onClick={() => {
                          navigate(item.href);
                          setMobileDrawerOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all',
                          location.pathname === item.href
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-foreground hover:bg-muted'
                        )}
                      >
                        {getIconComponent(item.icon)}
                        {item.name}
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
