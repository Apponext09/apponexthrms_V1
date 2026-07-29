import { useState } from 'react';
import { Bell, Moon, Sun, Menu, Building2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { getBreadcrumbsForHref } from '@/config/navigation';
import { GlobalSearchButton } from '@/features/search/components/GlobalSearch';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

  const visibleSections = getVisibleSections(roles, licensedFeatures);
  const breadcrumbs = getBreadcrumbsForHref(location.pathname);

  const currentTheme = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : theme;

  const notifications = [
    { id: 1, message: 'New leave request from John Doe', time: '2 hours ago' },
    { id: 2, message: 'Payroll processing completed', time: '1 day ago' },
    { id: 3, message: 'Upcoming birthday: Jane Smith', time: '3 days away' },
  ];

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

            {/* Organization Name Badge */}
            <div className="mr-1 hidden h-9 max-w-48 items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 text-xs font-bold text-foreground sm:inline-flex">
              <Building2 className="size-3.5 flex-shrink-0 text-primary" />
              <span className="truncate">{user?.organizationName || user?.organizationCode || (user as any)?.organization?.name || 'Organization'}</span>
            </div>

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

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative size-9 rounded-lg border border-border bg-card hover:bg-muted" aria-label="Open notifications">
                  <Bell className="size-4" />
                  <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-danger ring-2 ring-card" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80">
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-foreground">
                    Notifications
                  </h4>
                  <div className="space-y-2">
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className="cursor-pointer rounded-lg border border-border/70 bg-muted/60 p-3 transition-colors hover:bg-muted"
                      >
                        <p className="text-sm text-foreground">{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notif.time}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

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
