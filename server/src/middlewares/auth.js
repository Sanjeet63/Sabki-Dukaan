import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { forbidden, unauthorized } from '../shared/errors.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

function readUser(req) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    return { id: payload.sub, role: payload.role };
  } catch {
    throw unauthorized('Session expired, please login again');
  }
}

export function authenticate(req, _res, next) {
  const user = readUser(req);
  if (!user) return next(unauthorized());
  req.user = user;
  next();
}

export function optionalAuth(req, _res, next) {
  try {
    req.user = readUser(req) ?? undefined;
  } catch {
    req.user = undefined;
  }
  next();
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}
