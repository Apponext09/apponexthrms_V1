import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import type { Request, Response } from 'express';
import type { ApiResponse } from '@apponexthrms/shared';
import { getKnex } from '../../db/knex';
import { v4 as uuidv4 } from 'uuid';
import { LRUCache } from '../../common/lib/cache';
import { getOrgLeaveSettings, getDefaultWeeklyWorkPattern } from '../leaves/utils/settingsResolver';

// Cache for upcoming holidays (1 hour TTL)
const holidayCache = new LRUCache<string, any[]>(500, 3600000);

const router = Router();

router.use(authenticate, resolveTenant);

// Upcoming Holidays endpoint for Employees
router.get('/holidays/upcoming', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const limit = parseInt(req.query.limit as string, 10) || 5;

  const cacheKey = `${ctx.organizationId}:${ctx.userId}:${limit}`;
  const cachedHolidays = holidayCache.get(cacheKey);
  if (cachedHolidays) {
    res.status(200).json({ success: true, data: cachedHolidays });
    return;
  }

  // Find employee's location
  const user = await db('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).first('employee_id');
  let locationId = null;
  if (user?.employee_id) {
    const emp = await db('employees').where({ id: user.employee_id, organization_id: ctx.organizationId }).first('current_location_id');
    locationId = emp?.current_location_id;
  }

  const currentYear = new Date().getFullYear();
  let calendarsQuery = db('holiday_calendars')
    .where('organization_id', ctx.organizationId)
    .where('year', currentYear);

  if (locationId) {
    calendarsQuery = calendarsQuery.where(function() {
      this.where('applicable_location_id', locationId).orWhere('is_default', true);
    });
  } else {
    calendarsQuery = calendarsQuery.where('is_default', true);
  }

  const calendars = await calendarsQuery;
  const calendarIds = calendars.map(c => c.id);

  if (calendarIds.length === 0) {
    holidayCache.set(cacheKey, []);
    res.status(200).json({ success: true, data: [] });
    return;
  }

  // Get current date string (YYYY-MM-DD) based on server local time
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const holidays = await db('holidays')
    .whereIn('holiday_calendar_id', calendarIds)
    .where('holiday_date', '>=', todayStr)
    .orderBy('holiday_date', 'asc')
    .limit(limit)
    .select('id', 'holiday_name', 'holiday_date', 'holiday_type', 'is_optional');

  holidayCache.set(cacheKey, holidays);

  const response: ApiResponse = {
    success: true,
    data: holidays,
  };
  res.status(200).json(response);
}));

// Full Holiday Calendar endpoint for Employees
router.get('/holidays/my-calendar', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const cacheKey = `fullcal:${ctx.organizationId}:${ctx.userId}`;
  const cachedHolidays = holidayCache.get(cacheKey);
  if (cachedHolidays) {
    res.status(200).json({ success: true, data: cachedHolidays });
    return;
  }

  // Find employee's location
  const user = await db('users').where({ id: ctx.userId, organization_id: ctx.organizationId }).first('employee_id');
  let locationId = null;
  if (user?.employee_id) {
    const emp = await db('employees').where({ id: user.employee_id, organization_id: ctx.organizationId }).first('current_location_id');
    locationId = emp?.current_location_id;
  }

  const currentYear = new Date().getFullYear();
  let calendarsQuery = db('holiday_calendars')
    .where('organization_id', ctx.organizationId)
    .where('year', currentYear);

  if (locationId) {
    calendarsQuery = calendarsQuery.where(function() {
      this.where('applicable_location_id', locationId).orWhere('is_default', true);
    });
  } else {
    calendarsQuery = calendarsQuery.where('is_default', true);
  }

  const calendars = await calendarsQuery;
  const calendarIds = calendars.map(c => c.id);

  if (calendarIds.length === 0) {
    holidayCache.set(cacheKey, []);
    res.status(200).json({ success: true, data: [] });
    return;
  }

  const holidays = await db('holidays')
    .whereIn('holiday_calendar_id', calendarIds)
    .orderBy('holiday_date', 'asc')
    .select('id', 'holiday_name', 'holiday_date', 'holiday_type', 'is_optional');

  holidayCache.set(cacheKey, holidays);

  const response: ApiResponse = {
    success: true,
    data: holidays,
  };
  res.status(200).json(response);
}));

// Root endpoint - get organization settings
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const settings = await db('organization_settings')
    .where('organization_id', ctx.organizationId)
    .first();

  const response: ApiResponse = {
    success: true,
    data: settings || { organization_id: ctx.organizationId },
  };

  res.status(200).json(response);
}));

router.get('/locations', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  
  const db = getKnex();
  const offset = (page - 1) * pageSize;

  const locations = await db('locations')
    .where('organization_id', ctx.organizationId)
    .limit(pageSize)
    .offset(offset);

  const countResult = await db('locations')
    .where('organization_id', ctx.organizationId)
    .count('* as count')
    .first();

  const response: ApiResponse = {
    success: true,
    data: locations,
    meta: {
      page,
      pageSize,
      total: (countResult as any).count,
      hasMore: page * pageSize < (countResult as any).count,
      totalPages: Math.ceil((countResult as any).count / pageSize),
    },
  };

  res.status(200).json(response);
}));

