import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useAuthHydrated, hasStoredAccessToken } from './features/auth/store/authStore';

<<<<<<< HEAD
// ── Lazy Loaded Page Components ──────────────────────────────────────────
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ApprovalsDashboardPage = lazy(() => import('./features/leaves/pages/ApprovalsDashboardPage').then(m => ({ default: m.ApprovalsDashboardPage })));
const EmployeeListPage = lazy(() => import('./features/employee/pages/EmployeeListPage').then(m => ({ default: m.EmployeeListPage })));
const EmployeeProfilePage = lazy(() => import('./features/employee/pages/EmployeeProfilePage').then(m => ({ default: m.EmployeeProfilePage })));
const EmployeeEditPage = lazy(() => import('./features/employee/pages/EmployeeEditPage').then(m => ({ default: m.EmployeeEditPage })));
const OnboardingDashboardPage = lazy(() => import('./features/employee/pages/OnboardingDashboardPage').then(m => ({ default: m.OnboardingDashboardPage })));
const EmployeeDashboardPage = lazy(() => import('./features/employee/Dashboard/EmployeeDashboardPage').then(m => ({ default: m.EmployeeDashboardPage })));
const OrgStructurePage = lazy(() => import('./features/org-structure/pages/OrgStructurePage').then(m => ({ default: m.OrgStructurePage })));
const EmployeeLifecyclePage = lazy(() => import('./features/HR/EmployeeLifecycle/EmployeeLifecyclePage'));
const MyLifecyclePage = lazy(() => import('./features/employee/pages/MyLifecyclePage').then(m => ({ default: m.MyLifecyclePage })));
const AttendanceDashboard = lazy(() => import('./features/attendance/pages/AttendanceDashboard').then(m => ({ default: m.AttendanceDashboard })));
const AttendancePoliciesPage = lazy(() => import('./features/attendance/pages/AttendancePoliciesPage').then(m => ({ default: m.AttendancePoliciesPage })));
const LocationManagementPage = lazy(() => import('./features/attendance/pages/LocationManagementPage').then(m => ({ default: m.LocationManagementPage })));
const HRAttendanceLocationPage = lazy(() => import('./features/HR/Attendance').then(m => ({ default: m.HRAttendanceLocationPage })));
const ShiftManagementPage = lazy(() => import('./features/attendance/pages/ShiftManagementPage').then(m => ({ default: m.ShiftManagementPage })));
const BreakLogsPage = lazy(() => import('./features/attendance/pages/BreakLogsPage').then(m => ({ default: m.BreakLogsPage })));
const ManagerHRRegularizationApprovals = lazy(() => import('./features/attendance/components/ManagerHRRegularizationApprovals').then(m => ({ default: m.ManagerHRRegularizationApprovals })));
const AdminRegularizationLogsPage = lazy(() => import('./features/attendance/pages/AdminRegularizationLogsPage'));
const CeoFacePunchPage = lazy(() => import('./features/attendance/pages/CeoFacePunchPage'));
const LiveTrackingDashboardPage = lazy(() => import('./features/Livetracking').then(m => ({ default: m.LiveTrackingDashboardPage })));
const TrackingHistoryPage = lazy(() => import('./features/Livetracking').then(m => ({ default: m.TrackingHistoryPage })));
const MyLeavesPage = lazy(() => import('./features/leaves/pages/MyLeavesPage').then(m => ({ default: m.MyLeavesPage })));
const ApplyLeavePage = lazy(() => import('./features/leaves/pages/ApplyLeavePage').then(m => ({ default: m.ApplyLeavePage })));
const LeaveBalancePage = lazy(() => import('./features/leaves/pages/LeaveBalancePage').then(m => ({ default: m.LeaveBalancePage })));
const LeaveEncashmentPage = lazy(() => import('./features/leaves/pages/LeaveEncashmentPage').then(m => ({ default: m.LeaveEncashmentPage })));
const ApprovalInboxPage = lazy(() => import('./features/leaves/pages/ApprovalInboxPage').then(m => ({ default: m.ApprovalInboxPage })));
const CustomReportBuilder = lazy(() => import('./features/leaves/pages/CustomReportBuilder').then(m => ({ default: m.CustomReportBuilder })));
const BurnoutRiskDashboard = lazy(() => import('./features/hr/pages/BurnoutRiskDashboard').then(m => ({ default: m.BurnoutRiskDashboard })));
const EmployeeRequestsPage = lazy(() => import('./features/HR/requests/EmployeeRequestsPage').then(m => ({ default: m.EmployeeRequestsPage })));
const PayrollDashboard = lazy(() => import('./features/payroll/pages/PayrollDashboard').then(m => ({ default: m.PayrollDashboard })));
const PayslipViewer = lazy(() => import('./features/payroll/pages/PayslipViewer').then(m => ({ default: m.PayslipViewer })));
const SalaryStructureManagement = lazy(() => import('./features/payroll/pages/SalaryStructureManagement').then(m => ({ default: m.SalaryStructureManagement })));
const PayrollSettingsPage = lazy(() => import('./features/payroll/pages/PayrollSettingsPage').then(m => ({ default: m.PayrollSettingsPage })));
const TaxDeclaration = lazy(() => import('./features/payroll/pages/TaxDeclaration').then(m => ({ default: m.TaxDeclaration })));
const PayrollProcessing = lazy(() => import('./features/payroll/pages/PayrollProcessing').then(m => ({ default: m.PayrollProcessing })));
const SalaryRevisionManagement = lazy(() => import('./features/payroll/pages/SalaryRevisionManagement').then(m => ({ default: m.SalaryRevisionManagement })));
const LoanManagement = lazy(() => import('./features/payroll/pages/LoanManagement').then(m => ({ default: m.LoanManagement })));
const FullFinalSettlement = lazy(() => import('./features/payroll/pages/FullFinalSettlement').then(m => ({ default: m.FullFinalSettlement })));
const GratuityPolicyPage = lazy(() => import('./features/payroll/pages/GratuityPolicyPage').then(m => ({ default: m.GratuityPolicyPage })));
const PayrollReportsPage = lazy(() => import('./features/payroll/pages/PayrollReportsPage').then(m => ({ default: m.PayrollReportsPage })));
const PayrollPoliciesPage = lazy(() => import('./features/payroll/pages/PayrollPoliciesPage').then(m => ({ default: m.PayrollPoliciesPage })));
const MySettlementPage = lazy(() => import('./features/payroll/pages/MySettlementPage').then(m => ({ default: m.MySettlementPage })));
const TeamSettlementsPage = lazy(() => import('./features/payroll/pages/TeamSettlementsPage').then(m => ({ default: m.TeamSettlementsPage })));
const AdminDashboard = lazy(() => import('./features/payroll/pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const MassSalaryStructureUploadPage = lazy(() => import('./features/payroll/pages/MassSalaryStructureUploadPage').then(m => ({ default: m.MassSalaryStructureUploadPage })));
const EmployeeLoanRequest = lazy(() => import('./features/payroll/components/EmployeeLoanRequest').then(m => ({ default: m.EmployeeLoanRequest })));
const EmployeePayrollPortal = lazy(() => import('./features/payroll/pages').then(m => ({ default: m.EmployeePayrollPortal })));
const TeamLeadPayrollPortal = lazy(() => import('./features/payroll/pages').then(m => ({ default: m.TeamLeadPayrollPortal })));
const ManagerPayrollPortal = lazy(() => import('./features/payroll/pages').then(m => ({ default: m.ManagerPayrollPortal })));
const HRPayrollPortal = lazy(() => import('./features/payroll/pages').then(m => ({ default: m.HRPayrollPortal })));
const AdminPayrollPortal = lazy(() => import('./features/payroll/pages').then(m => ({ default: m.AdminPayrollPortal })));
const RecruitmentDashboard = lazy(() => import('./features/recruitment/pages/RecruitmentDashboard').then(m => ({ default: m.RecruitmentDashboard })));
const MrfRequestPage = lazy(() => import('./features/recruitment/pages/MrfRequestPage').then(m => ({ default: m.MrfRequestPage })));
const CandidateReportPage = lazy(() => import('./features/recruitment/pages/CandidateReportPage').then(m => ({ default: m.CandidateReportPage })));
=======
// ── Portal Route Modules ──────────────────────────────────────────────────────
import { adminRoutes }        from './routes/admin.routes';
import { hrRoutes }           from './routes/hr.routes';
import { managerRoutes }      from './routes/manager.routes';
import { teamLeadRoutes }     from './routes/teamlead.routes';
import { employeePortalRoutes } from './routes/employee.routes';
import { superAdminRoutes }   from './routes/superadmin.routes';
import { internRoutes }       from './routes/intern.routes';
import { consultantRoutes }   from './routes/consultant.routes';
import { financeRoutes }      from './routes/finance.routes';

// ── Public / Shared Lazy Pages ────────────────────────────────────────────────
const LoginPage        = lazy(() => import('./features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })));
>>>>>>> b13431884f6e3fb77d4463ab4da204cadac8faca
const JobReferencePage = lazy(() => import('./features/recruitment/pages/JobReferencePage').then(m => ({ default: m.JobReferencePage })));
const PublicOfferPage  = lazy(() => import('./features/recruitment/pages/PublicOfferPage').then(m => ({ default: m.PublicOfferPage })));
const TakeAssessmentPage = lazy(() => import('./features/recruitment/pages/TakeAssessmentPage').then(m => ({ default: m.TakeAssessmentPage })));
const NotFoundPage     = lazy(() => import('./features/common/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const UnauthorizedPage = lazy(() => import('./features/common/pages/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })));

// ── Page Loading Fallback ─────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] w-full p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-slate-400">Loading module...</p>
      </div>
    </div>
  );
}

