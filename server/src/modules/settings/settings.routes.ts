import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import type { Request, Response } from 'express';
import type { ApiResponse } from '@apponexthrms/shared';
import { getKnex } from '../../db/knex';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authenticate, resolveTenant);

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

  const name = req.body.name || 'Office';
  const code = req.body.code || `LOC-${Math.floor(100 + Math.random() * 900)}`;

  const [id] = await db('locations').insert({
    uuid: uuidv4(),
    organization_id: ctx.organizationId,
    name,
    code,
    address_line1: req.body.address,
    created_by: ctx.userId,
    updated_by: ctx.userId,
    created_at: new Date(),
    updated_at: new Date(),
  });

  const response: ApiResponse = {
    success: true,
    data: { id, message: 'Location created' },
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
    },
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

export default router;
