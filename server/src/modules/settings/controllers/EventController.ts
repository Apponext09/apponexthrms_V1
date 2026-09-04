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
    try {
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

      res.status(200).json({ success: true, data: events });
    } catch (error: any) {
      console.error('[EventController.list] Error:', error.message);
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
  }

  /**
   * GET /api/v1/settings/events/:id
   * Fetch single event by ID or UUID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const db = getKnex();
      const { id } = req.params;

      const row = await db('events')
        .where(function () {
          this.where('id', id).orWhere('uuid', id);
        })
        .whereNull('deleted_at')
        .first();

      if (!row) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
        return;
      }

      res.status(200).json({ success: true, data: parseEventRecord(row) });
    } catch (error: any) {
      console.error('[EventController.getById] Error:', error.message);
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
  }

  /**
   * POST /api/v1/settings/events
   * Create new event master
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      const db = getKnex();
      const body = req.body;

      console.log('[EventController.create] ctx:', JSON.stringify({ organizationId: ctx?.organizationId, companyId: ctx?.companyId, userId: ctx?.userId }));
      console.log('[EventController.create] body.title:', body?.title);

      if (!body?.title) {
        res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Title is required' } });
        return;
      }

      // Check if organizer_id column exists to avoid insert errors
      const hasOrganizerCol = await db.schema.hasColumn('events', 'organizer_id');

      const insertData: any = {
        uuid: uuidv4(),
        organization_id: ctx?.organizationId || 1,
        company_id: ctx?.companyId || (body.companyIds?.[0] ? Number(body.companyIds[0]) : null),
        title: body.title,
        description: body.description || '',
        venue: body.venue || '',
        event_type: body.eventType || body.event_type || 'General',
        start_date: body.startDate || body.start_date || null,
        end_date: body.endDate || body.end_date || null,
        start_time: body.startTime || body.start_time || '09:00',
        end_time: body.endTime || body.end_time || '17:00',
        display_days_before: Number(body.displayDaysBefore || body.display_days_before || 0),
        require_participation: body.requireParticipation ? 1 : 0,
        allow_comments: body.allowComments ? 1 : 0,
        set_reminder: body.setReminder ? 1 : 0,
        company_ids: JSON.stringify(body.companyIds || []),
        location_ids: JSON.stringify(body.locationIds || []),
        department_ids: JSON.stringify(body.departmentIds || []),
        shift_ids: JSON.stringify(body.shiftIds || []),
        grade_ids: JSON.stringify(body.gradeIds || []),
        employment_types: JSON.stringify(body.employmentTypes || []),
        employee_status_ids: JSON.stringify(body.employeeStatusIds || []),
        gender: body.gender || 'All',
        is_active: body.isActive !== false ? 1 : 0,
        status: body.status || 'Active',
        created_by: ctx?.userId || null,
        updated_by: ctx?.userId || null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      if (hasOrganizerCol) {
        insertData.organizer_id = ctx?.userId || null;
      }

      const [insertedId] = await db('events').insert(insertData);
      const createdRow = await db('events').where('id', insertedId).first();

      console.log('[EventController.create] Created event ID:', insertedId);
      res.status(201).json({ success: true, data: parseEventRecord(createdRow) });
    } catch (error: any) {
      console.error('[EventController.create] Error:', error.message, error.sql || '');
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
  }

  /**
   * PUT /api/v1/settings/events/:id
   * Update existing event
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const ctx = req.ctx;
      const db = getKnex();
      const { id } = req.params;
      const body = req.body;

      const existing = await db('events')
        .where(function () { this.where('id', id).orWhere('uuid', id); })
        .whereNull('deleted_at')
        .first();

      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
        return;
      }

      const updateData: any = {
        updated_at: new Date(),
        updated_by: ctx?.userId || null,
      };

      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.venue !== undefined) updateData.venue = body.venue;
      if (body.eventType !== undefined || body.event_type !== undefined) updateData.event_type = body.eventType || body.event_type;
      if (body.startDate !== undefined || body.start_date !== undefined) updateData.start_date = body.startDate || body.start_date;
      if (body.endDate !== undefined || body.end_date !== undefined) updateData.end_date = body.endDate || body.end_date;
      if (body.startTime !== undefined || body.start_time !== undefined) updateData.start_time = body.startTime || body.start_time;
      if (body.endTime !== undefined || body.end_time !== undefined) updateData.end_time = body.endTime || body.end_time;
      if (body.displayDaysBefore !== undefined) updateData.display_days_before = Number(body.displayDaysBefore);
      if (body.requireParticipation !== undefined) updateData.require_participation = body.requireParticipation ? 1 : 0;
      if (body.allowComments !== undefined) updateData.allow_comments = body.allowComments ? 1 : 0;
      if (body.setReminder !== undefined) updateData.set_reminder = body.setReminder ? 1 : 0;
      if (body.companyIds !== undefined) updateData.company_ids = JSON.stringify(body.companyIds || []);
      if (body.locationIds !== undefined) updateData.location_ids = JSON.stringify(body.locationIds || []);
      if (body.departmentIds !== undefined) updateData.department_ids = JSON.stringify(body.departmentIds || []);
      if (body.shiftIds !== undefined) updateData.shift_ids = JSON.stringify(body.shiftIds || []);
      if (body.gradeIds !== undefined) updateData.grade_ids = JSON.stringify(body.gradeIds || []);
      if (body.employmentTypes !== undefined) updateData.employment_types = JSON.stringify(body.employmentTypes || []);
      if (body.employeeStatusIds !== undefined) updateData.employee_status_ids = JSON.stringify(body.employeeStatusIds || []);
      if (body.gender !== undefined) updateData.gender = body.gender;
      if (body.status !== undefined) {
        updateData.status = body.status;
        updateData.is_active = body.status === 'Active' ? 1 : 0;
      }
      if (body.isActive !== undefined) {
        updateData.is_active = body.isActive ? 1 : 0;
        updateData.status = body.isActive ? 'Active' : 'Inactive';
      }

      await db('events').where('id', existing.id).update(updateData);
      const updatedRow = await db('events').where('id', existing.id).first();

      console.log('[EventController.update] Updated event ID:', existing.id);
      res.status(200).json({ success: true, data: parseEventRecord(updatedRow) });
    } catch (error: any) {
      console.error('[EventController.update] Error:', error.message, error.sql || '');
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
  }

  /**
   * DELETE /api/v1/settings/events/:id
   * Soft delete event master
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const db = getKnex();
      const { id } = req.params;

      const existing = await db('events')
        .where(function () { this.where('id', id).orWhere('uuid', id); })
        .whereNull('deleted_at')
        .first();

      if (!existing) {
        res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
        return;
      }

      await db('events').where('id', existing.id).update({
        deleted_at: new Date(),
        status: 'Inactive',
        is_active: false,
      });

      res.status(200).json({ success: true, message: 'Event deleted successfully' });
    } catch (error: any) {
      console.error('[EventController.delete] Error:', error.message);
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
  }
}
