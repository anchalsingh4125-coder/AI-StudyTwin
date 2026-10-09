import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * Custom Zod validator for MongoDB ObjectIds
 */
export const objectIdSchema = z
  .string({ required_error: 'ID is required' })
  .trim()
  .regex(objectIdRegex, { message: 'Invalid ID format. Must be a 24-character hexadecimal string.' });

export const optionalObjectIdSchema = z
  .string()
  .trim()
  .regex(objectIdRegex, { message: 'Invalid ID format. Must be a 24-character hexadecimal string.' })
  .optional()
  .or(z.literal(''))
  .transform((val) => (val === '' ? undefined : val));

// ==========================================
// Authentication Schemas
// ==========================================

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Please provide name, email, and password.' })
    .trim()
    .min(1, 'Please provide name, email, and password.')
    .max(100, 'Name must not exceed 100 characters.'),
  email: z
    .string({ required_error: 'Please provide name, email, and password.' })
    .trim()
    .toLowerCase()
    .email('Invalid email address format.'),
  password: z
    .string({ required_error: 'Please provide name, email, and password.' })
    .min(6, 'Password must be at least 6 characters long.')
    .max(128, 'Password must not exceed 128 characters.'),
  targetSubjects: z
    .array(z.string().trim().min(1))
    .optional()
    .default([]),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Please provide both email and password.' })
    .trim()
    .toLowerCase()
    .email('Invalid email address format.'),
  password: z
    .string({ required_error: 'Please provide both email and password.' })
    .min(1, 'Please provide both email and password.'),
});

// ==========================================
// Quiz & Telemetry Schemas
// ==========================================

export const startQuizSchema = z.object({
  subjectId: optionalObjectIdSchema,
  topicId: optionalObjectIdSchema,
  difficulty: z
    .enum(['all', 'easy', 'medium', 'hard'], {
      errorMap: () => ({ message: "Difficulty must be one of: 'all', 'easy', 'medium', 'hard'" }),
    })
    .optional()
    .default('all'),
  numberOfQuestions: z
    .union([z.number(), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return 5;
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 5 : parsed;
    })
    .pipe(
      z
        .number()
        .int('Number of questions must be an integer.')
        .min(1, 'Minimum question count is 1.')
        .max(50, 'Maximum question count is 50.')
    ),
});

export const answerQuestionSchema = z.object({
  questionId: z
    .string({ required_error: 'questionId is required.' })
    .trim()
    .regex(objectIdRegex, { message: 'Invalid questionId format.' }),
  selectedOption: z
    .union([z.number().int().min(0), z.null(), z.undefined()])
    .optional()
    .transform((val) => (val === undefined ? null : val)),
  timeSpentSeconds: z
    .union([z.number().min(0), z.string()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === null || val === '') return 0;
      const num = Number(val);
      return isNaN(num) || num < 0 ? 0 : num;
    }),
  mistakeType: z
    .enum(['conceptual', 'careless', 'time_pressure', 'unattempted', 'none'], {
      errorMap: () => ({
        message: "mistakeType must be one of: 'conceptual', 'careless', 'time_pressure', 'unattempted', 'none'",
      }),
    })
    .optional(),
});

export const quizIdParamSchema = z.object({
  quizId: z
    .string({ required_error: 'quizId parameter is required.' })
    .trim()
    .regex(objectIdRegex, { message: 'Invalid quizId format.' }),
});
