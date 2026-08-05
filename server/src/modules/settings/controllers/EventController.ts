import type { Request, Response } from 'express';
import { getKnex } from '../../../db/knex.js';
import { v4 as uuidv4 } from 'uuid';

function parseJsonArray(val: unknown): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseEventRecord(row: any) {
  if (!row) return null;
  return {
    ...row,
    id: String(row.id),
    company_ids: parseJsonArray(row.company_ids),
    location_ids: parseJsonArray(row.location_ids),
    department_ids: parseJsonArray(row.department_ids),
    shift_ids: parseJsonArray(row.shift_ids),
    grade_ids: parseJsonArray(row.grade_ids),
    employment_types: parseJsonArray(row.employment_types),
    employee_status_ids: parseJsonArray(row.employee_status_ids),
    require_participation: Boolean(row.require_participation),
    allow_comments: Boolean(row.allow_comments),
    set_reminder: Boolean(row.set_reminder),
    is_active: Boolean(row.is_active),
  };
}

export class EventController {
  /**
   * GET /api/v1/settings/events
   * Fetch all active events for the organization
   */
  async list(req: Request, res: Response): Promise<void> {
    const ctx = req.ctx;
    const db = getKnex();

    let query = db('events').whereNull('deleted_at');

    if (ctx?.organizationId) {
      query = query.where(function () {
        this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      });
    }

    const rows = await query.orderBy('id', 'desc');
    const events = rows.map(parseEventRecord);

    res.status(200).json({
      success: true,
      data: events,
    });
  }

