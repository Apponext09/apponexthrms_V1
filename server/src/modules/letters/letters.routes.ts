import { Router } from 'express';
import { authenticate } from '../../common/middleware/authenticate';
import { resolveTenant } from '../../common/middleware/resolveTenant';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { LetterController } from './controllers/LetterController';

const router = Router();
const letterController = new LetterController();

router.use(authenticate, resolveTenant);

// ==================== Template Master CRUD ====================
router.get('/templates', asyncHandler((req, res) => letterController.listTemplates(req, res)));
router.post('/templates', asyncHandler((req, res) => letterController.createTemplate(req, res)));
router.get('/templates/:id', asyncHandler((req, res) => letterController.getTemplate(req, res)));
router.put('/templates/:id', asyncHandler((req, res) => letterController.updateTemplate(req, res)));
router.delete('/templates/:id', asyncHandler((req, res) => letterController.deleteTemplate(req, res)));

// ==================== Merge Code Reference ====================
router.get('/merge-codes', asyncHandler((req, res) => letterController.getMergeCodes(req, res)));

// ==================== Letter Generation & Management ====================
router.post('/generate', asyncHandler((req, res) => letterController.generateLetter(req, res)));
router.get('/', asyncHandler((req, res) => letterController.listLetters(req, res)));
router.get('/my-letters', asyncHandler((req, res) => letterController.getMyLetters(req, res)));
router.get('/:id', asyncHandler((req, res) => letterController.getLetter(req, res)));
router.get('/:id/preview', asyncHandler((req, res) => letterController.getLetterPreview(req, res)));
router.post('/:id/send', asyncHandler((req, res) => letterController.sendLetter(req, res)));
router.post('/:id/revoke', asyncHandler((req, res) => letterController.revokeLetter(req, res)));
router.post('/:id/acknowledge', asyncHandler((req, res) => letterController.acknowledgeLetter(req, res)));

export { router as lettersRouter };
export default router;
