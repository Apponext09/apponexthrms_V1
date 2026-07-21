# ApponextHRMS Routing Architecture

## Application Structure

### Entry Points
- **App.tsx**: Main application component with BrowserRouter and QueryClientProvider
- **main.tsx**: React entry point that renders App component
- **routes.tsx**: Central routing configuration

### Layout
- **AppShellLayout**: Protected layout with sidebar navigation and header
- **LoginPage**: Public login interface

## Route Hierarchy

```
/                                    → Redirect to /dashboard
├── /login                          → LoginPage (Public)
└── /* (Protected - Requires Auth)
    ├── /dashboard                  → DashboardPage
    ├── /employees
    │   ├── / (index)              → EmployeeListPage
    │   ├── /:id                   → EmployeeProfilePage
    │   └── /onboarding            → OnboardingDashboardPage
    ├── /attendance
    │   ├── / (index)              → AttendanceDashboard
    │   └── /my-attendance         → MyAttendance
    ├── /leaves
    │   ├── / (index)              → MyLeavesPage
    │   ├── /apply                 → ApplyLeavePage
    │   ├── /approvals             → ApprovalInboxPage
    │   └── /balance               → LeaveBalancePage
    ├── /payroll
    │   ├── / (index)              → PayrollDashboard
    │   ├── /payslips              → PayslipViewer
    │   ├── /salary-structure      → SalaryStructureManagement
    │   └── /tax-declaration       → TaxDeclaration
    ├── /recruitment
    │   ├── / (index)              → RecruitmentDashboard
    │   ├── /jobs                  → JobManagement
    │   └── /candidates            → CandidateManagement
    ├── /performance
    │   ├── / (index)              → PerformanceDashboard
    │   ├── /goals                 → GoalManagementPage
    │   ├── /okrs                  → OKRManagementPage
    │   ├── /reviews               → ReviewCyclesPage
    │   ├── /review-form           → PerformanceReviewPage
    │   ├── /appraisals            → AppraisalDashboardPage
    │   ├── /competencies          → CompetencyDashboardPage
    │   ├── /pips                  → PIPDashboardPage
    │   ├── /succession            → SuccessionPlanningPage
    │   ├── /recognition           → RecognitionDashboardPage
    │   └── /analytics             → PerformanceAnalyticsPage
    ├── /workflow
    │   ├── / (index)              → WorkflowListPage
    │   ├── /builder               → WorkflowBuilderPage
    │   └── /approvals             → WorkflowApprovalInboxPage
    ├── /notifications
    │   ├── / (index)              → NotificationCenterPage
    │   └── /preferences           → NotificationPreferencesPage
    └── /settings
        ├── / (index)              → SettingsLayout
        ├── /company-profile       → CompanyProfilePage
        ├── /branches              → BranchesPage
        ├── /departments           → DepartmentsPage
        ├── /locations             → LocationsPage
        └── /branding              → BrandingPage
```

## Navigation Modules

### Primary Navigation (Sidebar)
The AppShellLayout provides a sidebar with quick access to all modules:

```typescript
const NAVIGATION = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Employees', href: '/employees', icon: '👥' },
  { name: 'Attendance', href: '/attendance', icon: '📋' },
  { name: 'Leaves', href: '/leaves', icon: '🏖️' },
  { name: 'Payroll', href: '/payroll', icon: '💰' },
  { name: 'Performance', href: '/performance', icon: '⭐' },
  { name: 'Recruitment', href: '/recruitment', icon: '🎯' },
  { name: 'Workflow', href: '/workflow', icon: '⚙️' },
  { name: 'Notifications', href: '/notifications', icon: '🔔' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];
```

## Module Details

### 1. Dashboard (`/dashboard`)
- **Component**: DashboardPage
- **Purpose**: Overview of key metrics and quick actions
- **Features**: 
  - Total employees count
  - Leave status
  - Open positions
  - Pending reviews
  - Quick action buttons
  - Recent activity feed

### 2. Employees (`/employees`)
- **Main Page**: EmployeeListPage - View and manage all employees
- **Profile**: EmployeeProfilePage - Individual employee details
- **Onboarding**: OnboardingDashboardPage - New employee setup
- **Features**: CRUD operations, employee profiles, lifecycle management

### 3. Attendance (`/attendance`)
- **Dashboard**: AttendanceDashboard - Company-wide attendance overview
- **My Attendance**: MyAttendance - Personal attendance tracking
- **Features**: Check-in/check-out, attendance calendar, punch timeline

### 4. Leaves (`/leaves`)
- **My Leaves**: MyLeavesPage - View personal leave balance
- **Apply**: ApplyLeavePage - Request new leave
- **Approvals**: ApprovalInboxPage - Review and approve leave requests
- **Balance**: LeaveBalancePage - View detailed leave balance
- **Features**: Leave policies, balance tracking, approvals workflow

