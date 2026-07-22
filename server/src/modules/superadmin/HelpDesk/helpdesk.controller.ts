import type { Request, Response } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { superAdminService } from '../superadmin.service';

export class HelpDeskController {
  /**
   * Get all client software purchase queries
   */
  getQueries = asyncHandler(async (req: Request, res: Response) => {
    const data = await superAdminService.getHelpDeskQueries();
    res.json({
      success: true,
      data,
    });
  });

  /**
   * Submit a new client purchase query
   */
  createQuery = asyncHandler(async (req: Request, res: Response) => {
    const query = await superAdminService.createHelpDeskQuery(req.body);
    res.status(201).json({
      success: true,
      message: 'HelpDesk query submitted successfully',
      data: query,
    });
  });

  /**
   * Update query status (new, in_progress, resolved, closed)
   */
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    const result = await superAdminService.updateHelpDeskQueryStatus(id, status);
    res.json({
      success: true,
      message: 'HelpDesk query status updated successfully',
      data: result,
    });
  });

  /**
   * Get unread notifications for navigation bell icon
   */
  getNotifications = asyncHandler(async (req: Request, res: Response) => {
    const notifications = await superAdminService.getHelpDeskNotifications();
    res.json({
      success: true,
      data: notifications,
    });
  });
}

export const helpDeskController = new HelpDeskController();
