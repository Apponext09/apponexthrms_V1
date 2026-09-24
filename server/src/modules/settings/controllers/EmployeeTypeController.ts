import type { Request, Response } from 'express';
import { EmployeeTypeService } from '../services/EmployeeTypeService';

export class EmployeeTypeController {
  private employeeTypeService: EmployeeTypeService;

  constructor() {
    this.employeeTypeService = new EmployeeTypeService();
  }

  list = async (req: Request, res: Response) => {
    const result: any = await this.employeeTypeService.listEmployeeTypes(req.ctx!, req.query);
    // Standard envelope: { success, data, meta } — matches every sibling settings master.
    res.json({ success: true, data: result?.items ?? result, meta: result?.meta });
  };

  getById = async (req: Request, res: Response) => {
    const employeeType = await this.employeeTypeService.getEmployeeType(req.ctx!, req.params.id);
    res.json({ success: true, data: employeeType });
  };

  create = async (req: Request, res: Response) => {
    const employeeType = await this.employeeTypeService.createEmployeeType(req.ctx!, req.body);
    res.status(201).json({ success: true, message: 'Employee Type created successfully', data: employeeType });
  };

  update = async (req: Request, res: Response) => {
    const employeeType = await this.employeeTypeService.updateEmployeeType(req.ctx!, req.params.id, req.body);
    res.json({ success: true, message: 'Employee Type updated successfully', data: employeeType });
  };

  delete = async (req: Request, res: Response) => {
    await this.employeeTypeService.deleteEmployeeType(req.ctx!, req.params.id);
    res.json({ success: true, message: 'Employee Type deleted successfully' });
  };
}
