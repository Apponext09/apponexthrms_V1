/** Existing routable organization pages. Generated from the eight portal route definitions. */
export const PORTAL_ROUTES: Record<string, string[]> = {
  admin: ["/approvals","/approvals/dashboard","/dashboard","/employees","/employees/:id","/employees/:id/edit","/employees/onboarding","/org-structure","/attendance","/attendance/policies","/attendance/workflow-settings","/attendance/locations","/attendance/employee-locations","/attendance/location-mapping","/attendance/shifts","/attendance/roster-shifts","/attendance/reports","/attendance/break-report","/attendance/break-logs","/attendance/regularization-logs","/admin/regularization-logs","/attendance/live-tracking","/live-tracking","/live-tracking/history","/admin/live-tracking/history","/attendance/face-punch","/leaves","/leaves/my-leaves","/leaves/history","/leaves/apply","/leaves/approvals","/leaves/approval","/leaves/balance","/leaves/balances","/leaves/encashment","/leaves/reports/builder","/leaves/reports/burnout-risk","/holidays","/payroll","/payroll/admin-dashboard","/payroll/admin-portal","/admin/payroll-policies","/admin/payroll-portal","/expenses","/expenses/dashboard","/expenses/my-expenses","/expenses/approvals","/expenses/finance-verification","/expenses/reimbursements","/expenses/travel-requests","/expenses/travel-advances","/expenses/mileage-claims","/expenses/categories","/expenses/policies","/expenses/reports","/expenses/settings","/payroll/expense-claims","/payroll/travel-requests","/payroll/reimbursements","/expense-claims","/travel-requests","/reimbursements","/policies/manage","/policies/queries","/policies/create","/policies/edit/:id","/policies/reports","/payroll/salary-structure","/payroll/settings","/payroll/master-settings","/payroll/salary-revision","/payroll/salary-revisions","/payroll/processing","/payroll-processing","/payroll/reports","/payroll/loans","/payroll/loan-types","/payroll/tax-declaration","/payroll/settlements","/payroll/settlement","/payroll/gratuity","/gratuity","/payroll/policies","/payroll/payslips","/payroll/payslip-requests","/payroll/mass-salary-upload","/mass-salary-upload","/manager/settlements","/team-lead/settlements","/recruitment","/recruitment/dashboard","/recruitment/mrf-request","/recruitment/jobs","/recruitment/candidates","/recruitment/candidate-report","/recruitment/resume-bank","/recruitment/applicant-tracker","/recruitment/assessments","/recruitment/offers","/letters","/employee-lifecycle/letters","/recruitment/interview-schedule","/recruitment/interviewer-rating","/recruitment/referrals","/recruitment/career-customization","/assets","/assets/list","/assets/:id","/assets/assign","/assets/transfer","/assets/return","/assets/maintenance","/assets/licenses","/assets/reports","/assets/analytics","/performance","/performance/goals","/performance/reviews","/performance/okrs","/performance/review-form","/performance/appraisals","/performance/competencies","/performance/pips","/performance/succession","/performance/recognition","/performance/analytics","/workflow","/workflows","/workflows/list","/workflows/create","/workflows/new","/workflows/builder","/workflows/:id","/workflows/:id/edit","/workflows/:id/builder","/workflow/create","/workflow/new","/workflow/builder","/workflow/approvals","/notifications","/notifications/preferences","/announcements","/announcements/manage","/announcements/feed","/hr-operations/requests","/requests","/configuration","/hr-operations/configuration","/hr-operations/announcements","/settings/configuration","/admin/configuration","/analytics","/analytics/attendance","/analytics/timelog","/analytics/ceo-attendance","/analytics/report-engine","/lms","/lms/dashboard","/lms/courses","/lms/categories","/lms/batches","/lms/enrollments","/lms/compliance","/lms/reports","/lms/catalog","/lms/catalog/:id","/lms/courses/:id","/lms/course/:id","/lms/my-learning","/lms/my-courses","/lms/assessment/:id","/lms/certificates","/lms/settings/integrations","/employee-lifecycle","/profile","/settings","/settings/general","/settings/company-profile","/settings/branches","/settings/locations","/settings/branding","/settings/leave-policies","/settings/org-leave-settings","/settings/id-card-designer","/settings/id-card-templates","/settings/career-customization","/settings/lms-integrations","/settings/workflows","/settings/modules","/settings/master-builder","/settings/master-builder/:id","/masters/builder","/masters/builder/:id","/masters","/operational-masters","/modules","/settings-group"],
  hr: ["/hr","/hr/dashboard","/hr/profile","/hr/my-profile","/hr/lifecycle","/hr/id-card","/hr/employees","/hr/employee-lifecycle","/hr/employees/:id","/hr/employees/:id/edit","/hr/employees/onboarding","/hr/org-structure","/hr/payroll","/hr/payroll/dashboard","/hr/payroll/admin-dashboard","/hr/payroll/admin-portal","/hr/payroll/hr-portal","/hr/payroll/settings","/hr/payroll/master-settings","/hr/payroll-settings","/hr/payroll/policies","/hr/payroll/salary-structure","/hr/payroll/salary-structures","/hr/salary-structure","/hr/salary-structures","/hr/payroll/mass-salary-upload","/hr/mass-salary-upload","/hr/payroll/salary-revision","/hr/payroll/salary-revisions","/hr/salary-revision","/hr/salary-revisions","/hr/payroll/processing","/hr/payroll-processing","/hr/payroll/payslips","/hr/payroll/payslip-requests","/hr/payslips","/hr/payroll/tax-declaration","/hr/tax-declaration","/hr/payroll/reports","/hr/payroll/loans","/hr/payroll/loan-types","/hr/loans","/hr/loan-types","/hr/payroll/settlements","/hr/payroll/settlement","/hr/settlements","/hr/payroll/gratuity","/hr/gratuity","/hr/payroll/team-settlements","/hr/expenses/dashboard","/hr/expenses/my-expenses","/hr/expenses/approvals","/hr/expenses/finance-verification","/hr/expenses/reimbursements","/hr/expenses/travel-requests","/hr/expenses/travel-advances","/hr/expenses/mileage-claims","/hr/expenses/categories","/hr/expenses/policies","/hr/expenses/reports","/hr/expenses/settings","/hr/policies/manage","/hr/policies/create","/hr/policies/edit/:id","/hr/policies/reports","/hr/attendance","/HR/attendance","/hr/attendance/shifts","/hr/attendance/roster-shifts","/hr/attendance-policies","/hr/attendance/policies","/hr/attendance/workflow-settings","/hr/face-attendance","/HR/face-attendance","/hr/my-attendance","/hr/my-attendance-correction","/hr/my-shifts","/hr/attendance/locations","/HR/attendance/locations","/hr/attendance-locations","/HR/attendance-locations","/hr/attendance/break-logs","/hr/attendance-regularization","/hr/regularization","/hr/leaves","/hr/leaves/my-leaves","/hr/leaves/apply","/hr/leaves/balance","/hr/leaves/encashment","/hr/leaves/approvals","/HR/leaves/approvals","/hr/approvals/dashboard","/hr/holidays","/hr/requests","/hr/announcements","/hr/recruitment","/hr/recruitment/dashboard","/hr/recruitment/mrf-request","/hr/recruitment/jobs","/hr/recruitment/candidates","/hr/recruitment/candidate-report","/hr/recruitment/resume-bank","/hr/recruitment/applicant-tracker","/hr/recruitment/assessments","/hr/recruitment/offers","/hr/letters","/hr/recruitment/interview-schedule","/hr/recruitment/interviewer-rating","/hr/recruitment/referrals","/hr/recruitment/career-customization","/hr/assets","/hr/assets/dashboard","/hr/assets/list","/hr/assets/details/:id","/hr/assets/assign","/hr/assets/transfers","/hr/assets/return","/hr/assets/maintenance","/hr/assets/licenses","/hr/assets/reports","/hr/assets/analytics","/hr/performance","/hr/performance/goals","/hr/performance/okrs","/hr/performance/reviews","/hr/performance/appraisals","/hr/performance/competencies","/hr/performance/pip","/hr/performance/succession","/hr/performance/recognition","/hr/performance/analytics","/hr/analytics/attendance","/hr/analytics/timelog","/hr/analytics/report-engine","/hr/analytics/burnout-risk","/hr/modules","/hr/lms","/hr/lms/dashboard","/hr/lms/courses","/hr/lms/categories","/hr/lms/batches","/hr/lms/enrollments","/hr/lms/compliance","/hr/lms/reports","/hr/lms/catalog","/hr/lms/catalog/:id","/hr/lms/courses/:id","/hr/lms/course/:id","/hr/lms/my-learning","/hr/lms/my-courses","/hr/lms/assessment/:id","/hr/lms/certificates","/hr/lms/settings/integrations","/hr/masters/builder","/hr/masters/builder/:id","/hr/masters","/hr/operational-masters","/hr/workflow","/hr/workflows","/hr-operations/workflows","/hr-operations/announcements","/hr-operations/holidays","/hr/workflow/builder","/hr/workflow/approvals","/hr/workflows/list","/hr/workflows/create","/hr/workflows/new","/hr/workflows/builder","/hr/workflows/:id","/hr/workflows/:id/edit","/hr/workflows/:id/builder","/hr/workflow/create","/hr/workflow/new","/hr/workflow/:id/edit","/hr/settings/workflows","/hr/settings/lms-integrations","/hr/settings","/hr/live-tracking","/hr/live-tracking/history"],
  manager: ["/manager","/manager/dashboard","/manager/team","/manager/attendance","/manager/attendance-regularization","/manager/regularization","/manager/attendance-correction","/manager/face-attendance","/manager/attendance-log","/manager/my-shift","/manager/leave-approvals","/manager/leaves/approvals","/manager/leaves/approvals-dashboard","/manager/hiring","/manager/mrf-request","/manager/ijp-approvals","/manager/interview-schedule","/manager/interviewer-rating","/manager/payroll","/manager/loans","/manager/expenses","/manager/expenses/approvals","/manager/expenses/my-expenses","/manager/expenses/travel-requests","/manager/expenses/travel-advances","/manager/expenses/mileage-claims","/manager/travel","/manager/payslips","/manager/salary-revisions","/manager/salary-revision","/manager/performance","/manager/performance/reviews","/manager/performance/goals","/manager/approvals","/manager/profile","/manager/lifecycle","/manager/id-card","/manager/org-chart","/manager/leaves","/manager/live-tracking","/manager/settlements","/manager/policies","/manager/lms","/manager/learning","/manager/live-tracking/history"],
  teamlead: ["/team-lead","/team-lead/dashboard","/team-lead/members","/team-lead/attendance","/team-lead/face-attendance","/team-lead/attendance-log","/team-lead/my-shift","/team-lead/attendance-correction","/team-lead/payroll","/team-lead/loans","/team-lead/expenses","/team-lead/expenses/approvals","/team-lead/expenses/my-expenses","/team-lead/expenses/travel-requests","/team-lead/expenses/travel-advances","/team-lead/expenses/mileage-claims","/team-lead/travel","/team-lead/payslips","/team-lead/salary-revisions","/team-lead/salary-revision","/team-lead/profile","/team-lead/lifecycle","/team-lead/id-card","/team-lead/org-chart","/team-lead/leaves","/team-lead/leaves/approvals","/team-lead/leaves/approvals-dashboard","/team-lead/performance","/team-lead/performance/reviews","/team-lead/performance/goals","/team-lead/approvals","/team-lead/policies","/team-lead/interview-schedule","/team-lead/interviewer-rating","/team-lead/mrf-request","/team-lead/mrf","/team-lead/live-tracking","/team-lead/settlements","/team-lead/live-tracking/history"],
  employee: ["/employee","/employee/dashboard","/employee/profile","/employee/lifecycle","/employee/attendance","/employee/face-attendance","/employee/leaves","/employee/attendance-regularization","/employee/regularization","/employee/work-hour-request","/employee/shift-roster","/employee/holiday-calendar","/employee/timesheet","/employee/payroll","/employee/my-settlement","/employee/settlement","/employee/payslips","/employee/salary-revisions","/employee/salary-revision","/employee/tax-declaration","/employee/expenses","/employee/my-expenses","/employee/travel-requests","/employee/travel-advances","/employee/travel","/employee/mileage-claims","/employee/assets","/employee/documents","/employee/id-card","/employee/org-chart","/employee/team-directory","/employee/performance","/employee/goals","/employee/feedback","/employee/learning","/employee/training","/employee/lms","/employee/lms/catalog","/employee/lms/catalog/:id","/employee/lms/course/:id","/employee/lms/my-learning","/employee/lms/assessment/:id","/employee/lms/assessment/:courseId","/employee/lms/certificates","/employee/policies","/employee/announcements","/employee/surveys","/employee/helpdesk","/employee/referrals","/employee/job-openings","/employee/interview-schedule","/employee/interviewer-rating","/employee/health-wellness","/employee/loans","/employee/ai-assistant","/employee/notifications","/employee/approvals","/employee/settings","/employee/live-tracking"],
  intern: ["/intern","/intern/dashboard","/intern/profile","/intern/lifecycle","/intern/attendance","/intern/face-attendance","/intern/attendance-regularization","/intern/shift-roster","/intern/leaves","/intern/payslips","/intern/expenses","/intern/travel-requests","/intern/travel-advances","/intern/mileage-claims","/intern/documents","/intern/holiday-calendar","/intern/announcements","/intern/id-card","/intern/org-chart"],
  consultant: ["/consultant","/consultant/dashboard","/consultant/profile","/consultant/lifecycle","/consultant/attendance","/consultant/face-attendance","/consultant/attendance-regularization","/consultant/shift-roster","/consultant/leaves","/consultant/payslips","/consultant/expenses","/consultant/travel-requests","/consultant/travel-advances","/consultant/mileage-claims","/consultant/documents","/consultant/holiday-calendar","/consultant/announcements","/consultant/id-card","/consultant/org-chart"],
  finance: ["/finance","/finance/dashboard","/finance/reports","/finance/approvals","/finance/expenses/verification","/finance/expenses/finance-verification","/finance/expenses/reimbursements","/finance/expenses/travel-advances","/finance/expenses/approvals","/finance/expenses/reports","/finance/expenses/dashboard","/finance/expenses/my-expenses","/finance/expenses/travel-requests","/finance/expenses/mileage-claims","/finance/expenses/categories","/finance/expenses/policies","/finance/expenses/settings","/finance/profile","/finance/lifecycle","/finance/attendance","/finance/face-punch","/finance/attendance-regularization","/finance/shift-roster","/finance/leaves","/finance/payslips","/finance/documents","/finance/holiday-calendar","/finance/announcements","/finance/org-chart","/finance/id-card"],
};

