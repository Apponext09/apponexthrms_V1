import { useState, useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from '@/components/ui/toast';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserRoleAndDept } from '@/lib/userProfile';
import { useRbac } from '@/lib/rbac';
import { useLicensedFeatures } from '@/features/licensing/api/useLicensing';
import { useAttendanceModuleSettings } from '@/features/attendance/hooks/useAttendanceModuleSettings';
import { getVisibleSections, NavSection, NavItem } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/features/notifications/hooks/useNotifications';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';
import { useNotificationStore } from '@/features/notifications/store/notificationStore';
import { NotificationDrawer } from '@/features/notifications/components/NotificationDrawer';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { PortalSidebarBrand } from './PortalSidebarBrand';
import { masterBuilderApi, CustomMasterItem } from '@/features/master-builder/api/masterBuilderApi';

import {
  ChevronDown, ChevronRight, Menu, Sun, Moon, LogOut, Building2, Lock,
  LayoutDashboard, Users, RefreshCw, GitBranch, BarChart3, Calendar, FilePlus,
  Briefcase, UserCheck, FileText, ClipboardList, Clock, MapPin, Wifi, Coffee,
  ScanFace, Palmtree, FileBarChart, CheckSquare, DollarSign, CreditCard,
  Receipt, TrendingUp, PieChart, Settings, Award, Target, Star, Activity,
  Zap, Package, Monitor, HelpCircle, Bell, Cog, Globe, Shield as ShieldIcon,
  Navigation, UserPlus, BarChart2, Layers, Database, AlertCircle, BookOpen,
  Heart, MessageSquare, Clipboard, Wallet, ShieldCheck, ArrowUpDown, FileSpreadsheet,
  Inbox, Code2, ListChecks, UploadCloud, Palette, Boxes, UserX, Percent, UserMinus,
  Compass, ArrowLeftRight, ReceiptIndianRupee, List, CalendarClock, Tag, Car,
  IndianRupee, CheckCircle, FileCheck, Sliders, Sparkles, Megaphone,
  CalendarDays, UserCog, User, GraduationCap, LineChart, Grid,
} from 'lucide-react';

// Static icon registry matching navigation.ts
const ICON_REGISTRY: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, RefreshCw, GitBranch, BarChart3, Calendar, FilePlus,
  Briefcase, UserCheck, FileText, ClipboardList, Clock, MapPin, Wifi, Coffee,
  ScanFace, Palmtree, FileBarChart, CheckSquare, DollarSign, CreditCard,
  Receipt, TrendingUp, PieChart, Settings, Award, Target, Star, Activity,
  Zap, Package, Monitor, HelpCircle, Bell, Cog, Building2, Globe, Shield: ShieldIcon,
  Navigation, UserPlus, BarChart2, Layers, Database, AlertCircle, BookOpen,
  Heart, MessageSquare, Clipboard, Wallet, ShieldCheck, ArrowUpDown, FileSpreadsheet,
  Lock, ChevronDown, LogOut, Inbox, Code2, ListChecks, UploadCloud, Palette, Boxes,
  UserX, Percent, UserMinus, Compass, ArrowLeftRight, ReceiptIndianRupee, List,
  CalendarClock, Tag, Car, IndianRupee, CheckCircle, FileCheck, Sliders, Sparkles,
  Megaphone, CalendarDays, UserCog, User, GraduationCap, LineChart, Grid,
};

function getIconComponent(iconName?: string) {
  if (!iconName) return <LayoutDashboard className="size-4 flex-shrink-0" />;
  const Icon = ICON_REGISTRY[iconName] || ICON_REGISTRY.LayoutDashboard;
  return <Icon className="size-4 flex-shrink-0" />;
}