router.post('/locations', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const name = req.body.name || req.body.locationName || 'Office Location';
  const code = req.body.code || req.body.locationCode || `LOC-${Math.floor(1000 + Math.random() * 9000)}`;
  const address = req.body.address || req.body.addressLine1 || req.body.address_line1 || null;
  const city = req.body.city || null;
  const state = req.body.state || null;
  const country = req.body.country || 'India';
  const latitude = req.body.latitude || 19.0760;
  const longitude = req.body.longitude || 72.8777;

  const [id] = await db('locations').insert({
    uuid: uuidv4(),
    organization_id: ctx.organizationId,
    name,
    code,
    address_line1: address,
    city,
    state,
    country,
    status: 'active',
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Sync to attendance_locations table for attendance geofence verification
  const hasAttLocations = await db.schema.hasTable('attendance_locations');
  if (hasAttLocations) {
    const existingAttLoc = await db('attendance_locations')
      .where({ organization_id: ctx.organizationId, location_code: code })
      .first();

    if (!existingAttLoc) {
      const [attLocId] = await db('attendance_locations').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        location_name: name,
        location_code: code,
        address,
        latitude,
        longitude,
        timezone: 'Asia/Kolkata',
        is_primary: false,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const hasGeofences = await db.schema.hasTable('attendance_geofences');
      if (hasGeofences) {
        await db('attendance_geofences').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          location_id: attLocId,
          geofence_name: `${name} Geofence`,
          latitude,
          longitude,
          radius_meters: 1000,
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
  }

  const response: ApiResponse = {
    success: true,
    data: { id, name, code, message: 'Location created successfully' },
  };

  res.status(201).json(response);
}));

router.get('/departments', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  
  const db = getKnex();
  const offset = (page - 1) * pageSize;

  const departments = await db('departments')
    .where('organization_id', ctx.organizationId)
    .limit(pageSize)
    .offset(offset);

  const countResult = await db('departments')
    .where('organization_id', ctx.organizationId)
    .count('* as count')
    .first();

  const response: ApiResponse = {
    success: true,
    data: departments,
    meta: {
      page,
      pageSize,
      total: (countResult as any).count,
      hasMore: page * pageSize < (countResult as any).count,
      totalPages: Math.ceil((countResult as any).count / pageSize),
    } as any,
  };

  res.status(200).json(response);
}));

// List all managers assigned to one department, including their direct-report count.
router.get('/departments/:id/managers', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const departmentId = Number(req.params.id);
  const managers = await db('department_managers as dm')
    .join('employees as e', 'e.id', 'dm.employee_id')
    .where({ 'dm.organization_id': ctx.organizationId, 'dm.department_id': departmentId })
    .select(
      'dm.id',
      'dm.manager_type as managerType',
      'dm.is_primary as isPrimary',
      'e.id as employeeId',
      'e.first_name as firstName',
      'e.last_name as lastName'
    );

  const result = await Promise.all(
    managers.map(async (m: any) => {
      const countRes = await db('employees')
        .where({ organization_id: ctx.organizationId, reporting_manager_id: m.employeeId })
        .count('* as count')
        .first();
      return {
        ...m,
        directReports: Number((countRes as any)?.count || 0),
      };
    })
  );

  res.json({ success: true, data: result });
}));

// Assign an existing department employee as an additional manager or team lead.
router.post('/departments/:id/managers', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const departmentId = Number(req.params.id);
  const { employeeId, managerType = 'department_manager', isPrimary = false } = req.body;
  const employee = await db('employees').where({ id: employeeId, organization_id: ctx.organizationId, current_department_id: departmentId }).first('id');
  if (!employee) throw new Error('Manager must be an employee in the selected department');
  if (isPrimary) await db('department_managers').where({ organization_id: ctx.organizationId, department_id: departmentId }).update({ is_primary: false });
  const [id] = await db('department_managers').insert({ organization_id: ctx.organizationId, department_id: departmentId, employee_id: employeeId, manager_type: managerType, is_primary: Boolean(isPrimary), assigned_by: ctx.userId, assigned_at: new Date() });
  res.status(201).json({ success: true, data: { id } });
}));

router.post('/departments', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const name = req.body.name || req.body.departmentName || 'Department';
  const code = req.body.code || req.body.departmentCode || `DEPT-${Math.floor(100 + Math.random() * 900)}`;
  const description = req.body.description || null;

  const [id] = await db('departments').insert({
    uuid: uuidv4(),
    organization_id: ctx.organizationId,
    name,
    code,
    description,
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: new Date(),
    updated_at: new Date(),
  });

  const created = await db('departments').where('id', id).first();

  const response: ApiResponse = {
    success: true,
    data: created || { id, name, code, message: 'Department created' },
  };

  res.status(201).json(response);
}));

// Get single department by ID
router.get('/departments/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  const dept = await db('departments')
    .where({ id, organization_id: ctx.organizationId })
    .first();

  if (!dept) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.json({ success: true, data: dept });
}));

// Update department by ID (supports PUT and PATCH)
const handleUpdateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  const name = req.body.name || req.body.departmentName;
  const code = req.body.code || req.body.departmentCode;
  const description = req.body.description;
  const status = req.body.status;

  const updatePayload: Record<string, any> = {
    updated_by: ctx.userId,
    updated_at: new Date(),
  };

  if (name !== undefined) updatePayload.name = name;
  if (code !== undefined) updatePayload.code = code;
  if (description !== undefined) updatePayload.description = description;
  if (status !== undefined) updatePayload.status = status;

  const count = await db('departments')
    .where({ id, organization_id: ctx.organizationId })
    .update(updatePayload);

  if (!count) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  const updated = await db('departments')
    .where({ id, organization_id: ctx.organizationId })
    .first();

  res.json({ success: true, data: updated, message: 'Department updated successfully' });
});

router.put('/departments/:id', handleUpdateDepartment);
router.patch('/departments/:id', handleUpdateDepartment);

// Delete department by ID
router.delete('/departments/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  const count = await db('departments')
    .where({ id, organization_id: ctx.organizationId })
    .delete();

  if (!count) {
    res.status(404).json({ success: false, message: 'Department not found' });
    return;
  }

  res.json({ success: true, message: 'Department deleted successfully' });
}));

// ==========================================
// Dynamic Employment Options (Grades, Types, Status)
// ==========================================

router.get('/employment-options', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const response: ApiResponse = {
    success: true,
    data: {
      // These match the database ENUMs in employees table exactly
      employeeTypes: ['full_time', 'part_time', 'contract', 'internship'],
      employeeStatuses: ['candidate', 'onboarding', 'probation', 'active', 'notice', 'exit', 'alumni'],
    }
  };

  res.status(200).json(response);
}));

// GET /company-profile
router.get('/company-profile', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const org = await db('organizations').where('id', ctx.organizationId).first();
  const user = await db('users').where('id', ctx.userId).first();

  res.json({
    success: true,
    data: {
      id: org?.id,
      company_name: org?.name || 'Organization',
      organization_code: org?.code || 'ORG-1001',
      industry: org?.industry || 'Technology & Enterprise Solutions',
      website: org?.website_url || org?.website_url || '',
      phone: org?.phone || user?.phone || '',
      address_line1: org?.location || org?.address_line1 || '',
      owner_name: org?.owner_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim(),
    },
  });
}));

