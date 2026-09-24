import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { PlatformAdminSidebar } from './PlatformAdminSidebar';
import { PlatformAdminTopbar } from './PlatformAdminTopbar';
import { Toaster } from '@/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';

export function PlatformAdminShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <PlatformAdminSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <PlatformAdminTopbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster position="top-right" />
    </div>
  );
}
