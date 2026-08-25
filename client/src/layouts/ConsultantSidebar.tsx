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
  Receipt,
  Plane,
  Activity,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { PortalSidebarBrand } from '@/layouts/PortalSidebarBrand';

// ── Violet accent constants ───────────────────────────────────────────────────
const C = {
  activeBg: 'bg-violet-600 dark:bg-violet-600',
  activeText: 'text-white',
  hoverBg: 'hover:bg-violet-50 dark:hover:bg-violet-950/30',
  hoverText: 'hover:text-violet-700 dark:hover:text-violet-400',
  icon: 'text-violet-500',
  sectionLabel: 'text-muted-foreground',
  avatarBg: 'bg-violet-600',
  avatarBorder: 'border-violet-300 dark:border-violet-700',
};

// ── Nav definitions ───────────────────────────────────────────────────────────
const CONSULTANT_NAV = [
  {
    label: 'OVERVIEW',
    items: [
      { name: 'My Dashboard', href: '/consultant/dashboard', icon: LayoutDashboard },
      { name: 'My Profile',   href: '/consultant/profile',   icon: User },
    ],
  },
  {
    label: 'TIME & ATTENDANCE',
    items: [
      { name: 'Attendance',       href: '/consultant/attendance',       icon: Clock },
      { name: 'Holiday Calendar', href: '/consultant/holiday-calendar', icon: Calendar },
    ],
  },
  {
    label: 'LEAVES',
    items: [
      { name: 'My Leaves', href: '/consultant/leaves', icon: Palmtree },
    ],
  },
  {
    label: 'EXPENSES',
    items: [
      { name: 'Expense Claims',   href: '/consultant/expenses', icon: Receipt },
      { name: 'Travel Requests',  href: '/consultant/travel',   icon: Plane },
    ],
  },
  {
    label: 'PAYROLL',
    items: [
      { name: 'My Payslips', href: '/consultant/payslips', icon: CreditCard },
    ],
  },
  {
    label: 'DOCUMENTS',
    items: [
      { name: 'My Documents', href: '/consultant/documents', icon: BookOpen },
      { name: 'ID Card',      href: '/consultant/id-card',   icon: Shield },
    ],
  },
  {
    label: 'COMPANY',
    items: [
      { name: 'Announcements', href: '/consultant/announcements', icon: Megaphone },
      { name: 'Org Chart',     href: '/consultant/org-chart',     icon: Building2 },
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'CO';

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  return (
    <div
      className={cn(
        'flex h-full flex-col border-r border-border bg-card transition-all duration-300 ease-in-out',
        open ? 'w-60' : 'w-[60px]'
      )}
    >
      {/* ── Brand ── */}
      <PortalSidebarBrand open={open} portalLabel="Consultant Portal" />

      {/* ── Nav ── */}
      <nav className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-2 py-4">
        {CONSULTANT_NAV.map((section) => (
          <div key={section.label}>
            <AnimatePresence>
              {open && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn('mb-1 px-3 text-[9px] font-bold uppercase', C.sectionLabel)}
                >
                  {section.label}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    title={!open ? item.name : undefined}
                    className={cn(
                      'group flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-[12px] font-semibold transition-all',
                      active
                        ? `${C.activeBg} ${C.activeText} shadow-sm`
                        : `text-muted-foreground ${C.hoverBg} ${C.hoverText}`
                    )}
                  >
                    <Icon
                      size={16}
                      className={cn('flex-shrink-0', active ? 'text-white' : C.icon)}
                    />
                    <AnimatePresence>
                      {open && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          className="overflow-hidden whitespace-nowrap"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User Footer ── */}
      <div className="border-t border-border p-3">
        <div className={cn('flex items-center gap-3', !open && 'justify-center')}>
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
                  onClick={handleLogout}
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