// ── Root Redirect — routes user to their portal based on role ─────────────────
function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  const authHydrated = useAuthHydrated();

<<<<<<< HEAD
  if (!authHydrated) {
    return <PageLoader />;
  }

  if (!isAuthenticated || !user) {
    if (!hasStoredAccessToken()) {
      return <Navigate to="/login" replace />;
    }
    return <PageLoader />;
  }
=======
  if (!authHydrated) return <PageLoader />;
  if (!isAuthenticated && !hasStoredAccessToken()) return <Navigate to="/login" replace />;
  if (!user) return <PageLoader />;
>>>>>>> b13431884f6e3fb77d4463ab4da204cadac8faca

  const roles = user?.roles || [];
  const accessRole = String((user as any)?.accessRole || (user as any)?.role || '').toLowerCase();
  const userRolesNorm = roles.map((r: string) => String(r).toLowerCase());

  if (userRolesNorm.includes('super_admin') || accessRole === 'super_admin')
    return <Navigate to="/superadmin/dashboard" replace />;

  if (
    userRolesNorm.includes('finance') ||
    userRolesNorm.includes('finance_manager') ||
    accessRole === 'finance' ||
    accessRole === 'finance_manager'
  ) {
    return <Navigate to="/finance/dashboard" replace />;
  }

  // CEO and HR (organization_admin, ceo, hr_manager, hr_admin, hr) — all go to Admin portal
  if (
    userRolesNorm.includes('organization_admin') ||
    userRolesNorm.includes('ceo') ||
    ['organization_admin', 'ceo'].includes(accessRole)
  ) return <Navigate to="/dashboard" replace />;

  if (
    userRolesNorm.includes('hr') ||
    userRolesNorm.includes('hr_admin') ||
    userRolesNorm.includes('hr_manager') ||
    ['hr', 'hr_admin', 'hr_manager'].includes(accessRole)
  ) return <Navigate to="/hr/dashboard" replace />;

  if (
    userRolesNorm.includes('department_head') ||
    userRolesNorm.includes('manager') ||
    accessRole === 'department_head' ||
    accessRole === 'manager'
  ) return <Navigate to="/manager/dashboard" replace />;

  if (userRolesNorm.includes('team_lead') || accessRole === 'team_lead')
    return <Navigate to="/team-lead/dashboard" replace />;

  if (userRolesNorm.includes('intern') || accessRole === 'intern')
    return <Navigate to="/intern/dashboard" replace />;

  if (userRolesNorm.includes('consultant') || accessRole === 'consultant')
    return <Navigate to="/consultant/dashboard" replace />;

  return <Navigate to="/employee/dashboard" replace />;
}

// ── App Routes ────────────────────────────────────────────────────────────────
export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/liberation/103/:requestId/aHc9PQ" element={<JobReferencePage />} />
        <Route path="/liberation/:portalId/:requestId/:token" element={<JobReferencePage />} />
        <Route path="/liberation/:portalId/:requestId" element={<JobReferencePage />} />
        <Route path="/liberation/:requestId" element={<JobReferencePage />} />
        <Route path="/public/job-reference/:requestId" element={<JobReferencePage />} />
        <Route path="/job-reference/:requestId" element={<JobReferencePage />} />
        <Route path="/public/offers/review/:uuid" element={<PublicOfferPage />} />
        <Route path="/public/assessments/take/:uuid" element={<TakeAssessmentPage />} />
        <Route path="/careers" element={<JobReferencePage />} />
        <Route path="/" element={<RootRedirect />} />

        {/* ── Modular Portal Route Groups ── */}
        {hrRoutes}
        {managerRoutes}
        {teamLeadRoutes}
        {adminRoutes}
        {employeePortalRoutes}
        {superAdminRoutes}
        {internRoutes}
        {consultantRoutes}
        {financeRoutes}

        {/* ── Fallback 404 Route ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
