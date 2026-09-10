import type { Request, Response } from 'express';
import { EmployeeStatusService } from '../services/EmployeeStatusService';

export class EmployeeStatusController {
  private employeeStatusService: EmployeeStatusService;

  constructor() {
    this.employeeStatusService = new EmployeeStatusService();
  }

  list = async (req: Request, res: Response) => {
    const result = await this.employeeStatusService.listEmployeeStatuses(req.ctx!, req.query);
    // If result already has a data array, use it. Otherwise use the result directly
    const responseData = (result as any)?.items || (result as any)?.data || result;
    res.json({ success: true, data: responseData, meta: (result as any)?.meta });
  };

  getById = async (req: Request, res: Response) => {
    const employeeStatus = await this.employeeStatusService.getEmployeeStatus(req.ctx!, req.params.id);
    res.json({ success: true, data: employeeStatus });
  };

  create = async (req: Request, res: Response) => {
    const employeeStatus = await this.employeeStatusService.createEmployeeStatus(req.ctx!, req.body);
    res.status(201).json({ success: true, message: 'Employee Status created successfully', data: employeeStatus });
  };

  update = async (req: Request, res: Response) => {
    const employeeStatus = await this.employeeStatusService.updateEmployeeStatus(req.ctx!, req.params.id, req.body);
    res.json({ success: true, message: 'Employee Status updated successfully', data: employeeStatus });
  };

  delete = async (req: Request, res: Response) => {
    await this.employeeStatusService.deleteEmployeeStatus(req.ctx!, req.params.id);
    res.json({ success: true, message: 'Employee Status deleted successfully' });
  };
}
