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
  ChevronRight,
  Building2,
  GraduationCap,
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

// ── Amber accent constants ────────────────────────────────────────────────────
const C = {
  activeBg: 'bg-primary',
  activeText: 'text-white',
  hoverBg: 'hover:bg-muted', hoverText: 'hover:text-foreground', icon: 'text-primary',
  sectionLabel: 'text-muted-foreground',
  avatarBg: 'bg-primary', avatarBorder: 'border-primary/30',
};

// ── Nav definitions ───────────────────────────────────────────────────────────
const INTERN_NAV = [
  {
    label: 'OVERVIEW',
    items: [{ name: 'My Dashboard', href: '/intern/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'EMPLOYEE CORE',
    items: [
      { name: 'My Lifecycle', href: '/intern/lifecycle', icon: GitBranch },
      { name: 'Org Structure', href: '/intern/org-chart', icon: Building2 },
      { name: 'ID Card', href: '/intern/id-card', icon: Shield },
    ],
  },
  {
    label: 'ATTENDANCE',
    items: [
      { name: 'Face Punch', href: '/intern/face-attendance', icon: ScanFace },
      { name: 'My Attendance Log', href: '/intern/attendance', icon: Clock },
      { name: 'My Shifts', href: '/intern/shift-roster', icon: Calendar },
      { name: 'Attendance Correction', href: '/intern/attendance-regularization', icon: RefreshCw },
    ],
  },
  {
    label: 'LEAVES',
    items: [
      { name: 'My Leaves', href: '/intern/leaves', icon: Palmtree },
    ],
  },
  {
    label: 'PAYROLL',
    items: [
      { name: 'My Payslips', href: '/intern/payslips', icon: CreditCard },
    ],
  },
  { label: 'DOCUMENTS', items: [{ name: 'My Documents', href: '/intern/documents', icon: BookOpen }] },
  {
    label: 'COMPANY',
    items: [
      { name: 'Announcements', href: '/intern/announcements', icon: Megaphone },
    ],
  },
  {
    label: 'EXPENSES',
    items: [
      { name: 'Expense Claims', href: '/intern/expenses', icon: ReceiptIndianRupee },
      { name: 'Travel Requests', href: '/intern/travel-requests', icon: Plane },
      { name: 'Travel Advances', href: '/intern/travel-advances', icon: CreditCard },
      { name: 'Mileage Claims', href: '/intern/mileage-claims', icon: Activity },
    ],
  },
];

interface InternSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InternSidebar({ open, onOpenChange }: InternSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'IN';

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r border-border bg-white transition-all duration-300 ease-in-out dark:bg-slate-950',
        open ? 'w-[calc(100vw-1.5rem)] max-w-72 md:w-28' : 'w-[72px]'
      )}
    >
      {/* ── Brand ── */}
      <PortalSidebarBrand open={false} portalLabel="Intern Portal" />

      {/* ── Nav ── */}
      <SectionRail id="intern" groups={INTERN_NAV} open={open} onNavigate={() => { if (window.innerWidth < 768) onOpenChange(false); }} />

      {/* ── User Footer ── */}
      <div className="border-t border-border bg-white p-3 dark:bg-slate-950">
        <SidebarProfileMenu profilePath="/intern/profile" onLogout={handleLogout} onProfileNavigate={() => { if (window.innerWidth < 768) onOpenChange(false); }}>
        <div
          className="mx-auto flex size-12 cursor-pointer items-center justify-center rounded-xl border border-border bg-white p-1.5 transition-colors hover:bg-muted dark:bg-slate-950"
          title="View Profile"
        >
          <Avatar className={cn('h-8 w-8 flex-shrink-0 border-2', C.avatarBorder)}>
            <AvatarImage src={user?.avatarUrl} />
            <AvatarFallback className={cn('text-xs font-bold text-white', C.avatarBg)}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        </SidebarProfileMenu>
      </div>
    </div>
  );
}
