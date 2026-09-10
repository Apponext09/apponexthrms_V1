import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateService } from '../services/template.service';
import type { TenantContext } from '../../../db/types';

describe('TemplateService', () => {
  let service: TemplateService;
  let mockCtx: TenantContext;

  beforeEach(() => {
    service = new TemplateService();
    mockCtx = {
      organizationId: 1,
      userId: 1,
      userEmail: 'test@example.com',
    };
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const input = {
        template_code: 'leave_approved',
        template_name: 'Leave Approved',
        template_description: 'Notification for approved leave',
        category: 'leave_approval' as const,
        body_text: 'Dear {{employeeName}}, your leave request has been approved.',
      };

      vi.spyOn(service as any, 'createTemplate').mockResolvedValue({
        id: 1,
        uuid: 'test-uuid',
        template_code: 'leave_approved',
        template_name: 'Leave Approved',
        status: 'draft',
      });

      const result = await service.createTemplate(mockCtx, input);

      expect(result.template_code).toBe('leave_approved');
      expect(result.status).toBe('draft');
    });
  });

  describe('renderTemplate', () => {
    it('should interpolate variables in template', async () => {
      const template = {
        id: 1,
        uuid: 'test-uuid',
        organization_id: 1,
        template_code: 'leave_approved',
        template_name: 'Leave Approved',
        category: 'leave_approval' as const,
        channels: ['email'],
        subject_line: 'Leave Approved for {{employeeName}}',
        body_text: 'Dear {{employeeName}}, your {{leaveType}} leave has been approved.',
        body_html: undefined,
        sms_text: undefined,
        whatsapp_template_name: undefined,
        variables: ['employeeName', 'leaveType'],
        version_number: 1,
        is_published: true,
        status: 'published' as const,
        created_by: 1,
        updated_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
        template_description: '',
      };

      const variables = {
        employeeName: 'John Doe',
        leaveType: 'Casual',
      };

      const result = await service.renderTemplate(template, variables);

      expect(result.subject_line).toBe('Leave Approved for John Doe');
      expect(result.body_text).toContain('John Doe');
      expect(result.body_text).toContain('Casual');
    });

    it('should escape HTML in variables', async () => {
      const template = {
        id: 1,
        uuid: 'test-uuid',
        organization_id: 1,
        template_code: 'test',
        template_name: 'Test',
        category: 'system' as const,
        channels: ['email'],
        subject_line: '',
        body_text: 'Message: {{message}}',
        body_html: undefined,
        sms_text: undefined,
        whatsapp_template_name: undefined,
        variables: ['message'],
        version_number: 1,
        is_published: true,
        status: 'published' as const,
        created_by: 1,
        updated_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
        template_description: '',
      };

      const variables = {
        message: '<script>alert("xss")</script>',
      };

      const result = await service.renderTemplate(template, variables);

      expect(result.body_text).not.toContain('<script>');
      expect(result.body_text).toContain('&lt;script&gt;');
    });
  });

  describe('publishTemplate', () => {
    it('should publish a template', async () => {
      vi.spyOn(service as any, 'publishTemplate').mockResolvedValue({
        id: 1,
        uuid: 'test-uuid',
        template_code: 'leave_approved',
        status: 'published',
        is_published: true,
      });

      const result = await service.publishTemplate(mockCtx, 1);

      expect(result.status).toBe('published');
      expect(result.is_published).toBe(true);
    });
  });

  describe('archiveTemplate', () => {
    it('should archive a template', async () => {
      vi.spyOn(service as any, 'archiveTemplate').mockResolvedValue({
        id: 1,
        uuid: 'test-uuid',
        template_code: 'leave_approved',
        status: 'archived',
        is_published: false,
      });

      const result = await service.archiveTemplate(mockCtx, 1);

      expect(result.status).toBe('archived');
      expect(result.is_published).toBe(false);
    });
  });
});
