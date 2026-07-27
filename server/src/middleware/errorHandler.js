import { env } from '../config/env.js';

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || 500;
  const message = error.isOperational ? error.message : 'An unexpected error occurred';
  if (env.NODE_ENV !== 'test') console.error(error);
  const body = { success: false, message, errors: error.errors || [] };
  if (env.NODE_ENV === 'development') body.stack = error.stack;
  res.status(statusCode).json(body);
}
