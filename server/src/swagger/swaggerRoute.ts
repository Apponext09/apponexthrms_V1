import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swaggerDoc';

const router = Router();

// Serve swagger UI
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'Apponext HRMS API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

export default router;
