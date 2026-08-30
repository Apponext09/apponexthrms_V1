import type { Request, Response } from 'express';
import { LetterService } from '../services/LetterService';
import { logger } from '../../../common/lib/logger';
import { db } from '../../../db/knex';

const letterService = new LetterService();

export class LetterController {

  // ──────────────────────────────────────────────────────────
  // TEMPLATE CRUD
  // ──────────────────────────────────────────────────────────

  async listTemplates(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      const { letter_type, letter_category, is_active } = req.query;
      const templates = await letterService.listTemplates(orgId, {
        letter_type: letter_type as string,
        letter_category: letter_category as string,
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
      });

      res.json({ success: true, data: templates });
    } catch (err: any) {
      logger.error('listTemplates error', err);
      res.status(500).json({ success: false, message: err.message || 'Failed to list templates' });
    }
  }

  async getTemplate(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      const template = await letterService.getTemplate(orgId, parseInt(req.params.id, 10));
      if (!template) return res.status(404).json({ success: false, message: 'Template not found' });

      res.json({ success: true, data: template });
    } catch (err: any) {
      logger.error('getTemplate error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async createTemplate(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      const template = await letterService.createTemplate(orgId, req.body, req.ctx?.userId);
      res.status(201).json({ success: true, data: template, message: 'Template created successfully' });
    } catch (err: any) {
      logger.error('createTemplate error', err);
      res.status(err.message?.includes('already exists') ? 409 : 500).json({ success: false, message: err.message });
    }
  }

  async updateTemplate(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      const template = await letterService.updateTemplate(orgId, parseInt(req.params.id, 10), req.body, req.ctx?.userId);
      res.json({ success: true, data: template, message: 'Template updated successfully' });
    } catch (err: any) {
      logger.error('updateTemplate error', err);
      res.status(err.message?.includes('not found') ? 404 : 500).json({ success: false, message: err.message });
    }
  }

  async deleteTemplate(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      await letterService.deleteTemplate(orgId, parseInt(req.params.id, 10), req.ctx?.userId);
      res.json({ success: true, message: 'Template deleted successfully' });
    } catch (err: any) {
      logger.error('deleteTemplate error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ──────────────────────────────────────────────────────────
  // MERGE CODES REFERENCE
  // ──────────────────────────────────────────────────────────

  async getMergeCodes(req: Request, res: Response) {
    try {
      const letterType = (req.query.letter_type as string) || 'custom';
      const codes = letterService.getMergeCodesForLetterType(letterType);
      res.json({ success: true, data: codes });
    } catch (err: any) {
      logger.error('getMergeCodes error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ──────────────────────────────────────────────────────────
  // LETTER GENERATION & MANAGEMENT
  // ──────────────────────────────────────────────────────────

  async generateLetter(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      const { template_id, employee_id, candidate_id, overrides } = req.body;
      if (!template_id) return res.status(400).json({ success: false, message: 'template_id is required' });

      const letter = await letterService.generateLetter(
        orgId,
        parseInt(template_id, 10),
        {
          employee_id: employee_id ? parseInt(employee_id, 10) : undefined,
          candidate_id: candidate_id ? parseInt(candidate_id, 10) : undefined,
          overrides,
        },
        req.ctx?.userId
      );

      res.status(201).json({ success: true, data: letter, message: 'Letter generated successfully' });
    } catch (err: any) {
      logger.error('generateLetter error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async listLetters(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      const { employee_id, candidate_id, letter_type, letter_category, status, page, limit } = req.query;
      const result = await letterService.listGeneratedLetters(orgId, {
        employee_id: employee_id ? parseInt(employee_id as string, 10) : undefined,
        candidate_id: candidate_id ? parseInt(candidate_id as string, 10) : undefined,
        letter_type: letter_type as string,
        letter_category: letter_category as string,
        status: status as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 25,
      });

      res.json({ success: true, ...result });
    } catch (err: any) {
      logger.error('listLetters error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getLetter(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      const letter = await letterService.getGeneratedLetter(orgId, parseInt(req.params.id, 10));
      if (!letter) return res.status(404).json({ success: false, message: 'Letter not found' });

      res.json({ success: true, data: letter });
    } catch (err: any) {
      logger.error('getLetter error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async getLetterPreview(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      const letter = await letterService.getGeneratedLetter(orgId, parseInt(req.params.id, 10));
      if (!letter) return res.status(404).json({ success: false, message: 'Letter not found' });

      res.setHeader('Content-Type', 'text/html');
      res.send(letter.rendered_html);
    } catch (err: any) {
      logger.error('getLetterPreview error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async sendLetter(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      const letter = await letterService.sendLetter(orgId, parseInt(req.params.id, 10), req.ctx?.userId);
      res.json({ success: true, data: letter, message: 'Letter sent successfully' });
    } catch (err: any) {
      logger.error('sendLetter error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async revokeLetter(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      const letter = await letterService.revokeLetter(orgId, parseInt(req.params.id, 10), req.ctx?.userId);
      res.json({ success: true, data: letter, message: 'Letter revoked successfully' });
    } catch (err: any) {
      logger.error('revokeLetter error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // ──────────────────────────────────────────────────────────
  // EMPLOYEE SELF-SERVICE
  // ──────────────────────────────────────────────────────────

  async getMyLetters(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;
      const userId = req.ctx?.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'Missing user context' });

      // Resolve employee ID from user
      let employeeId = userId;
      try {
        const user = await db('users').where('id', userId).first();
        if (user?.employee_id) employeeId = user.employee_id;
        else if (user?.email) {
          const emp = await db('employees').where('email', user.email).first();
          if (emp?.id) employeeId = emp.id;
        }
      } catch (e) { /* fallback to userId */ }

      const letters = await letterService.getMyLetters(orgId, employeeId);
      res.json({ success: true, data: letters });
    } catch (err: any) {
      logger.error('getMyLetters error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async acknowledgeLetter(req: Request, res: Response) {
    try {
      const orgId = req.ctx?.organizationId || 1;

      const letter = await letterService.acknowledgeLetter(orgId, parseInt(req.params.id, 10), req.body.note);
      res.json({ success: true, data: letter, message: 'Letter acknowledged successfully' });
    } catch (err: any) {
      logger.error('acknowledgeLetter error', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