// PUT and PATCH /company-profile
const handleUpdateCompanyProfile = asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const companyName = req.body.companyName || req.body.organizationName || req.body.company_name;
  const organizationCode = req.body.organizationCode || req.body.organization_code;
  const industry = req.body.industry;
  const website = req.body.website || req.body.websiteUrl;
  const phone = req.body.phone;
  const address = req.body.address || req.body.addressLine1 || req.body.location || req.body.address_line1;

  const orgUpdate: Record<string, any> = { updated_at: new Date() };
  if (companyName !== undefined) orgUpdate.name = companyName;
  if (organizationCode !== undefined) orgUpdate.code = organizationCode;
  if (industry !== undefined) orgUpdate.industry = industry;
  if (website !== undefined) {
    orgUpdate.website = website;
    orgUpdate.website_url = website;
  }
  if (phone !== undefined) orgUpdate.phone = phone;
  if (address !== undefined) {
    orgUpdate.address_line1 = address;
    orgUpdate.location = address;
  }

  if (Object.keys(orgUpdate).length > 1) {
    await db('organizations').where('id', ctx.organizationId).update(orgUpdate);
  }

  const updatedOrg = await db('organizations').where('id', ctx.organizationId).first();
  res.json({ success: true, data: updatedOrg, message: 'Company profile updated successfully' });
});

router.put('/company-profile', handleUpdateCompanyProfile);
router.patch('/company-profile', handleUpdateCompanyProfile);

// ==========================================
// Organization Settings (General HR Settings)
// ==========================================

router.get('/org-settings', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const settings = await db('organization_settings')
    .where('organization_id', ctx.organizationId);

  const settingsMap: Record<string, any> = {};
  settings.forEach(s => {
    const rawVal = s.settingValue !== undefined ? s.settingValue : s.setting_value;
    let parsedVal = rawVal;
    
    // Parse JSON string if needed (some databases return json columns as strings)
    if (typeof rawVal === 'string') {
      try {
        parsedVal = JSON.parse(rawVal);
      } catch (e) {
        parsedVal = rawVal;
      }
    }
    
    settingsMap[s.settingKey || s.setting_key] = parsedVal;
  });

  // Default value for sick leave doc threshold is 3
  if (settingsMap['sick_leave_doc_threshold'] === undefined) {
    settingsMap['sick_leave_doc_threshold'] = 3;
  }

  // Default values for Attendance Module Configuration
  if (settingsMap['attendance_mode'] === undefined) {
    settingsMap['attendance_mode'] = 'gps';
  }
  if (settingsMap['geofence_radius_meters'] === undefined) {
    settingsMap['geofence_radius_meters'] = 100;
  }
  if (settingsMap['whitelisted_ips'] === undefined) {
    settingsMap['whitelisted_ips'] = '192.168.1.1, 10.0.0.1';
  }
  if (settingsMap['require_checkout'] === undefined) {
    settingsMap['require_checkout'] = true;
  }
  if (settingsMap['live_tracking_enabled'] === undefined) {
    settingsMap['live_tracking_enabled'] = false;
  }
  if (settingsMap['tracking_interval_minutes'] === undefined) {
    settingsMap['tracking_interval_minutes'] = 15;
  }
  if (settingsMap['auto_checkout_enabled'] === undefined) {
    settingsMap['auto_checkout_enabled'] = false;
  }
  if (settingsMap['auto_checkout_buffer_minutes'] === undefined) {
    settingsMap['auto_checkout_buffer_minutes'] = 0;
  }

  res.json({ success: true, data: settingsMap });
}));

router.put('/org-settings', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const settings = req.body;

  for (const [key, value] of Object.entries(settings)) {
    const existing = await db('organization_settings')
      .where({ organization_id: ctx.organizationId, setting_key: key })
      .first();

    const dbVal = JSON.stringify(value);

    if (existing) {
      await db('organization_settings')
        .where({ id: existing.id })
        .update({
          setting_value: dbVal,
          updated_by: ctx.userId,
          updated_at: new Date()
        });
    } else {
      await db('organization_settings').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        setting_key: key,
        setting_value: dbVal,
        setting_type: typeof value,
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }

  res.json({ success: true, message: 'Settings updated successfully' });
}));

// ==========================================
// Admin Holiday Calendars
// ==========================================

router.get('/holiday-calendars', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();

  const calendars = await db('holiday_calendars as hc')
    .leftJoin('locations as l', 'hc.applicable_location_id', 'l.id')
    .where('hc.organization_id', ctx.organizationId)
    .where('hc.year', year)
    .select('hc.*', 'l.name as location_name');

  res.json({ success: true, data: calendars });
}));

router.post('/holiday-calendars', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const { name, year, description, is_default, applicable_location_id } = req.body;

  if (is_default) {
    // Unset other defaults for the same year
    await db('holiday_calendars')
      .where({ organization_id: ctx.organizationId, year, is_default: true })
      .update({ is_default: false });
  }

  const [id] = await db('holiday_calendars').insert({
    uuid: uuidv4(),
    organization_id: ctx.organizationId,
    name,
    year: year || new Date().getFullYear(),
    description,
    is_default: is_default || false,
    applicable_location_id: applicable_location_id || null,
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: new Date(),
    updated_at: new Date(),
  });

  res.status(201).json({ success: true, data: { id, message: 'Calendar created' } });
}));

router.put('/holiday-calendars/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const { name, description, is_default, applicable_location_id } = req.body;
  const id = Number(req.params.id);

  const cal = await db('holiday_calendars').where({ id, organization_id: ctx.organizationId }).first();
  if (!cal) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }

  if (is_default) {
    await db('holiday_calendars')
      .where({ organization_id: ctx.organizationId, year: cal.year, is_default: true })
      .whereNot('id', id)
      .update({ is_default: false });
  }

  await db('holiday_calendars')
    .where({ id })
    .update({
      name,
      description,
      is_default,
      applicable_location_id: applicable_location_id || null,
      updated_by: ctx.userId,
      updated_at: new Date()
    });

  res.json({ success: true, message: 'Calendar updated' });
}));