// Nested working pages rendered by wildcard routes are catalogued as patterns.
PORTAL_ROUTES.admin.push('/employee-lifecycle/*', '/masters/*', '/operational-masters/*');
PORTAL_ROUTES.hr.push('/hr/lifecycle/*', '/hr/employee-lifecycle/*', '/hr/masters/*', '/hr/operational-masters/*');
PORTAL_ROUTES.employee.push('/employee/lifecycle/*');

export function moduleForRoute(path: string): string {
  const value = path.toLowerCase();
  if (/(attendance|shift|live-tracking|face-punch|timelog|break-log|overtime)/.test(value)) return 'attendance';
  if (/(leave|holiday|comp-off)/.test(value)) return 'leaves';
  if (/(payroll|salary|payslip|loan|gratuity|settlement|tax-declaration)/.test(value)) return 'payroll';
  if (/(expense|travel|mileage|reimbursement)/.test(value)) return 'expenses';
  if (/(recruit|hiring|job|candidate|interview|mrf|referral|career)/.test(value)) return 'recruitment';
  if (/(performance|goal|review|feedback|okr|appraisal|pip)/.test(value)) return 'performance';
  if (/(lms|learning|course|training|certificate)/.test(value)) return 'learning';
  if (/(asset|license)/.test(value)) return 'assets';
  if (/(master|setting|configuration|module|policy|workflow)/.test(value)) return 'settings';
  if (/(analytics|report)/.test(value)) return 'analytics';
  if (/(notification|announcement|helpdesk|support)/.test(value)) return 'communication';
  if (/(employee|people|team|lifecycle|org-chart|id-card|document)/.test(value)) return 'people';
  return 'general';
}

