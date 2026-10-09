import { Router } from 'express';
import {
  startQuiz,
  answerQuestion,
  submitQuiz,
  getQuizResult,
  getQuizHistory,
} from '../controllers/quiz.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';
import { validateBody, validateParams } from '../middleware/validation.middleware.js';
import {
  startQuizSchema,
  answerQuestionSchema,
  quizIdParamSchema,
} from '../validators/schemas.js';

const router = Router();

// All quiz routes require authentication
router.use(authenticateUser);

router.post('/start', validateBody(startQuizSchema), startQuiz);
router.get('/history', getQuizHistory);
router.post(
  '/:quizId/answer',
  validateParams(quizIdParamSchema),
  validateBody(answerQuestionSchema),
  answerQuestion
);
router.post('/:quizId/submit', validateParams(quizIdParamSchema), submitQuiz);
router.get('/:quizId/result', validateParams(quizIdParamSchema), getQuizResult);

export default router;
