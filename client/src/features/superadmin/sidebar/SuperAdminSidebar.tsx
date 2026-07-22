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
      name: 'Help Desk',
      href: '/superadmin/helpdesk',
      icon: HelpCircle,
      badge: 'Inquiries',
      color: 'text-amber-500',
    },
  ];

  const getInitials = () => {
    return `${user?.firstName?.[0] || 'S'}${user?.lastName?.[0] || 'A'}`.toUpperCase();
  };

  return (
    <motion.div
      animate={{ width: open ? 240 : 64 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="flex flex-col h-screen bg-slate-900 text-slate-100 border-r border-slate-800 shadow-2xl overflow-hidden select-none"
    >
      {/* Header Logo Banner */}
      <div className="px-3.5 py-3 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-950/70">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1 shadow-md flex-shrink-0 overflow-hidden border border-slate-700">
            <img src={hrmsLogo} alt="HRMS Logo" className="h-full w-full object-contain" />
          </div>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap leading-none"
              >
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-xs tracking-wide text-white">Apponext</h1>
                  <Badge variant="outline" className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30 px-1 py-0 font-semibold">
                    SuperAdmin
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Platform Admin</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-slate-800 h-7 w-7 rounded-lg"
          onClick={() => onOpenChange(!open)}
        >
          {open ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">
          {open ? 'Main Controls' : '•••'}
        </div>

        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <motion.button
              key={item.href}
              whileHover={{ scale: 1.01, x: 2 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate(item.href)}
              title={!open ? item.name : ''}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 group relative',
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-red-500/10 text-white border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-md transition-colors flex-shrink-0',
                  isActive
                    ? 'bg-gradient-to-tr from-amber-500 to-red-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-400 group-hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 text-left overflow-hidden flex items-center justify-between"
                  >
                    <span className="font-semibold text-xs truncate">{item.name}</span>
                    <ChevronRight
                      className={cn(
                        'h-3.5 w-3.5 transition-transform opacity-0 group-hover:opacity-100',
                        isActive && 'opacity-100 text-amber-400'
                      )}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      {/* SuperAdmin User Profile Card */}
      <div className="p-2 border-t border-slate-800 space-y-1.5 bg-slate-950/50 flex-shrink-0">
        {(() => {
          const isProfileActive = location.pathname.startsWith('/superadmin/profile');
          return (
            <div
              onClick={() => navigate('/superadmin/profile')}
              className={cn(
                'flex items-center justify-between p-1.5 rounded-lg border cursor-pointer transition',
                isProfileActive
                  ? 'bg-amber-500/20 border-amber-500/40 text-white shadow-xs'
                  : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700'
              )}
              title="Click to view SuperAdmin Profile"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Avatar className="h-7 w-7 border border-amber-500/40 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-tr from-amber-500 to-red-600 text-white font-bold text-[10px]">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden text-left leading-tight"
                    >
                      <p className="text-xs font-bold text-white truncate">
                        {user?.firstName || 'Super'} {user?.lastName || 'Admin'}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">{user?.email || 'superadmin@apponext.com'}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {open && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                  className="text-slate-400 hover:text-red-400 hover:bg-red-950/50 h-6 w-6 rounded-md flex-shrink-0"
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