export const SUBSCRIPTION_MODULES: Record<string, string | null> = {
  attendance: 'Attendance & Time Tracking', leaves: 'Leave Management & Approvals',
  payroll: 'Automated Payroll Processing', expenses: 'Expense Management',
  people: 'Core HR & Directory', recruitment: 'Recruitment & ATS',
  performance: 'Performance & OKRs', learning: 'Learning Management System',
  assets: 'Asset Lifecycle Management', settings: 'Settings & RBAC',
  analytics: null, communication: null, general: null,
};

/** Plan data historically contains both display labels and short module codes. */
export const SUBSCRIPTION_ALIASES: Record<string, string[]> = {
  'Attendance & Time Tracking': ['attendance', 'time_tracking', 'attendance_tracking', 'shifts', 'shift_management', 'tracking', 'punches'],
  'Leave Management & Approvals': ['leave', 'leaves', 'leave_management'],
  'Automated Payroll Processing': ['payroll', 'salary', 'compensation'],
  'Expense Management': ['expense', 'expenses', 'expense_management'],
  'Core HR & Directory': ['core_hr', 'core', 'employee', 'employees', 'directory', 'lifecycle', 'org_structure', 'id_card'],
  'Recruitment & ATS': ['recruitment', 'ats', 'hiring'],
  'Performance & OKRs': ['performance', 'okr', 'okrs'],
  'Learning Management System': ['lms', 'learning', 'training'],
  'Asset Lifecycle Management': ['assets', 'asset_management'],
  'Settings & RBAC': ['settings', 'rbac'],
};

