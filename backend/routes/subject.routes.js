import { Router } from 'express';
import { getSubjects, getTopicsBySubject } from '../controllers/curriculum.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = Router();

// All curriculum routes require authentication
router.use(authenticateUser);

router.get('/', getSubjects);
router.get('/:id/topics', getTopicsBySubject);

export default router;
