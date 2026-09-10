import 'dotenv/config';
import { StartupError } from '../utils/startupError.js';
export function validateEnv(env = process.env) {
  for (const key of ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL']) {
    if (!env[key]) throw new StartupError(`Missing required environment variable: ${key}`);
  }
  if (env.JWT_SECRET.length < 32 || /your_jwt|change.?me/i.test(env.JWT_SECRET)) throw new StartupError('JWT_SECRET must be random and at least 32 characters');
  let client;
  try { client = new URL(env.CLIENT_URL); }
  catch { throw new StartupError('CLIENT_URL must be a valid HTTP(S) origin, for example http://localhost:5173'); }
  if (!['http:', 'https:'].includes(client.protocol) || client.origin !== env.CLIENT_URL) throw new StartupError('CLIENT_URL must be an HTTP(S) origin without a trailing slash');
  if (env.NODE_ENV === 'production' && client.protocol !== 'https:') throw new StartupError('Production CLIENT_URL must use HTTPS');
  for (const key of ['PORT', 'TRUST_PROXY_HOPS', 'MAX_FILE_SIZE']) {
    if (env[key] && (!/^\d+$/.test(env[key]) || !Number.isSafeInteger(Number(env[key])))) throw new StartupError(`${key} must be a non-negative integer`);
  }
  if (env.PORT && (+env.PORT < 1 || +env.PORT > 65535)) throw new StartupError('Invalid PORT');
  if (env.MAX_FILE_SIZE && +env.MAX_FILE_SIZE < 1) throw new StartupError('Invalid MAX_FILE_SIZE');
  if (Boolean(env.STRIPE_SECRET_KEY) !== Boolean(env.STRIPE_WEBHOOK_SECRET)) throw new StartupError('Configure both Stripe secrets or leave both unset');
  if (Boolean(env.RAZORPAY_KEY_ID) !== Boolean(env.RAZORPAY_KEY_SECRET)) throw new StartupError('Configure both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or leave both unset');
  if (env.NODE_ENV === 'production' && env.RAZORPAY_KEY_ID && !env.RAZORPAY_WEBHOOK_SECRET) throw new StartupError('RAZORPAY_WEBHOOK_SECRET is required in production. Configure the same secret in the Razorpay webhook dashboard.');
}