  /**
   * GET /api/v1/settings/events/:id
   * Fetch single event by ID or UUID
   */
  async getById(req: Request, res: Response): Promise<void> {
    const ctx = req.ctx;
    const db = getKnex();
    const { id } = req.params;

    let query = db('events')
      .where(function () {
        this.where('id', id).orWhere('uuid', id);
      })
      .whereNull('deleted_at');

    if (ctx?.organizationId) {
      query = query.where(function () {
        this.where('organization_id', ctx.organizationId).orWhereNull('organization_id');
      });
    }

    const row = await query.first();

    if (!row) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: parseEventRecord(row),
    });
  }

  /**
   * POST /api/v1/settings/events
   * Create new event master
   */
  async create(req: Request, res: Response): Promise<void> {
    const ctx = req.ctx!;
    const db = getKnex();
    const body = req.body;

    if (!body.title) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Title is required' },
      });
      return;
    }

    const newUuid = uuidv4();
    const insertData: any = {
      uuid: newUuid,
      organization_id: ctx.organizationId || 1,
      title: body.title,
      description: body.description || '',
      venue: body.venue || '',
      event_type: body.eventType || body.event_type || 'General',
      start_date: body.startDate || body.start_date || null,
      end_date: body.endDate || body.end_date || null,
      start_time: body.startTime || body.start_time || '09:00',
      end_time: body.endTime || body.end_time || '17:00',
      display_days_before: Number(body.displayDaysBefore || body.display_days_before || 0),
      require_participation: Boolean(body.requireParticipation ?? body.require_participation ?? false),
      allow_comments: Boolean(body.allowComments ?? body.allow_comments ?? false),
      set_reminder: Boolean(body.setReminder ?? body.set_reminder ?? false),
      company_ids: JSON.stringify(body.companyIds || body.company_ids || []),
      location_ids: JSON.stringify(body.locationIds || body.location_ids || []),
      department_ids: JSON.stringify(body.departmentIds || body.department_ids || []),
      shift_ids: JSON.stringify(body.shiftIds || body.shift_ids || []),
      grade_ids: JSON.stringify(body.gradeIds || body.grade_ids || []),
      employment_types: JSON.stringify(body.employmentTypes || body.employment_types || []),
      employee_status_ids: JSON.stringify(body.employeeStatusIds || body.employee_status_ids || []),
      gender: body.gender || 'All',
      is_active: body.isActive ?? body.is_active ?? true,
      status: body.status || (body.isActive === false ? 'Inactive' : 'Active'),
      created_by: ctx.userId || null,
      updated_by: ctx.userId || null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [insertedId] = await db('events').insert(insertData);
    const createdRow = await db('events').where('id', insertedId).first();

    res.status(201).json({
      success: true,
      data: parseEventRecord(createdRow),
    });
  }

  /**
   * PUT /api/v1/settings/events/:id
   * Update existing event
   */
  async update(req: Request, res: Response): Promise<void> {
    const ctx = req.ctx!;
    const db = getKnex();
    const { id } = req.params;
    const body = req.body;

    const existing = await db('events')
      .where(function () {
        this.where('id', id).orWhere('uuid', id);
      })
      .whereNull('deleted_at')
      .first();

    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found' },
      });
      return;
    }

    const updateData: any = {
      updated_at: new Date(),
      updated_by: ctx.userId || null,
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.venue !== undefined) updateData.venue = body.venue;
    if (body.eventType !== undefined || body.event_type !== undefined) {
      updateData.event_type = body.eventType || body.event_type;
    }
    if (body.startDate !== undefined || body.start_date !== undefined) {
      updateData.start_date = body.startDate || body.start_date;
    }
    if (body.endDate !== undefined || body.end_date !== undefined) {
      updateData.end_date = body.endDate || body.end_date;
    }
    if (body.startTime !== undefined || body.start_time !== undefined) {
      updateData.start_time = body.startTime || body.start_time;
    }
    if (body.endTime !== undefined || body.end_time !== undefined) {
      updateData.end_time = body.endTime || body.end_time;
    }
    if (body.displayDaysBefore !== undefined || body.display_days_before !== undefined) {
      updateData.display_days_before = Number(body.displayDaysBefore ?? body.display_days_before);
    }
    if (body.requireParticipation !== undefined || body.require_participation !== undefined) {
      updateData.require_participation = Boolean(body.requireParticipation ?? body.require_participation);
    }
    if (body.allowComments !== undefined || body.allow_comments !== undefined) {
      updateData.allow_comments = Boolean(body.allowComments ?? body.allow_comments);
    }
    if (body.setReminder !== undefined || body.set_reminder !== undefined) {
      updateData.set_reminder = Boolean(body.setReminder ?? body.set_reminder);
    }
    if (body.companyIds !== undefined || body.company_ids !== undefined) {
      updateData.company_ids = JSON.stringify(body.companyIds || body.company_ids || []);
    }
    if (body.locationIds !== undefined || body.location_ids !== undefined) {
      updateData.location_ids = JSON.stringify(body.locationIds || body.location_ids || []);
    }
    if (body.departmentIds !== undefined || body.department_ids !== undefined) {
      updateData.department_ids = JSON.stringify(body.departmentIds || body.department_ids || []);
    }
    if (body.shiftIds !== undefined || body.shift_ids !== undefined) {
      updateData.shift_ids = JSON.stringify(body.shiftIds || body.shift_ids || []);
    }
    if (body.gradeIds !== undefined || body.grade_ids !== undefined) {
      updateData.grade_ids = JSON.stringify(body.gradeIds || body.grade_ids || []);
    }
    if (body.employmentTypes !== undefined || body.employment_types !== undefined) {
      updateData.employment_types = JSON.stringify(body.employmentTypes || body.employment_types || []);
    }
    if (body.employeeStatusIds !== undefined || body.employee_status_ids !== undefined) {
      updateData.employee_status_ids = JSON.stringify(body.employeeStatusIds || body.employee_status_ids || []);
    }
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.isActive !== undefined || body.is_active !== undefined) {
      const active = Boolean(body.isActive ?? body.is_active);
      updateData.is_active = active;
      updateData.status = active ? 'Active' : 'Inactive';
    }
    if (body.status !== undefined) updateData.status = body.status;

    await db('events').where('id', existing.id).update(updateData);
    const updatedRow = await db('events').where('id', existing.id).first();

    res.status(200).json({
      success: true,
      data: parseEventRecord(updatedRow),
    });
  }

  /**
   * DELETE /api/v1/settings/events/:id
   * Soft delete event master
   */
  async delete(req: Request, res: Response): Promise<void> {
    const db = getKnex();
    const { id } = req.params;

    const existing = await db('events')
      .where(function () {
        this.where('id', id).orWhere('uuid', id);
      })
      .whereNull('deleted_at')
      .first();

    if (!existing) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Event not found' },
      });
      return;
    }

    await db('events').where('id', existing.id).update({
      deleted_at: new Date(),
      status: 'Inactive',
      is_active: false,
    });

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully',
    });
  }
}
