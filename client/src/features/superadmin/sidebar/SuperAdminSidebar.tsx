import {
  LayoutDashboard,
  Building2,
  CreditCard,
  HelpCircle,
  LogOut,
  ShieldAlert,
  ChevronRight,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
      animate={{ width: open ? 280 : 80 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="flex flex-col h-screen bg-slate-900 text-slate-100 border-r border-slate-800 shadow-2xl overflow-hidden select-none"
    >
      {/* Header Logo Banner */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-950/60">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 text-white font-bold shadow-lg flex-shrink-0">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <div className="flex items-center gap-1.5">
                  <h1 className="font-extrabold text-base tracking-wide text-white">Apponext</h1>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30 px-1.5 py-0">
                    SuperAdmin
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 font-medium">Platform Administration</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-slate-800 h-8 w-8"
          onClick={() => onOpenChange(!open)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {open ? 'Main Controls' : '•••'}
        </div>

        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <motion.button
              key={item.href}
              whileHover={{ scale: 1.02, x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(item.href)}
              title={!open ? item.name : ''}
              className={cn(
                'w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group relative',
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-red-500/10 text-white border border-amber-500/30 shadow-lg shadow-amber-500/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg transition-colors flex-shrink-0',
                  isActive
                    ? 'bg-gradient-to-tr from-amber-500 to-red-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 group-hover:text-white'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 text-left overflow-hidden flex items-center justify-between"
                  >
                    <span className="font-semibold text-sm truncate">{item.name}</span>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 transition-transform opacity-0 group-hover:opacity-100',
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
      <div className="p-3 border-t border-slate-800 space-y-3 bg-slate-950/40 flex-shrink-0">
        {(() => {
          const isProfileActive = location.pathname.startsWith('/superadmin/profile');
          return (
            <div
              onClick={() => navigate('/superadmin/profile')}
              className={cn(
                'flex items-center justify-between p-2 rounded-xl border cursor-pointer transition',
                isProfileActive
                  ? 'bg-amber-500/20 border-amber-500/40 text-white shadow-md shadow-amber-500/10'
                  : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
              )}
              title="Click to view SuperAdmin Profile"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <Avatar className="h-9 w-9 border-2 border-amber-500/40 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-tr from-amber-500 to-red-600 text-white font-bold text-xs">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden text-left"
                    >
                      <p className="text-xs font-bold text-white truncate">
                        {user?.firstName || 'Super'} {user?.lastName || 'Admin'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{user?.email || 'superadmin@apponext.com'}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
                className="text-slate-400 hover:text-red-400 hover:bg-red-950/50 h-8 w-8 rounded-lg flex-shrink-0"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          );
        })()}
      </div>
    </motion.div>
  );
}