export function expandMenuSelection(
  requestedIds: number[],
  rows: Array<{ id: number; parentId?: number | null; parent_id?: number | null }>
): number[] {
  const selected = new Set(requestedIds);
  for (const row of rows) {
    if (!selected.has(Number(row.id))) continue;
    const parentId = Number(row.parentId ?? row.parent_id);
    if (parentId > 0) selected.add(parentId);
  }
  return [...selected];
}

/** Only read checks can be bridged from page grants; write/approve rights stay separate. */
export function pageAllowsReadPermission(permission: string, route: string): boolean {
  const path = route.toLowerCase();
  if (permission === 'payroll:view') return /^(\/payroll|\/hr\/payroll)(\/|$)/.test(path) && !/(payslip|tax-declaration|my-)/.test(path);
  if (permission === 'recruitment.read') return /\/recruitment(\/dashboard)?$/.test(path);
  if (permission.startsWith('recruitment.') && permission.endsWith('.read')) {
    const resource = permission.split('.')[1];
    const terms: Record<string, RegExp> = {
      mrf: /mrf(-request)?$/, job: /jobs?$/, candidate: /candidate|applicant|resume-bank/,
      application: /applicant|candidate/, interview: /interview/,
      assessment: /assessment/, offer: /offers?$/,
    };
    return Boolean(terms[resource]?.test(path));
  }
  if (permission.startsWith('performance.') && permission.endsWith('_read')) {
    const resource = permission.slice('performance.'.length, -'_read'.length).replace('_cycle', '');
    const aliases: Record<string, RegExp> = {
      goal: /goal/, okr: /okr/, review: /review/, feedback: /feedback/,
      appraisal: /appraisal/, competency: /competenc/, pip: /pip/,
      succession: /succession/, recognition: /recognition/,
      reward: /recognition|reward/, analytics: /analytics/,
      talent_matrix: /analytics|talent-matrix/,
    };
    return Boolean(aliases[resource]?.test(path));
  }
  return false;
}
