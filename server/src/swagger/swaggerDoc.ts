export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Apponext HRMS Backend API Documentation',
    version: '1.0.0',
    description: `Complete REST API Documentation for Apponext HRMS Platform.
    
Supports multi-tenant organization management, recruitment platform, candidate job application, attendance tracking, leave workflows, and executive module management.`,
    contact: {
      name: 'Apponext Engineering Team',
      email: 'support@apponext.com',
      url: 'https://apponext.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Local Development API v1 Server',
    },
    {
      url: 'http://localhost:5000',
      description: 'Local Base Server Root',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT Authorization token: Bearer <JWT_TOKEN>',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description' },
        },
      },
      JobPosting: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          jobCode: { type: 'string', example: 'JOB-2026-001' },
          jobTitle: { type: 'string', example: 'Senior Full Stack Developer' },
          departmentId: { type: 'integer', example: 2 },
          departmentName: { type: 'string', example: 'Engineering' },
          employmentType: { type: 'string', example: 'Full Time' },
          experienceLevel: { type: 'string', example: '5-8 Years' },
          minSalary: { type: 'number', example: 800000 },
          maxSalary: { type: 'number', example: 1400000 },
          isPublished: { type: 'boolean', example: true },
          deadlineDate: { type: 'string', example: '2026-12-31' },
        },
      },
      CareerPortalSettings: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          organizationId: { type: 'integer', example: 1 },
          portalTitle: { type: 'string', example: 'Career Portal' },
          portalTagline: { type: 'string', example: 'Find Your Next Opportunity' },
          bannerDescription: { type: 'string', example: 'Explore open roles, apply directly, or submit a referral application.' },
          companyLogoUrl: { type: 'string', example: 'https://example.com/logo.png' },
          primaryColor: { type: 'string', example: '#4f46e5' },
          showAccountInfo: { type: 'boolean', example: false },
          showBackToHrms: { type: 'boolean', example: true },
          copyrightText: { type: 'string', example: '© 2026 HRMS Career Portal. All rights reserved.' },
          formFieldsConfig: { type: 'object' },
        },
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
  paths: {
    '/public/job-portal/openings': {
      get: {
        summary: 'List Public Active Job Openings',
        tags: ['Public Career Portal'],
        parameters: [
          { name: 'organizationId', in: 'query', schema: { type: 'integer' }, description: 'Organization ID' },
          { name: 'departmentName', in: 'query', schema: { type: 'string' }, description: 'Department Name Filter' },
          { name: 'employmentType', in: 'query', schema: { type: 'string' }, description: 'Employment Type Filter' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Keyword Search' },
        ],
        responses: {
          '200': {
            description: 'List of active published job postings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/JobPosting' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/public/job-portal/settings': {
      get: {
        summary: 'Get Public Career Portal Customization Settings',
        tags: ['Public Career Portal'],
        parameters: [
          { name: 'organizationId', in: 'query', schema: { type: 'integer' }, description: 'Organization ID' },
        ],
        responses: {
          '200': {
            description: 'Public portal customization branding & field requirements',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/CareerPortalSettings' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/public/job-reference/{requestId}': {
      get: {
        summary: 'Get Job Reference / Apply Details by Request ID',
        tags: ['Public Career Portal'],
        parameters: [
          { name: 'requestId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'MRF job posting reference details',
          },
        },
      },
    },
    '/public/job-reference/{mrfId}/apply': {
      post: {
        summary: 'Submit Candidate Application / New Candidate Registration',
        tags: ['Public Career Portal'],
        parameters: [
          { name: 'mrfId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Rahul Sharma' },
                  emailId: { type: 'string', example: 'rahul.sharma@example.com' },
                  contactNumber: { type: 'string', example: '9876543210' },
                  gender: { type: 'string', example: 'Male' },
                  resumeUrl: { type: 'string', description: 'Base64 file data or download URL' },
                  signatureUrl: { type: 'string', description: 'Base64 image data or download URL' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Candidate application registered successfully',
          },
        },
      },
    },
    '/recruitment/career-portal-settings': {
      get: {
        summary: 'Get Career Portal Customization Settings (HR/Admin)',
        tags: ['Recruitment Platform'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Career portal settings configuration object',
          },
        },
      },
      put: {
        summary: 'Save/Update Career Portal Customization Settings (HR/Admin)',
        tags: ['Recruitment Platform'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CareerPortalSettings' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Settings saved successfully',
          },
        },
      },
    },
    '/recruitment/jobs': {
      get: {
        summary: 'List All Job Postings (HR/Admin)',
        tags: ['Recruitment Platform'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Array of job postings' },
        },
      },
      post: {
        summary: 'Create New Job Posting',
        tags: ['Recruitment Platform'],
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Job posting created' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'User Login & Authenticate',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'admin@apponext.com' },
                  password: { type: 'string', example: 'Password123' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Token and User details returned' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get Currently Logged In User Info',
        tags: ['Authentication'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Logged in user profile' },
        },
      },
    },
    '/employees': {
      get: {
        summary: 'List Employees',
        tags: ['Employee Management'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'List of employees' },
        },
      },
    },
    '/attendance/records': {
      get: {
        summary: 'Get Attendance Logs',
        tags: ['Attendance'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Attendance logs' },
        },
      },
    },
    '/leaves/requests': {
      get: {
        summary: 'Get Leave Requests',
        tags: ['Leave Management'],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Leave requests list' },
        },
      },
    },
  },
};