router.delete('/holiday-calendars/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  await db('holidays').where('holiday_calendar_id', id).delete();
  const count = await db('holiday_calendars').where({ id, organization_id: ctx.organizationId }).delete();
  
  if (!count) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  res.json({ success: true, message: 'Deleted' });
}));

// ==========================================
// Admin Holidays
// ==========================================

router.get('/holiday-calendars/:calendarId/holidays', asyncHandler(async (req: Request, res: Response) => {
  const db = getKnex();
  const calendarId = Number(req.params.calendarId);

  const holidays = await db('holidays')
    .where('holiday_calendar_id', calendarId)
    .orderBy('holiday_date', 'asc');

  res.json({ success: true, data: holidays });
}));

router.post('/holiday-calendars/:calendarId/holidays', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const calendarId = Number(req.params.calendarId);
  const { holiday_name, holiday_date, holiday_type, is_optional, description } = req.body;

  const [id] = await db('holidays').insert({
    uuid: uuidv4(),
    organization_id: ctx.organizationId,
    holiday_calendar_id: calendarId,
    holiday_name,
    holiday_date,
    holiday_type: holiday_type || 'public',
    is_optional: is_optional || false,
    description,
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Bust cache
  holidayCache.clear();

  res.status(201).json({ success: true, data: { id, message: 'Holiday created' } });
}));

router.put('/holidays/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);
  const { holiday_name, holiday_date, holiday_type, is_optional, description } = req.body;

  const count = await db('holidays')
    .where({ id, organization_id: ctx.organizationId })
    .update({
      holiday_name,
      holiday_date,
      holiday_type,
      is_optional,
      description,
      updated_by: ctx.userId,
      updated_at: new Date()
    });

  if (!count) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  
  // Bust cache
  holidayCache.clear();
  
  res.json({ success: true, message: 'Holiday updated' });
}));

router.delete('/holidays/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  const count = await db('holidays')
    .where({ id, organization_id: ctx.organizationId })
    .delete();

  if (!count) {
    res.status(404).json({ success: false, message: 'Not found' });
    return;
  }
  
  // Bust cache
  holidayCache.clear();
  
  res.json({ success: true, message: 'Holiday deleted' });
}));

// ==========================================
// Admin Leave Types (Quotas)
// ==========================================

router.get('/leave-types', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  const types = await db('leave_types')
    .where('organization_id', ctx.organizationId)
    .orWhereNull('organization_id')
    .orderBy('id', 'asc');

  res.json({ success: true, data: types });
}));

