import { Router } from 'express';
import { getQuestionsByTopic } from '../controllers/curriculum.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

// All topic questions routes require authentication
router.use(authenticateUser);

router.get('/:id/questions', getQuestionsByTopic);

export default router;
