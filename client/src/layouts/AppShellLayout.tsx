import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalSearch } from '@/features/search/components/GlobalSearch';
import { Toaster } from '@/components/ui/toast';
import { useNotificationSocket } from '@/features/notifications/hooks/useNotificationSocket';

export function AppShellLayout() {
  useNotificationSocket();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="app-shell-reference flex h-dvh overflow-hidden bg-background">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden flex-shrink-0 md:flex">
        <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />

        {/* Content area */}
        <main className="app-shell-scroll flex-1 overflow-auto">
          <div className="app-shell-content p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global Search */}
      <GlobalSearch />

      {/* Toast notifications */}
      <Toaster position="bottom-right" />
    </div>
  );
}
