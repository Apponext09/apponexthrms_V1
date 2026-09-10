/**
 * Apponext HRMS - Master OpenAPI 3.0 Swagger Specification
 * All API responses show only status and message — no detailed data fields.
 */

// Shared minimal success response schema reference
const OK = {
  description: 'Success',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/SuccessResponse' },
    },
  },
};

const CREATED = {
  description: 'Created',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/SuccessResponse' },
    },
  },
};

const UNAUTHORIZED = {
  description: 'Unauthorized – invalid or missing JWT token',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
};

const NOT_FOUND = {
  description: 'Resource not found',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
};

const SERVER_ERROR = {
  description: 'Internal server error',
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  },
};

const stdResponses = { 200: OK, 401: UNAUTHORIZED, 500: SERVER_ERROR };
const stdCreate = { 201: CREATED, 400: { description: 'Validation error' }, 401: UNAUTHORIZED, 500: SERVER_ERROR };
const stdDelete = { 200: OK, 404: NOT_FOUND, 401: UNAUTHORIZED, 500: SERVER_ERROR };

export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Apponext HRMS API Documentation',
    version: '1.0.0',
    description: `
### Multi-Tenant Enterprise Human Resource Management System (HRMS)
Interactive REST API documentation for **Apponext HRMS**.

#### Authentication:
* Click **Authorize** → enter your JWT token as: \`Bearer <accessToken>\`
* Include multi-company context header: \`X-Company-Id: <companyId>\`

> **Note:** All API responses return only \`success\` and \`message\` fields.
    `,
    contact: { name: 'Apponext Engineering Team', email: 'support@apponext.com' },
  },
  servers: [
    { url: 'http://localhost:5000/api/v1', description: 'Local Development Server (v1)' },
    { url: '/api/v1', description: 'Relative API Path (v1)' },
  ],
  tags: [
    { name: 'Authentication', description: 'Login, registration, token refresh, and profile management' },
    { name: 'RBAC & Permissions', description: 'Role-based access control, role assignments, and permissions' },
    { name: 'User Management', description: 'System user account creation, updates, and directory' },
    { name: 'Employee Management', description: 'Employee onboarding, profiles, documents, and lifecycle' },
    { name: 'Attendance & Tracking', description: 'Punch in/out, shift schedules, regularization, and live GPS tracking' },
    { name: 'Leaves & Time Off', description: 'Leave applications, approvals, quotas, and policy mappings' },
    { name: 'Payroll & Compensation', description: 'Salary structures, payroll runs, payslips, loans, and F&F settlements' },
    { name: 'Recruitment & MRF', description: 'Manpower requisitions, job postings, applicant pipeline, and offers' },
    { name: 'Public Career Portal', description: 'Public job listings, portal settings, and candidate applications' },
    { name: 'Performance & OKRs', description: 'Goal setting, appraisal cycles, competencies, and PIPs' },
    { name: 'Asset Management', description: 'Hardware/software asset inventory, assignment, and tracking' },
    { name: 'Settings & Masters', description: 'Organization profile, departments, designations, and locations' },
    { name: 'Manager Portal', description: 'Department team roster, approvals, and KPI oversight' },
    { name: 'Team Lead Portal', description: 'Team attendance, shifts, and direct approval inbox' },
    { name: 'Notifications', description: 'In-app notification history and mark-as-read' },
    { name: 'Workflow Approvals', description: 'Multi-tier approval engine for leaves, loans, and assets' },
    { name: 'Marketplace & Licensing', description: 'Module add-ons, license status, and feature toggles' },
    { name: 'Super Admin', description: 'Tenant provisioning, subscriptions, and platform audit logs' },
    { name: 'System Reports & Dashboards', description: 'Dashboard metrics, filter options, and health check' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token from `/auth/login`. Format: `Bearer <token>`',
      },
      CompanyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Company-Id',
        description: 'Active company/branch context ID',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'An error occurred. Please try again.' },
        },
      },
      // ── Request Body Schemas ──────────────────────────────────────────────
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@company.com' },
          password: { type: 'string', format: 'password', example: 'Password@123' },
        },
      },
      RegisterOrgRequest: {
        type: 'object',
        required: ['organizationName', 'firstName', 'lastName', 'email', 'password'],
        properties: {
          organizationName: { type: 'string', example: 'Acme Corp' },
          firstName: { type: 'string', example: 'Jane' },
          lastName: { type: 'string', example: 'Doe' },
          email: { type: 'string', format: 'email', example: 'admin@acmecorp.com' },
          password: { type: 'string', format: 'password', example: 'SecurePass@123' },
        },
      },
      EmployeeRequest: {
        type: 'object',
        required: ['firstName', 'lastName', 'email', 'dateOfJoining'],
        properties: {
          firstName: { type: 'string', example: 'Aarav' },
          lastName: { type: 'string', example: 'Sharma' },
          email: { type: 'string', format: 'email', example: 'aarav.sharma@company.com' },
          gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
          dateOfJoining: { type: 'string', format: 'date', example: '2026-08-17' },
          employmentType: { type: 'string', enum: ['full_time', 'part_time', 'contract', 'internship'], example: 'full_time' },
          departmentName: { type: 'string', example: 'Engineering' },
          designationName: { type: 'string', example: 'Software Engineer' },
          accessRole: { type: 'string', enum: ['employee', 'team_lead', 'manager', 'hr', 'organization_admin'], example: 'employee' },
        },
      },
      PunchRequest: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string', enum: ['in', 'out'], example: 'in' },
          latitude: { type: 'number', example: 19.076 },
          longitude: { type: 'number', example: 72.877 },
          notes: { type: 'string', example: 'Clocking in from main office' },
        },
      },
      LeaveApplyRequest: {
        type: 'object',
        required: ['leaveTypeName', 'startDate', 'endDate', 'reason'],
        properties: {
          leaveTypeName: { type: 'string', example: 'Casual Leave' },
          startDate: { type: 'string', format: 'date', example: '2026-09-01' },
          endDate: { type: 'string', format: 'date', example: '2026-09-03' },
          reason: { type: 'string', example: 'Personal annual vacation' },
          isHalfDay: { type: 'boolean', example: false },
        },
      },
      SalaryAssignRequest: {
        type: 'object',
        required: ['employeeName', 'effectiveFrom', 'grossSalary'],
        properties: {
          employeeName: { type: 'string', example: 'Aarav Sharma' },
          structureName: { type: 'string', example: 'Standard IT Grade 1' },
          effectiveFrom: { type: 'string', format: 'date', example: '2026-08-01' },
          grossSalary: { type: 'number', example: 50000 },
          baseSalary: { type: 'number', example: 25000 },
          annualCtc: { type: 'number', example: 600000 },
        },
      },
      JobRequest: {
        type: 'object',
        required: ['jobTitle', 'departmentName', 'employmentType'],
        properties: {
          jobTitle: { type: 'string', example: 'Senior Full Stack Developer' },
          departmentName: { type: 'string', example: 'Engineering' },
          employmentType: { type: 'string', example: 'Full Time' },
          experienceLevel: { type: 'string', example: '5-8 Years' },
          minSalary: { type: 'number', example: 800000 },
          maxSalary: { type: 'number', example: 1400000 },
        },
      },
      MRFRequest: {
        type: 'object',
        required: ['departmentName', 'positionTitle', 'numberOfPositions'],
        properties: {
          departmentName: { type: 'string', example: 'Engineering' },
          positionTitle: { type: 'string', example: 'Senior Backend Developer' },
          numberOfPositions: { type: 'integer', example: 3 },
          priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'high' },
          reason: { type: 'string', example: 'Business expansion requirement' },
        },
      },
      InterviewRequest: {
        type: 'object',
        required: ['candidateName', 'scheduledAt', 'interviewType'],
        properties: {
          candidateName: { type: 'string', example: 'Rohit Mehta' },
          scheduledAt: { type: 'string', format: 'date-time', example: '2026-09-10T10:00:00' },
          interviewType: { type: 'string', enum: ['technical', 'hr', 'cultural', 'final'], example: 'technical' },
          interviewerName: { type: 'string', example: 'Priya Singh' },
          notes: { type: 'string', example: 'Round 2 Technical Interview' },
        },
      },
      ApprovalActionRequest: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['approve', 'reject'], example: 'approve' },
          remarks: { type: 'string', example: 'Approved as per policy' },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }, { CompanyHeader: [] }],
  paths: {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. AUTHENTICATION
    // ═══════════════════════════════════════════════════════════════════════
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User Login',
        description: 'Authenticate with email & password. Returns JWT token.',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
        responses: { 200: OK, 401: UNAUTHORIZED, 500: SERVER_ERROR },
      },
    },
    '/auth/register-organization': {
      post: {
        tags: ['Authentication'],
        summary: 'Register New Organization Tenant',
        description: 'Creates a new multi-tenant organization with an admin account.',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterOrgRequest' } } } },
        responses: { ...stdCreate },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh Access Token',
        description: 'Issues a fresh JWT token pair using an active session cookie.',
        responses: { ...stdResponses },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout User',
        description: 'Revokes active session tokens and clears auth cookies.',
        responses: { ...stdResponses },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get Logged-In User Profile',
        description: 'Returns name, email, and role of the current authenticated user.',
        responses: { ...stdResponses },
      },
      put: {
        tags: ['Authentication'],
        summary: 'Update Profile',
        responses: { ...stdResponses },
      },
    },
    '/auth/change-password': {
      put: {
        tags: ['Authentication'],
        summary: 'Change Password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', format: 'password' },
                  newPassword: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: { ...stdResponses },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 2. RBAC & PERMISSIONS
    // ═══════════════════════════════════════════════════════════════════════
    '/rbac/roles': {
      get: { tags: ['RBAC & Permissions'], summary: 'List Configured Roles', responses: { ...stdResponses } },
      post: { tags: ['RBAC & Permissions'], summary: 'Create Custom Role', responses: { ...stdCreate } },
    },
    '/rbac/roles/{id}': {
      get: {
        tags: ['RBAC & Permissions'],
        summary: 'Get Role Details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      put: {
        tags: ['RBAC & Permissions'],
        summary: 'Update Role Permissions',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['RBAC & Permissions'],
        summary: 'Delete Role',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/rbac/permissions': {
      get: { tags: ['RBAC & Permissions'], summary: 'List Permission Tags', responses: { ...stdResponses } },
    },
    '/rbac/assign': {
      post: { tags: ['RBAC & Permissions'], summary: 'Assign Role to User', responses: { ...stdCreate } },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 3. USER MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    '/users': {
      get: { tags: ['User Management'], summary: 'List System Users', responses: { ...stdResponses } },
      post: { tags: ['User Management'], summary: 'Create User Account', responses: { ...stdCreate } },
    },
    '/users/{id}': {
      get: {
        tags: ['User Management'],
        summary: 'Get User Account Details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      patch: {
        tags: ['User Management'],
        summary: 'Update User Account',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['User Management'],
        summary: 'Delete User Account',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 4. EMPLOYEE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    '/employees': {
      get: {
        tags: ['Employee Management'],
        summary: 'List Employees',
        description: 'Paginated employee directory with department and status filters.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name or email' },
          { name: 'departmentName', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'probation', 'notice', 'exit'] } },
        ],
        responses: { ...stdResponses },
      },
      post: {
        tags: ['Employee Management'],
        summary: 'Create New Employee',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/EmployeeRequest' } } } },
        responses: { ...stdCreate },
      },
    },
    '/employees/import': {
      post: { tags: ['Employee Management'], summary: 'Bulk CSV Import Employees', responses: { ...stdCreate } },
    },
    '/employees/{id}': {
      get: {
        tags: ['Employee Management'],
        summary: 'Get Employee Profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      patch: {
        tags: ['Employee Management'],
        summary: 'Update Employee Profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['Employee Management'],
        summary: 'Delete / Deactivate Employee',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/employees/{id}/documents': {
      get: {
        tags: ['Employee Management'],
        summary: 'List Employee Documents',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      post: {
        tags: ['Employee Management'],
        summary: 'Upload Employee Document',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdCreate },
      },
    },
    '/employees/{id}/documents/{docId}': {
      delete: {
        tags: ['Employee Management'],
        summary: 'Delete Employee Document',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'docId', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        responses: { ...stdDelete },
      },
    },
    '/employees/{id}/salary-structure': {
      get: {
        tags: ['Employee Management'],
        summary: 'Get Assigned Salary Structure',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/employees/{id}/leaves': {
      get: {
        tags: ['Employee Management'],
        summary: 'Get Employee Leave History',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/employees/{id}/attendance': {
      get: {
        tags: ['Employee Management'],
        summary: 'Get Employee Attendance Log',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 5. ATTENDANCE & LIVE GPS TRACKING
    // ═══════════════════════════════════════════════════════════════════════
    '/attendance/punch-in': {
      post: {
        tags: ['Attendance & Tracking'],
        summary: 'Clock In (Punch In)',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/PunchRequest' } } } },
        responses: { ...stdResponses },
      },
    },
    '/attendance/punch-out': {
      post: {
        tags: ['Attendance & Tracking'],
        summary: 'Clock Out (Punch Out)',
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/PunchRequest' } } } },
        responses: { ...stdResponses },
      },
    },
    '/attendance/records': {
      get: {
        tags: ['Attendance & Tracking'],
        summary: 'Get Attendance Logs',
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'employeeName', in: 'query', schema: { type: 'string' } },
        ],
        responses: { ...stdResponses },
      },
    },
    '/attendance/today': {
      get: { tags: ['Attendance & Tracking'], summary: "Today's Attendance Overview", responses: { ...stdResponses } },
    },
    '/attendance/regularization': {
      post: { tags: ['Attendance & Tracking'], summary: 'Submit Attendance Regularization Request', responses: { ...stdCreate } },
    },
    '/attendance/regularizations': {
      get: { tags: ['Attendance & Tracking'], summary: 'List Regularization Requests', responses: { ...stdResponses } },
    },
    '/attendance/regularization/{id}/approve': {
      post: {
        tags: ['Attendance & Tracking'],
        summary: 'Approve Regularization Request',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/attendance/regularization/{id}/reject': {
      post: {
        tags: ['Attendance & Tracking'],
        summary: 'Reject Regularization Request',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/attendance/shifts': {
      get: { tags: ['Attendance & Tracking'], summary: 'List Shift Schedules', responses: { ...stdResponses } },
      post: { tags: ['Attendance & Tracking'], summary: 'Create Shift Schedule', responses: { ...stdCreate } },
    },
    '/attendance/shifts/active': {
      get: { tags: ['Attendance & Tracking'], summary: 'List Active Shifts', responses: { ...stdResponses } },
    },
    '/attendance/shifts/{id}': {
      put: {
        tags: ['Attendance & Tracking'],
        summary: 'Update Shift Schedule',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['Attendance & Tracking'],
        summary: 'Delete Shift Schedule',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/livetracking/breadcrumbs': {
      post: { tags: ['Attendance & Tracking'], summary: 'Post GPS Location Breadcrumb', responses: { ...stdResponses } },
    },
    '/livetracking/live': {
      get: { tags: ['Attendance & Tracking'], summary: 'Get Live Employee GPS Locations', responses: { ...stdResponses } },
    },
    '/livetracking/history/{employeeId}': {
      get: {
        tags: ['Attendance & Tracking'],
        summary: 'Get Employee Location History',
        parameters: [{ name: 'employeeId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 6. LEAVES & TIME OFF
    // ═══════════════════════════════════════════════════════════════════════
    '/leaves/types': {
      get: { tags: ['Leaves & Time Off'], summary: 'List Leave Types', responses: { ...stdResponses } },
      post: { tags: ['Leaves & Time Off'], summary: 'Create Leave Type', responses: { ...stdCreate } },
    },
    '/leaves/types/{id}': {
      put: {
        tags: ['Leaves & Time Off'],
        summary: 'Update Leave Type',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['Leaves & Time Off'],
        summary: 'Delete Leave Type',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/leaves/apply': {
      post: {
        tags: ['Leaves & Time Off'],
        summary: 'Apply for Leave',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LeaveApplyRequest' } } } },
        responses: { ...stdCreate },
      },
    },
    '/leaves/applications': {
      get: { tags: ['Leaves & Time Off'], summary: 'List Leave Applications', responses: { ...stdResponses } },
      post: {
        tags: ['Leaves & Time Off'],
        summary: 'Submit Leave Application',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LeaveApplyRequest' } } } },
        responses: { ...stdCreate },
      },
    },
    '/leaves/applications/{applicationId}': {
      get: {
        tags: ['Leaves & Time Off'],
        summary: 'Get Leave Application Details',
        parameters: [{ name: 'applicationId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/leaves/applications/{applicationId}/submit': {
      post: {
        tags: ['Leaves & Time Off'],
        summary: 'Submit Draft Leave Application',
        parameters: [{ name: 'applicationId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/leaves/applications/{applicationId}/cancel': {
      post: {
        tags: ['Leaves & Time Off'],
        summary: 'Cancel Leave Request',
        parameters: [{ name: 'applicationId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/leaves/applications/{applicationId}/withdraw': {
      post: {
        tags: ['Leaves & Time Off'],
        summary: 'Withdraw Leave Request',
        parameters: [{ name: 'applicationId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/leaves/approvals': {
      get: { tags: ['Leaves & Time Off'], summary: 'List Pending Leave Approvals', responses: { ...stdResponses } },
    },
    '/leaves/approvals/pending': {
      get: { tags: ['Leaves & Time Off'], summary: 'Get Approval Inbox', responses: { ...stdResponses } },
    },
    '/leaves/approvals/processed': {
      get: { tags: ['Leaves & Time Off'], summary: 'Get Processed Approval History', responses: { ...stdResponses } },
    },
    '/leaves/approvals/{applicationId}/approve': {
      post: {
        tags: ['Leaves & Time Off'],
        summary: 'Approve Leave Request',
        parameters: [{ name: 'applicationId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ApprovalActionRequest' } } } },
        responses: { ...stdResponses },
      },
    },
    '/leaves/approvals/{applicationId}/reject': {
      post: {
        tags: ['Leaves & Time Off'],
        summary: 'Reject Leave Request',
        parameters: [{ name: 'applicationId', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ApprovalActionRequest' } } } },
        responses: { ...stdResponses },
      },
    },
    '/leaves/applications/{applicationId}/hr-override': {
      post: {
        tags: ['Leaves & Time Off'],
        summary: 'HR Force Override Leave Status',
        parameters: [{ name: 'applicationId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/leaves/balances': {
      get: { tags: ['Leaves & Time Off'], summary: 'Get Employee Leave Balances', responses: { ...stdResponses } },
    },
    '/leaves/policy-mappings': {
      get: { tags: ['Leaves & Time Off'], summary: 'List Leave Policy Mappings', responses: { ...stdResponses } },
      post: { tags: ['Leaves & Time Off'], summary: 'Create Policy Mapping', responses: { ...stdCreate } },
    },
    '/leaves/policy-mappings/{mappingId}': {
      delete: {
        tags: ['Leaves & Time Off'],
        summary: 'Delete Policy Mapping',
        parameters: [{ name: 'mappingId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/leaves/optional-holidays': {
      get: { tags: ['Leaves & Time Off'], summary: 'List Floating / Optional Holidays', responses: { ...stdResponses } },
    },
    '/leaves/policies': {
      get: { tags: ['Leaves & Time Off'], summary: 'List Leave Policies', responses: { ...stdResponses } },
    },
    '/leaves/policies/{id}': {
      put: {
        tags: ['Leaves & Time Off'],
        summary: 'Update Leave Policy Configuration',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 7. PAYROLL & COMPENSATION
    // ═══════════════════════════════════════════════════════════════════════
    '/payroll/structures': {
      get: { tags: ['Payroll & Compensation'], summary: 'List Salary Structures', responses: { ...stdResponses } },
      post: { tags: ['Payroll & Compensation'], summary: 'Create Salary Structure', responses: { ...stdCreate } },
    },
    '/payroll/structures/{id}': {
      put: {
        tags: ['Payroll & Compensation'],
        summary: 'Update Salary Structure',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/payroll/structures/assign': {
      post: {
        tags: ['Payroll & Compensation'],
        summary: 'Assign Salary Structure to Employee',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SalaryAssignRequest' } } } },
        responses: { ...stdResponses },
      },
    },
    '/payroll/runs': {
      get: { tags: ['Payroll & Compensation'], summary: 'List Monthly Payroll Runs', responses: { ...stdResponses } },
      post: { tags: ['Payroll & Compensation'], summary: 'Initiate New Payroll Run', responses: { ...stdCreate } },
    },
    '/payroll/runs/{id}': {
      get: {
        tags: ['Payroll & Compensation'],
        summary: 'Get Payroll Run Details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/payroll/runs/{id}/process': {
      post: {
        tags: ['Payroll & Compensation'],
        summary: 'Process Payroll Calculations',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/payroll/runs/{id}/lock': {
      post: {
        tags: ['Payroll & Compensation'],
        summary: 'Lock Payroll Run',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/payroll/runs/{id}/approve': {
      post: {
        tags: ['Payroll & Compensation'],
        summary: 'Approve Payroll Run',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/payroll/runs/{id}/publish': {
      post: {
        tags: ['Payroll & Compensation'],
        summary: 'Publish Payslips to Employees',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/payroll/payslips': {
      get: {
        tags: ['Payroll & Compensation'],
        summary: 'List Employee Payslips',
        parameters: [
          { name: 'month', in: 'query', schema: { type: 'integer' }, description: 'Month number (1-12)' },
          { name: 'year', in: 'query', schema: { type: 'integer' } },
          { name: 'employeeName', in: 'query', schema: { type: 'string' } },
        ],
        responses: { ...stdResponses },
      },
    },
    '/payroll/payslips/{id}': {
      get: {
        tags: ['Payroll & Compensation'],
        summary: 'Download / View Payslip',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/payroll/loans': {
      get: { tags: ['Payroll & Compensation'], summary: 'List Employee Loans', responses: { ...stdResponses } },
      post: { tags: ['Payroll & Compensation'], summary: 'Apply for Loan', responses: { ...stdCreate } },
    },
    '/payroll/loans/{id}/approve': {
      post: {
        tags: ['Payroll & Compensation'],
        summary: 'Approve Loan Request',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/payroll/reimbursements': {
      get: { tags: ['Payroll & Compensation'], summary: 'List Expense Reimbursements', responses: { ...stdResponses } },
      post: { tags: ['Payroll & Compensation'], summary: 'Submit Reimbursement Claim', responses: { ...stdCreate } },
    },
    '/payroll/reimbursements/{id}/approve': {
      post: {
        tags: ['Payroll & Compensation'],
        summary: 'Approve Reimbursement Claim',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/payroll/settlements': {
      get: { tags: ['Payroll & Compensation'], summary: 'List F&F Settlements', responses: { ...stdResponses } },
      post: { tags: ['Payroll & Compensation'], summary: 'Process Employee F&F Settlement', responses: { ...stdCreate } },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 8. RECRUITMENT & MRF
    // ═══════════════════════════════════════════════════════════════════════
    '/recruitment/mrf': {
      get: { tags: ['Recruitment & MRF'], summary: 'List Manpower Requisitions (MRF)', responses: { ...stdResponses } },
      post: {
        tags: ['Recruitment & MRF'],
        summary: 'Create MRF Request',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/MRFRequest' } } } },
        responses: { ...stdCreate },
      },
    },
    '/recruitment/mrf/{id}': {
      get: {
        tags: ['Recruitment & MRF'],
        summary: 'Get MRF Details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      patch: {
        tags: ['Recruitment & MRF'],
        summary: 'Update MRF Request',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['Recruitment & MRF'],
        summary: 'Delete MRF Request',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/recruitment/mrf/{id}/approve': {
      post: {
        tags: ['Recruitment & MRF'],
        summary: 'Approve MRF Request',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/recruitment/mrf/{id}/reject': {
      post: {
        tags: ['Recruitment & MRF'],
        summary: 'Reject MRF Request',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/recruitment/jobs': {
      get: { tags: ['Recruitment & MRF'], summary: 'List Job Postings', responses: { ...stdResponses } },
      post: {
        tags: ['Recruitment & MRF'],
        summary: 'Create Job Posting',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/JobRequest' } } } },
        responses: { ...stdCreate },
      },
    },
    '/recruitment/jobs/{id}': {
      get: {
        tags: ['Recruitment & MRF'],
        summary: 'Get Job Posting Details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      patch: {
        tags: ['Recruitment & MRF'],
        summary: 'Update Job Posting',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['Recruitment & MRF'],
        summary: 'Delete Job Posting',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/recruitment/jobs/{id}/publish': {
      post: {
        tags: ['Recruitment & MRF'],
        summary: 'Publish Job Posting',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/recruitment/jobs/{id}/close': {
      post: {
        tags: ['Recruitment & MRF'],
        summary: 'Close Job Posting',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/recruitment/candidates': {
      get: { tags: ['Recruitment & MRF'], summary: 'List Candidate Registry', responses: { ...stdResponses } },
      post: { tags: ['Recruitment & MRF'], summary: 'Create Candidate Record', responses: { ...stdCreate } },
    },
    '/recruitment/candidates/{id}': {
      get: {
        tags: ['Recruitment & MRF'],
        summary: 'Get Candidate Profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      patch: {
        tags: ['Recruitment & MRF'],
        summary: 'Update Candidate',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['Recruitment & MRF'],
        summary: 'Delete Candidate',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/recruitment/applications': {
      get: { tags: ['Recruitment & MRF'], summary: 'List Candidate Job Applications', responses: { ...stdResponses } },
      post: { tags: ['Recruitment & MRF'], summary: 'Submit Application', responses: { ...stdCreate } },
    },
    '/recruitment/applications/{applicationId}/move-stage': {
      patch: {
        tags: ['Recruitment & MRF'],
        summary: 'Move Application Pipeline Stage',
        parameters: [{ name: 'applicationId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/recruitment/interviews': {
      get: { tags: ['Recruitment & MRF'], summary: 'List Scheduled Interviews', responses: { ...stdResponses } },
      post: {
        tags: ['Recruitment & MRF'],
        summary: 'Schedule Interview Round',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/InterviewRequest' } } } },
        responses: { ...stdCreate },
      },
    },
    '/recruitment/interviews/{interviewId}/feedback': {
      post: {
        tags: ['Recruitment & MRF'],
        summary: 'Submit Interview Feedback',
        parameters: [{ name: 'interviewId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/recruitment/offers': {
      get: { tags: ['Recruitment & MRF'], summary: 'List Offer Letters', responses: { ...stdResponses } },
      post: { tags: ['Recruitment & MRF'], summary: 'Generate Offer Letter', responses: { ...stdCreate } },
    },
    '/recruitment/offers/{offerId}/accept': {
      post: {
        tags: ['Recruitment & MRF'],
        summary: 'Accept Offer Letter',
        parameters: [{ name: 'offerId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/recruitment/offers/{offerId}/reject': {
      post: {
        tags: ['Recruitment & MRF'],
        summary: 'Reject Offer Letter',
        parameters: [{ name: 'offerId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/recruitment/referrals': {
      get: { tags: ['Recruitment & MRF'], summary: 'List Employee Referrals', responses: { ...stdResponses } },
      post: { tags: ['Recruitment & MRF'], summary: 'Submit Employee Referral', responses: { ...stdCreate } },
    },
    '/recruitment/resume-bank': {
      get: { tags: ['Recruitment & MRF'], summary: 'List Resume Bank', responses: { ...stdResponses } },
      post: { tags: ['Recruitment & MRF'], summary: 'Add Resume to Bank', responses: { ...stdCreate } },
    },
    '/recruitment/dashboard': {
      get: { tags: ['Recruitment & MRF'], summary: 'Recruitment Dashboard Metrics', responses: { ...stdResponses } },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 9. PUBLIC CAREER PORTAL
    // ═══════════════════════════════════════════════════════════════════════
    '/public/jobs': {
      get: { tags: ['Public Career Portal'], summary: 'List Published Job Openings', security: [], responses: { ...stdResponses } },
    },
    '/public/job-portal/openings': {
      get: { tags: ['Public Career Portal'], summary: 'List Public Job Portal Openings', security: [], responses: { ...stdResponses } },
    },
    '/public/job-reference/openings': {
      get: { tags: ['Public Career Portal'], summary: 'List Public Job Reference Openings', security: [], responses: { ...stdResponses } },
    },
    '/public/job-portal/settings': {
      get: { tags: ['Public Career Portal'], summary: 'Get Career Portal Branding Settings', security: [], responses: { ...stdResponses } },
    },
    '/public/job-reference/{mrfId}': {
      get: {
        tags: ['Public Career Portal'],
        summary: 'Get Job Reference Details',
        security: [],
        parameters: [{ name: 'mrfId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { ...stdResponses },
      },
    },
    '/public/job-reference/{mrfId}/apply': {
      post: {
        tags: ['Public Career Portal'],
        summary: 'Submit Candidate Application',
        security: [],
        parameters: [{ name: 'mrfId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { ...stdResponses },
      },
    },
    '/recruitment/career-portal-settings': {
      get: { tags: ['Public Career Portal'], summary: 'Get Career Portal Settings (HR/Admin)', responses: { ...stdResponses } },
      put: { tags: ['Public Career Portal'], summary: 'Update Career Portal Settings (HR/Admin)', responses: { ...stdResponses } },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 10. PERFORMANCE & OKRs
    // ═══════════════════════════════════════════════════════════════════════
    '/performance/goals': {
      get: { tags: ['Performance & OKRs'], summary: 'List OKRs and Performance Goals', responses: { ...stdResponses } },
      post: { tags: ['Performance & OKRs'], summary: 'Create Performance Goal / OKR', responses: { ...stdCreate } },
    },
    '/performance/goals/{id}': {
      put: {
        tags: ['Performance & OKRs'],
        summary: 'Update Goal',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['Performance & OKRs'],
        summary: 'Delete Goal',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/performance/appraisals': {
      get: { tags: ['Performance & OKRs'], summary: 'List Appraisal Review Cycles', responses: { ...stdResponses } },
      post: { tags: ['Performance & OKRs'], summary: 'Initiate Appraisal Review', responses: { ...stdCreate } },
    },
    '/performance/pips': {
      get: { tags: ['Performance & OKRs'], summary: 'List Performance Improvement Plans (PIP)', responses: { ...stdResponses } },
      post: { tags: ['Performance & OKRs'], summary: 'Create PIP Plan', responses: { ...stdCreate } },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 11. ASSET MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════
    '/assets': {
      get: { tags: ['Asset Management'], summary: 'List Organization Assets', responses: { ...stdResponses } },
      post: { tags: ['Asset Management'], summary: 'Register New Asset', responses: { ...stdCreate } },
    },
    '/assets/{id}': {
      get: {
        tags: ['Asset Management'],
        summary: 'Get Asset Details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      put: {
        tags: ['Asset Management'],
        summary: 'Update Asset',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['Asset Management'],
        summary: 'Delete Asset',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/assets/{id}/assign': {
      post: {
        tags: ['Asset Management'],
        summary: 'Assign Asset to Employee',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/assets/{id}/return': {
      post: {
        tags: ['Asset Management'],
        summary: 'Return Assigned Asset',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 12. SETTINGS & MASTERS
    // ═══════════════════════════════════════════════════════════════════════
    '/settings/company': {
      get: { tags: ['Settings & Masters'], summary: 'Get Company Profile Settings', responses: { ...stdResponses } },
      put: { tags: ['Settings & Masters'], summary: 'Update Company Profile', responses: { ...stdResponses } },
    },
    '/settings/companies': {
      get: { tags: ['Settings & Masters'], summary: 'List Sub-Companies / Branches', responses: { ...stdResponses } },
    },
    '/settings/departments': {
      get: { tags: ['Settings & Masters'], summary: 'List Departments', responses: { ...stdResponses } },
      post: { tags: ['Settings & Masters'], summary: 'Create Department', responses: { ...stdCreate } },
    },
    '/settings/departments/{id}': {
      put: {
        tags: ['Settings & Masters'],
        summary: 'Update Department',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['Settings & Masters'],
        summary: 'Delete Department',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/settings/designations': {
      get: { tags: ['Settings & Masters'], summary: 'List Designations', responses: { ...stdResponses } },
      post: { tags: ['Settings & Masters'], summary: 'Create Designation', responses: { ...stdCreate } },
    },
    '/settings/designations/{id}': {
      put: {
        tags: ['Settings & Masters'],
        summary: 'Update Designation',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
      delete: {
        tags: ['Settings & Masters'],
        summary: 'Delete Designation',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdDelete },
      },
    },
    '/settings/locations': {
      get: { tags: ['Settings & Masters'], summary: 'List Office Locations', responses: { ...stdResponses } },
      post: { tags: ['Settings & Masters'], summary: 'Create Office Location', responses: { ...stdCreate } },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 13. MANAGER PORTAL
    // ═══════════════════════════════════════════════════════════════════════
    '/manager/team': {
      get: { tags: ['Manager Portal'], summary: 'Get Department Team Roster (All Tiers)', responses: { ...stdResponses } },
    },
    '/manager/dashboard': {
      get: { tags: ['Manager Portal'], summary: 'Get Manager Dashboard KPIs', responses: { ...stdResponses } },
    },
    '/manager/approvals': {
      get: { tags: ['Manager Portal'], summary: 'Get Manager Approval Inbox', responses: { ...stdResponses } },
    },
    '/manager/approvals/{id}/action': {
      post: {
        tags: ['Manager Portal'],
        summary: 'Approve or Reject Request',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/ApprovalActionRequest' } } } },
        responses: { ...stdResponses },
      },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 14. TEAM LEAD PORTAL
    // ═══════════════════════════════════════════════════════════════════════
    '/team-lead/members': {
      get: { tags: ['Team Lead Portal'], summary: 'Get Team Members Roster', responses: { ...stdResponses } },
    },
    '/team-lead/attendance': {
      get: { tags: ['Team Lead Portal'], summary: 'Get Team Daily Attendance', responses: { ...stdResponses } },
    },
    '/team-lead/approvals': {
      get: { tags: ['Team Lead Portal'], summary: 'Get Team Lead Approval Inbox', responses: { ...stdResponses } },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 15. NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════════════
    '/notifications': {
      get: { tags: ['Notifications'], summary: 'List User Notifications', responses: { ...stdResponses } },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark Notification as Read',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { ...stdResponses },
      },
    },
    '/notifications/read-all': {
      post: { tags: ['Notifications'], summary: 'Mark All Notifications as Read', responses: { ...stdResponses } },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 16. WORKFLOW APPROVALS ENGINE
    // ═══════════════════════════════════════════════════════════════════════
    '/workflows': {
      get: { tags: ['Workflow Approvals'], summary: 'List Configured Approval Workflows', responses: { ...stdResponses } },
      post: { tags: ['Workflow Approvals'], summary: 'Create Approval Workflow Rule', responses: { ...stdCreate } },
    },
    '/workflows/approvals': {
      get: { tags: ['Workflow Approvals'], summary: 'List Pending Workflow Approval Tasks', responses: { ...stdResponses } },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 17. MARKETPLACE & LICENSING
    // ═══════════════════════════════════════════════════════════════════════
    '/marketplace/addons': {
      get: { tags: ['Marketplace & Licensing'], summary: 'List Available Marketplace Add-ons', responses: { ...stdResponses } },
    },
    '/marketplace/addons/{id}/enable': {
      post: {
        tags: ['Marketplace & Licensing'],
        summary: 'Enable Marketplace Add-on',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { ...stdResponses },
      },
    },
    '/licensing/status': {
      get: { tags: ['Marketplace & Licensing'], summary: 'Get Tenant License & Subscription Status', responses: { ...stdResponses } },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 18. SUPER ADMIN
    // ═══════════════════════════════════════════════════════════════════════
    '/superadmin/organizations': {
      get: { tags: ['Super Admin'], summary: 'List All Tenant Organizations', responses: { ...stdResponses } },
      post: { tags: ['Super Admin'], summary: 'Provision New Tenant Organization', responses: { ...stdCreate } },
    },
    '/superadmin/subscriptions': {
      get: { tags: ['Super Admin'], summary: 'List Subscription Plans & Billing', responses: { ...stdResponses } },
    },
    '/superadmin/audit-logs': {
      get: { tags: ['Super Admin'], summary: 'Get System Global Audit Logs', responses: { ...stdResponses } },
    },

    // ═══════════════════════════════════════════════════════════════════════
    // 19. SYSTEM REPORTS & DASHBOARDS
    // ═══════════════════════════════════════════════════════════════════════
    '/dashboard': {
      get: { tags: ['System Reports & Dashboards'], summary: 'Smart Dashboard Metrics (Role-Based)', responses: { ...stdResponses } },
    },
    '/reports/options': {
      get: { tags: ['System Reports & Dashboards'], summary: 'Get Report Filter Dropdown Options', responses: { ...stdResponses } },
    },
    '/health': {
      get: { tags: ['System Reports & Dashboards'], summary: 'API Health Check', security: [], responses: { 200: OK } },
    },
  },
};
