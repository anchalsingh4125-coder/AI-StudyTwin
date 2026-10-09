import { Router } from 'express';
import {
  getOverview,
  getTopicAnalytics,
  getMistakeAnalytics,
  getReadinessAnalytics,
} from '../controllers/analytics.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

// All analytics endpoints require authentication
router.use(authenticateUser);

router.get('/overview', getOverview);
router.get('/topics', getTopicAnalytics);
router.get('/mistakes', getMistakeAnalytics);
router.get('/readiness', getReadinessAnalytics);

export default router;
