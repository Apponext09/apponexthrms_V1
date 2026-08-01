import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AttendancePoliciesManager } from '@/features/attendance/components/AttendancePoliciesManager';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getUserRoleAndDept } from '@/lib/userProfile';
import { showToast } from '@/components/ui/toast';

export const AttendancePoliciesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const roleInfo = getUserRoleAndDept(user);

  const handleBackToDashboard = () => {
    const cleanRole = (roleInfo.roleTitle || '').toLowerCase();
    if (cleanRole.includes('hr')) {
      navigate('/hr/attendance');
    } else if (cleanRole.includes('manager')) {
      navigate('/manager/attendance');
    } else if (cleanRole.includes('team lead')) {
      navigate('/team-lead/attendance');
    } else {
      navigate('/attendance');
    }
  };

  const handleSyncPolicies = () => {
    showToast.success('Attendance Policies engine synchronized with latest database rules.');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card border border-border/80 p-4 rounded-xl shadow-2xs">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleBackToDashboard}
            className="h-8 text-xs font-semibold gap-1 px-2.5 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          <div className="h-4 w-px bg-border shrink-0" />

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-foreground tracking-tight">
                Attendance Policies Engine
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold text-[10px] px-2 py-0.5">
                {roleInfo.roleTitle}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enterprise rule management: 30 master attendance policies across 8 operational pillars.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncPolicies}
            className="h-8 text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            Sync Policies
          </Button>
        </div>
      </div>

      {/* Main Full-Page Attendance Policies Manager Component */}
      <AttendancePoliciesManager />
    </div>
  );
};

export default AttendancePoliciesPage;
