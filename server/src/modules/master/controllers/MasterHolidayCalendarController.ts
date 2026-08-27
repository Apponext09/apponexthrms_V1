import type { Request, Response } from 'express';
import { MasterHolidayCalendarRepository } from '../repositories/MasterHolidayCalendarRepository';
import { MasterHolidayRepository } from '../repositories/MasterHolidayRepository';
import { WeeklyOffRuleRepository } from '../repositories/WeeklyOffRuleRepository';
import { CalendarAssignmentRepository } from '../repositories/CalendarAssignmentRepository';
import type { TenantContext } from '../../../db/types';

export class MasterHolidayCalendarController {
  private calendarRepo: MasterHolidayCalendarRepository;
  private holidayRepo: MasterHolidayRepository;
  private weeklyOffRepo: WeeklyOffRuleRepository;
  private assignmentRepo: CalendarAssignmentRepository;

  constructor() {
    this.calendarRepo = new MasterHolidayCalendarRepository();
    this.holidayRepo = new MasterHolidayRepository();
    this.weeklyOffRepo = new WeeklyOffRuleRepository();
    this.assignmentRepo = new CalendarAssignmentRepository();
  }

  /**
   * Helper to extract or fallback TenantContext
   */
  private getContext(req: Request): TenantContext {
    if (req.ctx) return req.ctx;
    const orgId = Number(req.headers['x-organization-id'] || req.headers['x-tenant-id'] || 8);
    const userId = Number(req.headers['x-user-id'] || 1);
    const companyId = req.headers['x-company-id'] ? Number(req.headers['x-company-id']) : undefined;
    return { organizationId: orgId, userId: userId, companyId };
  }

  /**
   * Helper to validate 4-digit year
   */
  private isValidYear(year: any): boolean {
    const num = Number(year);
    return !isNaN(num) && Number.isInteger(num) && num >= 1900 && num <= 2100;
  }

