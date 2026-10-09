/**
 * Middleware factory functions for validating Express request bodies, parameters, and query strings with Zod.
 */

export const validateBody = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue ? issue.message : 'Invalid request payload.';
    const errors = result.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return res.status(400).json({
      success: false,
      message,
      errors,
    });
  }

  req.body = result.data;
  next();
};

export const validateParams = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.params);
  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue ? issue.message : 'Invalid route parameter.';
    const errors = result.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return res.status(400).json({
      success: false,
      message,
      errors,
    });
  }

  req.params = result.data;
  next();
};

export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue ? issue.message : 'Invalid query string parameter.';
    const errors = result.error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return res.status(400).json({
      success: false,
      message,
      errors,
    });
  }

  req.query = result.data;
  next();
};
