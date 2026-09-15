import { createApp } from '../app.js';
import connectDB from '../database/db.js';
import { validateEnv } from '../config/env.js';
import { startupErrorMessage } from '../utils/startupError.js';

const app = createApp();
export default async function handler(req, res) {
  // Static pages remain available even during a database outage.
  if (/^\/(api|health)(\/|\?|$)/.test(req.url)) {
    try {
      validateEnv();
      await connectDB();
    } catch (error) {
      console.error(startupErrorMessage(error));
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Retry-After', '10');
      return res.status(503).json({ success: false, message: 'Service is temporarily unavailable. Please try again shortly.' });
    }
  }
  return app(req, res);
}
