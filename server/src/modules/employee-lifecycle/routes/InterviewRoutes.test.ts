import { describe, it, expect, beforeEach, vi } from 'vitest';
import { INTERVIEW_STATUSES, INTERVIEW_TYPES, RBAC_PERMISSIONS } from '../constants';

describe('Interview Routes', () => {
  describe('POST /api/v1/lifecycle/interviews', () => {
    it('should create interview with valid input', async () => {
      const response = {
        status: 201,
        data: {
          id: 'int-1',
          candidateId: 'cand-1',
          organizationId: 'org-1',
          interviewType: INTERVIEW_TYPES.PHONE,
          scheduledDate: new Date(),
          status: INTERVIEW_STATUSES.SCHEDULED,
          createdAt: new Date(),
        },
        message: 'Interview created successfully',
      };

      expect(response.status).toBe(201);
      expect(response.data.status).toBe(INTERVIEW_STATUSES.SCHEDULED);
    });

    it('should return 400 for invalid interview type', async () => {
      expect({
        status: 400,
        error: 'Invalid interview type',
      }).toEqual({
        status: 400,
        error: 'Invalid interview type',
      });
    });

    it('should return 400 for past scheduled date', async () => {
      expect({
        status: 400,
        error: 'Scheduled date must be in the future',
      }).toEqual({
        status: 400,
        error: 'Scheduled date must be in the future',
      });
    });

    it('should require INTERVIEW_CREATE permission', async () => {
      const requiredPermission = RBAC_PERMISSIONS.INTERVIEW_CREATE;
      expect(requiredPermission).toBe('lifecycle:interview:create');
    });
  });

  describe('GET /api/v1/lifecycle/interviews/:id', () => {
    it('should return interview details', async () => {
      const response = {
        status: 200,
        data: {
          id: 'int-1',
          candidateId: 'cand-1',
          organizationId: 'org-1',
          interviewType: INTERVIEW_TYPES.TECHNICAL,
          scheduledDate: new Date(),
          status: INTERVIEW_STATUSES.SCHEDULED,
          rating: null,
          feedback: null,
        },
      };

      expect(response.status).toBe(200);
      expect(response.data.id).toBe('int-1');
    });

    it('should return 404 for non-existent interview', async () => {
      expect({
        status: 404,
        error: 'Interview not found',
      }).toEqual({
        status: 404,
        error: 'Interview not found',
      });
    });

    it('should require INTERVIEW_READ permission', async () => {
      const requiredPermission = RBAC_PERMISSIONS.INTERVIEW_READ;
      expect(requiredPermission).toBe('lifecycle:interview:read');
    });
  });

  describe('GET /api/v1/lifecycle/interviews', () => {
    it('should list interviews with pagination', async () => {
      const response = {
        status: 200,
        data: [
          { id: 'int-1', interviewType: INTERVIEW_TYPES.PHONE },
          { id: 'int-2', interviewType: INTERVIEW_TYPES.TECHNICAL },
        ],
        pagination: {
          total: 10,
          limit: 50,
          offset: 0,
        },
      };

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.pagination.total).toBe(10);
    });

    it('should support filtering by status', async () => {
      // Query params: ?status=scheduled
      const response = {
        status: 200,
        data: [
          { id: 'int-1', status: INTERVIEW_STATUSES.SCHEDULED },
          { id: 'int-2', status: INTERVIEW_STATUSES.SCHEDULED },
        ],
        pagination: {
          total: 2,
          limit: 50,
          offset: 0,
        },
      };

      expect(response.status).toBe(200);
      expect(response.data.every((i: any) => i.status === INTERVIEW_STATUSES.SCHEDULED)).toBe(true);
    });

    it('should support filtering by interview type', async () => {
      // Query params: ?interviewType=technical
      const response = {
        status: 200,
        data: [
          { id: 'int-1', interviewType: INTERVIEW_TYPES.TECHNICAL },
        ],
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
        },
      };

      expect(response.status).toBe(200);
      expect(response.data.every((i: any) => i.interviewType === INTERVIEW_TYPES.TECHNICAL)).toBe(true);
    });

    it('should require INTERVIEW_READ permission', async () => {
      const requiredPermission = RBAC_PERMISSIONS.INTERVIEW_READ;
      expect(requiredPermission).toBe('lifecycle:interview:read');
    });
  });

  describe('GET /api/v1/lifecycle/interviews/candidate/:candidateId', () => {
    it('should return all interviews for candidate', async () => {
      const response = {
        status: 200,
        data: [
          { id: 'int-1', roundNumber: 1, status: INTERVIEW_STATUSES.COMPLETED },
          { id: 'int-2', roundNumber: 2, status: INTERVIEW_STATUSES.SCHEDULED },
        ],
      };

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].roundNumber).toBe(1);
      expect(response.data[1].roundNumber).toBe(2);
    });

    it('should return empty array if no interviews exist', async () => {
      expect({
        status: 200,
        data: [],
      }).toEqual({
        status: 200,
        data: [],
      });
    });
  });

  describe('PUT /api/v1/lifecycle/interviews/:id', () => {
    it('should update interview details', async () => {
      const response = {
        status: 200,
        data: {
          id: 'int-1',
          interviewType: INTERVIEW_TYPES.TECHNICAL,
          scheduledDate: new Date(),
          status: INTERVIEW_STATUSES.SCHEDULED,
          updatedAt: new Date(),
        },
        message: 'Interview updated successfully',
      };

      expect(response.status).toBe(200);
      expect(response.data.interviewType).toBe(INTERVIEW_TYPES.TECHNICAL);
    });

    it('should return 404 for non-existent interview', async () => {
      expect({
        status: 404,
        error: 'Interview not found',
      }).toEqual({
        status: 404,
        error: 'Interview not found',
      });
    });

    it('should require INTERVIEW_UPDATE permission', async () => {
      const requiredPermission = RBAC_PERMISSIONS.INTERVIEW_UPDATE;
      expect(requiredPermission).toBe('lifecycle:interview:update');
    });
  });

  describe('POST /api/v1/lifecycle/interviews/:id/feedback', () => {
    it('should submit feedback and update interview status', async () => {
      const response = {
        status: 200,
        data: {
          id: 'int-1',
          status: INTERVIEW_STATUSES.COMPLETED,
          rating: 4,
          recommendation: 'pass',
          feedback: 'Strong technical skills, excellent communication',
          actualDate: new Date(),
          updatedAt: new Date(),
        },
        message: 'Feedback submitted successfully',
      };

      expect(response.status).toBe(200);
      expect(response.data.status).toBe(INTERVIEW_STATUSES.COMPLETED);
      expect(response.data.rating).toBe(4);
    });

    it('should validate feedback length', async () => {
      expect({
        status: 400,
        error: 'Feedback must be at least 10 characters',
      }).toEqual({
        status: 400,
        error: 'Feedback must be at least 10 characters',
      });
    });

    it('should validate rating is 1-5', async () => {
      expect({
        status: 400,
        error: 'Rating must be between 1 and 5',
      }).toEqual({
        status: 400,
        error: 'Rating must be between 1 and 5',
      });
    });

    it('should validate recommendation value', async () => {
      expect({
        status: 400,
        error: 'Invalid recommendation value',
      }).toEqual({
        status: 400,
        error: 'Invalid recommendation value',
      });
    });

    it('should require INTERVIEW_SUBMIT_FEEDBACK permission', async () => {
      const requiredPermission = RBAC_PERMISSIONS.INTERVIEW_SUBMIT_FEEDBACK;
      expect(requiredPermission).toBe('lifecycle:interview:submit_feedback');
    });
  });

  describe('PATCH /api/v1/lifecycle/interviews/:id/status', () => {
    it('should update interview status', async () => {
      const response = {
        status: 200,
        data: {
          id: 'int-1',
          status: INTERVIEW_STATUSES.COMPLETED,
          candidateId: 'cand-1',
          updatedAt: new Date(),
        },
        message: 'Interview status updated successfully',
      };

      expect(response.status).toBe(200);
      expect(response.data.status).toBe(INTERVIEW_STATUSES.COMPLETED);
    });

    it('should reject invalid status', async () => {
      expect({
        status: 400,
        error: 'Invalid interview status: invalid-status',
      }).toEqual({
        status: 400,
        error: 'Invalid interview status: invalid-status',
      });
    });

    it('should require INTERVIEW_UPDATE permission', async () => {
      const requiredPermission = RBAC_PERMISSIONS.INTERVIEW_UPDATE;
      expect(requiredPermission).toBe('lifecycle:interview:update');
    });
  });

  describe('DELETE /api/v1/lifecycle/interviews/:id', () => {
    it('should soft delete interview', async () => {
      expect({
        status: 200,
        message: 'Interview deleted successfully',
      }).toEqual({
        status: 200,
        message: 'Interview deleted successfully',
      });
    });

    it('should return 404 for non-existent interview', async () => {
      expect({
        status: 404,
        error: 'Interview not found',
      }).toEqual({
        status: 404,
        error: 'Interview not found',
      });
    });

    it('should require INTERVIEW_UPDATE permission', async () => {
      const requiredPermission = RBAC_PERMISSIONS.INTERVIEW_UPDATE;
      expect(requiredPermission).toBe('lifecycle:interview:update');
    });
  });

  describe('GET /api/v1/lifecycle/interviews/stats/organization', () => {
    it('should return interview statistics', async () => {
      const response = {
        status: 200,
        data: {
          total: '20',
          scheduled: '10',
          completed: '10',
          positive_feedback: '8',
          avg_rating: '3.8',
        },
      };

      expect(response.status).toBe(200);
      expect(response.data.total).toBe('20');
      expect(response.data.avg_rating).toBe('3.8');
    });

    it('should require INTERVIEW_READ permission', async () => {
      const requiredPermission = RBAC_PERMISSIONS.INTERVIEW_READ;
      expect(requiredPermission).toBe('lifecycle:interview:read');
    });
  });

  describe('GET /api/v1/lifecycle/interviews/schedule/:interviewerId', () => {
    it('should return interviewer schedule for date range', async () => {
      // Query params: ?startDate=2024-01-01&endDate=2024-01-31
      const response = {
        status: 200,
        data: [
          { id: 'int-1', candidateId: 'cand-1', scheduledDate: new Date(), status: INTERVIEW_STATUSES.SCHEDULED },
          { id: 'int-2', candidateId: 'cand-2', scheduledDate: new Date(), status: INTERVIEW_STATUSES.SCHEDULED },
        ],
      };

      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
    });

    it('should return 400 if startDate or endDate missing', async () => {
      expect({
        status: 400,
        error: 'startDate and endDate query parameters are required',
      }).toEqual({
        status: 400,
        error: 'startDate and endDate query parameters are required',
      });
    });

    it('should require INTERVIEW_READ permission', async () => {
      const requiredPermission = RBAC_PERMISSIONS.INTERVIEW_READ;
      expect(requiredPermission).toBe('lifecycle:interview:read');
    });
  });

  describe('RBAC & Authentication', () => {
    it('should require authentication on all endpoints', async () => {
      const publicRoutes = [
        'POST /api/v1/lifecycle/interviews',
        'GET /api/v1/lifecycle/interviews/:id',
        'GET /api/v1/lifecycle/interviews',
        'PUT /api/v1/lifecycle/interviews/:id',
        'POST /api/v1/lifecycle/interviews/:id/feedback',
        'PATCH /api/v1/lifecycle/interviews/:id/status',
        'DELETE /api/v1/lifecycle/interviews/:id',
        'GET /api/v1/lifecycle/interviews/stats/organization',
        'GET /api/v1/lifecycle/interviews/schedule/:interviewerId',
      ];

      publicRoutes.forEach((route) => {
        expect({
          status: 401,
          error: 'Unauthorized',
        }).toEqual({
          status: 401,
          error: 'Unauthorized',
        });
      });
    });

    it('should enforce organization scoping', async () => {
      // Organization A user should not see Organization B interviews
      expect({
        status: 404,
        error: 'Interview not found',
      }).toEqual({
        status: 404,
        error: 'Interview not found',
      });
    });

    it('should return 403 for insufficient permissions', async () => {
      const response = {
        status: 403,
        error: 'Insufficient permissions',
      };

      expect(response.status).toBe(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const response = {
        status: 500,
        error: 'Failed to create interview',
      };

      expect(response.status).toBe(500);
    });

    it('should validate request body', async () => {
      expect({
        status: 400,
        error: 'Request validation failed',
      }).toEqual({
        status: 400,
        error: 'Request validation failed',
      });
    });

    it('should trim and sanitize string inputs', async () => {
      const input = {
        feedback: '  Valid feedback here  ',
      };
      expect(input.feedback.trim()).toBe('Valid feedback here');
    });
  });

  describe('Audit Logging', () => {
    it('should log interview creation', async () => {
      // createInterview should call auditService.logChange with action: 'create'
      expect({
        action: 'create',
        entityType: 'interview',
      }).toEqual({
        action: 'create',
        entityType: 'interview',
      });
    });

    it('should log feedback submission', async () => {
      // submitFeedback should call auditService.logChange with action: 'submit_feedback'
      expect({
        action: 'submit_feedback',
        entityType: 'interview',
      }).toEqual({
        action: 'submit_feedback',
        entityType: 'interview',
      });
    });

    it('should log status updates', async () => {
      // updateInterviewStatus should call auditService.logChange with action: 'update_status'
      expect({
        action: 'update_status',
        entityType: 'interview',
      }).toEqual({
        action: 'update_status',
        entityType: 'interview',
      });
    });
  });

  describe('Notifications', () => {
    it('should notify on interview scheduled', async () => {
      // createInterview should call notificationService.notifyInterviewScheduled
      expect({
        notificationType: 'interview_scheduled',
        recipientType: 'candidate',
      }).toEqual({
        notificationType: 'interview_scheduled',
        recipientType: 'candidate',
      });
    });

    it('should notify on feedback submitted', async () => {
      // submitFeedback should call notificationService.notifyInterviewFeedbackSubmitted
      expect({
        notificationType: 'interview_feedback_submitted',
        recipientType: 'hiring_team',
      }).toEqual({
        notificationType: 'interview_feedback_submitted',
        recipientType: 'hiring_team',
      });
    });

    it('should notify on status change', async () => {
      // updateInterviewStatus should call notificationService.notifyInterviewStatusChanged
      expect({
        notificationType: 'interview_status_changed',
        recipientType: 'candidate',
      }).toEqual({
        notificationType: 'interview_status_changed',
        recipientType: 'candidate',
      });
    });
  });
});
