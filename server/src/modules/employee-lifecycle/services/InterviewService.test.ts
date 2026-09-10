import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InterviewService, CreateInterviewInput, SubmitFeedbackInput } from './InterviewService';
import { AppError, ValidationError } from '@/lib/errors';
import { INTERVIEW_STATUSES, INTERVIEW_TYPES } from '../constants';

describe('InterviewService', () => {
  let mockDb: any;
  let mockAuditService: any;
  let mockNotificationService: any;
  let interviewService: InterviewService;

  beforeEach(() => {
    mockDb = {
      query: vi.fn(),
    };

    mockAuditService = {
      logChange: vi.fn().mockResolvedValue(undefined),
    };

    mockNotificationService = {
      notifyInterviewScheduled: vi.fn().mockResolvedValue(undefined),
      notifyInterviewFeedbackSubmitted: vi.fn().mockResolvedValue(undefined),
      notifyInterviewStatusChanged: vi.fn().mockResolvedValue(undefined),
    };

    interviewService = new InterviewService(mockDb, mockAuditService, mockNotificationService);
  });

  describe('createInterview', () => {
    it('should create interview with valid input', async () => {
      const input: CreateInterviewInput = {
        organizationId: 'org-1',
        candidateId: 'cand-1',
        interviewType: INTERVIEW_TYPES.PHONE,
        scheduledDate: new Date(Date.now() + 86400000),
        location: 'Virtual - Zoom',
        interviewerId: 'user-1',
        roundNumber: 1,
        createdBy: 'user-1',
      };

      const mockInterview = {
        id: 'int-1',
        candidateId: input.candidateId,
        organizationId: input.organizationId,
        interviewType: input.interviewType,
        scheduledDate: input.scheduledDate,
        location: input.location,
        interviewerId: input.interviewerId,
        roundNumber: input.roundNumber,
        status: INTERVIEW_STATUSES.SCHEDULED,
        createdAt: new Date(),
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockInterview] }) // Validation - candidate exists
        .mockResolvedValueOnce({ rows: [{ id: input.interviewerId }] }) // Validation - interviewer exists
        .mockResolvedValueOnce({ rows: [mockInterview] }); // Insert

      const result = await interviewService.createInterview(input);

      expect(result.id).toBe('int-1');
      expect(result.status).toBe(INTERVIEW_STATUSES.SCHEDULED);
      expect(mockAuditService.logChange).toHaveBeenCalled();
      expect(mockNotificationService.notifyInterviewScheduled).toHaveBeenCalled();
    });

    it('should reject interview with past date', async () => {
      const input: CreateInterviewInput = {
        organizationId: 'org-1',
        candidateId: 'cand-1',
        interviewType: INTERVIEW_TYPES.PHONE,
        scheduledDate: new Date(Date.now() - 86400000), // Past date
        interviewerId: 'user-1',
        createdBy: 'user-1',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: input.candidateId }] }) // Candidate exists
        .mockResolvedValueOnce({ rows: [{ id: input.interviewerId }] }); // Interviewer exists

      await expect(interviewService.createInterview(input)).rejects.toThrow(ValidationError);
    });

    it('should reject invalid interview type', async () => {
      const input: CreateInterviewInput = {
        organizationId: 'org-1',
        candidateId: 'cand-1',
        interviewType: 'invalid-type',
        scheduledDate: new Date(Date.now() + 86400000),
        interviewerId: 'user-1',
        createdBy: 'user-1',
      };

      await expect(interviewService.createInterview(input)).rejects.toThrow(ValidationError);
    });

    it('should reject if candidate does not exist', async () => {
      const input: CreateInterviewInput = {
        organizationId: 'org-1',
        candidateId: 'invalid-cand',
        interviewType: INTERVIEW_TYPES.TECHNICAL,
        scheduledDate: new Date(Date.now() + 86400000),
        interviewerId: 'user-1',
        createdBy: 'user-1',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [] }); // Candidate not found

      await expect(interviewService.createInterview(input)).rejects.toThrow(ValidationError);
    });
  });

  describe('getInterviewById', () => {
    it('should return interview when found', async () => {
      const mockInterview = {
        id: 'int-1',
        candidateId: 'cand-1',
        organizationId: 'org-1',
        interviewType: INTERVIEW_TYPES.PHONE,
        scheduledDate: new Date(),
        status: INTERVIEW_STATUSES.SCHEDULED,
        createdAt: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockInterview] });

      const result = await interviewService.getInterviewById('int-1', 'org-1');

      expect(result.id).toBe('int-1');
      expect(result.candidateId).toBe('cand-1');
    });

    it('should throw error when interview not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(interviewService.getInterviewById('invalid-id', 'org-1')).rejects.toThrow(
        AppError
      );
    });
  });

  describe('getInterviewsByCandidate', () => {
    it('should return all interviews for candidate', async () => {
      const mockInterviews = [
        {
          id: 'int-1',
          interviewType: INTERVIEW_TYPES.PHONE,
          roundNumber: 1,
          scheduledDate: new Date(),
          status: INTERVIEW_STATUSES.COMPLETED,
        },
        {
          id: 'int-2',
          interviewType: INTERVIEW_TYPES.TECHNICAL,
          roundNumber: 2,
          scheduledDate: new Date(),
          status: INTERVIEW_STATUSES.SCHEDULED,
        },
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockInterviews });

      const result = await interviewService.getInterviewsByCandidate('cand-1', 'org-1');

      expect(result).toHaveLength(2);
      expect(result[0].roundNumber).toBe(1);
      expect(result[1].roundNumber).toBe(2);
    });
  });

  describe('listInterviews', () => {
    it('should list interviews with pagination', async () => {
      const mockInterviews = [
        { id: 'int-1', interviewType: INTERVIEW_TYPES.PHONE },
        { id: 'int-2', interviewType: INTERVIEW_TYPES.TECHNICAL },
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: '10' }] }) // Count
        .mockResolvedValueOnce({ rows: mockInterviews }); // List

      const result = await interviewService.listInterviews('org-1', {
        limit: 50,
        offset: 0,
      });

      expect(result.rows).toHaveLength(2);
      expect(result.total).toBe(10);
    });

    it('should filter interviews by status', async () => {
      const mockInterviews = [
        { id: 'int-1', status: INTERVIEW_STATUSES.SCHEDULED },
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockInterviews });

      const result = await interviewService.listInterviews('org-1', {
        status: INTERVIEW_STATUSES.SCHEDULED,
        limit: 50,
        offset: 0,
      });

      expect(result.rows).toHaveLength(1);
    });
  });

  describe('updateInterview', () => {
    it('should update interview details', async () => {
      const existingInterview = {
        id: 'int-1',
        candidateId: 'cand-1',
        interviewType: INTERVIEW_TYPES.PHONE,
      };

      const updatedInterview = {
        id: 'int-1',
        interviewType: INTERVIEW_TYPES.TECHNICAL,
        scheduledDate: new Date(),
        status: INTERVIEW_STATUSES.SCHEDULED,
        updatedAt: new Date(),
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingInterview] }) // Get existing
        .mockResolvedValueOnce({ rows: [updatedInterview] }); // Update

      const result = await interviewService.updateInterview('int-1', 'org-1', {
        interviewType: INTERVIEW_TYPES.TECHNICAL,
        updatedBy: 'user-1',
      });

      expect(result.interviewType).toBe(INTERVIEW_TYPES.TECHNICAL);
      expect(mockAuditService.logChange).toHaveBeenCalled();
    });
  });

  describe('submitFeedback', () => {
    it('should submit feedback and update interview status', async () => {
      const existingInterview = {
        id: 'int-1',
        candidateId: 'cand-1',
        status: INTERVIEW_STATUSES.SCHEDULED,
      };

      const feedbackInput: SubmitFeedbackInput = {
        feedback: 'Good technical knowledge, excellent communication skills',
        rating: 4,
        recommendation: 'pass',
        submittedBy: 'user-1',
      };

      const updatedInterview = {
        id: 'int-1',
        candidateId: 'cand-1',
        status: INTERVIEW_STATUSES.COMPLETED,
        rating: 4,
        recommendation: 'pass',
        feedback: feedbackInput.feedback,
        actualDate: new Date(),
        updatedAt: new Date(),
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [existingInterview] }) // Get existing
        .mockResolvedValueOnce({ rows: [updatedInterview] }); // Update with feedback

      const result = await interviewService.submitFeedback('int-1', 'org-1', feedbackInput);

      expect(result.status).toBe(INTERVIEW_STATUSES.COMPLETED);
      expect(result.rating).toBe(4);
      expect(result.recommendation).toBe('pass');
      expect(mockAuditService.logChange).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'submit_feedback',
        })
      );
      expect(mockNotificationService.notifyInterviewFeedbackSubmitted).toHaveBeenCalled();
    });

    it('should validate feedback is at least 10 characters', async () => {
      const shortFeedback: SubmitFeedbackInput = {
        feedback: 'Short',
        rating: 3,
        recommendation: 'maybe',
        submittedBy: 'user-1',
      };

      await expect(
        interviewService.submitFeedback('int-1', 'org-1', shortFeedback)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate rating is between 1-5', async () => {
      const invalidRatingFeedback: SubmitFeedbackInput = {
        feedback: 'This feedback is definitely at least ten characters long',
        rating: 10, // Invalid
        recommendation: 'pass',
        submittedBy: 'user-1',
      };

      await expect(
        interviewService.submitFeedback('int-1', 'org-1', invalidRatingFeedback)
      ).rejects.toThrow(ValidationError);
    });

    it('should validate recommendation is pass, fail, or maybe', async () => {
      const invalidRecommendation: SubmitFeedbackInput = {
        feedback: 'This feedback is definitely at least ten characters long',
        rating: 4,
        recommendation: 'invalid' as any,
        submittedBy: 'user-1',
      };

      await expect(
        interviewService.submitFeedback('int-1', 'org-1', invalidRecommendation)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateInterviewStatus', () => {
    it('should update interview status', async () => {
      const updatedInterview = {
        id: 'int-1',
        status: INTERVIEW_STATUSES.COMPLETED,
        candidateId: 'cand-1',
        updatedAt: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [updatedInterview] });

      const result = await interviewService.updateInterviewStatus('int-1', 'org-1', {
        status: INTERVIEW_STATUSES.COMPLETED,
        updatedBy: 'user-1',
      });

      expect(result.status).toBe(INTERVIEW_STATUSES.COMPLETED);
      expect(mockAuditService.logChange).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update_status',
        })
      );
    });

    it('should reject invalid status', async () => {
      await expect(
        interviewService.updateInterviewStatus('int-1', 'org-1', {
          status: 'invalid-status',
          updatedBy: 'user-1',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteInterview', () => {
    it('should soft delete interview', async () => {
      mockDb.query.mockResolvedValueOnce({ rowCount: 1 });

      await interviewService.deleteInterview('int-1', 'org-1', 'user-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at = CURRENT_TIMESTAMP'),
        expect.any(Array)
      );
      expect(mockAuditService.logChange).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'delete',
        })
      );
    });

    it('should throw error if interview not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rowCount: 0 });

      await expect(interviewService.deleteInterview('invalid-id', 'org-1', 'user-1')).rejects.toThrow(
        AppError
      );
    });
  });

  describe('getInterviewStats', () => {
    it('should return interview statistics', async () => {
      const stats = {
        total: '10',
        scheduled: '5',
        completed: '5',
        positive_feedback: '4',
        avg_rating: '4.2',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [stats] });

      const result = await interviewService.getInterviewStats('org-1');

      expect(result.total).toBe('10');
      expect(result.avg_rating).toBe('4.2');
    });
  });

  describe('getInterviewerSchedule', () => {
    it('should return interviewer schedule for date range', async () => {
      const schedule = [
        { id: 'int-1', candidateId: 'cand-1', scheduledDate: new Date() },
        { id: 'int-2', candidateId: 'cand-2', scheduledDate: new Date() },
      ];

      mockDb.query.mockResolvedValueOnce({ rows: schedule });

      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 86400000);

      const result = await interviewService.getInterviewerSchedule('user-1', 'org-1', startDate, endDate);

      expect(result).toHaveLength(2);
    });
  });
});
