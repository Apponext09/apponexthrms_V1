import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, useAuthHydrated, hasStoredAccessToken } from './features/auth/store/authStore';
import { firstGrantedPage, useMenuAccess } from './features/access/useMenuAccess';

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

function RedirectToGrantedPage({ preferred }: { preferred: string }) {
  const { access, ready, error, canAccessPath } = useMenuAccess();
  if (error) return <Navigate to="/unauthorized" replace />;
  if (!ready) return <PageLoader />;
  const firstPage = firstGrantedPage(access?.paths ?? []);
  return <Navigate to={canAccessPath(preferred) ? preferred : firstPage ?? '/unauthorized'} replace />;
}

// ── Root Redirect — routes user to their portal based on role ─────────────────
function RootRedirect() {
  const { isAuthenticated, user } = useAuthStore();
  const authHydrated = useAuthHydrated();

  if (!authHydrated) return <PageLoader />;
  if (!isAuthenticated && !hasStoredAccessToken()) return <Navigate to="/login" replace />;
  if (!user) return <PageLoader />;

  const roles = user?.roles || [];
  const accessRole = String(user.accessRole || user.role || '').toLowerCase();
  const userRolesNorm = roles.map((r: string) => String(r).toLowerCase());

  if (userRolesNorm.includes('super_admin') || accessRole === 'super_admin')
    return <Navigate to="/superadmin/dashboard" replace />;

  if (
    userRolesNorm.includes('finance') ||
    userRolesNorm.includes('finance_manager') ||
    accessRole === 'finance' ||
    accessRole === 'finance_manager'
  ) {
    return <RedirectToGrantedPage preferred="/finance/dashboard" />;
  }

  // CEO and HR (organization_admin, ceo, hr_manager, hr_admin, hr) — all go to Admin portal
  if (
    userRolesNorm.includes('organization_admin') ||
    userRolesNorm.includes('ceo') ||
    ['organization_admin', 'ceo'].includes(accessRole)
  ) return <RedirectToGrantedPage preferred="/dashboard" />;

  if (
    userRolesNorm.includes('hr') ||
    userRolesNorm.includes('hr_admin') ||
    userRolesNorm.includes('hr_manager') ||
    ['hr', 'hr_admin', 'hr_manager'].includes(accessRole)
  ) return <RedirectToGrantedPage preferred="/hr/dashboard" />;

  if (
    userRolesNorm.includes('department_head') ||
    userRolesNorm.includes('manager') ||
    accessRole === 'department_head' ||
    accessRole === 'manager'
  ) return <RedirectToGrantedPage preferred="/manager/dashboard" />;

  if (userRolesNorm.includes('team_lead') || accessRole === 'team_lead')
    return <RedirectToGrantedPage preferred="/team-lead/dashboard" />;

  if (userRolesNorm.includes('intern') || accessRole === 'intern')
    return <RedirectToGrantedPage preferred="/intern/dashboard" />;

  if (userRolesNorm.includes('consultant') || accessRole === 'consultant')
    return <RedirectToGrantedPage preferred="/consultant/dashboard" />;

  return <RedirectToGrantedPage preferred="/employee/dashboard" />;
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