router.post('/leave-types', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const {
    leave_name,
    leave_code,
    annual_quota,
    carry_forward_enabled,
    carry_forward_limit,
    encashment_enabled,
    encashment_limit,
    sandwich_rule_enabled,
    gender_applicable,
    description,
    status,
    allow_negative_balance,
    negative_balance_action,
    pool_from_leave_type_id,
    paid_type,
    leave_classification,
    allocation_settings,
    application_settings,
    payroll_settings,
    employment_allocation_settings,
    employment_application_settings,
    encashment_settings
  } = req.body;

  const existingCode = await db('leave_types')
    .where({ organization_id: ctx.organizationId, leave_code: leave_code.toUpperCase() })
    .whereNull('deleted_at')
    .first();

  if (existingCode) {
    res.status(400).json({ success: false, message: `A leave category with code '${leave_code.toUpperCase()}' already exists. Please edit the existing one.` });
    return;
  }

  const isAllowNeg = Boolean(allow_negative_balance);
  const action = isAllowNeg ? negative_balance_action : null;
  const poolId = (isAllowNeg && action === 'POOL_FROM_OTHER_LEAVE') ? (parseInt(pool_from_leave_type_id, 10) || null) : null;

  if (isAllowNeg && action === 'POOL_FROM_OTHER_LEAVE' && !poolId) {
    res.status(400).json({ success: false, message: 'Deduct leave type is required when Pooling is selected.' });
    return;
  }

  const stringifyJson = (val: any) => val ? (typeof val === 'string' ? val : JSON.stringify(val)) : null;

  await db.transaction(async (trx) => {
    const [id] = await trx('leave_types').insert({
      uuid: uuidv4(),
      organization_id: ctx.organizationId,
      leave_name,
      leave_code: leave_code.toUpperCase(),
      annual_quota: parseInt(annual_quota, 10) || 0,
      carry_forward_enabled: Boolean(carry_forward_enabled),
      carry_forward_limit: parseInt(carry_forward_limit, 10) || null,
      encashment_enabled: Boolean(encashment_enabled),
      encashment_limit: parseInt(encashment_limit, 10) || null,
      sandwich_rule_enabled: Boolean(sandwich_rule_enabled),
      gender_applicable: gender_applicable || 'all',
      description: description || null,
      status: status || 'active',
      paid_type: paid_type || 'paid',
      allow_negative_balance: isAllowNeg,
      negative_balance_action: action,
      pool_from_leave_type_id: poolId,
      leave_classification: leave_classification || 'uncategorized',
      allocation_settings: stringifyJson(allocation_settings),
      application_settings: stringifyJson(application_settings),
      payroll_settings: stringifyJson(payroll_settings),
      employment_allocation_settings: stringifyJson(employment_allocation_settings),
      employment_application_settings: stringifyJson(employment_application_settings),
      encashment_settings: stringifyJson(encashment_settings),
      created_by: ctx.userId,
      updated_by: ctx.userId,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Resolve or create default leave policy for organization
    let defaultPolicy = await trx('leave_policies')
      .where('organization_id', ctx.organizationId)
      .where('is_default', true)
      .first();

    if (!defaultPolicy) {
      const [policyId] = await trx('leave_policies').insert({
        uuid: uuidv4(),
        organization_id: ctx.organizationId,
        name: 'Standard Leave Policy',
        code: 'STD_POLICY',
        is_default: true,
        status: 'active',
        created_by: ctx.userId,
        updated_by: ctx.userId,
        created_at: new Date(),
        updated_at: new Date()
      });
      defaultPolicy = await trx('leave_policies').where('id', policyId).first();
    }

    const policyId = defaultPolicy.id;

    // For all existing employees, initialize policy assignments and balances for this new leave type!
    const employees = await trx('employees')
      .where({ organization_id: ctx.organizationId })
      .whereNull('deleted_at');

    const currentYear = new Date().getFullYear();
    const fyStart = `${currentYear}-04-01`;
    const fyEnd = `${currentYear + 1}-03-31`;

    for (const emp of employees) {
      // Check if assignment already exists
      const existingAssign = await trx('leave_policy_assignments')
        .where({ employee_id: emp.id, leave_type_id: id })
        .first();
      if (!existingAssign) {
        await trx('leave_policy_assignments').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: emp.id,
          leave_type_id: id,
          leave_policy_id: policyId, // Use the resolved policyId!
          annual_quota: parseInt(annual_quota, 10) || 0,
          carry_forward_enabled: Boolean(carry_forward_enabled) ? 1 : 0,
          carry_forward_limit: parseInt(carry_forward_limit, 10) || null,
          assignment_start_date: new Date(),
          is_active: true,
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date()
        });
      }

      const existingBal = await trx('leave_balances')
        .where({ employee_id: emp.id, leave_type_id: id, financial_year_start: fyStart })
        .first();
      if (!existingBal) {
        await trx('leave_balances').insert({
          uuid: uuidv4(),
          organization_id: ctx.organizationId,
          employee_id: emp.id,
          leave_type_id: id,
          financial_year_start: fyStart,
          financial_year_end: fyEnd,
          opening_balance: parseInt(annual_quota, 10) || 0,
          credited_balance: 0,
          consumed_balance: 0,
          available_balance: parseInt(annual_quota, 10) || 0,
          carry_forward_balance: 0,
          encashed_balance: 0,
          expired_balance: 0,
          pending_approval_balance: 0,
          created_by: ctx.userId,
          updated_by: ctx.userId,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    // Write to audit_logs
    await trx('audit_logs').insert({
      organization_id: ctx.organizationId,
      actor_user_id: ctx.userId,
      action: 'CREATE_LEAVE_TYPE',
      entity_type: 'leave_type',
      entity_id: String(id),
      before_state: null,
      after_state: JSON.stringify({
        leave_name,
        leave_code: leave_code.toUpperCase(),
        annual_quota: parseInt(annual_quota, 10) || 0,
        carry_forward_enabled: Boolean(carry_forward_enabled),
        carry_forward_limit: parseInt(carry_forward_limit, 10) || null,
        encashment_enabled: Boolean(encashment_enabled),
        encashment_limit: parseInt(encashment_limit, 10) || null,
        sandwich_rule_enabled: Boolean(sandwich_rule_enabled),
        gender_applicable: gender_applicable || 'all',
        description: description || null,
        status: status || 'active',
        paid_type: paid_type || 'paid',
        allow_negative_balance: isAllowNeg,
        negative_balance_action: action,
        pool_from_leave_type_id: poolId
      }),
      ip_address: req.ip || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'unknown',
      created_at: new Date()
    }).catch(() => {});
  });

  res.status(201).json({ success: true, message: 'Leave type created successfully and assigned to employees' });
}));

router.put('/leave-types/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);
  const {
    leave_name,
    leave_code,
    annual_quota,
    carry_forward_enabled,
    carry_forward_limit,
    encashment_enabled,
    encashment_limit,
    sandwich_rule_enabled,
    gender_applicable,
    description,
    status,
    allow_negative_balance,
    negative_balance_action,
    pool_from_leave_type_id,
    paid_type,
    leave_classification,
    allocation_settings,
    application_settings,
    payroll_settings,
    employment_allocation_settings,
    employment_application_settings,
    encashment_settings
  } = req.body;

  const currentType = await db('leave_types').where({ id }).first();
  if (!currentType) {
    res.status(404).json({ success: false, message: 'Leave type not found' });
    return;
  }

  const isAllowNeg = Boolean(allow_negative_balance);
  const action = isAllowNeg ? negative_balance_action : null;
  const poolId = (isAllowNeg && action === 'POOL_FROM_OTHER_LEAVE') ? (parseInt(pool_from_leave_type_id, 10) || null) : null;

  if (isAllowNeg && action === 'POOL_FROM_OTHER_LEAVE' && !poolId) {
    res.status(400).json({ success: false, message: 'Deduct leave type is required when Pooling is selected.' });
    return;
  }

  if (isAllowNeg && action === 'POOL_FROM_OTHER_LEAVE' && poolId === id) {
    res.status(400).json({ success: false, message: 'Cannot pool from the same leave type.' });
    return;
  }

  const newQuota = parseInt(annual_quota, 10) || 0;
  const oldQuota = currentType.annual_quota || currentType.annualQuota || 0;
  const quotaDiff = newQuota - oldQuota;

  const stringifyJson = (val: any) => val ? (typeof val === 'string' ? val : JSON.stringify(val)) : null;

  // 1. Update leave type
  await db('leave_types')
    .where({ id })
    .update({
      leave_name,
      leave_code: leave_code.toUpperCase(),
      annual_quota: newQuota,
      carry_forward_enabled: Boolean(carry_forward_enabled),
      carry_forward_limit: parseInt(carry_forward_limit, 10) || null,
      encashment_enabled: Boolean(encashment_enabled),
      encashment_limit: parseInt(encashment_limit, 10) || null,
      sandwich_rule_enabled: Boolean(sandwich_rule_enabled),
      gender_applicable: gender_applicable || 'all',
      description: description || null,
      status: status || 'active',
      paid_type: paid_type || 'paid',
      allow_negative_balance: isAllowNeg,
      negative_balance_action: action,
      pool_from_leave_type_id: poolId,
      leave_classification: leave_classification || 'uncategorized',
      allocation_settings: stringifyJson(allocation_settings),
      application_settings: stringifyJson(application_settings),
      payroll_settings: stringifyJson(payroll_settings),
      employment_allocation_settings: stringifyJson(employment_allocation_settings),
      employment_application_settings: stringifyJson(employment_application_settings),
      encashment_settings: stringifyJson(encashment_settings),
      updated_by: ctx.userId,
      updated_at: new Date()
    });

  // 2. Update all active policy assignments for this type in this organization
  await db('leave_policy_assignments')
    .where({ organization_id: ctx.organizationId, leave_type_id: id })
    .update({
      annual_quota: newQuota,
      carry_forward_enabled: Boolean(carry_forward_enabled) ? 1 : 0,
      carry_forward_limit: parseInt(carry_forward_limit, 10) || null,
      updated_by: ctx.userId,
      updated_at: new Date()
    });

  // 3. Update active leave balances for this financial year (adjust available/opening balances by the diff)
  const currentYear = new Date().getFullYear();
  const fyStart = `${currentYear}-04-01`;

  const balances = await db('leave_balances')
    .where({ organization_id: ctx.organizationId, leave_type_id: id, financial_year_start: fyStart });

  for (const bal of balances) {
    const updatedOpening = (parseFloat(bal.opening_balance || bal.openingBalance) || 0) + quotaDiff;
    const updatedAvailable = (parseFloat(bal.available_balance || bal.availableBalance) || 0) + quotaDiff;

    await db('leave_balances')
      .where({ id: bal.id })
      .update({
        opening_balance: updatedOpening,
        available_balance: updatedAvailable,
        updated_by: ctx.userId,
        updated_at: new Date()
      });
  }

  // Write to audit_logs
  await db('audit_logs').insert({
    organization_id: ctx.organizationId,
    actor_user_id: ctx.userId,
    action: 'UPDATE_LEAVE_TYPE',
    entity_type: 'leave_type',
    entity_id: String(id),
    before_state: JSON.stringify({
      leave_name: currentType.leave_name,
      leave_code: currentType.leave_code,
      annual_quota: oldQuota,
      carry_forward_enabled: !!currentType.carry_forward_enabled,
      carry_forward_limit: currentType.carry_forward_limit,
      encashment_enabled: !!currentType.encashment_enabled,
      encashment_limit: currentType.encashment_limit,
      sandwich_rule_enabled: !!currentType.sandwich_rule_enabled,
      gender_applicable: currentType.gender_applicable,
      description: currentType.description,
      status: currentType.status,
      paid_type: currentType.paid_type,
      allow_negative_balance: !!currentType.allow_negative_balance,
      negative_balance_action: currentType.negative_balance_action,
      pool_from_leave_type_id: currentType.pool_from_leave_type_id
    }),
    after_state: JSON.stringify({
      leave_name,
      leave_code: leave_code.toUpperCase(),
      annual_quota: newQuota,
      carry_forward_enabled: Boolean(carry_forward_enabled),
      carry_forward_limit: parseInt(carry_forward_limit, 10) || null,
      encashment_enabled: Boolean(encashment_enabled),
      encashment_limit: parseInt(encashment_limit, 10) || null,
      sandwich_rule_enabled: Boolean(sandwich_rule_enabled),
      gender_applicable: gender_applicable || 'all',
      description: description || null,
      status: status || 'active',
      paid_type: paid_type || 'paid',
      allow_negative_balance: isAllowNeg,
      negative_balance_action: action,
      pool_from_leave_type_id: poolId
    }),
    ip_address: req.ip || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown',
    created_at: new Date()
  }).catch((err) => {
    console.error('Failed to insert audit log:', err);
  });

  res.json({ success: true, message: 'Leave type and employee quotas updated successfully' });
}));

