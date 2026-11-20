import rateLimit from 'express-rate-limit';

// Rate limiter that answers with our normal JSON error shape.
// When `perUser` is set it must run after `authenticate`, and limits by user id instead of IP:
// many mobile users in India share one IP (carrier NAT), so IP limits would block real customers.
export function limiter({ windowMs, limit, message, perUser = false }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    ...(perUser && { keyGenerator: (req) => `user:${req.user.id}` }),
    handler: (req, res, _next, options) => {
      const retryAfter = Math.ceil(options.windowMs / 1000);
      res.status(429).json({
        error: { code: 'TOO_MANY_REQUESTS', message, retryAfterSeconds: retryAfter },
      });
    },
  });
}
