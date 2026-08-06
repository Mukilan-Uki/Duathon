import { env } from '../config/env.js';

export function errorHandler(error, req, res, _next) {
  const duplicate = error?.code === 11000;
  const malformedJson = error instanceof SyntaxError && error.status === 400 && 'body' in error;
  const validation = error?.name === 'ValidationError';
  const invalidIdentifier = error?.name === 'CastError';
  const statusCode = duplicate
    ? 409
    : malformedJson || validation || invalidIdentifier
      ? 400
      : error.statusCode || 500;
  const message = duplicate
    ? 'A record with these details already exists'
    : malformedJson
      ? 'Request body contains invalid JSON'
      : validation
        ? 'Database validation failed'
        : invalidIdentifier
          ? 'Invalid resource identifier'
          : error.isOperational
            ? error.message
            : 'An unexpected error occurred';
  if (env.NODE_ENV !== 'test') {
    if (env.NODE_ENV === 'production') {
      console.error({
        message: error.message,
        statusCode,
        name: error.name,
        path: req.originalUrl?.split('?')[0],
      });
    } else {
      console.error(error);
    }
  }
  const errors = validation
    ? Object.values(error.errors).map((item) => ({
        field: item.path,
        message: item.message,
      }))
    : error.errors || [];
  const body = { success: false, message, errors };
  if (env.NODE_ENV === 'development') body.stack = error.stack;
  res.status(statusCode).json(body);
}