### 5. Payroll (`/payroll`)
- **Dashboard**: PayrollDashboard - Payroll overview and processing
- **Payslips**: PayslipViewer - View and download payslips
- **Salary Structure**: SalaryStructureManagement - Manage salary components
- **Tax**: TaxDeclaration - Tax calculation and declarations
- **Features**: Salary processing, payslips, tax management, EMI schedules

### 6. Recruitment (`/recruitment`)
- **Dashboard**: RecruitmentDashboard - Recruitment overview
- **Jobs**: JobManagement - Create and manage job postings
- **Candidates**: CandidateManagement - Manage candidate applications
- **Features**: Job postings, candidate tracking, hiring workflow

### 7. Performance (`/performance`)
- **Dashboard**: PerformanceDashboard - Performance overview
- **Goals**: GoalManagementPage - Create and track employee goals
- **OKRs**: OKRManagementPage - Manage OKR (Objectives & Key Results)
- **Reviews**: ReviewCyclesPage - Manage review cycles
- **Review Form**: PerformanceReviewPage - Complete performance reviews
- **Appraisals**: AppraisalDashboardPage - Annual appraisals
- **Competencies**: CompetencyDashboardPage - Competency framework
- **PIPs**: PIPDashboardPage - Performance Improvement Plans
- **Succession**: SuccessionPlanningPage - Succession planning
- **Recognition**: RecognitionDashboardPage - Employee recognition
- **Analytics**: PerformanceAnalyticsPage - Performance analytics
- **Features**: 360-degree feedback, goal alignment, performance tracking

### 8. Workflow (`/workflow`)
- **List**: WorkflowListPage - View all workflows
- **Builder**: WorkflowBuilderPage - Create and edit workflows
- **Approvals**: WorkflowApprovalInboxPage - Pending approvals
- **Features**: Visual workflow builder, approval routing, delegation

### 9. Notifications (`/notifications`)
- **Center**: NotificationCenterPage - View all notifications
- **Preferences**: NotificationPreferencesPage - Configure notification settings
- **Features**: In-app notifications, preference management, announcements

### 10. Settings (`/settings`)
- **Company Profile**: CompanyProfilePage - Organization details
- **Branches**: BranchesPage - Office/branch management
- **Departments**: DepartmentsPage - Department management
- **Locations**: LocationsPage - Work location management
- **Branding**: BrandingPage - Company branding settings
- **Features**: Organization setup, multi-location support, branding

## Authentication & Authorization

### ProtectedRoute Component
- Wraps all protected routes
- Checks authentication status via `useAuthStore`
- Redirects to `/login` if not authenticated

### Auth Store (Zustand)
- Manages user session state
- Stores JWT tokens in localStorage
- Provides login/logout methods
- Maintains user profile information

## Navigation Features

### Sidebar Navigation
- Dynamic module icons and labels
- Active route highlighting (blue background)
- Collapsible for screen space
- User profile display
- Quick logout button

### Header
- Toggle sidebar button
- Application branding
- Notification bell
- User profile menu

### Breadcrumb Support (TODO)
- Automatic breadcrumb generation from routes
- Click to navigate to parent routes

## Future Enhancements

1. **Breadcrumbs**: Add automatic breadcrumb navigation
2. **Mobile Navigation**: Responsive drawer for mobile devices
3. **Deep Linking**: Support for sharing specific views
4. **Route Transitions**: Smooth page transitions
5. **Route Caching**: Preserve component state on navigation
6. **Analytics Integration**: Track user navigation patterns

## Development Notes

### Adding New Routes
1. Create feature folder under `src/features/`
2. Create pages under `src/features/[module]/pages/`
3. Import page component in `src/routes.tsx`
4. Add route to routes configuration
5. Update sidebar navigation if needed

### Testing Routes
```bash
# Frontend runs on port 5173
http://localhost:5173/

# Try these routes:
http://localhost:5173/dashboard
http://localhost:5173/employees
http://localhost:5173/attendance
http://localhost:5173/leaves
http://localhost:5173/payroll
http://localhost:5173/recruitment
http://localhost:5173/performance
http://localhost:5173/workflow
http://localhost:5173/notifications
http://localhost:5173/settings
```

## Performance Considerations

1. **Code Splitting**: Each feature module can be lazy-loaded
2. **Route-based Chunking**: Vite automatically chunks by route
3. **Query Client**: React Query handles API caching
4. **State Management**: Zustand stores are lightweight
5. **Dark Mode**: TailwindCSS dark mode support built-in
