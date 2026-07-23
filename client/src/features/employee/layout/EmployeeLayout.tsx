import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { EmployeeSidebar } from './EmployeeSidebar';
import { Bell, Search, Sun, Moon, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useEmployee } from '../hooks/useEmployees';

export function EmployeeLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const employeeId = user?.employeeId || 0;
  const { employee } = useEmployee(employeeId);

  const getPageTitle = () => {
    if (location.pathname.includes('/attendance')) return 'My Attendance & Time Log';
    if (location.pathname.includes('/leaves/apply')) return 'Apply Leave Request';
    if (location.pathname.includes('/leaves/balance')) return 'My Leave Balances';
    if (location.pathname.includes('/leaves')) return 'My Leave History';
    if (location.pathname.includes('/payroll/payslips')) return 'My Monthly Payslips';
    if (location.pathname.includes('/payroll/tax-declaration')) return 'Tax & Investment Declarations';
    if (location.pathname.includes('/performance/goals')) return 'Goals & OKR Tracking';
    if (location.pathname.includes('/performance/appraisals')) return 'Performance Appraisals';
    if (location.pathname.includes('/performance')) return 'Performance Reviews & Feedback';
    if (location.pathname.includes('/assets')) return 'My Assigned Company Assets';
    if (location.pathname.includes('/approvals')) return 'Approval Inbox';
    return 'Employee Self Service Portal';
  };

  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : `${user?.firstName || 'Employee'} ${user?.lastName || ''}`;
  const getInitials = () => {
    return employeeName.split(' ').map(w => w[0]).join('').toUpperCase() || 'EMP';
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Dedicated Employee Sidebar */}
      <div className="flex-shrink-0 z-30">
        <EmployeeSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      </div>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Header */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 shadow-sm relative z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-base md:text-lg font-extrabold tracking-tight text-foreground">{getPageTitle()}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications Button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground rounded-xl relative h-9 w-9"
              onClick={() => navigate('/notifications')}
            >
              <Bell className="h-4.5 w-4.5" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-violet-600 animate-ping" />
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-violet-600" />
            </Button>

            {/* Profile Avatar Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-border">
              <Avatar className="h-8 w-8 border">
                <AvatarImage src={employee?.avatarUrl || `https://avatar.example.com/${user?.email}`} />
                <AvatarFallback className="bg-violet-600 text-white font-bold text-xs">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold text-foreground hidden md:inline-block truncate max-w-[120px]">
                {employeeName}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-muted/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
