import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { AppError, catchAsync } from './error.middleware.js';
import { User } from '../models/user.model.js';
export const isAuthenticated = catchAsync(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) throw new AppError('Please sign in', 401);
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { throw new AppError('Invalid or expired session', 401); }
  if (!mongoose.isObjectIdOrHexString(decoded.userId)) throw new AppError('Invalid session', 401);
  const user = await User.findById(decoded.userId);
  if (!user || (decoded.tokenVersion || 0) !== (user.tokenVersion || 0)) throw new AppError('Session is no longer valid', 401);
  req.id = String(user._id); req.user = user;
  next();
});
export const restrictTo = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new AppError('You do not have permission to perform this action', 403));
  next();
};

// Browsing published course details does not require an account. A valid session
// still allows the owner or purchaser to receive their authorized course view.
export const optionalAuth = catchAsync(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return next();
  let decoded;
  try { decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return next(); }
  if (!mongoose.isObjectIdOrHexString(decoded.userId)) return next();
  const user = await User.findById(decoded.userId);
  if (user && (decoded.tokenVersion || 0) === (user.tokenVersion || 0)) {
    req.id = String(user._id);
    req.user = user;
  }
  next();
});
