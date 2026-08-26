import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { reportController } from './ReportController';

const router = Router();

// All report routes require authentication and tenant context
router.use(authenticate, resolveTenant);

// Get all available field definitions grouped by module
router.get('/fields', reportController.getFields);

// Get filter metadata (departments, locations, leave types, employees)
router.get('/meta', reportController.getMetadata);

// Run a dynamic report query with selected fields + filters
router.post('/run', reportController.runReport);

// Saved templates CRUD
router.get('/templates', reportController.listTemplates);
router.post('/templates', reportController.saveTemplate);
router.get('/templates/:id', reportController.getTemplate);
router.put('/templates/:id', reportController.updateTemplate);
router.delete('/templates/:id', reportController.deleteTemplate);

export default router;
