import { PortalSidebarBrand } from './PortalSidebarBrand';
import { SidebarProfileMenu } from './SidebarProfileMenu';
import { SectionRail } from '@/layouts/SectionNavigation';
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown, LogOut, Lock, Shield,
  // ── All nav icons used across navigation.ts sections ──────────────────────
  LayoutDashboard, Users, RefreshCw, GitBranch, BarChart3, Calendar, FilePlus,
  Briefcase, UserCheck, FileText, ClipboardList, Clock, MapPin, Wifi, Coffee,
  ScanFace, Palmtree, FileBarChart, CheckSquare, DollarSign, CreditCard,
  Receipt, TrendingUp, PieChart, Settings, Award, Target, Star, Activity,
  Zap, Package, Monitor, HelpCircle, Bell, Cog, Building2, Globe, Shield as ShieldIcon,
  Navigation, UserPlus, BarChart2, Layers, Database, AlertCircle, BookOpen,
  Heart, MessageSquare, Clipboard, Wallet, ShieldCheck, ArrowUpDown, FileSpreadsheet,
  Home, Search, Filter, Edit, Trash2, Eye, Download, Upload, Plus, Minus,
  ChevronRight, ChevronLeft, ChevronUp, X, Check, Info, AlertTriangle,
  LayoutGrid, List, Grid, Table, Columns, Rows, Maximize, Minimize,
  Link, ExternalLink, Mail, Phone, Video, Image, File, Folder, Archive,
  Tag, Bookmark, Flag, Pin, Share, Copy, Printer, Send, Inbox, MessageCircle,
  Headphones, Mic, Volume, Camera, Music, Play, Pause, FastForward,
  RotateCcw, RotateCw, Shuffle, Repeat, SkipForward, SkipBack,
  Battery, Bluetooth, Cast, Cpu, HardDrive, Lock as LockIcon, Unlock,
  Key, Fingerprint, LogIn, User, UserMinus, Users2, Group, PersonStanding,
  Building, Factory, Store, MapIcon, Compass, Route, Truck, Car, Plane,
  Train, Bike, Bus, Anchor, Ticket, Gift, ShoppingCart, ShoppingBag,
  CreditCard as CardIcon, Banknote, Coins, TrendingDown, BarChart,
  LineChart, ScatterChart, GanttChart, Network, TreeDeciduous, GitMerge,
  GitBranch as BranchIcon, GitCommit, GitPullRequest, Code, Terminal,
  Globe2, Layers2, Layout, PanelLeft, PanelRight, SidebarIcon, Menu,
  IndianRupee, ReceiptIndianRupee, CheckCircle, Code2, FileCheck, ListChecks,
  CalendarClock, Sliders, UploadCloud, UserX, Percent, Sparkles, Megaphone,
  CalendarDays, UserCog, GraduationCap, Palette, Boxes,
} from 'lucide-react';

// ── Static icon registry — only icons referenced in navigation config ────────
// This replaces `import * as LucideIcons` (which imports all ~1000 icons).
// Vite/Rollup tree-shakes this object, keeping bundle size minimal.
const ICON_REGISTRY: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, RefreshCw, GitBranch, BarChart3, Calendar, FilePlus,
  Briefcase, UserCheck, FileText, ClipboardList, Clock, MapPin, Wifi, Coffee,
  ScanFace, Palmtree, FileBarChart, CheckSquare, DollarSign, CreditCard,
  Receipt, TrendingUp, PieChart, Settings, Award, Target, Star, Activity,
  Zap, Package, Monitor, HelpCircle, Bell, Cog, Building2, Globe, Shield: ShieldIcon,
  Navigation, UserPlus, BarChart2, Layers, Database, AlertCircle, BookOpen,
  Heart, MessageSquare, Clipboard, Wallet, ShieldCheck, ArrowUpDown, FileSpreadsheet,
  Home, Search, Filter, Edit, Eye, Download, Upload, Plus, Share, Copy, Send, Tag, Bookmark,
  BarChart, LineChart, GanttChart, Network, GitMerge, GitCommit, GitPullRequest,
  Building, Factory, Store, Truck, Users2, Fingerprint, Key, Inbox, MessageCircle, Headphones,
  IndianRupee, ReceiptIndianRupee, CheckCircle, Code2, FileCheck, ListChecks,
  CalendarClock, Sliders, UploadCloud, UserX, Percent, Sparkles, Megaphone,
  CalendarDays, UserCog, GraduationCap, Palette, Boxes, Grid, List, Table, Columns,
  Rows, Link, Mail, Phone, Video, Image, File, Folder, Compass, Car, User, UserMinus,
  Lock, ChevronDown, LogOut
};
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLicensedFeatures } from '@/features/licensing/api/useLicensing';
import { useNavStore } from '@/features/navigation/store/navStore';
import { getVisibleSections, type NavItem } from '@/config/navigation';
import { useAttendanceModuleSettings } from '@/features/attendance/hooks/useAttendanceModuleSettings';
import { useRbac } from '@/lib/rbac';
import { getUserRoleAndDept } from '@/lib/userProfile';
import { useSubscriptionStore } from '@/features/subscriptions/store/subscriptionStore';
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

