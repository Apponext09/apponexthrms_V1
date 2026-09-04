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
  User,
  Plus,
  Target,
  MessageSquare,
  Award,
  CreditCard,
  Calendar,
  ReceiptIndianRupee,
  Compass,
  Briefcase,
  BookOpen,
  Shield,
  Megaphone,
  Activity,
  Bot,
  Settings,
  Folder,
  RefreshCw,
  Users,
  Camera,
  Percent,
  UserX,
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
import { PortalSidebarBrand } from '@/layouts/PortalSidebarBrand';

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
      label: 'EMPLOYEE CORE',
      items: [
        {
          name: 'My profile',
          href: '/employee/profile',
          icon: User,
          color: 'text-indigo-500',
        },
        {
          name: 'My Lifecycle',
          href: '/employee/lifecycle',
          icon: RefreshCw,
          color: 'text-sky-500',
        },
        {
          name: 'Digital ID Card',
          href: '/employee/id-card',
          icon: Shield,
          color: 'text-emerald-500',
        },
      ],
    },
    {
      label: 'ATTENDANCE',
      items: [
        {
          name: 'Face Punch',
          href: '/employee/face-attendance',
          icon: Camera,
          color: 'text-sky-500',
          badge: 'Live Scan',
        },
        {
          name: 'Attendance Logs',
          href: '/employee/attendance',
          icon: Clock,
          color: 'text-emerald-500',
        },
        {
          name: 'Attendance Correction',
          href: '/employee/attendance-regularization',
          icon: RefreshCw,
          color: 'text-rose-500',
        },
        {
          name: 'My shifts',
          href: '/employee/shift-roster',
          icon: Calendar,
          color: 'text-cyan-500',
        },
      ],
    },
    {
      label: 'LEAVES',
      items: [
        {
          name: 'My Leaves',
          href: '/employee/leaves',
          icon: Palmtree,
          color: 'text-amber-500',
        },
        {
          name: 'Holiday Calendar',
          href: '/employee/holiday-calendar',
          icon: Calendar,
          color: 'text-violet-500',
        },
      ],
    },
    {
      label: 'PAYROLL',
      items: [
        {
          name: 'My Payslips',
          href: '/employee/payslips',
          icon: FileText,
          color: 'text-violet-500',
        },
        {
          name: 'Salary Revisions',
          href: '/employee/salary-revisions',
          icon: TrendingUp,
          color: 'text-blue-500',
        },
        {
          name: 'My exit Settlement',
          href: '/employee/my-settlement',
          icon: UserX,
          color: 'text-purple-500',
        },
      ],
    },
    {
      label: 'LOAN MANAGEMENT',
      items: [
        {
          name: 'Loan Request',
          href: '/employee/loans',
          icon: CreditCard,
          color: 'text-emerald-500',
        },
      ],
    },
    {
      label: 'EXPENSE MANAGEMENT',
      items: [
        {
          name: 'My Expenses',
          href: '/employee/my-expenses',
          icon: ReceiptIndianRupee,
          color: 'text-amber-500',
        },
        {
          name: 'Travel Requests',
          href: '/employee/travel-requests',
          icon: Compass,
          color: 'text-rose-500',
        },
        {
          name: 'Travel Advances',
          href: '/employee/travel-advances',
          icon: CreditCard,
          color: 'text-emerald-500',
        },
        {
          name: 'Mileage Claims',
          href: '/employee/mileage-claims',
          icon: Activity,
          color: 'text-purple-500',
        },
      ],
    },
    {
      label: 'DEVELOPMENT & ENGAGEMENT',
      items: [
        {
          name: 'Performance reviews',
          href: '/employee/performance',
          icon: TrendingUp,
          color: 'text-purple-500',
        },
        {
          name: 'Goals Checklist',
          href: '/employee/goals',
          icon: Target,
          color: 'text-indigo-500',
        },
        {
          name: 'Feedback Hub',
          href: '/employee/feedback',
          icon: MessageSquare,
          color: 'text-emerald-500',
        },
        {
          name: 'Learning (LMS)',
          href: '/employee/learning',
          icon: BookOpen,
          color: 'text-violet-500',
        },
        {
          name: 'Training workshops',
          href: '/employee/training',
          icon: Award,
          color: 'text-amber-500',
        },
        {
          name: 'Company Policies',
          href: '/employee/policies',
          icon: Shield,
          color: 'text-slate-500',
        },
        {
          name: 'Announcements',
          href: '/employee/announcements',
          icon: Megaphone,
          color: 'text-rose-500',
        },
        {
          name: 'Feedback Surveys',
          href: '/employee/surveys',
          icon: FileText,
          color: 'text-blue-500',
        },
        {
          name: 'Employee Referrals',
          href: '/employee/referrals',
          icon: Plus,
          color: 'text-emerald-500',
        },
        {
          name: 'Internal Job Openings',
          href: '/employee/job-openings',
          icon: Briefcase,
          color: 'text-indigo-500',
        },
        {
          name: 'Health & Wellness',
          href: '/employee/health-wellness',
          icon: Activity,
          color: 'text-rose-500',
        },
        {
          name: 'Assigned Assets',
          href: '/employee/assets',
          icon: Package,
          color: 'text-slate-500',
        },
        {
          name: 'My Documents',
          href: '/employee/documents',
          icon: Folder,
          color: 'text-cyan-500',
        },
      ],
    },
    {
      label: 'RECRUITMENT',
      items: [
        {
          name: 'Assigned Interviews',
          href: '/employee/interview-schedule',
          icon: Calendar,
          color: 'text-indigo-500',
        },
        {
          name: 'Interviewer Ratings',
          href: '/employee/interviewer-rating',
          icon: Award,
          color: 'text-amber-500',
        },
        {
          name: 'Employee Referrals',
          href: '/employee/referrals',
          icon: Plus,
          color: 'text-emerald-500',
        },
      ],
    },
    {
      label: 'TOOLS & SUPPORT',
      items: [
        {
          name: 'Helpdesk Tickets',
          href: '/employee/helpdesk',
          icon: MessageSquare,
          color: 'text-amber-500',
        },
        {
          name: 'AI HR Assistant',
          href: '/employee/ai-assistant',
          icon: Bot,
          color: 'text-violet-500',
        },
        {
          name: 'My Approvals',
          href: '/employee/approvals',
          icon: CheckCircle2,
          color: 'text-emerald-500',
        },
        {
          name: 'Settings & Security',
          href: '/employee/settings',
          icon: Settings,
          color: 'text-slate-500',
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
        {
          name: 'Team Payroll',
          href: '/payroll/processing',
          icon: CreditCard,
          color: 'text-emerald-500',
        },
        {
          name: 'Team Loans',
          href: '/payroll/loans',
          icon: Percent,
          color: 'text-amber-500',
        },
        {
          name: 'Team Payslips',
          href: '/payroll/payslips',
          icon: FileText,
          color: 'text-blue-500',
        },
      ],
    });
  }

  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {
      'EMPLOYEE CORE': true,
      'ATTENDANCE': true,
      'LEAVES': false,
      'PAYROLL': false,
      'LOAN MANAGEMENT': false,
      'EXPENSE MANAGEMENT': false,
      'TRAVEL MANAGEMENT': false,
      'DEVELOPMENT & ENGAGEMENT': false,
      'RECRUITMENT': false,
      'TOOLS & SUPPORT': false,
      'TEAM WORKSPACE': false,
    };
    for (const section of visibleSections) {
      const hasActive = section.items.some(item =>
        location.pathname === item.href || location.pathname.startsWith(item.href + '/')
      );
      if (hasActive) {
        defaults[section.label] = true;
      }
    }
    return defaults;
  });

  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`;
  const getInitials = () => {
    return employeeName.split(' ').map(w => w[0]).join('').toUpperCase() || 'EMP';
  };

  const isDashboardActive = location.pathname === '/employee/dashboard';

  return (
    <aside className={cn('role-portal-sidebar flex h-dvh flex-col overflow-hidden border-r border-border bg-card text-card-foreground select-none', open ? 'w-64' : 'w-[72px]')}>
      {/* Header Logo Banner */}
      <PortalSidebarBrand open={open} portalLabel="Employee Self Service" />

      {/* Navigation List */}
      <nav className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {/* SEPARATE STANDALONE DASHBOARD LINK */}
        <div className="pb-1">
          <button
            onClick={() => handleItemClick('/employee/dashboard', 'Dashboard')}
            title={!open ? 'Dashboard' : ''}
            className={cn(
              'group relative flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold transition-all',
              !open && 'justify-center px-2',
              isDashboardActive
                ? 'portal-sidebar-active font-extrabold text-white dark:text-slate-950 shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <LayoutDashboard className={cn('size-4 flex-shrink-0', isDashboardActive ? 'text-white dark:text-slate-950' : 'text-violet-500')} />

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 text-left overflow-hidden"
                >
                  <span className="truncate">Dashboard</span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {visibleSections.map((section, idx) => {
          const isExpanded = !open || !!expandedSections[section.label];
          return (
            <div key={idx} className="space-y-1 pt-1">
              {open ? (
                <button
                  type="button"
                  onClick={() => {
                    setExpandedSections((prev: Record<string, boolean>) => ({
                      ...prev,
                      [section.label]: !prev[section.label]
                    }));
                  }}
                  className="group flex w-full items-center justify-between px-3 py-1 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground tracking-wider"
                >
                  <span>{section.label}</span>
                  <ChevronRight className={cn(
                    "h-3 w-3 text-muted-foreground/60 transition-transform duration-200 group-hover:text-foreground",
                    isExpanded ? "rotate-90" : ""
                  )} />
                </button>
              ) : (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 text-center">
                  •••
                </div>
              )}

              {isExpanded && (
                <div className="space-y-1 mt-1">
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
                                'group flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors',
                                isActive
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Icon className="size-4 flex-shrink-0" />
                                <span className="text-xs font-semibold">{item.name}</span>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-90 text-muted-foreground" />
                            </button>
                          </CollapsibleTrigger>

                          <CollapsibleContent className="ml-3 space-y-1 border-l border-border pl-3">
                            {item.subItems?.map((sub) => {
                              const SubIcon = sub.icon;
                              const isSubActive = location.pathname === sub.href;
                              return (
                                <button
                                  key={sub.href}
                                  onClick={() => handleItemClick(sub.href, sub.name)}
                                  className={cn(
                                    'flex min-h-9 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors',
                                    isSubActive
                                      ? 'portal-sidebar-active font-bold text-white dark:text-slate-950'
                                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                  )}
                                >
                                  <SubIcon className="size-3.5 flex-shrink-0" />
                                  <span>{sub.name}</span>
                                </button>
                              );
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    }

                    return (
                      <button
                        key={item.name + item.href}
                        onClick={() => handleItemClick(item.href, item.name)}
                        title={!open ? item.name : ''}
                        className={cn(
                          'group relative flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                          !open && 'justify-center px-2',
                          isActive
                            ? 'portal-sidebar-active font-semibold text-white dark:text-slate-950'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <Icon className={cn('size-4 flex-shrink-0', isActive ? 'text-white dark:text-slate-950' : 'text-muted-foreground')} />

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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Employee User Card Footer */}
      <div className="flex-shrink-0 border-t border-border bg-card p-3">
        <div className={cn('flex min-h-14 items-center rounded-xl border border-border bg-card p-2.5', open ? 'justify-between' : 'justify-center')}>
          <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
            <Avatar className="size-9 flex-shrink-0 border border-primary/30 shadow-soft-xs">
              <AvatarImage src={employee?.avatarUrl || user?.avatarUrl} />
              <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
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

          {open && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="size-7 flex-shrink-0 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
              title="Logout"
              aria-label="Log out"
            >
              <LogOut className="size-3.5" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
