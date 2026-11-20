import { AppError } from '../shared/errors.js';
import { env } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Invalid JSON body' } });
  }

  // Postgres unique / foreign key violations
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Already exists' } });
  }
  if (err.code === '23514') {
    return res.status(400).json({ error: { code: 'INVALID_VALUE', message: 'Some values are not allowed. Please check and try again.' } });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: { code: 'BAD_REFERENCE', message: 'Related record not found' } });
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: env.isProd ? 'Something went wrong' : err.message,
    },
  });
}
