import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Settings, CreditCard, Lock, ShoppingBag, Palette, Code, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import hrmsLogo from '@/assests/hrms.png';

interface PlatformAdminSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORM_MENU = [
  { name: 'Dashboard', href: '/platform-admin', icon: BarChart3 },
  { name: 'Billing', href: '/platform-admin/billing', icon: CreditCard },
  { name: 'Module Licensing', href: '/platform-admin/licensing', icon: Lock },
  { name: 'Marketplace', href: '/platform-admin/marketplace', icon: ShoppingBag },
  { name: 'White Label', href: '/platform-admin/white-label', icon: Palette },
  { name: 'Developer Portal', href: '/platform-admin/developer', icon: Code },
];

export function PlatformAdminSidebar({ open, onOpenChange }: PlatformAdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = () => {
    return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <motion.div
      animate={{ width: open ? 240 : 64 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex flex-col h-screen bg-gradient-to-b from-accent/10 to-accent/5 border-r border-border shadow-soft-sm overflow-hidden select-none"
    >
      {/* Logo / Branding */}
      <div className="px-3.5 py-3 border-b border-border bg-card/60">
        <div className="flex items-center gap-2.5 justify-center md:justify-start">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1 shadow-sm border border-border/60 flex-shrink-0 overflow-hidden">
            <img src={hrmsLogo} alt="HRMS Logo" className="h-full w-full object-contain" />
          </div>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap flex flex-col justify-center leading-none"
              >
                <h1 className="font-extrabold text-xs tracking-tight text-foreground flex items-center gap-1.5">
                  Apponext <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent">Platform</span>
                </h1>
                <p className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">System Admin</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1">
        {PLATFORM_MENU.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.href}
              whileHover={{ x: open ? 3 : 0 }}
              onClick={() => navigate(item.href)}
              title={!open ? item.name : ''}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 text-xs font-medium',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <AnimatePresence>
                {open && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-xs font-medium overflow-hidden text-left truncate"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && open && (
                <ChevronRight className="ml-auto h-3.5 w-3.5 flex-shrink-0" />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="border-t border-border/60 p-2 flex-shrink-0 bg-muted/20">
        <div
          onClick={() => navigate('/superadmin/profile')}
          className={cn(
            'flex items-center justify-between p-1.5 rounded-md border cursor-pointer transition group',
            location.pathname.startsWith('/superadmin/profile')
              ? 'bg-accent/10 border-accent/30 text-accent shadow-2xs'
              : 'bg-transparent hover:bg-muted/80 border-transparent'
          )}
          title="Click to view Admin Profile"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Avatar className="h-7 w-7 border border-accent/40 flex-shrink-0 shadow-2xs">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-accent text-accent-foreground font-bold text-[10px]">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            {open && (
              <div className="overflow-hidden text-left leading-tight">
                <p className="text-[12px] font-semibold text-foreground truncate group-hover:text-accent transition-colors">
                  {user?.firstName || 'Admin'} {user?.lastName || 'User'}
                </p>
              </div>
            )}
          </div>

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
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

