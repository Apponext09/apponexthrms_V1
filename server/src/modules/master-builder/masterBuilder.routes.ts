import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { masterBuilderController } from './masterBuilder.controller';

const router = Router();

router.use(authenticate, resolveTenant);

// Choice lists
router.get('/choice-lists', asyncHandler((req, res) => masterBuilderController.listChoiceLists(req, res)));
router.post('/choice-lists', asyncHandler((req, res) => masterBuilderController.createChoiceList(req, res)));
router.put('/choice-lists/:id', asyncHandler((req, res) => masterBuilderController.updateChoiceList(req, res)));
router.delete('/choice-lists/:id', asyncHandler((req, res) => masterBuilderController.deleteChoiceList(req, res)));

// Masters
router.get('/masters', asyncHandler((req, res) => masterBuilderController.listMasters(req, res)));
router.post('/masters', asyncHandler((req, res) => masterBuilderController.createMaster(req, res)));
router.get('/masters/:id', asyncHandler((req, res) => masterBuilderController.getMaster(req, res)));
router.put('/masters/:id', asyncHandler((req, res) => masterBuilderController.updateMaster(req, res)));
router.delete('/masters/:id', asyncHandler((req, res) => masterBuilderController.deleteMaster(req, res)));

// Fields
router.post('/masters/:id/fields', asyncHandler((req, res) => masterBuilderController.addField(req, res)));
router.put('/masters/:id/fields/:fieldId', asyncHandler((req, res) => masterBuilderController.updateField(req, res)));
router.delete('/masters/:id/fields/:fieldId', asyncHandler((req, res) => masterBuilderController.deleteField(req, res)));

// Validation Rules
router.post('/masters/:id/rules', asyncHandler((req, res) => masterBuilderController.addValidationRule(req, res)));
router.put('/masters/:id/rules/:ruleId', asyncHandler((req, res) => masterBuilderController.updateValidationRule(req, res)));
router.delete('/masters/:id/rules/:ruleId', asyncHandler((req, res) => masterBuilderController.deleteValidationRule(req, res)));

// Autofill Mappings
router.post('/masters/:id/autofill', asyncHandler((req, res) => masterBuilderController.addAutofillMapping(req, res)));
router.delete('/masters/:id/autofill/:mappingId', asyncHandler((req, res) => masterBuilderController.deleteAutofillMapping(req, res)));

// Records
router.get('/masters/:id/records', asyncHandler((req, res) => masterBuilderController.listRecords(req, res)));
router.post('/masters/:id/records', asyncHandler((req, res) => masterBuilderController.createRecord(req, res)));
router.put('/masters/:id/records/:recordId', asyncHandler((req, res) => masterBuilderController.updateRecord(req, res)));
router.delete('/masters/:id/records/:recordId', asyncHandler((req, res) => masterBuilderController.deleteRecord(req, res)));

// DB Lookup Options (for db_lookup field type — fetches real entities from DB)
router.get('/db-lookup-options/:entity', asyncHandler((req, res) => masterBuilderController.getDbLookupOptions(req, res)));

// Employee Profile Linkages
router.get('/employee-linkages', asyncHandler((req, res) => masterBuilderController.getEmployeeLinkages(req, res)));
router.get('/employee-values/:employeeId', asyncHandler((req, res) => masterBuilderController.getEmployeeValues(req, res)));
router.post('/employee-values/:employeeId', asyncHandler((req, res) => masterBuilderController.saveEmployeeValues(req, res)));

export default router;

