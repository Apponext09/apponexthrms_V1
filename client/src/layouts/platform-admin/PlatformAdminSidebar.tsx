import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, Menu, LogOut, Settings, CreditCard, Lock, ShoppingBag, Palette, Code, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
      animate={{ width: open ? 280 : 80 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="flex flex-col h-screen bg-gradient-to-b from-accent/10 to-accent/5 border-r border-border shadow-soft-md"
    >
      {/* Logo / Branding */}
      <div className="px-4 py-6 border-b border-border">
        <div className="flex items-center gap-3 justify-center md:justify-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
            <span className="text-lg font-bold text-accent">P</span>
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
                <h1 className="font-semibold text-sm text-foreground">Platform Admin</h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {PLATFORM_MENU.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.href}
              whileHover={{ x: open ? 4 : 0 }}
              onClick={() => navigate(item.href)}
              title={!open ? item.name : ''}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
                isActive
                  ? 'bg-accent text-accent-foreground shadow-soft-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <AnimatePresence>
                {open && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium overflow-hidden"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && open && (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* User Card */}
      <div className="border-t border-border p-3 space-y-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={`https://avatar.example.com/${user?.email}`} />
                <AvatarFallback className="bg-accent/20 text-accent font-semibold">
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
                    className="flex-1 text-left overflow-hidden"
                  >
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard')}>
              Back to HRMS
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-danger">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
