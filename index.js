import { startupErrorMessage } from './utils/startupError.js';
import { validateEnv } from './config/env.js';
import { createApp } from './app.js';
import connectDB from './database/db.js';
import mongoose from 'mongoose';
try {
  validateEnv();
  if (process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_WEBHOOK_SECRET) {
    console.warn('Development: Razorpay webhook is disabled until RAZORPAY_WEBHOOK_SECRET is configured.');
  }
  await connectDB();
  const port = Number(process.env.PORT || 8000);
  const server = createApp().listen(port, () => console.log(`LMS API is running at http://localhost:${port}`));
  server.requestTimeout = 120_000;
  server.headersTimeout = 30_000;
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const timeout = setTimeout(() => process.exit(1), 15_000).unref();
    server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(timeout);
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  server.on('error', (error) => { console.error(startupErrorMessage(error)); process.exit(1); });
} catch (error) {
  console.error(startupErrorMessage(error));
  await mongoose.disconnect();
  process.exitCode = 1;
}
