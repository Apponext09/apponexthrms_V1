import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, LogOut, Settings, Lock } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLicensedFeatures } from '@/features/licensing/api/useLicensing';
import { useNavStore } from '@/features/navigation/store/navStore';
import { getVisibleSections } from '@/config/navigation';
import { useAttendanceModuleSettings } from '@/features/attendance/hooks/useAttendanceModuleSettings';
import { useRbac } from '@/lib/rbac';
import { getUserRoleAndDept } from '@/lib/userProfile';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

import hrmsLogo from '@/assests/hrms.png';

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { roles } = useRbac();
  const { data: licensedFeatures } = useLicensedFeatures();
  const { attendanceMode, liveTrackingEnabled } = useAttendanceModuleSettings();
  const { expandedSections, toggleSection, expandSectionContainingRoute } = useNavStore();

  const [visibleSections, setVisibleSections] = useState<ReturnType<typeof getVisibleSections>>([]);
  const [lockedItemDialogOpen, setLockedItemDialogOpen] = useState(false);
  const [lockedItemName, setLockedItemName] = useState('');

  // Get role-filtered navigation on mount and when roles/features/modules change
  useEffect(() => {
    const refreshSections = () => {
      const sections = getVisibleSections(roles, licensedFeatures, attendanceMode, liveTrackingEnabled);
      setVisibleSections(sections);
      expandSectionContainingRoute(location.pathname, sections);
    };

    refreshSections();

    window.addEventListener('apponext_modules_updated', refreshSections);
    window.addEventListener('storage', refreshSections);

    return () => {
      window.removeEventListener('apponext_modules_updated', refreshSections);
      window.removeEventListener('storage', refreshSections);
    };
  }, [roles, licensedFeatures, attendanceMode, liveTrackingEnabled, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (href: string, isLocked?: boolean) => {
    if (isLocked) {
      setLockedItemName(href);
      setLockedItemDialogOpen(true);
      return;
    }
    navigate(href);
    // Don't close sidebar on desktop
  };

  const getInitials = () => {
    return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  };

  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : <div className="h-4 w-4" />;
  };

  const handleProfileClick = () => {
    if (roles.includes('super_admin')) {
      navigate('/superadmin/profile');
    } else {
      navigate('/settings/company-profile');
    }
  };

  return (
    <>
      <div
        className={cn(
          'app-dashboard-sidebar flex h-dvh flex-col overflow-hidden border-r border-border bg-card select-none',
          open ? 'w-64' : 'w-[72px]'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-20 flex-shrink-0 items-center border-b border-border px-4">
          <div className="flex w-full items-center gap-3 overflow-hidden">
            <div className="flex size-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1 shadow-soft-xs ring-1 ring-border/70">
              <img src={hrmsLogo} alt="Apponext HRMS" className="h-full w-full object-contain" />
            </div>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col justify-center overflow-hidden whitespace-nowrap leading-tight"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-extrabold tracking-tight text-foreground">Apponext</span>
                    <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-primary">HRMS</span>
                  </div>
                  <span className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Admin Portal</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleSections.map((section) => {
            const isActive = section.items.some((item) =>
              location.pathname.startsWith(item.href)
            );
            const isExpanded = expandedSections[section.id] ?? true;

            return (
              <Collapsible
                key={section.id}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.id)}
                className="group"
              >
                {section.collapsible !== false ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors',
                          isActive
                            ? 'text-primary font-semibold bg-primary/10 dark:bg-primary/15'
                            : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                        )}
                        title={!open ? section.label : ''}
                      >
                        <span className="flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground">
                          {section.icon ? getIconComponent(section.icon) : ''}
                        </span>
                        <AnimatePresence>
                          {open && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.12 }}
                              className="flex-1 overflow-hidden truncate text-left text-[12px] font-semibold tracking-tight"
                            >
                              {section.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {open && (
                          <ChevronDown
                            className={cn(
                              'ml-auto size-3 flex-shrink-0 text-muted-foreground/60 transition-transform duration-200',
                              isExpanded ? 'rotate-180' : ''
                            )}
                          />
                        )}
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className={cn('mt-1 space-y-1', open ? 'ml-3 border-l border-border pl-3' : '')}>
                      {section.items.map((item) => {
                        const hasChildren = item.children && item.children.length > 0;
                        const isChildActive = hasChildren && item.children!.some((c) => location.pathname === c.href);
                        const itemActive = (location.pathname === item.href && !hasChildren) || isChildActive;
                        const isLocked = (item as any).isLocked;

                        if (hasChildren) {
                          return (
                            <Collapsible
                              key={item.name}
                              defaultOpen={true}
                              className="group/sub space-y-0.5"
                            >
                              <CollapsibleTrigger asChild>
                                <button
                                  className={cn(
                                    'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors',
                                    itemActive
                                      ? 'text-primary font-semibold bg-primary/10 dark:bg-primary/15'
                                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                  )}
                                  title={!open ? item.name : ''}
                                >
                                  <span className="flex-shrink-0">
                                    {getIconComponent(item.icon)}
                                  </span>
                                  <AnimatePresence>
                                    {open && (
                                      <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.12 }}
                                        className="flex-1 text-left overflow-hidden flex items-center justify-between gap-1.5"
                                      >
                                        <span className="truncate">{item.name}</span>
                                        <ChevronDown className="ml-auto size-3 flex-shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]/sub:rotate-180" />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </button>
                              </CollapsibleTrigger>

                              <CollapsibleContent className={cn('mt-1 space-y-1', open ? 'ml-3 border-l border-border pl-3' : '')}>
                                {item.children!.map((child) => {
                                  const childActive = location.pathname === child.href;
                                  return (
                                    <button
                                      key={child.name}
                                      onClick={() => handleNavClick(child.href, (child as any).isLocked)}
                                      title={!open ? child.name : ''}
                                      className={cn(
                                        'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors',
                                        childActive
                                          ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                      )}
                                    >
                                      <span className="flex-shrink-0">
                                        {getIconComponent(child.icon)}
                                      </span>
                                      <AnimatePresence>
                                        {open && (
                                          <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.12 }}
                                            className="flex-1 text-left overflow-hidden flex items-center gap-1.5"
                                          >
                                            <span className="truncate">{child.name}</span>
                                            {child.badge && (
                                              <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto font-normal">
                                                {child.badge}
                                              </Badge>
                                            )}
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </button>
                                  );
                                })}
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        }

                        return (
                          <button
                            key={item.href}
                            onClick={() => handleNavClick(item.href, isLocked)}
                            title={!open ? item.name : ''}
                            className={cn(
                              'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors',
                              itemActive
                                ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
                              isLocked && 'opacity-60'
                            )}
                          >
                            <span className="flex-shrink-0">
                              {getIconComponent(item.icon)}
                            </span>
                            <AnimatePresence>
                              {open && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.12 }}
                                  className="flex-1 text-left overflow-hidden flex items-center gap-1.5"
                                >
                                  <span className="truncate">{item.name}</span>
                                  {item.badge && (
                                    <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto font-normal">
                                      {item.badge}
                                    </Badge>
                                  )}
                                  {isLocked && <Lock className="h-3 w-3 ml-auto flex-shrink-0 text-amber-500" />}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </button>
                        );
                      })}
                    </CollapsibleContent>
                  </>
                ) : (
                  // Single item section
                  <button
                    onClick={() =>
                      handleNavClick(section.items[0].href, (section.items[0] as any).isLocked)
                    }
                    title={!open ? section.label : ''}
                    className={cn(
                      'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-[12px] transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                    )}
                  >
                    <span className="flex-shrink-0">
                      {getIconComponent(section.items[0].icon)}
                    </span>
                    <AnimatePresence>
                      {open && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.12 }}
                          className="font-medium overflow-hidden flex-1 text-left truncate"
                        >
                          {section.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                )}
              </Collapsible>
            );
          })}
        </nav>

        {/* User Card & Platform Admin Footer */}
        <div className="flex-shrink-0 space-y-2 border-t border-border bg-card p-3">
          {roles.includes('super_admin') && (
            <>
              <button
                onClick={() => navigate('/platform-admin')}
                title={!open ? 'Platform Administration' : ''}
                className={cn(
                  'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-semibold transition-colors',
                  location.pathname.startsWith('/platform-admin')
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <LucideIcons.Shield className="h-3.5 w-3.5 flex-shrink-0" />
                {open && <span className="truncate">Platform Admin</span>}
              </button>
              <Separator className="my-1 border-border/40" />
            </>
          )}

          <div
            onClick={handleProfileClick}
            className={cn(
              'group flex min-h-14 cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-colors',
              location.pathname.startsWith('/settings/company-profile') || location.pathname.startsWith('/superadmin/profile')
                ? 'bg-primary/10 border-primary/30 text-primary shadow-2xs'
                : 'bg-card hover:bg-muted/80 border-border/60'
            )}
            title="Click to view Admin Profile"
          >
            {(() => {
              const roleInfo = getUserRoleAndDept(user);
              return (
                <>
                  <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
                    <Avatar className="size-9 flex-shrink-0 border border-primary/30 shadow-soft-xs">
                      <AvatarImage src={user?.avatarUrl} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-[10px]">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    {open && (
                      <div className="overflow-hidden text-left leading-tight min-w-0">
                        <p className="text-[12px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {user?.firstName || 'Admin'} {user?.lastName || 'User'}
                        </p>
                        <p className="text-[10px] font-semibold text-primary truncate">
                          {roleInfo.roleTitle}
                        </p>
                        {roleInfo.departmentName && (
                          <p className="text-[9px] text-muted-foreground truncate">
                            {roleInfo.departmentName}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            {open && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                className="text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 h-6 w-6 rounded-md flex-shrink-0"
                title="Logout"
                aria-label="Log out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Locked Feature Dialog */}
      <Dialog open={lockedItemDialogOpen} onOpenChange={setLockedItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-danger" />
              Feature Not Enabled
            </DialogTitle>
            <DialogDescription>
              This feature is not currently enabled for your organization. Please contact your administrator to enable it or upgrade your subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLockedItemDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
