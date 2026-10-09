import { Router } from 'express';
import { diagnoseStudent } from '../controllers/ai.controller.js';
import {
  createRecommendations,
  getLatestRecommendations,
  getRecommendationHistory,
} from '../controllers/recommendation.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

// All AI and Recommendation routes require authentication
router.use(authenticateUser);

// Diagnosis route (from Module 5)
router.post('/diagnose', diagnoseStudent);

// Recommendation routes (Module 6)
router.post('/recommendations', createRecommendations);
router.get('/recommendations', getLatestRecommendations);
router.get('/recommendations/history', getRecommendationHistory);

export default router;