// GET audit logs for a specific leave type
router.get('/leave-types/:id/audit-logs', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  const logs = await db('audit_logs')
    .where({
      organization_id: ctx.organizationId,
      entity_type: 'leave_type',
      entity_id: String(id)
    })
    .orderBy('created_at', 'desc')
    .limit(100);

  const userIds = logs.map(l => l.actorUserId || l.actor_user_id).filter(Boolean);
  let usersMap: Record<number, string> = {};
  if (userIds.length > 0) {
    const users = await db('users').whereIn('id', userIds).select('id', 'name', 'email');
    users.forEach(u => {
      usersMap[u.id] = u.name || u.email || `User #${u.id}`;
    });
  }

  const formattedLogs = logs.map(log => ({
    id: log.id,
    action: log.action,
    actorName: usersMap[log.actorUserId || log.actor_user_id] || 'System',
    beforeState: typeof log.beforeState === 'string' ? JSON.parse(log.beforeState) : log.beforeState || log.before_state,
    afterState: typeof log.afterState === 'string' ? JSON.parse(log.afterState) : log.afterState || log.after_state,
    ipAddress: log.ipAddress || log.ip_address,
    createdAt: log.createdAt || log.created_at
  }));

  res.status(200).json({ success: true, data: formattedLogs });
}));

router.delete('/leave-types/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const id = Number(req.params.id);

  // Soft delete leave type
  await db('leave_types')
    .where({ id })
    .update({
      deleted_at: new Date(),
      status: 'inactive'
    });

  // Deactivate assignments
  await db('leave_policy_assignments')
    .where({ organization_id: ctx.organizationId, leave_type_id: id })
    .update({
      is_active: false,
      updated_at: new Date()
    });

  res.json({ success: true, message: 'Leave type deleted successfully' });
}));

// GET resolved settings for the logged-in employee based on their location
router.get('/org-leave-settings/my-resolved', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  // Find employee for the current user
  const employee = await db('employees')
    .where('user_id', ctx.userId)
    .first();

  const locationId = employee?.current_location_id || null;
  const settings = await getOrgLeaveSettings(ctx.organizationId, locationId);
  res.status(200).json({ success: true, data: settings });
}));

