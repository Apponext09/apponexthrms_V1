import React from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { PayslipRequesterPanel } from '@/features/payroll/components/PayslipRequestSystem';
import { PayslipAdminApprovalPanel } from '@/features/payroll/components/PayslipRequestSystem';

/**
 * Universal Payslip Request Page
 * - Admin/Super Admin → sees Approval Queue
 * - All others (Employee, Manager, Team Lead, HR) → sees Request Form
 * Route this to /employee/apply-payslip, /manager/apply-payslip, /team-lead/apply-payslip, /hr/apply-payslip
 * and also /payroll/payslip-requests (for admin)
 */
export const ApplyPayslipPage: React.FC<{ forceRole?: 'Employee' | 'Manager' | 'Team Lead' | 'HR' | 'admin' }> = ({ forceRole }) => {
  const { user } = useAuthStore();

  const isAdmin = forceRole === 'admin' || user?.roles?.some((r: string) =>
    ['super_admin', 'organization_admin', 'admin'].includes(r.toLowerCase())
  );

  if (isAdmin) {
    return <PayslipAdminApprovalPanel />;
  }

  const u = user as any;
  const name = u?.name || u?.firstName || u?.email || 'User';
  const empId = Number(u?.employeeId || u?.id || 0);
  const role = forceRole || 'Employee';

  return (
    <PayslipRequesterPanel
      employeeName={name}
      employeeId={empId}
      role={role as any}
    />
  );
};

export default ApplyPayslipPage;