import { masterBuilderApi } from '@/features/master-builder/api/masterBuilderApi';
import hrmsLogo from '@/assests/hrms.png';

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: () => void;
}

export function Sidebar({ open, onOpenChange, onNavigate }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { roles } = useRbac();
  const { data: licensedFeatures } = useLicensedFeatures();
  const { attendanceMode, liveTrackingEnabled } = useAttendanceModuleSettings();
  const { expandedSections, toggleSection, expandSectionContainingRoute } = useNavStore();
  const { enabledModules } = useSubscriptionStore();

  const [lockedItemDialogOpen, setLockedItemDialogOpen] = useState(false);
  const [lockedItemName, setLockedItemName] = useState('');

  // ── Dynamic custom masters for sidebar injection ────────────────────────────
  const [customMasterNavItems, setCustomMasterNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    // Hardcoded master codes already present in static navigation — skip these
    const STATIC_MASTER_CODES = new Set([
      'company', 'location', 'department', 'designation',
      'ot-rule', 'ot_rule', 'grade', 'employee-status', 'employee_status',
      'emp-type', 'emp_type', 'events', 'event',
      'notification-templates', 'notification_templates',
      'notification-merge-codes', 'notification_merge_codes',
      'break', 'general-shift', 'general_shift', 'roster-shift', 'roster_shift',
      'holiday', 'offer-templates', 'roles-responsibility',
      'kra', 'resource-plan', 'employment_status', 'employment_type',
      'custom_company', 'test1',
    ]);

    const loadCustomMasters = async () => {
      try {
        const list = await masterBuilderApi.getMasters();
        const dynamicItems = list
          .filter((cm) => !STATIC_MASTER_CODES.has(cm.code) && !STATIC_MASTER_CODES.has(cm.code.replace(/_/g, '-')))
          .map((cm) => ({
            name: cm.name,
            href: `/masters/${cm.code}`,
            icon: cm.icon || 'Boxes',
          }));
        setCustomMasterNavItems(dynamicItems);
      } catch {
        // silently fail — sidebar nav items are non-critical
      }
    };

    loadCustomMasters();
    window.addEventListener('custom_masters_updated', loadCustomMasters);
    return () => window.removeEventListener('custom_masters_updated', loadCustomMasters);
  }, []);

  // ── Memoized nav sections — only recomputes when roles/features/settings change ──
  // Removed location.pathname from deps: pathname changes no longer trigger
  // the heavy getVisibleSections() computation on every navigation.
  const visibleSections = useMemo(
    () => getVisibleSections(roles, licensedFeatures, attendanceMode, liveTrackingEnabled, enabledModules),
    [roles, licensedFeatures, attendanceMode, liveTrackingEnabled, enabledModules]
  );

  // ── Inject dynamic custom master items into the MASTERS section ──────────────
  const finalSections = useMemo(() => {
    if (customMasterNavItems.length === 0) return visibleSections;
    return visibleSections.map((section) => {
      if (section.id !== 'masters') return section;
      // Avoid duplicates: only add items whose href isn't already in the section
      const existingHrefs = new Set(section.items.map((i) => i.href));
      const newItems = customMasterNavItems.filter((ci) => !existingHrefs.has(ci.href));
      if (newItems.length === 0) return section;
      return { ...section, items: [...section.items, ...newItems] };
    });
  }, [visibleSections, customMasterNavItems]);

  // ── Expand the active section when route changes (lightweight, no recompute) ──
  useEffect(() => {
    expandSectionContainingRoute(location.pathname, finalSections);
  }, [location.pathname, finalSections, expandSectionContainingRoute]);

  // ── Re-trigger nav when module toggles fire from storage/custom events ────
  useEffect(() => {
    const handleExternalUpdate = () => {
      // Force re-evaluation by invalidating licensing query cache
      // The licensedFeatures change will cause visibleSections useMemo to re-run
      window.dispatchEvent(new Event('apponext_nav_refresh'));
    };
    window.addEventListener('apponext_modules_updated', handleExternalUpdate);
    window.addEventListener('storage', handleExternalUpdate);
    return () => {
      window.removeEventListener('apponext_modules_updated', handleExternalUpdate);
      window.removeEventListener('storage', handleExternalUpdate);
    };
  }, []);

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
  };

  const isPathActive = (itemHref: string, currentPath: string, currentSearch: string = ''): boolean => {
    if (!itemHref || !currentPath) return false;
    const currentFull = currentSearch ? `${currentPath}${currentSearch}` : currentPath;

    if (itemHref.includes('?')) {
      return currentFull === itemHref;
    }

    if (itemHref === currentPath) return true;

    const exactMatchRoutes = [
      '/',
      '/dashboard',
      '/hr',
      '/hr/dashboard',
      '/attendance',
      '/hr/attendance',
      '/leaves',
      '/hr/leaves',
      '/payroll',
      '/hr/payroll',
      '/recruitment',
      '/hr/recruitment',
      '/performance',
      '/hr/performance',
      '/assets',
      '/hr/assets',
      '/expenses',
      '/hr/expenses',
      '/modules',
      '/hr/modules',
      '/masters',
      '/hr/masters',
      '/operational-masters',
      '/hr/operational-masters',
    ];

    if (exactMatchRoutes.includes(itemHref)) {
      return currentPath === itemHref;
    }

    if (currentPath.startsWith(itemHref + '/')) return true;
    return false;
  };


  const getFullName = () => {
    const fName = (user?.firstName || (user as any)?.first_name || '').trim();
    let lName = (user?.lastName || (user as any)?.last_name || '').trim();
    if (lName.toLowerCase() === 'user') lName = '';
    const combined = `${fName} ${lName}`.trim();
    if (combined) return combined;
    if ((user as any)?.name && (user as any).name.toLowerCase() !== 'user') return (user as any).name;
    return fName || 'User';
  };

  const getInitials = () => {
    const fName = user?.firstName || (user as any)?.first_name || '';
    const lName = user?.lastName || (user as any)?.last_name || '';
    return `${fName?.[0] || ''}${lName?.[0] || ''}`.toUpperCase() || 'US';
  };

  // Get icon component by name — uses static registry, with robust fallback
  const getIconComponent = (iconName?: string) => {
    if (!iconName) return <LayoutDashboard className="h-4 w-4 flex-shrink-0" />;
    const Icon = ICON_REGISTRY[iconName] || ICON_REGISTRY.LayoutDashboard;
    return Icon ? <Icon className="h-4 w-4 flex-shrink-0" /> : <LayoutDashboard className="h-4 w-4 flex-shrink-0" />;
  };

  const handleProfileClick = () => {
    if (roles.includes('super_admin')) {
      navigate('/superadmin/profile');
    } else {
      navigate('/settings/company-profile');
    }
  };

  const userProfile = getUserRoleAndDept(user);
  const userRoleCode = (userProfile?.roleCode || '').toLowerCase();
  const userRoleTitle = (userProfile?.roleTitle || '').toLowerCase();
  const isHrUser =
    userRoleCode.startsWith('hr') ||
    userRoleTitle === 'hr' ||
    (user as any)?.role === 'hr' ||
    (Array.isArray((user as any)?.roles) && (user as any).roles.some((r: string) => String(r).toLowerCase().startsWith('hr')));

  const portalLabel = isHrUser
    ? 'HR Portal'
    : ['organization_admin', 'ceo', 'super_admin'].includes(userRoleCode)
      ? 'Admin Portal'
      : userRoleCode === 'support'
        ? 'Support Portal'
        : userRoleCode === 'finance'
          ? 'Finance Portal'
          : userRoleCode === 'department_head'
            ? 'Manager Portal'
            : userRoleCode === 'team_lead'
              ? 'Team Lead Portal'
              : 'Admin Portal';

  return (
    <>
      <div
        className={cn(
          'app-dashboard-sidebar flex h-dvh flex-col overflow-hidden border-r border-border bg-card select-none',
          open ? 'w-72 md:w-28' : 'w-[72px]'
        )}
      >
        {/* Brand Header */}
        <PortalSidebarBrand open={false} portalLabel={portalLabel} />

        {/* Navigation List */}
        <SectionRail id="admin" groups={finalSections.map(section => ({ label: section.label, icon: ICON_REGISTRY[section.icon || section.items[0]?.icon] || LayoutDashboard, items: section.items.map(item => ({ ...item, icon: ICON_REGISTRY[item.icon] || LayoutDashboard, children: item.children?.map(child => ({ name: child.name, href: child.href, icon: ICON_REGISTRY[child.icon] || LayoutDashboard, isLocked: (child as any).isLocked })) })) }))} open={open} onNavigate={onNavigate} />

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
                <Shield className="h-3.5 w-3.5 flex-shrink-0" />
                {open && <span className="truncate">Platform Admin</span>}
              </button>
              <Separator className="my-1 border-border/40" />
            </>
          )}

          <SidebarProfileMenu
            profilePath={roles.includes('super_admin') ? '/superadmin/profile' : '/settings/company-profile'}
            onLogout={handleLogout}
            onProfileNavigate={onNavigate}
          >
          <div
            className={cn(
              'group flex min-h-14 cursor-pointer items-center justify-center rounded-xl border p-2.5 transition-colors',
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
                      <div className="hidden overflow-hidden text-left leading-tight min-w-0">
                        <p className="text-[12px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {getFullName()}
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

          </div>
          </SidebarProfileMenu>
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
