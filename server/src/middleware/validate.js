import { AppError } from '../utils/AppError.js';

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      return next(
        new AppError(
          'Validation failed',
          422,
          result.error.issues.map((issue) => ({
            field: issue.path.slice(1).join('.'),
            message: issue.message,
          })),
        ),
      );
    }
    if (result.data.body) req.body = result.data.body;
    if (result.data.params) req.params = result.data.params;
    if (result.data.query) req.query = result.data.query;
    return next();
  };
}
