import type { Request, Response } from 'express';
import { EmployeeTypeService } from '../services/EmployeeTypeService';

export class EmployeeTypeController {
  private employeeTypeService: EmployeeTypeService;

  constructor() {
    this.employeeTypeService = new EmployeeTypeService();
  }

  list = async (req: Request, res: Response) => {
    const result = await this.employeeTypeService.listEmployeeTypes(req.ctx!, req.query);
    res.json(result);
  };

  getById = async (req: Request, res: Response) => {
    const employeeType = await this.employeeTypeService.getEmployeeType(req.ctx!, req.params.id);
    res.json(employeeType);
  };

  create = async (req: Request, res: Response) => {
    const employeeType = await this.employeeTypeService.createEmployeeType(req.ctx!, req.body);
    res.status(201).json({ message: 'Employee Type created successfully', data: employeeType });
  };

  update = async (req: Request, res: Response) => {
    const employeeType = await this.employeeTypeService.updateEmployeeType(req.ctx!, req.params.id, req.body);
    res.json({ message: 'Employee Type updated successfully', data: employeeType });
  };

  delete = async (req: Request, res: Response) => {
    await this.employeeTypeService.deleteEmployeeType(req.ctx!, req.params.id);
    res.json({ message: 'Employee Type deleted successfully' });
  };
}
