import {
  LayoutDashboard,
  Building2,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import hrmsLogo from '@/assests/hrms.png';

interface SuperAdminSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuperAdminSidebar({ open, onOpenChange }: SuperAdminSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getFullName = () => {
    const fName = user?.firstName || (user as any)?.first_name || '';
    const lName = user?.lastName || (user as any)?.last_name || '';
    const combined = `${fName} ${lName}`.trim();
    if (combined) return combined;
    if ((user as any)?.name) return (user as any).name;
    return 'Super Admin';
  };

  const getInitials = () => {
    const fName = user?.firstName || (user as any)?.first_name || '';
    const lName = user?.lastName || (user as any)?.last_name || '';
    return `${fName?.[0] || ''}${lName?.[0] || ''}`.toUpperCase() || 'SA';
  };

  const navItems = [
    {
      name: 'Dashboard',
      href: '/superadmin/dashboard',
      icon: LayoutDashboard,
      badge: 'Overview',
      color: 'text-sky-500',
    },
    {
      name: 'Organization',
      href: '/superadmin/organization',
      icon: Building2,
      badge: 'Tenants',
      color: 'text-indigo-500',
    },
    {
      name: 'Subscription',
      href: '/superadmin/subscription',
      icon: CreditCard,
      badge: 'Plans',
      color: 'text-emerald-500',
    },
    {
      name: 'Helpdesk',
      href: '/superadmin/helpdesk',
      icon: HelpCircle,
      badge: 'Inquiries',
      color: 'text-amber-500',
    },
  ];



  return (
    <motion.div
      animate={{ width: open ? 220 : 60 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="flex flex-col h-screen bg-card text-foreground border-r border-border/70 shadow-2xs overflow-hidden select-none"
    >
      {/* Header Logo Banner */}
      <div className="h-16 px-3 border-b border-border/60 flex items-center justify-between flex-shrink-0 bg-muted/20">
        {open ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex size-9 items-center justify-center flex-shrink-0 overflow-hidden">
                <img src={hrmsLogo} alt="Apponext HRMS Logo" className="h-full w-full object-contain" />
              </div>
              <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                <span className="text-sm font-extrabold tracking-tight text-foreground">Apponext</span>
                <span className="rounded-md border border-primary/20 bg-primary/10 px-1 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-primary">SuperAdmin</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-muted/80 h-7 w-7 rounded-md ml-auto"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center size-full min-h-0 overflow-hidden">
            <button
              onClick={() => onOpenChange(true)}
              className="flex items-center justify-center size-full"
              title="Expand Sidebar"
            >
              <img src={hrmsLogo} alt="HRMS Logo" className="h-12 w-auto max-w-[85%] object-contain scale-[1.35] origin-center drop-shadow-xs" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto sidebar-scrollbar px-2 py-2 space-y-0.5">
        {open && (
          <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Main Controls
          </div>
        )}

        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              title={!open ? item.name : ''}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md font-medium text-[12px] transition-all duration-150 group relative',
                isActive
                  ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border border-amber-500/30 shadow-2xs'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'p-1 rounded-md transition-colors flex-shrink-0',
                  isActive
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'bg-muted/60 text-muted-foreground group-hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>

              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="flex-1 text-left overflow-hidden flex items-center justify-between"
                  >
                    <span className="font-medium text-[12px] truncate">{item.name}</span>
                    <ChevronRight
                      className={cn(
                        'h-3 w-3 transition-transform opacity-0 group-hover:opacity-100 ml-auto flex-shrink-0',
                        isActive && 'opacity-100 text-amber-500'
                      )}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* SuperAdmin User Profile Card */}
      <div className="p-2 border-t border-border/60 space-y-1 flex-shrink-0 bg-muted/20">
        {(() => {
          const isProfileActive = location.pathname.startsWith('/superadmin/profile');
          return (
            <div
              onClick={() => navigate('/superadmin/profile')}
              className={cn(
                'flex cursor-pointer transition group',
                open
                  ? 'items-center justify-between p-1 rounded-md border'
                  : 'flex-col items-center justify-center p-0.5',
                isProfileActive
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 shadow-2xs'
                  : 'bg-transparent hover:bg-muted/80 border-transparent'
              )}
              title="Click to view SuperAdmin Profile"
            >
              <div className={cn('flex overflow-hidden', open ? 'items-center gap-2' : 'flex-col items-center justify-center')}>
                <Avatar className="size-8.5 border border-amber-500/40 flex-shrink-0 shadow-2xs">
                  <AvatarFallback className="bg-amber-500 text-white font-bold text-xs">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}
                      className="overflow-hidden text-left leading-tight"
                    >
                      <p className="text-[12px] font-semibold text-foreground truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {getFullName()}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!open && (
                  <span className="text-[8.5px] font-bold tracking-tight text-amber-600 dark:text-amber-400 text-center leading-tight truncate max-w-[68px] mt-1">
                    Super Admin
                  </span>
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
          );
        })()}
      </div>
    </motion.div>
  );
}