// GET resolved settings for a location or org-wide fallback
router.get('/org-leave-settings/resolved', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const locationId = req.query.locationId as string || null;
  try {
    const settings = await getOrgLeaveSettings(ctx.organizationId, locationId);
    res.status(200).json({ success: true, data: settings });
  } catch (err: any) {
    // Table may not exist yet if migration hasn't run
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.message?.includes('no such table') || err?.message?.includes("doesn't exist")) {
      res.status(200).json({
        success: true,
        data: {
          organizationId: ctx.organizationId,
          locationId: null,
          normalWorkingHoursDaily: 9,
          fullTimeHours: 8,
          weeklyWorkPattern: getDefaultWeeklyWorkPattern(),
          holidayYearStartMonth: 4,
          maxConsecutiveAnnualLeaveDays: null
        }
      });
      return;
    }
    throw err;
  }
}));

// GET list of all settings (org-wide and overrides)
router.get('/org-leave-settings', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  // Run migrations programmatically to ensure new columns are added
  try {
    await db.migrate.latest({
      directory: 'd:/KOSQU TECHNOLAB/HRMS/apponexthrms/database/migrations',
      loadExtensions: ['.ts']
    });
    // Safely drop the foreign key constraint to support both locations and attendance_locations tables
    try {
      await db.schema.alterTable('org_leave_settings', (table) => {
        table.dropForeign(['location_id']);
      });
    } catch (fkErr) {
      // Ignore if constraint already dropped or doesn't exist
    }
  } catch (migErr) {
    console.error('Programmatic migration failed:', migErr);
  }

  try {
    const settings = await db('org_leave_settings')
      .where('organization_id', ctx.organizationId);
    const parsedSettings = settings.map((row: any) => {
      const parseJson = (val: any) => {
        if (!val) return null;
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
      };

      const getVal = (field1: string, field2: string) => {
        if (row[field1] !== undefined) return row[field1];
        if (row[field2] !== undefined) return row[field2];
        return null;
      };

      const normalWorkingHoursDaily = getVal('normalWorkingHoursDaily', 'normal_working_hours_daily');
      const fullTimeHours = getVal('fullTimeHours', 'full_time_hours');
      const weeklyWorkPattern = parseJson(getVal('weeklyWorkPattern', 'weekly_work_pattern'));
      const holidayYearStartMonth = getVal('holidayYearStartMonth', 'holiday_year_start_month');
      const maxConsecutiveAnnualLeaveDays = getVal('maxConsecutiveAnnualLeaveDays', 'max_consecutive_annual_leave_days');
      const leaveClubbingRules = parseJson(getVal('leaveClubbingRules', 'leave_clubbing_rules'));
      const leaveRestrictionRules = parseJson(getVal('leaveRestrictionRules', 'leave_restriction_rules'));
      const defaultWeekDay = getVal('defaultWeekDay', 'default_week_day');
      const disableLeaveApplicationReminder = getVal('disableLeaveApplicationReminder', 'disable_leave_application_reminder');
      const showPopupOnWeekOffOrHoliday = getVal('showPopupOnWeekOffOrHoliday', 'show_popup_on_week_off_or_holiday');
      const leaveApplicationDateRestriction = getVal('leaveApplicationDateRestriction', 'leave_application_date_restriction');
      const leaveApplicationStartDay = getVal('leaveApplicationStartDay', 'leave_application_start_day');
      const leaveApplicationStartMonth = getVal('leaveApplicationStartMonth', 'leave_application_start_month');
      const defaultLeaveMonth = getVal('defaultLeaveMonth', 'default_leave_month');

      const organization_id = getVal('organizationId', 'organization_id');
      const location_id = getVal('locationId', 'location_id');

      return {
        ...row,
        normalWorkingHoursDaily,
        fullTimeHours,
        weeklyWorkPattern,
        holidayYearStartMonth,
        maxConsecutiveAnnualLeaveDays,
        leaveClubbingRules,
        leaveRestrictionRules,
        defaultWeekDay,
        disableLeaveApplicationReminder,
        showPopupOnWeekOffOrHoliday,
        leaveApplicationDateRestriction,
        leaveApplicationStartDay,
        leaveApplicationStartMonth,
        defaultLeaveMonth,

        organization_id,
        location_id,
        normal_working_hours_daily: normalWorkingHoursDaily,
        full_time_hours: fullTimeHours,
        weekly_work_pattern: weeklyWorkPattern,
        holiday_year_start_month: holidayYearStartMonth,
        max_consecutive_annual_leave_days: maxConsecutiveAnnualLeaveDays,
        leave_clubbing_rules: leaveClubbingRules,
        leave_restriction_rules: leaveRestrictionRules,
        default_week_day: defaultWeekDay,
        disable_leave_application_reminder: disableLeaveApplicationReminder,
        show_popup_on_week_off_or_holiday: showPopupOnWeekOffOrHoliday,
        leave_application_date_restriction: leaveApplicationDateRestriction,
        leave_application_start_day: leaveApplicationStartDay,
        leave_application_start_month: leaveApplicationStartMonth,
        default_leave_month: defaultLeaveMonth
      };
    });
    res.status(200).json({ success: true, data: parsedSettings });
  } catch (err: any) {
    // Table may not exist yet if migration hasn't run
    if (err?.code === 'ER_NO_SUCH_TABLE' || err?.message?.includes('no such table') || err?.message?.includes("doesn't exist")) {
      res.status(200).json({ success: true, data: [] });
    } else {
      throw err;
    }
  }
}));

