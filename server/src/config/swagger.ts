/**
 * ApponextHRMS - OpenAPI 3.0 Swagger Specification
 */
export const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'ApponextHRMS API Documentation',
    version: '1.0.0',
    description: `
### Multi-Tenant Enterprise Human Resource Management System (HRMS)
Welcome to the interactive REST API documentation for **ApponextHRMS**.

#### Authentication:
* Click **Authorize** to inject your JWT token: \`Bearer <accessToken>\`.
* Pass multi-company context via header: \`X-Company-Id: <selectedCompanyId>\`.
    `,
    contact: {
      name: 'Apponext Engineering Team',
      email: 'support@apponext.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development Server (v1)',
    },
    {
      url: '/api/v1',
      description: 'Current Host (Relative v1)',
    },
  ],
  tags: [
    { name: 'Authentication', description: 'User login, registration, token refresh, and profile management' },
    { name: 'Employees', description: 'Employee directory, profiles, lifecycle, and document management' },
    { name: 'Attendance & Tracking', description: 'Clock in/out, breaks, shifts, location validation, and live GPS tracking' },
    { name: 'Leaves & Time Off', description: 'Leave applications, approvals, quotas, and encashment' },
    { name: 'Payroll & Compensation', description: 'Salary structures, monthly payroll processing, payslips, and revisions' },
    { name: 'Recruitment & MRF', description: 'Manpower requests (MRF), job postings, applicant tracking, and offer letters' },
    { name: 'Performance & OKRs', description: 'Goal setting, appraisal cycles, competencies, and PIPs' },
    { name: 'Assets & Equipment', description: 'Hardware/software asset assignment, inventory, and tracking' },
    { name: 'Settings & Masters', description: 'Organization profile, companies, departments, designations, and policies' },
    { name: 'Manager Portal', description: 'Department roster, multi-tier approvals, and direct reports' },
    { name: 'Team Lead Portal', description: 'Team attendance, task monitoring, and shift management' },
    { name: 'Super Admin', description: 'Tenant provisioning, subscription tiers, and platform audit' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your Bearer token obtained from `/auth/login`',
      },
      CompanyHeader: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Company-Id',
        description: 'Multi-company / branch context ID (e.g., `4` or `9`)',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          status: { type: 'string', example: 'active' },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'harsh@gmail.com' },
          password: { type: 'string', format: 'password', example: 'harsh@gmail.com' },
        },
      },
      EmployeeCreateRequest: {
        type: 'object',
        required: ['employeeCode', 'firstName', 'lastName', 'email', 'dateOfJoining'],
        properties: {
          employeeCode: { type: 'string', example: 'EMP001' },
          firstName: { type: 'string', example: 'Aarav' },
          lastName: { type: 'string', example: 'Sharma' },
          email: { type: 'string', format: 'email', example: 'aarav.sharma@example.com' },
          mobile: { type: 'string', example: '+91 9876543210' },
          gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
          dateOfJoining: { type: 'string', format: 'date', example: '2026-08-17' },
          employmentType: { type: 'string', enum: ['full_time', 'part_time', 'contract', 'internship'], example: 'full_time' },
          departmentId: { type: 'integer', example: 1 },
          designationId: { type: 'integer', example: 1 },
          status: { type: 'string', example: 'active' },
          accessRole: { type: 'string', enum: ['employee', 'team_lead', 'manager', 'hr_manager', 'organization_admin'], example: 'employee' },
        },
      },
      PunchRequest: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['in', 'out'], example: 'in' },
          latitude: { type: 'number', example: 19.0760 },
          longitude: { type: 'number', example: 72.8777 },
          locationId: { type: 'integer', example: 1 },
          notes: { type: 'string', example: 'Clocking in from main office' },
        },
      },
      LeaveApplyRequest: {
        type: 'object',
        required: ['leaveTypeId', 'startDate', 'endDate', 'reason'],
        properties: {
          leaveTypeId: { type: 'integer', example: 1 },
          startDate: { type: 'string', format: 'date', example: '2026-09-01' },
          endDate: { type: 'string', format: 'date', example: '2026-09-03' },
          reason: { type: 'string', example: 'Personal annual vacation' },
          isHalfDay: { type: 'boolean', example: false },
        },
      },
      SalaryStructureAssignRequest: {
        type: 'object',
        required: ['employeeId', 'effectiveFrom', 'grossSalary', 'baseSalary', 'annualCtc'],
        properties: {
          employeeId: { type: 'integer', example: 10 },
          slabId: { type: 'integer', example: 1 },
          structureName: { type: 'string', example: 'Standard IT Grade 1' },
          effectiveFrom: { type: 'string', format: 'date', example: '2026-08-01' },
          grossSalary: { type: 'number', example: 50000 },
          baseSalary: { type: 'number', example: 25000 },
          annualCtc: { type: 'number', example: 600000 },
          netSalary: { type: 'number', example: 45000 },
        },
      },
    },
  },
  security: [
    { bearerAuth: [] },
    { CompanyHeader: [] },
  ],
  paths: {
    // ─────────────────────────────────────────────────────────────────────────
    // AUTHENTICATION
    // ─────────────────────────────────────────────────────────────────────────
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User Login',
        description: 'Authenticate user or administrator with email & password. Sets secure HttpOnly cookies for session management.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        user: {
                          type: 'object',
                          properties: {
                            email: { type: 'string', example: 'harsh@gmail.com' },
                            orgName: { type: 'string', example: 'Kosqu' },
                            roles: { type: 'array', items: { type: 'string' }, example: ['organization_admin'] },
                          },
                        },
                        roles: { type: 'array', items: { type: 'string' }, example: ['organization_admin'] },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid email or password' },
        },
      },
    },
    '/auth/register-organization': {
      post: {
        tags: ['Authentication'],
        summary: 'Register New Organization Tenant',
        description: 'Create a new multi-tenant organization with administrator profile and initial company context.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['organizationName', 'slug', 'firstName', 'lastName', 'email', 'password'],
                properties: {
                  organizationName: { type: 'string', example: 'Acme Global Corp' },
                  slug: { type: 'string', example: 'acme-global' },
                  firstName: { type: 'string', example: 'Jane' },
                  lastName: { type: 'string', example: 'Doe' },
                  email: { type: 'string', format: 'email', example: 'admin@acmeglobal.com' },
                  password: { type: 'string', format: 'password', example: 'SecureP@ss123' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Organization registered successfully' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh Access Token',
        description: 'Issues a fresh session token pair using the secure refreshToken cookie or payload.',
        responses: {
          200: { description: 'Token refreshed successfully' },
          401: { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout User',
        description: 'Revokes active session tokens and clears browser cookies.',
        responses: {
          200: { description: 'Logged out successfully' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get Current Authenticated User Profile',
        description: 'Returns profile details and organizational role permissions for the active session.',
        responses: {
          200: { description: 'Profile details returned' },
          401: { description: 'Unauthorized' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // EMPLOYEES
    // ─────────────────────────────────────────────────────────────────────────
    '/employees': {
      get: {
        tags: ['Employees'],
        summary: 'List Employees',
        description: 'Paginated employee directory filtered by company context, department, designation, and status.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', default: 25 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'probation', 'notice', 'exit'] } },
          { name: 'departmentId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'List of employees' },
        },
      },
      post: {
        tags: ['Employees'],
        summary: 'Create New Employee',
        description: 'Registers a new employee with auto-generated code, credentials, and optional salary slab.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmployeeCreateRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Employee created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    status: { type: 'string', example: 'active' },
                    data: {
                      type: 'object',
                      properties: {
                        employeeName: { type: 'string', example: 'Aarav Sharma' },
                        employeeEmail: { type: 'string', example: 'aarav.sharma@example.com' },
                        organizationName: { type: 'string', example: 'Kosqu' },
                        status: { type: 'string', example: 'active' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/employees/{id}': {
      get: {
        tags: ['Employees'],
        summary: 'Get Employee Profile by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Employee profile data' },
          404: { description: 'Employee not found' },
        },
      },
      patch: {
        tags: ['Employees'],
        summary: 'Update Employee Profile',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
        responses: {
          200: { description: 'Employee updated successfully' },
        },
      },
      delete: {
        tags: ['Employees'],
        summary: 'Delete / Deactivate Employee',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Employee deleted successfully' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ATTENDANCE & TRACKING
    // ─────────────────────────────────────────────────────────────────────────
    '/attendance/punch-in': {
      post: {
        tags: ['Attendance & Tracking'],
        summary: 'Clock In (Punch In)',
        description: 'Records daily punch-in with optional geolocation coordinates and facial recognition verification.',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PunchRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Punch-in recorded' },
        },
      },
    },
    '/attendance/punch-out': {
      post: {
        tags: ['Attendance & Tracking'],
        summary: 'Clock Out (Punch Out)',
        description: 'Records daily punch-out and calculates total effective working hours.',
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PunchRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Punch-out recorded' },
        },
      },
    },
    '/attendance/records': {
      get: {
        tags: ['Attendance & Tracking'],
        summary: 'Get Attendance Logs',
        parameters: [
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'employeeId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Attendance logs list' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LEAVES
    // ─────────────────────────────────────────────────────────────────────────
    '/leaves/apply': {
      post: {
        tags: ['Leaves & Time Off'],
        summary: 'Apply for Leave',
        description: 'Submits a leave application for manager / HR approval workflow.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LeaveApplyRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Leave application submitted' },
        },
      },
    },
    '/leaves/types': {
      get: {
        tags: ['Leaves & Time Off'],
        summary: 'List Configured Leave Types',
        responses: {
          200: { description: 'Leave types array (Casual, Sick, Earned, Maternity, etc.)' },
        },
      },
    },
    '/leaves/balances': {
      get: {
        tags: ['Leaves & Time Off'],
        summary: 'Get Employee Leave Balances',
        responses: {
          200: { description: 'Leave quotas and balances' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PAYROLL
    // ─────────────────────────────────────────────────────────────────────────
    '/payroll/structures': {
      get: {
        tags: ['Payroll & Compensation'],
        summary: 'List Salary Structures & Slabs',
        responses: {
          200: { description: 'List of salary structures' },
        },
      },
    },
    '/payroll/structures/assign': {
      post: {
        tags: ['Payroll & Compensation'],
        summary: 'Assign Salary Slab to Employee',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SalaryStructureAssignRequest' },
            },
          },
        },
        responses: {
          200: { description: 'Salary structure assigned' },
        },
      },
    },
    '/payroll/payslips': {
      get: {
        tags: ['Payroll & Compensation'],
        summary: 'List Payslips',
        parameters: [
          { name: 'month', in: 'query', schema: { type: 'integer' } },
          { name: 'year', in: 'query', schema: { type: 'integer' } },
          { name: 'employeeId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: {
          200: { description: 'Payslips list' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // RECRUITMENT & MRF
    // ─────────────────────────────────────────────────────────────────────────
    '/recruitment/jobs': {
      get: {
        tags: ['Recruitment & MRF'],
        summary: 'List Job Postings & Openings',
        responses: {
          200: { description: 'Job openings' },
        },
      },
    },
    '/recruitment/applicants': {
      get: {
        tags: ['Recruitment & MRF'],
        summary: 'List Job Applicants',
        responses: {
          200: { description: 'Candidate applicants' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PERFORMANCE
    // ─────────────────────────────────────────────────────────────────────────
    '/performance/goals': {
      get: {
        tags: ['Performance & OKRs'],
        summary: 'List OKRs and Performance Goals',
        responses: {
          200: { description: 'Performance goals' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ASSETS
    // ─────────────────────────────────────────────────────────────────────────
    '/assets': {
      get: {
        tags: ['Assets & Equipment'],
        summary: 'List Organization Assets',
        responses: {
          200: { description: 'Asset inventory items' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SETTINGS & MASTERS
    // ─────────────────────────────────────────────────────────────────────────
    '/settings/companies': {
      get: {
        tags: ['Settings & Masters'],
        summary: 'List Sub-Companies / Branches',
        responses: {
          200: { description: 'List of companies within tenant' },
        },
      },
    },
    '/settings/departments': {
      get: {
        tags: ['Settings & Masters'],
        summary: 'List Departments',
        responses: {
          200: { description: 'List of departments' },
        },
      },
    },
    '/settings/designations': {
      get: {
        tags: ['Settings & Masters'],
        summary: 'List Designations',
        responses: {
          200: { description: 'List of designations' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MANAGER & TEAM LEAD
    // ─────────────────────────────────────────────────────────────────────────
    '/manager/team': {
      get: {
        tags: ['Manager Portal'],
        summary: 'Get Department / Direct Reports Roster',
        description: 'Hierarchical query returning all team leads and subordinates under the manager.',
        responses: {
          200: { description: 'Team member roster' },
        },
      },
    },
    '/team-lead/members': {
      get: {
        tags: ['Team Lead Portal'],
        summary: 'Get Team Lead Members Roster',
        responses: {
          200: { description: 'Assigned team members' },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SUPER ADMIN
    // ─────────────────────────────────────────────────────────────────────────
    '/superadmin/organizations': {
      get: {
        tags: ['Super Admin'],
        summary: 'List All Tenant Organizations',
        description: 'Platform-level organization management for super administrators.',
        responses: {
          200: { description: 'All tenant organizations' },
        },
      },
    },
  },
};
