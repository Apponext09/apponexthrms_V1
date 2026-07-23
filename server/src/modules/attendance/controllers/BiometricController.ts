import { Request, Response } from 'express';
import { BiometricService } from '../services/BiometricService';

export class BiometricController {
  private biometricService: BiometricService;

  constructor() {
    this.biometricService = new BiometricService();
  }

  enrollFace = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).ctx?.organizationId?.toString() || (req as any).tenantId || req.headers['x-tenant-id'] || '1';
      const employeeId = req.body.employeeId || req.body.employeeCode || (req as any).ctx?.userId?.toString() || (req as any).user?.employeeId || (req as any).user?.id || 'EMP101';
      const employeeName = req.body.employeeName || `${(req as any).user?.firstName || ''} ${(req as any).user?.lastName || ''}`.trim() || `Employee (${employeeId})`;
      const { image } = req.body;

      if (!image) {
        res.status(400).json({ success: false, message: 'Camera image payload is required' });
        return;
      }

      const result = await this.biometricService.enrollFace(tenantId, String(employeeId), employeeName, image);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to enroll face biometric',
      });
    }
  };

  getEnrollmentStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).ctx?.organizationId?.toString() || (req as any).tenantId || req.headers['x-tenant-id'] || '1';
      const reqEmpId = req.query.employeeId as string;
      const employeeId = reqEmpId || (req as any).ctx?.userId?.toString() || (req as any).user?.employeeId || (req as any).user?.id || 'EMP101';

      const result = await this.biometricService.getEnrollmentStatus(tenantId, String(employeeId));
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  verifyAndPunch = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).ctx?.organizationId?.toString() || (req as any).tenantId || req.headers['x-tenant-id'] || '1';
      const { image, location, employeeId } = req.body;

      if (!image) {
        res.status(400).json({ success: false, message: 'Snapshot image payload is required' });
        return;
      }

      const result = await this.biometricService.verifyAndPunch(tenantId, image, location, employeeId ? String(employeeId) : undefined);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || 'Face biometric verification failed',
      });
    }
  };

  getEmployees = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).ctx?.organizationId?.toString() || (req as any).tenantId || req.headers['x-tenant-id'] || '1';
      const result = await this.biometricService.getEmployeesList(tenantId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}
