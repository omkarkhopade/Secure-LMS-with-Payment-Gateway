import './config/env.js';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import userRoute from './routes/user.route.js';
import courseRoute from './routes/course.route.js';
import mediaRoute from './routes/media.route.js';
import purchaseRoute from './routes/purchaseCourse.route.js';
import progressRoute from './routes/courseProgress.route.js';
import razorpayRoute from './routes/razorpay.routes.js';
import healthRoute from './routes/health.routes.js';
import { handleStripeWebhook } from './controllers/coursePurchase.controller.js';
import { handleRazorpayWebhook } from './controllers/razorpay.controller.js';
import { AppError, errorHandler } from './middleware/error.middleware.js';
import { validateRequest } from './middleware/request.middleware.js';
export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
  app.use(helmet());
  app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
  // Webhooks must receive the original bytes, before JSON parsing and browser CSRF checks.
  app.post('/api/v1/purchase/webhook', express.raw({ type: 'application/json', limit: '256kb' }), handleStripeWebhook);
  app.post('/api/v1/razorpay/webhook', express.raw({ type: 'application/json', limit: '256kb' }), handleRazorpayWebhook);
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.get('origin');
      if ((origin && origin !== process.env.CLIENT_URL) || req.get('sec-fetch-site') === 'cross-site') return next(new AppError('Request origin is not allowed', 403));
      if (req.cookies.token && !origin) return next(new AppError('Origin header is required', 403));
    }
    next();
  });
  app.use(validateRequest);
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
  app.use(['/api/v1/user/signup', '/api/v1/user/signin'], authLimiter);
  app.use('/api/v1/user', userRoute);
  app.use('/api/v1/course', courseRoute);
  app.use('/api/v1/media', mediaRoute);
  app.use('/api/v1/purchase', purchaseRoute);
  app.use('/api/v1/progress', progressRoute);
  app.use('/api/v1/razorpay', razorpayRoute);
  app.use('/health', healthRoute);
  app.use((req, res, next) => next(new AppError('Route not found', 404)));
  app.use(errorHandler);
  return app;
}
