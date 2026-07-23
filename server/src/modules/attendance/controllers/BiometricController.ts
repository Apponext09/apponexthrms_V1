import { Request, Response } from 'express';
import { BiometricService } from '../services/BiometricService';

export class BiometricController {
  private biometricService: BiometricService;

  constructor() {
    this.biometricService = new BiometricService();
  }

  /**
   * Keep SQL/driver details out of API responses while preserving useful
   * biometric and attendance validation messages for the employee.
   */
  private clientMessage(error: unknown, fallback: string): string {
    const message = error instanceof Error ? error.message.trim() : '';
    if (!message) return fallback;

    const containsTechnicalDetails =
      /(select\s+.+\s+from|insert\s+into|update\s+.+\s+set|delete\s+from|sql|query|knex|bindings?|errno|er_[a-z_]+|unknown column|doesn't exist|econnrefused|database)/i.test(
        message
      );

    return containsTechnicalDetails ? fallback : message;
  }

  enrollFace = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.ctx) {
        res.status(401).json({ success: false, message: 'Tenant context is required' });
        return;
      }
      const employeeId = req.body.employeeId || req.body.employeeCode;
      const images = Array.isArray(req.body.images) && req.body.images.length
        ? req.body.images
        : req.body.image;

      if (!employeeId || !images) {
        res.status(400).json({
          success: false,
          message: 'Employee and camera image payload are required',
        });
        return;
      }

      const result = await this.biometricService.enrollFace(
        req.ctx,
        String(employeeId),
        images
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: this.clientMessage(error, 'Failed to enroll face biometric'),
      });
    }
  };

  getEnrollmentStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.ctx) {
        res.status(401).json({ success: false, message: 'Tenant context is required' });
        return;
      }
      const employeeId = req.query.employeeId as string;
      if (!employeeId) {
        res.status(400).json({ success: false, message: 'employeeId is required' });
        return;
      }

      const result = await this.biometricService.getEnrollmentStatus(
        req.ctx,
        employeeId
      );
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: this.clientMessage(error, 'Failed to load biometric enrollment status'),
      });
    }
  };

  verifyAndPunch = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.ctx) {
        res.status(401).json({ success: false, message: 'Tenant context is required' });
        return;
      }
      const { image, images, location, employeeId, action = 'auto' } = req.body;

      if (!image && (!Array.isArray(images) || images.length === 0)) {
        res.status(400).json({ success: false, message: 'Snapshot image payload is required' });
        return;
      }
      if (!['auto', 'check_in', 'check_out'].includes(action)) {
        res.status(400).json({ success: false, message: 'Invalid biometric punch action' });
        return;
      }

      const result = await this.biometricService.verifyAndPunch(
        req.ctx,
        Array.isArray(images) && images.length ? images : image,
        action,
        location,
        employeeId ? String(employeeId) : undefined
      );
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: this.clientMessage(
          error,
          'Unable to mark biometric attendance. Please try again.'
        ),
      });
    }
  };

  getEmployees = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.ctx) {
        res.status(401).json({ success: false, message: 'Tenant context is required' });
        return;
      }
      const result = await this.biometricService.getEmployeesList(req.ctx);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: this.clientMessage(error, 'Failed to load employees'),
      });
    }
  };

  syncExisting = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.ctx) {
        res.status(401).json({ success: false, message: 'Tenant context is required' });
        return;
      }
      const result = await this.biometricService.syncExistingEmployeePhotos(req.ctx);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: this.clientMessage(
          error,
          'Failed to synchronize employee profile photos'
        ),
      });
    }
  };
}
