import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useRbac } from '@/lib/rbac';
import { useLicensedFeatures } from '@/features/licensing/api/useLicensing';
import { useAttendanceModuleSettings } from '@/features/attendance/hooks/useAttendanceModuleSettings';
import { useSubscriptionStore } from '@/features/subscriptions/store/subscriptionStore';
import { getVisibleSections } from '@/config/navigation';
import { SectionRail, type SectionGroup } from './SectionNavigation';
import { Sidebar, ICON_REGISTRY } from './Sidebar';
import { mapToHRHref } from './HRLayout';
import { MANAGER_NAV } from './ManagerLayout';
import { TEAM_LEAD_NAV } from './TeamLeadLayout';
import { FINANCE_NAV } from './FinanceSidebar';
import { INTERN_NAV } from './InternSidebar';
import { CONSULTANT_NAV } from './ConsultantSidebar';
import { EmployeeSidebar } from '@/features/employee/layout/EmployeeSidebar';
import { PortalSidebarBrand } from './PortalSidebarBrand';
import { SidebarProfileMenu } from './SidebarProfileMenu';

export type OrganizationPortal = 'admin' | 'hr' | 'manager' | 'team_lead' | 'employee' | 'intern' | 'consultant' | 'finance';

const PORTAL_META: Record<OrganizationPortal, { label: string; profile: string }> = {
  admin: { label: 'Admin Portal', profile: '/settings/company-profile' },
  hr: { label: 'HR Portal', profile: '/hr/profile' },
  manager: { label: 'Manager Portal', profile: '/manager/profile' },
  team_lead: { label: 'Team Lead Portal', profile: '/team-lead/profile' },
  employee: { label: 'Employee Portal', profile: '/employee/profile' },
  intern: { label: 'Intern Portal', profile: '/intern/profile' },
  consultant: { label: 'Consultant Portal', profile: '/consultant/profile' },
  finance: { label: 'Finance Portal', profile: '/finance/profile' },
};

function OriginalNavigation({ portal, open, onNavigate }: { portal: OrganizationPortal; open: boolean; onNavigate: () => void }) {
  const { roles } = useRbac();
  const { data: licensedFeatures } = useLicensedFeatures();
  const { attendanceMode, liveTrackingEnabled } = useAttendanceModuleSettings();
  const { enabledModules } = useSubscriptionStore();
  const sections = getVisibleSections([...roles, 'organization_admin', 'hr'], licensedFeatures, attendanceMode, liveTrackingEnabled, enabledModules);
  const hrGroups: SectionGroup[] = sections.map((section) => ({
    label: section.label,
    icon: ICON_REGISTRY[section.icon || section.items[0]?.icon] || LayoutDashboard,
    items: section.items.map((item) => ({
      name: item.name, href: mapToHRHref(item.href), icon: ICON_REGISTRY[item.icon] || LayoutDashboard,
      children: item.children?.map((child) => ({ name: child.name, href: mapToHRHref(child.href), icon: ICON_REGISTRY[child.icon] || LayoutDashboard })),
    })),
  }));
  const groups: SectionGroup[] = portal === 'hr' ? hrGroups
    : portal === 'manager' ? MANAGER_NAV as SectionGroup[]
    : portal === 'team_lead' ? TEAM_LEAD_NAV as SectionGroup[]
    : portal === 'finance' ? FINANCE_NAV as SectionGroup[]
    : portal === 'intern' ? INTERN_NAV as SectionGroup[]
    : CONSULTANT_NAV as SectionGroup[];
  return <SectionRail id={portal} groups={groups} open={open} onNavigate={onNavigate} />;
}

function OtherPortalSidebar({ portal, open, onNavigate }: { portal: OrganizationPortal; open: boolean; onNavigate: () => void }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const meta = PORTAL_META[portal];
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'US';
  const profileImage = user as (typeof user & { avatar?: string; profile_picture?: string }) | null;
  return <div className="role-portal-sidebar flex h-full flex-col overflow-hidden border-r border-border bg-white text-foreground dark:bg-slate-950">
    <PortalSidebarBrand open={false} portalLabel={meta.label} />
    <OriginalNavigation portal={portal} open={open} onNavigate={onNavigate} />
    <div className="border-t border-border bg-white p-2 dark:bg-slate-950">
      <SidebarProfileMenu profilePath={meta.profile} onLogout={() => { logout(); navigate('/login'); }} onProfileNavigate={onNavigate}>
        <div className="flex cursor-pointer flex-col items-center justify-center" title={`View ${meta.label} profile`}>
          <Avatar className="size-10 border border-primary/30 bg-primary">
            <AvatarImage src={user?.avatarUrl || profileImage?.avatar || profileImage?.profile_picture} alt="Profile" />
            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <span className="mt-1 max-w-[68px] truncate text-center text-[8.5px] font-bold text-primary">{meta.label}</span>
        </div>
      </SidebarProfileMenu>
    </div>
  </div>;
}

export function SharedPortalSidebar({ portal, open, onNavigate }: { portal: OrganizationPortal; open: boolean; onNavigate: () => void }) {
  if (portal === 'admin') return <Sidebar open={open} onOpenChange={() => undefined} onNavigate={onNavigate} />;
  if (portal === 'employee') return <EmployeeSidebar open={open} onOpenChange={onNavigate} />;
  return <OtherPortalSidebar portal={portal} open={open} onNavigate={onNavigate} />;
}