  /**
   * 1. POST / — Create a new holiday calendar
   */
  async createCalendar(req: Request, res: Response): Promise<void> {
    try {
      const ctx = this.getContext(req);
      const { calendar_name, name, calendar_year, year, company_id, region_id, location_id, description, status } = req.body;

      const calName = (calendar_name || name || '').trim();
      const calYear = Number(calendar_year || year);

      if (!calName) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Calendar name (calendar_name) is required.',
        });
        return;
      }

      if (!this.isValidYear(calYear)) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Calendar year (calendar_year) must be a valid 4-digit year (1900-2100).',
        });
        return;
      }

      // Check unique scope + year
      const duplicate = await this.calendarRepo.findDuplicate(ctx, {
        companyId: company_id ? Number(company_id) : null,
        regionId: region_id ? Number(region_id) : null,
        locationId: location_id ? Number(location_id) : null,
        year: calYear,
      });

      if (duplicate) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          message: `A holiday calendar for this scope (company, region, location) and year (${calYear}) already exists.`,
          duplicateCalendarId: duplicate.id,
        });
        return;
      }

      const created = await this.calendarRepo.createCalendar(ctx, {
        calendar_name: calName,
        calendar_year: calYear,
        company_id: company_id ? Number(company_id) : null,
        region_id: region_id ? Number(region_id) : null,
        location_id: location_id ? Number(location_id) : null,
        description: description || null,
        status: status || 'Draft',
      });

      res.status(201).json({
        success: true,
        message: 'Holiday calendar created successfully.',
        data: created,
      });
    } catch (error: any) {
      console.error('Error creating holiday calendar:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to create holiday calendar.',
      });
    }
  }

  /**
   * 2. GET / — List all calendars with filters
   */
  async listCalendars(req: Request, res: Response): Promise<void> {
    try {
      const ctx = this.getContext(req);
      const filters = {
        company_id: req.query.company_id as string,
        region_id: req.query.region_id as string,
        location_id: req.query.location_id as string,
        year: req.query.year as string,
        calendar_year: req.query.calendar_year as string,
        status: req.query.status as string,
        search: req.query.search as string,
      };

      const calendars = await this.calendarRepo.listCalendars(ctx, filters);

      res.status(200).json({
        success: true,
        count: calendars.length,
        data: calendars,
      });
    } catch (error: any) {
      console.error('Error listing holiday calendars:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to list holiday calendars.',
      });
    }
  }

  /**
   * 3. GET /:id — Get single calendar with nested holidays and weekly-off rules
   */
  async getCalendarById(req: Request, res: Response): Promise<void> {
    try {
      const ctx = this.getContext(req);
      const { id } = req.params;

      const calendar = await this.calendarRepo.getCalendarWithDetails(ctx, id);

      if (!calendar) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Holiday calendar with ID ${id} was not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: calendar,
      });
    } catch (error: any) {
      console.error('Error fetching holiday calendar:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to fetch holiday calendar.',
      });
    }
  }

  /**
   * 4. PUT /:id — Update calendar details
   */
  async updateCalendar(req: Request, res: Response): Promise<void> {
    try {
      const ctx = this.getContext(req);
      const { id } = req.params;
      const { calendar_name, name, calendar_year, year, company_id, region_id, location_id, description, status } = req.body;

      const existing = await this.calendarRepo.getById(ctx, id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Holiday calendar with ID ${id} was not found.`,
        });
        return;
      }

      const calYear = calendar_year || year ? Number(calendar_year || year) : existing.calendar_year || existing.year;
      if (calendar_year || year) {
        if (!this.isValidYear(calYear)) {
          res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'Calendar year must be a valid 4-digit year (1900-2100).',
          });
          return;
        }
      }

      // Check conflict if scope changed
      const targetCompany = company_id !== undefined ? (company_id ? Number(company_id) : null) : existing.company_id;
      const targetRegion = region_id !== undefined ? (region_id ? Number(region_id) : null) : existing.region_id;
      const targetLocation = location_id !== undefined ? (location_id ? Number(location_id) : null) : existing.location_id;

      const duplicate = await this.calendarRepo.findDuplicate(ctx, {
        companyId: targetCompany,
        regionId: targetRegion,
        locationId: targetLocation,
        year: calYear,
        excludeId: id,
      });

      if (duplicate) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          message: `Another holiday calendar with this scope and year (${calYear}) already exists.`,
          duplicateCalendarId: duplicate.id,
        });
        return;
      }

      const updated = await this.calendarRepo.updateCalendar(ctx, id, {
        calendar_name: calendar_name || name,
        calendar_year: calendar_year || year ? Number(calendar_year || year) : undefined,
        company_id: company_id !== undefined ? (company_id ? Number(company_id) : null) : undefined,
        region_id: region_id !== undefined ? (region_id ? Number(region_id) : null) : undefined,
        location_id: location_id !== undefined ? (location_id ? Number(location_id) : null) : undefined,
        description: description,
        status: status,
      });

      res.status(200).json({
        success: true,
        message: 'Holiday calendar updated successfully.',
        data: updated,
      });
    } catch (error: any) {
      console.error('Error updating holiday calendar:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to update holiday calendar.',
      });
    }
  }

  /**
   * 5. DELETE /:id — Delete calendar (cascade delete)
   */
  async deleteCalendar(req: Request, res: Response): Promise<void> {
    try {
      const ctx = this.getContext(req);
      const { id } = req.params;

      const deleted = await this.calendarRepo.deleteCalendarCascade(ctx, id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Holiday calendar with ID ${id} was not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Holiday calendar and associated holidays/weekly-off rules deleted successfully.',
      });
    } catch (error: any) {
      console.error('Error deleting holiday calendar:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to delete holiday calendar.',
      });
    }
  }

  /**
   * 6. PATCH /:id/publish — Publish calendar
   */
  async publishCalendar(req: Request, res: Response): Promise<void> {
    try {
      const ctx = this.getContext(req);
      const { id } = req.params;

      const existing = await this.calendarRepo.getById(ctx, id);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Holiday calendar with ID ${id} was not found.`,
        });
        return;
      }

      if (existing.status === 'Archived') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'An Archived calendar cannot be published.',
        });
        return;
      }

      const published = await this.calendarRepo.publishCalendar(ctx, id);

      res.status(200).json({
        success: true,
        message: 'Holiday calendar published successfully.',
        data: published,
      });
    } catch (error: any) {
      console.error('Error publishing holiday calendar:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to publish holiday calendar.',
      });
    }
  }

  /**
   * 7. POST /:id/holidays & POST /:id/holidays/bulk — Add holiday(s) to a calendar (Single or Bulk Array)
   */
  async addHoliday(req: Request, res: Response): Promise<void> {
    try {
      const ctx = this.getContext(req);
      const { id } = req.params;
      const body = req.body;

      const calendar = await this.calendarRepo.getById(ctx, id);
      if (!calendar) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Holiday calendar with ID ${id} was not found.`,
        });
        return;
      }

      // Check Archived status
      if (calendar.status === 'Archived') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Cannot add holidays to an Archived holiday calendar.',
        });
        return;
      }

      const calYear = Number(calendar.calendar_year || calendar.year);

      // Check if Bulk / Array request
      const isBulk = Array.isArray(body) || (body && Array.isArray(body.holidays));
      if (isBulk) {
        const rawList: any[] = Array.isArray(body) ? body : body.holidays;
        if (!rawList || rawList.length === 0) {
          res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'Array of holidays cannot be empty.',
          });
          return;
        }

        // Validate each holiday item
        const validHolidays: any[] = [];
        for (let i = 0; i < rawList.length; i++) {
          const item = rawList[i];
          const hName = (item.holiday_name || item.name || '').trim();
          const hDate = (item.holiday_date || item.date || '').trim().split('T')[0];

          if (!hName) {
            res.status(400).json({
              success: false,
              error: 'Validation Error',
              message: `Holiday item at index ${i} is missing holiday_name.`,
            });
            return;
          }

          if (!hDate || isNaN(Date.parse(hDate))) {
            res.status(400).json({
              success: false,
              error: 'Validation Error',
              message: `Holiday "${hName}" at index ${i} has an invalid holiday_date (must be YYYY-MM-DD).`,
            });
            return;
          }

          const hYear = new Date(hDate).getFullYear();
          if (hYear !== calYear) {
            res.status(400).json({
              success: false,
              error: 'Validation Error',
              message: `Holiday "${hName}" date (${hDate}) does not fall within calendar year (${calYear}).`,
            });
            return;
          }

          validHolidays.push({
            holiday_name: hName,
            holiday_date: hDate,
            holiday_type: item.holiday_type || item.type || 'National',
            is_optional: !!(item.is_optional ?? item.isOptional),
            description: item.description || null,
          });
        }

        const bulkResult = await this.holidayRepo.addBulkHolidays(ctx, Number(id), validHolidays);

        res.status(201).json({
          success: true,
          message: `${bulkResult.inserted} holiday(s) added/updated in calendar successfully.`,
          count: bulkResult.holidays.length,
          data: bulkResult.holidays,
        });
        return;
      }

      // Single holiday flow
      const { holiday_name, holiday_date, holiday_type, is_optional, description } = body;
      const hName = (holiday_name || '').trim();
      const hDate = (holiday_date || '').trim().split('T')[0];

      if (!hName) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Holiday name (holiday_name) is required.',
        });
        return;
      }

      if (!hDate || isNaN(Date.parse(hDate))) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Valid holiday date (holiday_date: YYYY-MM-DD) is required.',
        });
        return;
      }

      // Validate holiday_date falls within calendar_year
      const holidayYear = new Date(hDate).getFullYear();
      if (holidayYear !== calYear) {
        res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: `Holiday date (${hDate}) must fall within the calendar year (${calYear}).`,
        });
        return;
      }

      // Check duplicate date in same calendar
      const duplicate = await this.holidayRepo.findDuplicate(ctx, id, hDate);
      if (duplicate) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          message: `A holiday on date ${hDate} already exists in this calendar ("${duplicate.holiday_name}").`,
          existingHolidayId: duplicate.id,
        });
        return;
      }

      const holiday = await this.holidayRepo.addHoliday(ctx, {
        calendar_id: Number(id),
        holiday_name: hName,
        holiday_date: hDate,
        holiday_type: holiday_type || 'National',
        is_optional: !!is_optional,
        description: description || null,
      });

      res.status(201).json({
        success: true,
        message: 'Holiday added to calendar successfully.',
        data: holiday,
      });
    } catch (error: any) {
      console.error('Error adding holiday:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to add holiday.',
      });
    }
  }

  /**
   * 8. PUT /holidays/:holidayId — Update a holiday
   */
  async updateHoliday(req: Request, res: Response): Promise<void> {
    try {
      const ctx = this.getContext(req);
      const { holidayId } = req.params;
      const { holiday_name, holiday_date, holiday_type, is_optional, description } = req.body;

      const existing = await this.holidayRepo.getById(ctx, holidayId);
      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Holiday with ID ${holidayId} was not found.`,
        });
        return;
      }

      const calId = existing.calendar_id || existing.holiday_calendar_id;
      const calendar = await this.calendarRepo.getById(ctx, calId);
      if (calendar && calendar.status === 'Archived') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Cannot modify holidays in an Archived calendar.',
        });
        return;
      }

      if (holiday_date) {
        const hDate = holiday_date.split('T')[0];
        if (isNaN(Date.parse(hDate))) {
          res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'Valid holiday date (holiday_date: YYYY-MM-DD) is required.',
          });
          return;
        }

        if (calendar) {
          const calYear = Number(calendar.calendar_year || calendar.year);
          const holidayYear = new Date(hDate).getFullYear();
          if (holidayYear !== calYear) {
            res.status(400).json({
              success: false,
              error: 'Validation Error',
              message: `Holiday date (${hDate}) must fall within the calendar year (${calYear}).`,
            });
            return;
          }
        }

        // Check duplicate on updated date
        const duplicate = await this.holidayRepo.findDuplicate(ctx, calId, hDate, holidayId);
        if (duplicate) {
          res.status(409).json({
            success: false,
            error: 'Conflict',
            message: `Another holiday on date ${hDate} already exists in this calendar.`,
            existingHolidayId: duplicate.id,
          });
          return;
        }
      }

      const updated = await this.holidayRepo.updateHoliday(ctx, holidayId, {
        holiday_name,
        holiday_date,
        holiday_type,
        is_optional,
        description,
      });

      res.status(200).json({
        success: true,
        message: 'Holiday updated successfully.',
        data: updated,
      });
    } catch (error: any) {
      console.error('Error updating holiday:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to update holiday.',
      });
    }
  }

  /**
   * 9. DELETE /holidays/:holidayId — Delete a holiday
   */
  async deleteHoliday(req: Request, res: Response): Promise<void> {
    try {
      const ctx = this.getContext(req);
      const { holidayId } = req.params;

      const deleted = await this.holidayRepo.deleteHoliday(ctx, holidayId);
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Holiday with ID ${holidayId} was not found.`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Holiday deleted successfully.',
      });
    } catch (error: any) {
      console.error('Error deleting holiday:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to delete holiday.',
      });
    }
  }

  /**
   * 10. POST /:id/weekly-off — Add/update weekly off rules for a calendar
   */
  async addWeeklyOff(req: Request, res: Response): Promise<void> {
    try {
      const ctx = this.getContext(req);
      const { id } = req.params;
      const body = req.body;

      const calendar = await this.calendarRepo.getById(ctx, id);
      if (!calendar) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Holiday calendar with ID ${id} was not found.`,
        });
        return;
      }

      if (calendar.status === 'Archived') {
        res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Cannot modify weekly-off rules for an Archived calendar.',
        });
        return;
      }

      let rulesArray: any[] = [];
      if (Array.isArray(body)) {
        rulesArray = body;
      } else if (Array.isArray(body.rules)) {
        rulesArray = body.rules;
      } else if (body.week_day) {
        rulesArray = [body];
      }

      // Validate weekdays
      const validWeekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      for (const rule of rulesArray) {
        if (!rule.week_day) {
          res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: 'Each weekly off rule must have a week_day (Mon, Tue, Wed, Thu, Fri, Sat, Sun).',
          });
          return;
        }
        // Normalize week day
        const matched = validWeekDays.find(
          (d) => d.toLowerCase() === String(rule.week_day).trim().slice(0, 3).toLowerCase()
        );
        if (!matched) {
          res.status(400).json({
            success: false,
            error: 'Validation Error',
            message: `Invalid week_day "${rule.week_day}". Must be one of: ${validWeekDays.join(', ')}`,
          });
          return;
        }
        rule.week_day = matched;
      }

      const updatedRules = await this.weeklyOffRepo.setWeeklyOffRules(ctx, id, rulesArray);

      res.status(200).json({
        success: true,
        message: 'Weekly off rules configured successfully.',
        count: updatedRules.length,
        data: updatedRules,
      });
    } catch (error: any) {
      console.error('Error configuring weekly off rules:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to configure weekly off rules.',
      });
    }
  }

  /**
   * 11. POST /:id/assign — Assign calendar to organizational scope
   */
  async assignCalendar(req: Request, res: Response): Promise<void> {
    try {
      const ctx = this.getContext(req);
      const { id } = req.params;
      const { company_id, location_id, department_id, employee_group_id } = req.body;

      const calendar = await this.calendarRepo.getById(ctx, id);
      if (!calendar) {
        res.status(404).json({
          success: false,
          error: 'Not Found',
          message: `Holiday calendar with ID ${id} was not found.`,
        });
        return;
      }

      const assignment = await this.assignmentRepo.assignCalendar(ctx, {
        calendar_id: Number(id),
        company_id: company_id ? Number(company_id) : null,
        location_id: location_id ? Number(location_id) : null,
        department_id: department_id ? Number(department_id) : null,
        employee_group_id: employee_group_id ? Number(employee_group_id) : null,
      });

      res.status(201).json({
        success: true,
        message: 'Holiday calendar assigned successfully.',
        data: assignment,
      });
    } catch (error: any) {
      console.error('Error assigning holiday calendar:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error.message || 'Failed to assign holiday calendar.',
      });
    }
  }
}

export const masterHolidayCalendarController = new MasterHolidayCalendarController();
