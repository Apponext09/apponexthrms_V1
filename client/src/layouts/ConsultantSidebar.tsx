import {
  LayoutDashboard,
  Clock,
  Palmtree,
  FileText,
  User,
  Calendar,
  Megaphone,
  BookOpen,
  LogOut,
  Building2,
  Briefcase,
  CreditCard,
  ReceiptIndianRupee,
  Plane,
  Activity,
  Shield,
  ChevronDown,
  GitBranch,
  ScanFace,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PortalSidebarBrand } from '@/layouts/PortalSidebarBrand';

// ── Violet accent constants ───────────────────────────────────────────────────
const C = {
  activeBg: 'bg-primary',
  activeText: 'text-white',
  hoverBg: 'hover:bg-muted', hoverText: 'hover:text-foreground', icon: 'text-primary',
  sectionLabel: 'text-muted-foreground',
  avatarBg: 'bg-primary', avatarBorder: 'border-primary/30',
};

import { useSubscriptionStore } from '@/features/subscriptions/store/subscriptionStore';

// ── Nav definitions ───────────────────────────────────────────────────────────
const CONSULTANT_NAV = [
  {
    label: 'OVERVIEW',
    subscriptionModule: null,
    items: [{ name: 'My Dashboard', href: '/consultant/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'EMPLOYEE CORE',
    subscriptionModule: 'Core HR & Directory',
    items: [
      { name: 'My Lifecycle', href: '/consultant/lifecycle', icon: GitBranch },
      { name: 'Org Structure', href: '/consultant/org-chart', icon: Building2 },
      { name: 'ID Card', href: '/consultant/id-card', icon: Shield },
    ],
  },
  {
    label: 'ATTENDANCE',
    subscriptionModule: 'Attendance & Time Tracking',
    items: [
      { name: 'Face Punch', href: '/consultant/face-attendance', icon: ScanFace },
      { name: 'My Attendance Log', href: '/consultant/attendance', icon: Clock },
      { name: 'My Shifts', href: '/consultant/shift-roster', icon: Calendar },
      { name: 'Attendance Correction', href: '/consultant/attendance-regularization', icon: RefreshCw },
    ],
  },
  {
    label: 'LEAVES',
    subscriptionModule: 'Leave Management & Approvals',
    items: [
      { name: 'My Leaves', href: '/consultant/leaves', icon: Palmtree },
    ],
  },
  {
    label: 'EXPENSES',
    subscriptionModule: 'Expense Management',
    items: [
      { name: 'Expense Claims',   href: '/consultant/expenses', icon: ReceiptIndianRupee },
      { name: 'Travel Requests',  href: '/consultant/travel-requests', icon: Plane },
      { name: 'Travel Advances',  href: '/consultant/travel-advances', icon: CreditCard },
      { name: 'Mileage Claims',   href: '/consultant/mileage-claims',  icon: Activity },
    ],
  },
  {
    label: 'PAYROLL',
    subscriptionModule: 'Automated Payroll Processing',
    items: [
      { name: 'My Payslips', href: '/consultant/payslips', icon: CreditCard },
    ],
  },
  {
    label: 'DOCUMENTS',
    subscriptionModule: 'Core HR & Directory',
    items: [{ name: 'My Documents', href: '/consultant/documents', icon: BookOpen }],
  },
  {
    label: 'COMPANY',
    subscriptionModule: null,
    items: [
      { name: 'Announcements', href: '/consultant/announcements', icon: Megaphone },
    ],
  },
];

interface ConsultantSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsultantSidebar({ open, onOpenChange }: ConsultantSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { hasModule, isGatingEnabled } = useSubscriptionStore();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'CO';

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const visibleNav = CONSULTANT_NAV.filter(sec => {
    if (!isGatingEnabled || !sec.subscriptionModule) return true;
    return hasModule(sec.subscriptionModule);
  });

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r border-border bg-card transition-all duration-300 ease-in-out',
        open ? 'w-64' : 'w-[72px]'
      )}
    >
      {/* ── Brand ── */}
      <PortalSidebarBrand open={open} portalLabel="Consultant Portal" />

      {/* ── Nav ── */}
      <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNav.map((section) => (
          <div key={section.label}>
            {section.label === 'OVERVIEW' ? (
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return <button key={item.href} onClick={() => navigate(item.href)} title={!open ? item.name : undefined} className={cn('group flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all', active ? `${C.activeBg} ${C.activeText} shadow-sm` : `text-muted-foreground ${C.hoverBg} ${C.hoverText}`, !open && 'justify-center px-2')}><Icon size={16} className={cn('flex-shrink-0', active ? 'text-white' : C.icon)} />{open && <span className="truncate">{item.name}</span>}</button>;
                })}
              </div>
            ) : (() => {
              const SectionIcon = section.items[0].icon;
              const hasActiveItem = section.items.some((item) => isActive(item.href));
              const isOpen = openMenu === section.label || hasActiveItem;
              return <div className="space-y-1"><button type="button" onClick={() => setOpenMenu(isOpen ? null : section.label)} title={!open ? section.label : undefined} className={cn('group flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors', hasActiveItem ? 'bg-violet-600/10 text-violet-700 dark:text-violet-400' : `text-muted-foreground ${C.hoverBg} ${C.hoverText}`, !open && 'justify-center px-2')}><span className="flex items-center gap-3"><SectionIcon size={16} className={C.icon} />{open && <span>{section.label}</span>}</span>{open && <ChevronDown size={16} className={cn('transition-transform', isOpen && 'rotate-180')} />}</button>{open && isOpen && <div className="ml-3 space-y-1 border-l border-border pl-3">{section.items.map((item) => { const Icon = item.icon; const active = isActive(item.href); return <button key={item.href} onClick={() => navigate(item.href)} className={cn('flex min-h-9 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors', active ? `${C.activeBg} ${C.activeText} font-bold` : `text-muted-foreground ${C.hoverBg} ${C.hoverText}`)}><Icon size={14} className={active ? 'text-white' : C.icon} /><span className="truncate">{item.name}</span></button>; })}</div>}</div>;
            })()}
          </div>
        ))}
      </nav>

      {/* ── User Footer ── */}
      <div className="border-t border-border p-3">
        <div
          onClick={() => navigate('/consultant/profile')}
          className={cn('flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-card p-2.5 hover:bg-muted transition-colors', !open && 'justify-center')}
          title="View Profile"
        >
          <Avatar className={cn('h-8 w-8 flex-shrink-0 border-2', C.avatarBorder)}>
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className={cn('text-xs font-bold text-white', C.avatarBg)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex flex-1 items-center justify-between overflow-hidden"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {(() => {
                      const fName = (user?.firstName || (user as any)?.first_name || '').trim();
                      let lName = (user?.lastName || (user as any)?.last_name || '').trim();
                      if (lName.toLowerCase() === 'user') lName = '';
                      const full = `${fName} ${lName}`.trim();
                      return full || fName || 'User';
                    })()}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">Consultant</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  title="Sign out"
                >
                  <LogOut size={13} />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
