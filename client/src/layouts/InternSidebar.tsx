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
    label: 'Overview',
    items: [{ name: 'Dashboard', href: '/intern/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'CoreHR',
    items: [
      { name: 'Lifecycle', href: '/intern/lifecycle', icon: GitBranch },
      { name: 'Structure', href: '/intern/org-chart', icon: Building2 },
      { name: 'Identity', href: '/intern/id-card', icon: Shield },
    ],
  },
  {
    label: 'Attendance',
    items: [
      { name: 'FacePunch', href: '/intern/face-attendance', icon: ScanFace },
      { name: 'Logs', href: '/intern/attendance', icon: Clock },
      { name: 'Shifts', href: '/intern/shift-roster', icon: Calendar },
      { name: 'Correction', href: '/intern/attendance-regularization', icon: RefreshCw },
    ],
  },
  {
    label: 'Leaves',
    items: [
      { name: 'Leaves', href: '/intern/leaves', icon: Palmtree },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { name: 'Payslips', href: '/intern/payslips', icon: CreditCard },
    ],
  },
  { label: 'Documents', items: [{ name: 'Documents', href: '/intern/documents', icon: BookOpen }] },
  {
    label: 'Company',
    items: [
      { name: 'Announcements', href: '/intern/announcements', icon: Megaphone },
    ],
  },
  {
    label: 'Expenses',
    items: [
      { name: 'Expenses', href: '/intern/expenses', icon: ReceiptIndianRupee },
      { name: 'Travel', href: '/intern/travel-requests', icon: Plane },
      { name: 'Advances', href: '/intern/travel-advances', icon: CreditCard },
      { name: 'Mileage', href: '/intern/mileage-claims', icon: Activity },
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
        'flex h-full flex-col border-r border-border bg-card transition-all duration-300 ease-in-out',
        open ? 'w-72 md:w-28' : 'w-[72px]'
      )}
    >
      {/* ── Brand ── */}
      <PortalSidebarBrand open={false} portalLabel="Intern Portal" />

      {/* ── Nav ── */}
      <SectionRail id="intern" groups={INTERN_NAV} open={open} onNavigate={() => { if (window.innerWidth < 768) onOpenChange(false); }} />

      {/* ── User Footer ── */}
<<<<<<< HEAD
      <div className="border-t border-border p-3">
        <SidebarProfileMenu profilePath="/intern/profile" onLogout={handleLogout} onProfileNavigate={() => { if (window.innerWidth < 768) onOpenChange(false); }}>
        <div
          className="flex cursor-pointer items-center justify-center rounded-xl border border-border bg-card p-2.5 transition-colors hover:bg-muted"
=======
      <div className="border-t border-border bg-white p-2 dark:bg-slate-950">
        <SidebarProfileMenu profilePath="/intern/profile" onLogout={handleLogout} onProfileNavigate={() => { if (window.innerWidth < 768) onOpenChange(false); }}>
        <div
          className="mx-auto flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border bg-white p-0.5 transition-colors hover:bg-muted dark:bg-slate-950"
>>>>>>> 28ed9bc7 (Fixed sidebar UI)
          title="View Profile"
        >
          <Avatar className={cn('size-10 flex-shrink-0 border-2', C.avatarBorder)}>
            <AvatarImage src={user?.avatarUrl || (user as any)?.avatar || (user as any)?.profile_picture} alt="Profile" />
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
                className="hidden flex-1 items-center justify-between overflow-hidden"
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
                  <p className="truncate text-[10px] text-muted-foreground">Intern</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </SidebarProfileMenu>
      </div>
    </div>
  );
}
