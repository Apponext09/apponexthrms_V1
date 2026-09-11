import type { Request, Response } from 'express';
import { certificateService } from '../services/CertificateService';

export class CertificateController {
  async getCertificates(req: Request, res: Response) {
    const filters = {
      employeeId: req.query.employeeId ? Number(req.query.employeeId) : undefined,
      courseId: req.query.courseId ? Number(req.query.courseId) : undefined,
    };
    const certificates = await certificateService.getCertificates(req.ctx!, filters);
    res.json({ success: true, data: certificates });
  }

  async getMyCertificates(req: Request, res: Response) {
    const employeeId = Number(req.query.employeeId || req.ctx?.userId);
    const certificates = await certificateService.getCertificates(req.ctx!, { employeeId });
    res.json({ success: true, data: certificates });
  }

  async getCertificateById(req: Request, res: Response) {
    const certificate = await certificateService.getCertificateById(req.ctx!, Number(req.params.id));
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    res.json({ success: true, data: certificate });
  }

  async getCertificateByNumber(req: Request, res: Response) {
    const certificate = await certificateService.getCertificateByNumber(req.ctx!, req.params.certificateNumber);
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    res.json({ success: true, data: certificate });
  }
}

export const certificateController = new CertificateController();