// Map standard route href to /hr/* route href for HR layout
function mapToHRHref(href: string): string {
  if (!href) return '/hr/dashboard';
  if (href.startsWith('/hr/')) return href;
  if (href === '/' || href === '/dashboard') return '/hr/dashboard';
  if (href === '/employees') return '/hr/employees';
  if (href === '/employee-lifecycle') return '/hr/employee-lifecycle';
  if (href === '/org-structure') return '/hr/org-structure';
  if (href.startsWith('/recruitment')) return `/hr${href}`;
  if (href === '/attendance') return '/hr/attendance';
  if (href === '/live-tracking') return '/hr/live-tracking';
  if (href === '/attendance/locations') return '/hr/attendance/locations';
  if (href === '/attendance/break-logs') return '/hr/attendance/break-logs';
  if (href === '/attendance/face-punch') return '/hr/face-attendance';
  if (href === '/attendance/shifts') return '/hr/attendance/shifts';
  if (href === '/attendance/roster-shifts') return '/hr/attendance/roster-shifts';
  if (href.startsWith('/leaves')) return `/hr${href}`;
  if (href === '/approvals/dashboard') return '/hr/approvals/dashboard';
  if (href === '/settings/leave-policies') return '/hr/settings/leave-policies';
  if (href === '/holidays') return '/hr/holidays';
  if (href.startsWith('/payroll')) return `/hr${href}`;
  if (href.startsWith('/expenses')) return `/hr${href}`;
  if (href.startsWith('/policies')) return `/hr${href}`;
  if (href === '/assets') return '/hr/assets/dashboard';
  if (href === '/assets/my-assets') return '/hr/assets/assign';
  if (href === '/assets/list') return '/hr/assets/list';
  if (href.startsWith('/performance')) return `/hr${href}`;
  if (href.startsWith('/analytics')) return `/hr${href}`;
  if (href === '/hr-operations/requests') return '/hr/requests';
  if (href === '/workflow') return '/hr/workflow';
  if (href === '/configuration') return '/hr/settings';
  if (href === '/hr-operations/announcements') return '/hr/announcements';
  if (href.startsWith('/masters')) {
    if (href.includes('tab=')) {
      const tab = href.split('tab=')[1];
      return `/hr/masters/${tab}`;
    }
    return `/hr${href}`;
  }
  if (href.startsWith('/operational-masters')) {
    if (href.includes('tab=')) {
      const tab = href.split('tab=')[1];
      return `/hr/operational-masters/${tab}`;
    }
    return `/hr${href}`;
  }
  if (href.startsWith('/modules')) {
    if (href.includes('?')) {
      const query = href.substring(href.indexOf('?'));
      return `/hr/modules${query}`;
    }
    return '/hr/modules';
  }
  if (href.startsWith('/settings')) {
    const sub = href.replace('/settings', '');
    return `/hr/settings${sub}`;
  }
  return `/hr${href}`;
}

