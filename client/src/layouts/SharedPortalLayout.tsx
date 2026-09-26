import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toast';
import { useThemeStore } from '@/features/settings/store/themeStore';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { NotificationDrawer } from '@/features/notifications/components/NotificationDrawer';
import { GlobalSearch, GlobalSearchButton } from '@/features/search/components/GlobalSearch';
import { useAttendanceStore } from '@/features/attendance';
import { useAttendance } from '@/features/attendance/hooks/useAttendance';
import { useEmployeeLocationTracker } from '@/features/Livetracking';
import { CompanySelector } from './CompanySelector';
import { SectionTabs } from './SectionNavigation';
import { SharedPortalSidebar, type OrganizationPortal } from './SharedPortalSidebar';
import { useMenuAccess } from '@/features/access/useMenuAccess';

function isCheckedInRecord(record: unknown) {
  const value = record as { check_in_time?: string; checkInTime?: string; check_out_time?: string; checkOutTime?: string } | null;
  return !!(value?.check_in_time || value?.checkInTime) && !(value?.check_out_time || value?.checkOutTime);
}

function EmployeeTrackingEffects() {
  const storeIsCheckedIn = useAttendanceStore((state) => state.isCheckedIn);
  const { getTodayRecord } = useAttendance();
  const [serverCheckedIn, setServerCheckedIn] = useState<boolean | null>(null);

  const syncAttendanceStatus = useCallback(async () => {
    const record = await getTodayRecord();
    setServerCheckedIn(isCheckedInRecord(record));
  }, [getTodayRecord]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const record = await getTodayRecord();
      if (cancelled) return;
      setServerCheckedIn(isCheckedInRecord(record));
    })();
    const interval = setInterval(syncAttendanceStatus, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
    // Match the existing employee layout: recheck immediately when local check-in changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeIsCheckedIn]);

  useEmployeeLocationTracker({
    token: localStorage.getItem('accessToken'),
    enabled: serverCheckedIn ?? storeIsCheckedIn,
  });
  return null;
}

function MenuPageGuard() {
  const { pathname, search } = useLocation();
  const { ready, error, retry, access, canAccessPath } = useMenuAccess();
  if (error) return <div role="alert" className="p-6 text-sm text-destructive">Access rules could not be loaded. <Button variant="outline" size="sm" className="ml-2" onClick={retry}>Retry</Button></div>;
  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Loading access rules...</div>;
  const roleTab = new URLSearchParams(search).get('tab');
  const isRoleEditor = ['access-roles', 'roles-responsibility', 'roles-responsibilities'].includes(roleTab ?? '') ||
    /\/(access-roles|roles-responsibility|roles-responsibilities)(?:\/|$)/.test(pathname);
  if (isRoleEditor && !access?.roleCodes.some((code) => ['organization_admin', 'ceo', 'hr', 'hr_admin', 'hr_manager'].includes(code))) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (!canAccessPath(search.includes('tab=') ? `${pathname}${search}` : pathname)) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}

export function SharedPortalLayout({ portal }: { portal: OrganizationPortal }) {
  useNotificationSocket();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const currentTheme = theme === 'system'
    ? (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;

  return <div className="app-shell-reference flex h-dvh overflow-hidden bg-background font-sans text-foreground">
    {portal === 'employee' && <EmployeeTrackingEffects />}
    <div className={`z-30 hidden shrink-0 md:block ${sidebarOpen ? 'w-28' : 'w-[72px]'}`}>
      <SharedPortalSidebar portal={portal} open={sidebarOpen} onNavigate={() => undefined} />
    </div>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="relative z-20 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="hidden md:inline-flex" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
            {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
          </Button>
          <span className="hidden truncate text-base font-extrabold tracking-tight md:inline">APPONEXTHRMS</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <GlobalSearchButton />
          {portal === 'admin' && <CompanySelector />}
          <Button variant="ghost" size="icon" onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')} aria-label={currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            {currentTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <NotificationBell className="size-9 rounded-lg" iconClassName="size-4" />
        </div>
      </header>
      <SectionTabs id={portal} />
      <main className="app-shell-scroll flex-1 overflow-auto p-4 sm:p-6"><MenuPageGuard /></main>
    </div>
    {mobileOpen && <>
      <button type="button" className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
      <div className="fixed inset-y-0 left-0 z-50 w-72 md:hidden">
        <SharedPortalSidebar portal={portal} open onNavigate={() => setMobileOpen(false)} />
      </div>
    </>}
    <GlobalSearch />
    <NotificationDrawer />
    <Toaster position="top-right" />
  </div>;
}