// POST/PUT save settings (upsert style)
router.post('/org-leave-settings', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();

  try {
    // Check if table exists first
    try {
      await db.raw("SELECT 1 FROM org_leave_settings LIMIT 0");
    } catch (err: any) {
      if (err?.code === 'ER_NO_SUCH_TABLE' || err?.message?.includes('no such table') || err?.message?.includes("doesn't exist")) {
        res.status(503).json({ success: false, message: 'org_leave_settings table does not exist yet. Please run database migrations first (cd database && npm run migrate).' });
        return;
      }
      throw err;
    }

    const {
      locationId, // UUID string
      normalWorkingHoursDaily,
      fullTimeHours,
      weeklyWorkPattern,
      holidayYearStartMonth,
      maxConsecutiveAnnualLeaveDays,
      leaveClubbingRules,
      leaveRestrictionRules,
      defaultWeekDay,
      disableLeaveApplicationReminder,
      showPopupOnWeekOffOrHoliday,
      leaveApplicationDateRestriction,
      leaveApplicationStartDay,
      leaveApplicationStartMonth,
      defaultLeaveMonth
    } = req.body;

    // Validate locationId exists or is null
    let finalLocationUuid: string | null = null;
    if (locationId) {
      let loc = await db('locations').where('uuid', locationId).first();
      if (!loc) {
        loc = await db('attendance_locations').where('uuid', locationId).first();
      }
      if (!loc) {
        res.status(400).json({ success: false, message: 'Invalid location UUID.' });
        return;
      }
      finalLocationUuid = loc.uuid;
    }

    // Check if settings already exist for this combination
    const query = db('org_leave_settings')
      .where('organization_id', ctx.organizationId);
    
    if (finalLocationUuid) {
      query.where('location_id', finalLocationUuid);
    } else {
      query.whereNull('location_id');
    }
    
    const existing = await query.first();

    const dataToSave: any = {
      updated_at: new Date(),
      updated_by: ctx.userId
    };

    const setIfDefined = (dbCol: string, val: any, transform?: (v: any) => any) => {
      if (val !== undefined) {
        dataToSave[dbCol] = transform ? transform(val) : val;
      } else if (!existing) {
        if (!finalLocationUuid) {
          if (dbCol === 'normal_working_hours_daily') dataToSave[dbCol] = 9;
          else if (dbCol === 'full_time_hours') dataToSave[dbCol] = 8;
          else if (dbCol === 'holiday_year_start_month') dataToSave[dbCol] = 4;
          else if (dbCol === 'leave_application_start_day') dataToSave[dbCol] = 1;
          else dataToSave[dbCol] = null;
        } else {
          dataToSave[dbCol] = null;
        }
      }
    };

    setIfDefined('normal_working_hours_daily', normalWorkingHoursDaily, (v) => v !== null && v !== '' ? parseFloat(v) : 9);
    setIfDefined('full_time_hours', fullTimeHours, (v) => v !== null && v !== '' ? parseFloat(v) : 8);
    setIfDefined('weekly_work_pattern', weeklyWorkPattern, (v) => v ? (typeof v === 'string' ? v : JSON.stringify(v)) : null);
    setIfDefined('holiday_year_start_month', holidayYearStartMonth, (v) => v !== null && v !== '' ? parseInt(v, 10) : null);
    setIfDefined('max_consecutive_annual_leave_days', maxConsecutiveAnnualLeaveDays, (v) => v !== null && v !== '' ? parseFloat(v) : null);
    setIfDefined('leave_clubbing_rules', leaveClubbingRules, (v) => v ? (typeof v === 'string' ? v : JSON.stringify(v)) : null);
    setIfDefined('leave_restriction_rules', leaveRestrictionRules, (v) => v ? (typeof v === 'string' ? v : JSON.stringify(v)) : null);
    setIfDefined('default_week_day', defaultWeekDay, (v) => v || null);
    setIfDefined('disable_leave_application_reminder', disableLeaveApplicationReminder, (v) => !!v);
    setIfDefined('show_popup_on_week_off_or_holiday', showPopupOnWeekOffOrHoliday, (v) => !!v);
    setIfDefined('leave_application_date_restriction', leaveApplicationDateRestriction, (v) => !!v);
    setIfDefined('leave_application_start_day', leaveApplicationStartDay, (v) => v !== null && v !== '' ? parseInt(v, 10) : 1);
    setIfDefined('leave_application_start_month', leaveApplicationStartMonth, (v) => v !== null && v !== '' ? parseInt(v, 10) : null);
    setIfDefined('default_leave_month', defaultLeaveMonth, (v) => v !== null && v !== '' ? parseInt(v, 10) : null);

    if (existing) {
      await db('org_leave_settings')
        .where('id', existing.id)
        .update(dataToSave);
    } else {
      const id = uuidv4();
      await db('org_leave_settings').insert({
        id,
        organization_id: ctx.organizationId,
        location_id: finalLocationUuid,
        created_by: ctx.userId,
        created_at: new Date(),
        ...dataToSave
      });
    }

    // Clean up empty override row if all location overrides are deleted
    if (finalLocationUuid) {
      const updatedRow = await db('org_leave_settings')
        .where('organization_id', ctx.organizationId)
        .where('location_id', finalLocationUuid)
        .first();
      
      if (updatedRow) {
        const hasWorkPattern = updatedRow.weeklyWorkPattern !== null && updatedRow.weeklyWorkPattern !== undefined;
        const hasStartMonth = updatedRow.leaveApplicationStartMonth !== null && updatedRow.leaveApplicationStartMonth !== undefined;
        const hasHolidayMonth = updatedRow.holidayYearStartMonth !== null && updatedRow.holidayYearStartMonth !== undefined;
        const hasWeekDay = updatedRow.defaultWeekDay !== null && updatedRow.defaultWeekDay !== undefined;

        const parseJsonList = (val: any) => {
          if (!val) return [];
          if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return []; }
          }
          return val;
        };
        const clubbing = parseJsonList(updatedRow.leaveClubbingRules);
        const restriction = parseJsonList(updatedRow.leaveRestrictionRules);
        const hasClubbing = Array.isArray(clubbing) && clubbing.length > 0;
        const hasRestriction = Array.isArray(restriction) && restriction.length > 0;

        if (!hasWorkPattern && !hasStartMonth && !hasHolidayMonth && !hasWeekDay && !hasClubbing && !hasRestriction) {
          await db('org_leave_settings')
            .where('id', updatedRow.id)
            .delete();
        }
      }
    }

    res.status(200).json({ success: true, message: 'Leave settings saved successfully.' });
  } catch (err: any) {
    console.error('[SETTINGS POST ERROR]', err);
    throw err;
  }
}));




// DELETE organization settings row (to reset overrides to defaults)
router.delete('/org-leave-settings/:id', asyncHandler(async (req: Request, res: Response) => {
  const ctx = req.ctx!;
  const db = getKnex();
  const { id } = req.params;

  await db('org_leave_settings')
    .where('id', id)
    .where('organization_id', ctx.organizationId)
    .delete();

  res.json({ success: true, message: 'Settings override deleted successfully.' });
}));

export default router;
