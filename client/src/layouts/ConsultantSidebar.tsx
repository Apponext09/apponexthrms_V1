import { SectionRail } from '@/layouts/SectionNavigation';
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
import { SidebarProfileMenu } from '@/layouts/SidebarProfileMenu';

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
export const CONSULTANT_NAV = [
  {
    label: 'Overview',
    subscriptionModule: null,
    items: [{ name: 'Dashboard', href: '/consultant/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'CoreHR',
    subscriptionModule: 'Core HR & Directory',
    items: [
      { name: 'Lifecycle', href: '/consultant/lifecycle', icon: GitBranch },
      { name: 'Structure', href: '/consultant/org-chart', icon: Building2 },
      { name: 'Identity', href: '/consultant/id-card', icon: Shield },
    ],
  },
  {
    label: 'Attendance',
    subscriptionModule: 'Attendance & Time Tracking',
    items: [
      { name: 'FacePunch', href: '/consultant/face-attendance', icon: ScanFace },
      { name: 'Logs', href: '/consultant/attendance', icon: Clock },
      { name: 'Shifts', href: '/consultant/shift-roster', icon: Calendar },
      { name: 'Correction', href: '/consultant/attendance-regularization', icon: RefreshCw },
    ],
  },
  {
    label: 'Leaves',
    subscriptionModule: 'Leave Management & Approvals',
    items: [
      { name: 'Leaves', href: '/consultant/leaves', icon: Palmtree },
    ],
  },
  {
    label: 'Expenses',
    subscriptionModule: 'Expense Management',
    items: [
      { name: 'Expenses',   href: '/consultant/expenses', icon: ReceiptIndianRupee },
      { name: 'Travel',  href: '/consultant/travel-requests', icon: Plane },
      { name: 'Advances',  href: '/consultant/travel-advances', icon: CreditCard },
      { name: 'Mileage',   href: '/consultant/mileage-claims',  icon: Activity },
    ],
  },
  {
    label: 'Payroll',
    subscriptionModule: 'Automated Payroll Processing',
    items: [
      { name: 'Payslips', href: '/consultant/payslips', icon: CreditCard },
    ],
  },
  {
    label: 'Documents',
    subscriptionModule: 'Core HR & Directory',
    items: [{ name: 'Documents', href: '/consultant/documents', icon: BookOpen }],
  },
  {
    label: 'Company',
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
        'flex h-full flex-col border-r border-border bg-white transition-all duration-300 ease-in-out dark:bg-slate-950',
        open ? 'w-[calc(100vw-1.5rem)] max-w-72 md:w-28' : 'w-[72px]'
      )}
    >
      {/* ── Brand ── */}
      <PortalSidebarBrand open={false} portalLabel="Consultant Portal" />

      {/* ── Nav ── */}
      <SectionRail id="consultant" groups={visibleNav} open={open} onNavigate={() => { if (window.innerWidth < 768) onOpenChange(false); }} />

      {/* ── User Footer ── */}
      <div className="border-t border-border bg-white p-2 dark:bg-slate-950">
        <SidebarProfileMenu profilePath="/consultant/profile" onLogout={handleLogout} onProfileNavigate={() => { if (window.innerWidth < 768) onOpenChange(false); }}>
          <div className="flex flex-col items-center justify-center cursor-pointer group">
            <div
              className="mx-auto flex size-11 items-center justify-center rounded-xl border border-border bg-white p-0.5 transition-colors hover:bg-muted dark:bg-slate-950"
              title="View Consultant Profile"
            >
              <Avatar className={cn('size-10 flex-shrink-0 border-2', C.avatarBorder)}>
                <AvatarImage src={user?.avatarUrl || (user as any)?.avatar || (user as any)?.profile_picture} alt="Profile" />
                <AvatarFallback className={cn('text-xs font-bold text-white', C.avatarBg)}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-[8.5px] font-bold tracking-tight text-primary text-center leading-tight truncate max-w-[68px] mt-1">
              Consultant Portal
            </span>
          </div>
        </SidebarProfileMenu>
      </div>
    </div>
  );
}
