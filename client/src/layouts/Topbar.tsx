import { useState } from 'react';
import { Bell, Moon, Sun, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { getBreadcrumbsForHref } from '@/config/navigation';
import { GlobalSearchButton } from '@/features/search/components/GlobalSearch';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const { roles } = useRbac();
  const { data: licensedFeatures } = useLicensedFeatures();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleSections = getVisibleSections(roles, licensedFeatures);
  const breadcrumbs = getBreadcrumbsForHref(location.pathname);

  const getInitials = () => {
    return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  };

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
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm shadow-soft-sm">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden md:flex items-center gap-4">
              <div className="text-lg font-semibold text-foreground">
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
          <div className="flex items-center gap-1">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setTheme(currentTheme === 'dark' ? 'light' : 'dark')
              }
            >
              {currentTheme === 'dark' ? (
                <Sun className="h-5 w-5 text-amber-400 animate-pulse" />
              ) : (
                <Moon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              )}
            </Button>

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-danger rounded-full" />
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
                        className="p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
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
        <DialogContent className="max-w-sm max-h-screen overflow-y-auto">
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
