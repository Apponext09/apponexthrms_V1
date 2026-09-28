import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useMenuAccess } from '@/features/access/useMenuAccess';
import { SectionRail, type SectionGroup } from './SectionNavigation';
import { Sidebar } from './Sidebar';
import { EmployeeSidebar } from '@/features/employee/layout/EmployeeSidebar';
import { buildCompleteAccessModules, orderAccessModules } from '@/features/settings/components/roleAccessTabs';
import type { RoleMenuItem } from '@/features/settings/components/roleMenuSelection';
import { PortalSidebarBrand } from './PortalSidebarBrand';
import { SidebarProfileMenu } from './SidebarProfileMenu';

export type OrganizationPortal = 'admin' | 'hr' | 'manager' | 'team_lead' | 'employee' | 'intern' | 'consultant' | 'finance';

export function buildGrantedNavigationGroups(items: RoleMenuItem[], paths: string[], portal: OrganizationPortal, moduleOrder: string[] = []): SectionGroup[] {
  const allowed = new Set(paths);
  return orderAccessModules(buildCompleteAccessModules(items), moduleOrder).map((module) => ({
    label: module.label, icon: module.icon,
    items: module.tabs.flatMap((tab) => {
      const granted = tab.menus.filter((item) => item.route && !/[:*]/.test(item.route) && allowed.has(item.route));
      const menu = granted.find((item) => item.portal === portal) ?? granted[0];
      return menu ? [{ name: tab.label, href: menu.route!, icon: tab.icon }] : [];
    }),
  })).filter((module) => module.items.length > 0);
}

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

function OriginalNavigation({ portal, open, onNavigate, navigationGroups }: { portal: OrganizationPortal; open: boolean; onNavigate: () => void; navigationGroups: SectionGroup[] }) {
  return <SectionRail id={portal} groups={navigationGroups} open={open} onNavigate={onNavigate} />;
}

function OtherPortalSidebar({ portal, open, onNavigate, navigationGroups }: { portal: OrganizationPortal; open: boolean; onNavigate: () => void; navigationGroups: SectionGroup[] }) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const meta = PORTAL_META[portal];
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'US';
  const profileImage = user as (typeof user & { avatar?: string; profile_picture?: string }) | null;
  return <div className="role-portal-sidebar flex h-full flex-col overflow-hidden border-r border-border bg-white text-foreground dark:bg-slate-950">
    <PortalSidebarBrand open={false} portalLabel={meta.label} />
    <OriginalNavigation portal={portal} open={open} onNavigate={onNavigate} navigationGroups={navigationGroups} />
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
  const { catalog, access } = useMenuAccess();
  const navigationGroups = useMemo<SectionGroup[]>(() => buildGrantedNavigationGroups(catalog.map((item) => ({
    id: item.id, code: item.code, label: item.label, parentId: item.parentId, portal: item.portal, route: item.path ?? item.route,
  })), access?.paths ?? [], (access?.primaryPortal as OrganizationPortal | undefined) ?? portal, access?.moduleOrder ?? []), [catalog, access?.primaryPortal, access?.paths, access?.moduleOrder, portal]);
  if (portal === 'admin') return <Sidebar open={open} onOpenChange={() => undefined} onNavigate={onNavigate} navigationGroups={navigationGroups} />;
  if (portal === 'employee') return <EmployeeSidebar open={open} onOpenChange={onNavigate} navigationGroups={navigationGroups} />;
  return <OtherPortalSidebar portal={portal} open={open} onNavigate={onNavigate} navigationGroups={navigationGroups} />;
}