export function HRLayout() {
  useNotificationSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { roles } = useRbac();
  const { theme, setTheme } = useThemeStore();
  const { data: licensedFeatures } = useLicensedFeatures();
  const { attendanceMode, liveTrackingEnabled } = useAttendanceModuleSettings();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [customMasters, setCustomMasters] = useState<CustomMasterItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchMasters = async () => {
      try {
        const list = await masterBuilderApi.getMasters();
        if (isMounted) setCustomMasters(list || []);
      } catch (err) {}
    };
    fetchMasters();
    window.addEventListener('custom_masters_updated', fetchMasters);
    return () => {
      isMounted = false;
      window.removeEventListener('custom_masters_updated', fetchMasters);
    };
  }, []);

  // Compute HR visible sections derived from navigation.ts so cleanliness & tab order match CEO/Admin 1:1
  const hrSections = useMemo(() => {
    const rawSections = getVisibleSections(roles, licensedFeatures, attendanceMode, liveTrackingEnabled);
    return rawSections.map((sec) => {
      const items = sec.items.map((item) => {
        const hrHref = mapToHRHref(item.href);
        const children = item.children?.map((c) => ({
          ...c,
          href: mapToHRHref(c.href),
        }));
        return {
          ...item,
          href: hrHref,
          children,
        };
      });

      // Insert custom masters if section is MASTERS
      if (sec.id === 'masters' && customMasters.length > 0) {
        const existingHrefs = new Set(items.map((i) => i.href.toLowerCase()));
        const customItems: NavItem[] = customMasters
          .filter((cm) => !existingHrefs.has(`/hr/masters/${cm.code}`.toLowerCase()))
          .map((cm): NavItem => ({
            name: cm.name,
            href: `/hr/masters/${cm.code}`,
            icon: 'Boxes',
          }));
        return {
          ...sec,
          items: [...items, ...customItems],
        };
      }

      return {
        ...sec,
        items,
      };
    });
  }, [roles, licensedFeatures, attendanceMode, liveTrackingEnabled, customMasters]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
  };

  const isPathActive = (itemHref: string, currentPath: string, currentSearch: string = ''): boolean => {
    if (!itemHref || !currentPath) return false;
    const currentFull = currentSearch ? `${currentPath}${currentSearch}` : currentPath;

    if (itemHref.includes('?')) {
      return currentFull === itemHref;
    }

    if (itemHref === currentPath) return true;
    const exactMatchRoutes = [
      '/', '/dashboard', '/hr', '/hr/dashboard',
      '/attendance', '/hr/attendance',
      '/leaves', '/hr/leaves',
      '/payroll', '/hr/payroll',
      '/recruitment', '/hr/recruitment',
      '/performance', '/hr/performance',
      '/assets', '/hr/assets',
      '/expenses', '/hr/expenses',
      '/modules', '/hr/modules',
      '/masters', '/hr/masters',
      '/operational-masters', '/hr/operational-masters',
    ];
    if (exactMatchRoutes.includes(itemHref)) return currentPath === itemHref;
    return currentPath.startsWith(itemHref + '/');
  };

  if (!mounted) return null;

  const roleInfo = getUserRoleAndDept(user);
  const currentTheme = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme;
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'HR';
  const handleLogout = () => { logout(); navigate('/login'); };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full select-none">
      {/* ── Brand Header (HR Panel Branding) ── */}
      <PortalSidebarBrand open={sidebarOpen} portalLabel="HR Panel" />

      {/* ── Navigation List (Exact same dropdown cleanliness & tab order as CEO/Admin) ── */}
      <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {hrSections.map((section) => {
          const isActive = section.items.some((item) =>
            isPathActive(item.href, location.pathname, location.search) ||
            (item.children && item.children.some((c) => isPathActive(c.href, location.pathname, location.search)))
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
                      title={!sidebarOpen ? section.label : ''}
                    >
                      <span className="flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground">
                        {section.icon ? getIconComponent(section.icon) : getIconComponent(section.items[0]?.icon || 'LayoutDashboard')}
                      </span>
                      <AnimatePresence>
                        {sidebarOpen && (
                          <motion.span
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="flex-1 overflow-hidden truncate text-left text-[12px] font-semibold tracking-tight uppercase"
                          >
                            {section.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      {sidebarOpen && (
                        <ChevronDown
                          className={cn(
                            'ml-auto size-3 flex-shrink-0 text-muted-foreground/60 transition-transform duration-200',
                            isExpanded ? 'rotate-180' : ''
                          )}
                        />
                      )}
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className={cn('mt-1 space-y-1', sidebarOpen ? 'ml-3 border-l border-border pl-3' : '')}>
                    {section.items.map((item) => {
                      const hasChildren = item.children && item.children.length > 0;
                      const isChildActive = hasChildren && item.children!.some((c) => isPathActive(c.href, location.pathname, location.search));
                      const itemActive = (isPathActive(item.href, location.pathname, location.search) && !hasChildren) || isChildActive;

                      if (hasChildren) {
                        return (
                          <Collapsible key={item.name} defaultOpen={true} className="group/sub space-y-0.5">
                            <CollapsibleTrigger asChild>
                              <button
                                className={cn(
                                  'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors',
                                  itemActive
                                    ? 'text-primary font-semibold bg-primary/10 dark:bg-primary/15'
                                    : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                )}
                                title={!sidebarOpen ? item.name : ''}
                              >
                                <span className="flex-shrink-0">{getIconComponent(item.icon)}</span>
                                <AnimatePresence>
                                  {sidebarOpen && (
                                    <motion.div
                                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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

                            <CollapsibleContent className={cn('mt-1 space-y-1', sidebarOpen ? 'ml-3 border-l border-border pl-3' : '')}>
                              {item.children!.map((child) => {
                                const childActive = isPathActive(child.href, location.pathname, location.search);
                                return (
                                  <NavLink
                                    key={child.href}
                                    to={child.href}
                                    onClick={() => setMobileOpen(false)}
                                    title={!sidebarOpen ? child.name : ''}
                                    className={cn(
                                      'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors',
                                      childActive
                                        ? 'portal-sidebar-active font-bold text-white dark:text-slate-950 shadow-2xs'
                                        : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                                    )}
                                  >
                                    <span className="flex-shrink-0">{getIconComponent(child.icon)}</span>
                                    <AnimatePresence>
                                      {sidebarOpen && (
                                        <motion.div
                                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
                                  </NavLink>
                                );
                              })}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      }

                      return (
                        <NavLink
                          key={item.href}
                          to={item.href}
                          onClick={() => setMobileOpen(false)}
                          title={!sidebarOpen ? item.name : ''}
                          className={cn(
                            'flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] transition-colors',
                            itemActive
                              ? 'portal-sidebar-active font-bold text-white dark:text-slate-950 shadow-2xs'
                              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                          )}
                        >
                          <span className="flex-shrink-0">{getIconComponent(item.icon)}</span>
                          <AnimatePresence>
                            {sidebarOpen && (
                              <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                transition={{ duration: 0.12 }}
                                className="flex-1 text-left overflow-hidden flex items-center gap-1.5"
                              >
                                <span className="truncate">{item.name}</span>
                                {item.badge && (
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto font-normal">
                                    {item.badge}
                                  </Badge>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </NavLink>
                      );
                    })}
                  </CollapsibleContent>
                </>
              ) : (
                <NavLink
                  to={section.items[0].href}
                  onClick={() => setMobileOpen(false)}
                  title={!sidebarOpen ? section.label : ''}
                  className={cn(
                    'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-[12px] transition-colors',
                    isActive
                      ? 'portal-sidebar-active font-bold text-white dark:text-slate-950 shadow-2xs'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <span className="flex-shrink-0">{getIconComponent(section.items[0].icon)}</span>
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="font-medium overflow-hidden flex-1 text-left truncate"
                      >
                        {section.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              )}
            </Collapsible>
          );
        })}
      </nav>

      {/* ── User Footer ── */}
      <div className="flex-shrink-0 border-t border-border bg-card p-3">
        <div
          onClick={() => navigate('/hr/profile')}
          className={cn(
            'group flex min-h-14 cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition-colors',
            'border-border bg-card hover:bg-muted',
            !sidebarOpen && 'justify-center'
          )}
          title="View Profile"
        >
          <div className="relative flex-shrink-0">
            <Avatar className="size-9 border border-primary/30 bg-primary shadow-soft-xs">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-primary text-white font-bold text-[10px]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 border-2 border-card rounded-full" />
          </div>

          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 min-w-0 leading-tight"
              >
                <p className="text-[12px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {(() => {
                    const fName = (user?.firstName || (user as any)?.first_name || '').trim();
                    let lName = (user?.lastName || (user as any)?.last_name || '').trim();
                    if (lName.toLowerCase() === 'user') lName = '';
                    const full = `${fName} ${lName}`.trim();
                    return full || fName || 'User';
                  })()}
                </p>
                <p className="text-[10px] font-medium truncate text-primary">
                  {roleInfo.roleTitle}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {sidebarOpen && (
            <Button
              variant="ghost" size="icon"
              onClick={(e) => { e.stopPropagation(); handleLogout(); }}
              className="h-6 w-6 rounded-lg text-muted-foreground/50 hover:text-rose-500 hover:bg-rose-500/10 flex-shrink-0 transition-colors"
              title="Logout" aria-label="Log out"
            >
              <LogOut className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-shell-reference flex h-dvh overflow-hidden bg-background">
      {/* ── Desktop Sidebar ── */}
      <aside className={cn('role-portal-sidebar relative hidden h-dvh flex-shrink-0 flex-col overflow-hidden border-r border-border bg-card md:flex', sidebarOpen ? 'w-64' : 'w-[72px]')}>
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute right-2 top-20 z-10 hidden size-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground md:flex"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
        {renderSidebarContent()}
      </aside>

      {/* ── Mobile Sidebar ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="role-portal-sidebar fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card shadow-2xl md:hidden"
            >
              {renderSidebarContent()}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="sticky top-0 z-30 flex-shrink-0 border-b border-border bg-card/80 backdrop-blur-md px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost" size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex h-8 w-8 rounded-lg"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon"
            onClick={() => { setSidebarOpen(true); setMobileOpen(true); }}
            className="md:hidden h-8 w-8 rounded-lg"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-sm font-bold text-foreground hidden sm:block">HR Panel</span>
            <span className="hidden md:inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-primary">
              {roleInfo.roleTitle} · {roleInfo.departmentName}
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary shadow-xs mr-1">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span>{user?.organizationName || user?.organizationCode || (user as any)?.organization?.name || 'Organization'}</span>
            </div>

            <Button variant="ghost" size="icon" onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')} aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {currentTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            <NotificationBell className="size-8 rounded-lg" iconClassName="size-4" />

            <div className="w-px h-5 bg-border mx-1" />

            <button
              onClick={() => navigate('/hr/profile')}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition-colors"
            >
              <Avatar className="h-7 w-7 border border-primary/30">
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback className="bg-primary text-white text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left leading-tight">
                <p className="text-[12px] font-semibold text-foreground">{(() => {
                  const fName = (user?.firstName || (user as any)?.first_name || '').trim();
                  let lName = (user?.lastName || (user as any)?.last_name || '').trim();
                  if (lName.toLowerCase() === 'user') lName = '';
                  const full = `${fName} ${lName}`.trim();
                  return full || fName || 'User';
                })()}</p>
                <p className="text-[10px] font-medium text-primary">{roleInfo.departmentName}</p>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className="p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
      <NotificationDrawer />
      <Toaster position="top-right" />
    </div>
  );
}

export default HRLayout;
