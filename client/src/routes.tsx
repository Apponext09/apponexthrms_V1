import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuthStore, useAuthHydrated, hasStoredAccessToken } from './features/auth/store/authStore';

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

  if (!authHydrated) return <PageLoader />;
  if (!isAuthenticated && !hasStoredAccessToken()) return <Navigate to="/login" replace />;
  if (!user) return <PageLoader />;

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
  ) return <Navigate to="/finance/reports" replace />;

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

        {/* ── Portal Route Modules ── */}
        {hrRoutes}
        {managerRoutes}
        {teamLeadRoutes}
        {adminRoutes}
        {employeePortalRoutes}
        {superAdminRoutes}
        {internRoutes}
        {consultantRoutes}
        {financeRoutes}

        {/* ── 404 ── */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
