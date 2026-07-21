import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, LogOut, Settings, Lock } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLicensedFeatures } from '@/features/licensing/api/useLicensing';
import { useNavStore } from '@/features/navigation/store/navStore';
import { getVisibleSections } from '@/config/navigation';
import { useRbac } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { roles } = useRbac();
  const { data: licensedFeatures } = useLicensedFeatures();
  const { expandedSections, toggleSection, expandSectionContainingRoute } = useNavStore();

  const [visibleSections, setVisibleSections] = useState<ReturnType<typeof getVisibleSections>>([]);
  const [lockedItemDialogOpen, setLockedItemDialogOpen] = useState(false);
  const [lockedItemName, setLockedItemName] = useState('');

  // Get role-filtered navigation on mount and when roles/features change
  useEffect(() => {
    const sections = getVisibleSections(roles, licensedFeatures);
    setVisibleSections(sections);

    // Auto-expand section containing current route
    expandSectionContainingRoute(location.pathname, sections);
  }, [roles, licensedFeatures, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = (href: string, isLocked?: boolean) => {
    if (isLocked) {
      setLockedItemName(href);
      setLockedItemDialogOpen(true);
      return;
    }
    navigate(href);
    // Don't close sidebar on desktop
  };

  const getInitials = () => {
    return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  };

  // Get icon component by name
  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-5 w-5" /> : <div className="h-5 w-5" />;
  };

  return (
    <>
      <motion.div
        animate={{ width: open ? 280 : 80 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex flex-col h-screen bg-gradient-to-b from-card to-card/95 border-r border-border shadow-soft-md overflow-hidden"
      >
        {/* Logo */}
        <div className="px-4 py-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 justify-center md:justify-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 flex-shrink-0">
              <span className="text-lg font-bold text-primary">A</span>
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
                  <h1 className="font-semibold text-sm text-foreground">ApponextHRMS</h1>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {visibleSections.map((section) => {
            const isActive = section.items.some((item) =>
              location.pathname.startsWith(item.href)
            );
            const isExpanded = expandedSections[section.id] ?? true;

            return (
              <Collapsible
                key={section.id}
                open={isExpanded}
                onOpenChange={() => toggleSection(section.id)}
                className="group"
              >
                {section.items.length > 1 ? (
                  <>
                    <CollapsibleTrigger asChild>
                      <motion.button
                        whileHover={{ x: open ? 4 : 0 }}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-soft-md'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                        title={!open ? section.label : ''}
                      >
                        <span className="text-lg flex-shrink-0">
                          {section.icon ? getIconComponent(section.icon) : ''}
                        </span>
                        <AnimatePresence>
                          {open && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-sm font-medium overflow-hidden flex-1 text-left"
                            >
                              {section.label}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 transition-transform duration-200',
                            isExpanded ? 'rotate-180' : ''
                          )}
                        />
                      </motion.button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="pl-6 space-y-1 mt-1">
                      {section.items.map((item) => {
                        const itemActive = location.pathname === item.href;
                        const isLocked = (item as any).isLocked;

                        return (
                          <motion.button
                            key={item.href}
                            whileHover={{ x: open ? 4 : 0 }}
                            onClick={() => handleNavClick(item.href, isLocked)}
                            title={!open ? item.name : ''}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-all duration-200',
                              itemActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                              isLocked && 'opacity-60'
                            )}
                          >
                            <span className="text-base flex-shrink-0">
                              {getIconComponent(item.icon)}
                            </span>
                            <AnimatePresence>
                              {open && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="flex-1 text-left overflow-hidden flex items-center gap-2"
                                >
                                  <span className="truncate">{item.name}</span>
                                  {item.badge && (
                                    <Badge variant="secondary" className="text-xs ml-auto">
                                      {item.badge}
                                    </Badge>
                                  )}
                                  {isLocked && <Lock className="h-3 w-3 ml-auto flex-shrink-0" />}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.button>
                        );
                      })}
                    </CollapsibleContent>
                  </>
                ) : (
                  // Single item section (no collapse)
                  <motion.button
                    whileHover={{ x: open ? 4 : 0 }}
                    onClick={() =>
                      handleNavClick(section.items[0].href, (section.items[0] as any).isLocked)
                    }
                    title={!open ? section.label : ''}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-soft-md'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span className="text-lg flex-shrink-0">
                      {getIconComponent(section.items[0].icon)}
                    </span>
                    <AnimatePresence>
                      {open && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-sm font-medium overflow-hidden flex-1 text-left"
                        >
                          {section.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                )}
              </Collapsible>
            );
          })}
        </nav>

        {/* User card & Platform Admin */}
        <div className="border-t border-border space-y-3 p-3 flex-shrink-0">
          {/* Platform Admin button (Super Admin only) */}
          {roles.includes('super_admin') && (
            <>
              <Separator />
              <motion.button
                whileHover={{ x: open ? 4 : 0 }}
                onClick={() => navigate('/platform-admin')}
                title={!open ? 'Platform Administration' : ''}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 text-xs',
                  location.pathname.startsWith('/platform-admin')
                    ? 'bg-accent/20 text-accent font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="text-lg flex-shrink-0">
                  <LucideIcons.Shield className="h-5 w-5" />
                </span>
                <AnimatePresence>
                  {open && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="font-medium overflow-hidden"
                    >
                      Platform Admin
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              <Separator />
            </>
          )}

          {/* User profile dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={`https://avatar.example.com/${user?.email}`} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
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
              <DropdownMenuItem onClick={handleLogout} className="text-danger">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Locked Feature Dialog */}
      <Dialog open={lockedItemDialogOpen} onOpenChange={setLockedItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-danger" />
              Feature Not Enabled
            </DialogTitle>
            <DialogDescription>
              This feature is not currently enabled for your organization. Please contact your administrator to enable it or upgrade your subscription.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLockedItemDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
