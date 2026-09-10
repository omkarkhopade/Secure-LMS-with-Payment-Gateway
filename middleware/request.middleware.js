import { AppError } from './error.middleware.js';
export function validateRequest(req, res, next) {
  const inspect = (value, depth = 0) => {
    if (depth > 10) throw new AppError('Request nesting is too deep', 400);
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.') || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new AppError('Invalid request field', 400);
      inspect(child, depth + 1);
    }
  };
  try {
    inspect(req.body); inspect(req.query);
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value !== 'string' && !(key === 'categories' && Array.isArray(value) && value.every(v => typeof v === 'string'))) throw new AppError('Invalid query parameter', 400);
    }
    for (const key of ['page', 'limit']) {
      const value = req.query[key];
      if (value !== undefined && (!/^\d+$/.test(value) || +value < 1 || +value > (key === 'limit' ? 100 : 100000))) throw new AppError(`Invalid ${key}`, 400);
    }
    next();
  } catch (error) { next(error); }
}
