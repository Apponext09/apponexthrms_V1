import React from 'react';
import {
  LayoutDashboard,
  Clock,
  Palmtree,
  FileText,
  TrendingUp,
  Package,
  CheckCircle2,
  LogOut,
  ChevronRight,
  Menu,
  X,
  User,
  Plus,
  BarChart2,
  Layers,
  Target,
  MessageSquare,
  Award,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { toast } from 'sonner';

interface EmployeeSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SubNavItem {
  name: string;
  href: string;
  icon: any;
}

interface EmployeeNavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  color?: string;
  subItems?: SubNavItem[];
}

interface NavSection {
  label: string;
  items: EmployeeNavItem[];
}

export function EmployeeSidebar({ open, onOpenChange }: EmployeeSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const employeeId = user?.employeeId || 0;
  const { employee } = useEmployee(employeeId);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleItemClick = (href: string, name: string) => {
    navigate(href);
  };

  const navSections: NavSection[] = [
    {
      label: 'PORTAL HOME',
      items: [
        {
          name: 'Dashboard',
          href: '/employee/dashboard',
          icon: LayoutDashboard,
          badge: 'Overview',
          color: 'text-violet-500',
        },
      ],
    },
    {
      label: 'TIME & LEAVES',
      items: [
        {
          name: 'My Attendance',
          href: '/attendance/my-attendance',
          icon: Clock,
          color: 'text-emerald-500',
        },
        {
          name: 'My Leaves',
          href: '/leaves',
          icon: Palmtree,
          color: 'text-amber-500',
          subItems: [
            { name: 'Apply Leave', href: '/leaves/apply', icon: Plus },
            { name: 'Leave Balance', href: '/leaves/balance', icon: BarChart2 },
          ]
        },
      ],
    },
    {
      label: 'PAYROLL & FINANCES',
      items: [
        {
          name: 'My Payslips',
          href: '/payroll/payslips',
          icon: FileText,
          color: 'text-blue-500',
          subItems: [
            { name: 'Tax Declaration', href: '/payroll/tax-declaration', icon: Layers },
          ]
        },
      ],
    },
    {
      label: 'MY DEVELOPMENT',
      items: [
        {
          name: 'My Performance',
          href: '/performance/reviews',
          icon: TrendingUp,
          color: 'text-purple-500',
          subItems: [
            { name: 'Goals & OKRs', href: '/performance/goals', icon: Target },
            { name: 'Appraisals', href: '/performance/appraisals', icon: Award },
          ]
        },
        {
          name: 'My Assets',
          href: '/assets/my-assets',
          icon: Package,
          color: 'text-indigo-500',
        },
        {
          name: 'My Approvals',
          href: '/approvals',
          icon: CheckCircle2,
          color: 'text-rose-500',
        },
      ],
    },
  ];

  const userRoles = user?.roles || [];
  const isTeamLead = userRoles.includes('team_lead') || userRoles.includes('reporting_manager') || userRoles.includes('hr_manager') || userRoles.includes('organization_admin');

  const visibleSections = [...navSections];
  if (isTeamLead) {
    visibleSections.push({
      label: 'TEAM WORKSPACE',
      items: [
        {
          name: 'Team Dashboard',
          href: '/team-lead/dashboard',
          icon: Users,
          color: 'text-indigo-500',
        },
      ],
    });
  }

  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`;
  const getInitials = () => {
    return employeeName.split(' ').map(w => w[0]).join('').toUpperCase() || 'EMP';
  };

  return (
    <motion.div
      animate={{ width: open ? 280 : 80 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="flex flex-col h-screen bg-card text-card-foreground border-r border-border shadow-md overflow-hidden select-none"
    >
      {/* Header Logo Banner */}
      <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0 bg-muted/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white font-bold shadow-md flex-shrink-0">
            <User className="h-5 w-5" />
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
                  <h1 className="font-extrabold text-sm tracking-wide text-foreground">Work Desk</h1>
                  <Badge variant="secondary" className="text-[10px] bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 px-1.5 py-0">
                    Employee
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-medium">Self Service Portal</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground h-8 w-8"
          onClick={() => onOpenChange(!open)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {visibleSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
              {open ? section.label : '•••'}
            </div>

            {section.items.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;

              if (hasSubItems && open) {
                return (
                  <Collapsible key={item.href} defaultOpen={isActive} className="space-y-1">
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group',
                          isActive
                            ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 font-semibold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={cn('h-4.5 w-4.5', item.color)} />
                          <span className="text-xs font-semibold">{item.name}</span>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-90 text-muted-foreground" />
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="pl-8 space-y-1">
                      <button
                        onClick={() => handleItemClick(item.href, item.name)}
                        className={cn(
                          'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2',
                          location.pathname === item.href
                            ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200 font-bold'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        Overview
                      </button>
                      {item.subItems?.map((sub) => {
                        const SubIcon = sub.icon;
                        const isSubActive = location.pathname === sub.href;
                        return (
                          <button
                            key={sub.href}
                            onClick={() => handleItemClick(sub.href, sub.name)}
                            className={cn(
                              'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2',
                              isSubActive
                                ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-200 font-bold'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <SubIcon className="h-3.5 w-3.5" />
                            <span>{sub.name}</span>
                          </button>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              return (
                <motion.button
                  key={item.href}
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleItemClick(item.href, item.name)}
                  title={!open ? item.name : ''}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 group relative',
                    isActive
                      ? 'bg-violet-600 text-white shadow-md font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className={cn('h-4.5 w-4.5 flex-shrink-0', isActive ? 'text-white' : item.color)} />

                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 text-left overflow-hidden flex items-center justify-between"
                      >
                        <span className="truncate">{item.name}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
                            {item.badge}
                          </Badge>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Employee User Card Footer */}
      <div className="p-3 border-t border-border space-y-3 bg-muted/20 flex-shrink-0">
        <div className="flex items-center justify-between p-2 rounded-xl border bg-card shadow-sm">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="h-9 w-9 border flex-shrink-0">
              <AvatarImage src={employee?.avatarUrl || `https://avatar.example.com/${user?.email}`} />
              <AvatarFallback className="bg-violet-600 text-white font-bold text-xs">
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
                  <p className="text-xs font-bold text-foreground truncate">{employeeName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email || 'employee@apponext.com'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 h-8 w-8 rounded-lg flex-shrink-0"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
