import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../config/env.js';
import { StartupError, startupErrorMessage } from '../utils/startupError.js';

const env = {
  MONGO_URI: 'mongodb://localhost/test', JWT_SECRET: 'x'.repeat(48),
  CLIENT_URL: 'https://example.com', NODE_ENV: 'development',
  RAZORPAY_KEY_ID: 'test-key', RAZORPAY_KEY_SECRET: 'test-secret',
};
test('development can start without a Razorpay webhook secret; production cannot', () => {
  assert.doesNotThrow(() => validateEnv(env));
  assert.throws(() => validateEnv({ ...env, NODE_ENV: 'production' }), /RAZORPAY_WEBHOOK_SECRET/);
  assert.doesNotThrow(() => validateEnv({ ...env, NODE_ENV: 'production', RAZORPAY_WEBHOOK_SECRET: 'webhook-secret' }));
  assert.throws(() => validateEnv({ ...env, RAZORPAY_KEY_SECRET: '' }), /RAZORPAY_KEY_SECRET/);
});
test('startup errors expose actionable configuration messages without raw credentials', () => {
  for (const overrides of [{ JWT_SECRET: 'short' }, { CLIENT_URL: 'invalid-url' }]) {
    assert.throws(() => validateEnv({ ...env, ...overrides }), error => {
      assert.ok(error instanceof StartupError);
      assert.equal(startupErrorMessage(error), error.message);
      return true;
    });
  }
  const secret = 'mongodb://username:private-password@private-host/database';
  assert.equal(startupErrorMessage(new Error(secret)).includes(secret), false);
  assert.match(startupErrorMessage({ name: 'MongoServerSelectionError', message: secret }), /Cannot reach MongoDB/);
  assert.match(startupErrorMessage({ code: 18, message: secret }), /authentication failed/);
  assert.match(startupErrorMessage({ code: 'EADDRINUSE' }), /PORT is already in use/);
});
