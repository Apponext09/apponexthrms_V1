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
  Building2,
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
  GraduationCap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useSubscriptionStore } from '@/features/subscriptions/store/subscriptionStore';
import { useEmployee } from '../hooks/useEmployees';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { PortalSidebarBrand } from '@/layouts/PortalSidebarBrand';

export interface EmployeeSidebarProps {
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
  subscriptionModule?: string | null;
  items: EmployeeNavItem[];
}

export function EmployeeSidebar({ open, onOpenChange }: EmployeeSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { hasModule, isGatingEnabled } = useSubscriptionStore();

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
      subscriptionModule: 'Core HR & Directory',
      items: [
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
        {
          name: 'Org Structure',
          href: '/employee/org-chart',
          icon: Building2,
          color: 'text-violet-500',
        },
      ],
    },
    {
      label: 'ATTENDANCE',
      subscriptionModule: 'Attendance & Time Tracking',
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
      subscriptionModule: 'Leave Management & Approvals',
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
      subscriptionModule: 'Automated Payroll Processing',
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
      subscriptionModule: 'Automated Payroll Processing',
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
      subscriptionModule: 'Expense Management',
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
      label: 'LEARNING & ACADEMY (LMS)',
      subscriptionModule: 'Learning Management System',
      items: [
        {
          name: 'My Learning Hub',
          href: '/employee/lms/my-learning',
          icon: GraduationCap,
          color: 'text-indigo-500',
        },
        {
          name: 'Course Catalog',
          href: '/employee/lms/catalog',
          icon: BookOpen,
          color: 'text-sky-500',
        },
        {
          name: 'My Certificates',
          href: '/employee/lms/certificates',
          icon: Award,
          color: 'text-amber-500',
        },
      ],
    },
    {
      label: 'DEVELOPMENT & ENGAGEMENT',
      subscriptionModule: 'Performance & OKRs',
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
      label: 'CAREER & OPENINGS',
      subscriptionModule: 'Recruitment & ATS',
      items: [
        {
          name: 'Internal Job Openings',
          href: '/employee/job-openings',
          icon: Briefcase,
          color: 'text-indigo-500',
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
      subscriptionModule: null,
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
          color: 'text-purple-500',
        },
      ],
    },
  ];

  const visibleNavSections = navSections.filter(sec => {
    if (!isGatingEnabled || !sec.subscriptionModule) return true;
    return hasModule(sec.subscriptionModule);
  });

  const employeeName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`;

  const employeeDesignation =
    (typeof employee?.designation === 'object' ? (employee?.designation as any)?.name : employee?.designation) ||
    user?.designation ||
    'Team Member';
  const employeeAvatar = employee?.avatarUrl || user?.avatarUrl;

  const getInitials = () => {
    if (employee) {
      return `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase() || 'E';
    }
    return `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'E';
  };

  return (
    <aside
      className={cn(
        'portal-sidebar h-dvh flex flex-col justify-between border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 select-none overflow-hidden',
        open ? 'w-64' : 'w-20'
      )}
    >
      <div className="flex flex-col flex-1 min-h-0">
        {/* Brand Header */}
        <PortalSidebarBrand open={open} portalLabel="Employee Self Service" />

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 no-scrollbar">
          {visibleNavSections.map((section, secIdx) => {
            return (
              <div key={section.label || secIdx} className="space-y-1">
                {open && section.label && (
                  <p className="px-3 text-[10px] font-bold text-muted-foreground/60 tracking-wider uppercase">
                    {section.label}
                  </p>
                )}
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;

                  return (
                    <button
                      key={item.href}
                      onClick={() => handleItemClick(item.href, item.name)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group relative',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                        !open && 'justify-center px-0'
                      )}
                      title={!open ? item.name : undefined}
                    >
                      <Icon className={cn('size-4 shrink-0 transition-transform group-hover:scale-110', isActive ? 'text-primary-foreground' : item.color || 'text-muted-foreground')} />
                      {open && <span className="truncate">{item.name}</span>}
                      {open && item.badge && (
                        <Badge variant="secondary" className="ml-auto text-[9px] px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/10">
        <div className={cn('flex items-center gap-3', !open && 'justify-center')}>
          <Avatar className="size-9 shrink-0 border border-primary/20">
            <AvatarImage src={employeeAvatar} />
            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          {open && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate text-foreground">{employeeName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{employeeDesignation}</p>
            </div>
          )}
          {open && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="size-8 text-muted-foreground hover:text-destructive shrink-0"
              title="Logout"
            >
              <LogOut className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
