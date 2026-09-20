import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServer as portServer } from 'node:net';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

Object.assign(process.env, {
  NODE_ENV: 'production', JWT_SECRET: 'production-test-secret-at-least-32-characters',
  CLIENT_URL: 'https://forma.example', VERCEL: '1',
  STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '',
  RAZORPAY_KEY_ID: 'rzp_test_fixture', RAZORPAY_KEY_SECRET: 'fixture-secret', RAZORPAY_WEBHOOK_SECRET: 'fixture-webhook',
  MONGOMS_DOWNLOAD_DIR: resolve('../.mongodb-binaries'),
});
let repl, server, base;
before(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGO_URI = repl.getUri();
  await mongoose.connect(process.env.MONGO_URI);
  for (const [file, name] of [['user.model.js', 'User'], ['course.model.js', 'Course'], ['lecture.model.js', 'Lecture'], ['coursePurchase.model.js', 'CoursePurchase'], ['courseProgress.js', 'CourseProgress']]) {
    const module = await import(`../models/${file}`);
    await module[name].createIndexes();
  }
  await mongoose.connection.db.collection('ratelimits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await mongoose.disconnect();
  const { default: handler } = await import('../api/index.js');
  server = createServer(handler).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 120000 });
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('serverless production entry connects, uses secure cookies and preserves raw webhook bytes', async () => {
  assert.equal((await fetch(base + '/health')).status, 200);
  const signup = await fetch(base + '/api/v1/user/signup', {
    method: 'POST', headers: { Origin: process.env.CLIENT_URL, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Production Learner', email: 'production@example.test', password: 'Testing123!' }),
  });
  assert.equal(signup.status, 200);
  const cookie = signup.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Secure/i); assert.match(cookie, /SameSite=Lax/i);
  const profile = await fetch(base + '/api/v1/user/profile', { headers: { Cookie: cookie.split(';')[0] } });
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).data.password, undefined);
  const body = JSON.stringify({ event: 'payment.failed', payload: {} }, null, 2);
  const signature = createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
  const webhook = await fetch(base + '/api/v1/razorpay/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': signature }, body });
  assert.equal(webhook.status, 200);
  assert.deepEqual(await webhook.json(), { received: true });
  assert.equal((await fetch(base + '/api/unknown')).status, 404);
  if (existsSync('client/dist/index.html')) {
    const page = await fetch(base + '/courses');
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy'), /upgrade-insecure-requests/);
    assert.match(await page.text(), /theme.js/);
  }
});

test('serverless configuration failure returns a redacted retryable JSON response', async () => {
  const saved = process.env.JWT_SECRET;
  try {
    process.env.JWT_SECRET = '';
    const response = await fetch(base + '/health');
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('retry-after'), '10');
    const body = await response.text();
    assert.match(body, /temporarily unavailable/);
    assert.equal(body.includes('JWT_SECRET'), false);
    assert.equal(body.includes(process.env.MONGO_URI), false);
  } finally { process.env.JWT_SECRET = saved; }
});

for (const mode of ['development', 'production']) {
  test(`persistent Node entry starts in ${mode} against an isolated database`, async () => {
    const probe = portServer().listen(0, '127.0.0.1');
    await new Promise(resolve => probe.once('listening', resolve));
    const port = probe.address().port;
    await new Promise(resolve => probe.close(resolve));
    const child = spawn(process.execPath, ['index.js'], { env: { ...process.env, NODE_ENV: mode, PORT: String(port), VERCEL: '', UPLOAD_PATH: resolve('test-uploads') }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    try {
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        if (child.exitCode !== null) throw new Error(`Startup failed: ${output}`);
        try { ready = (await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) })).ok; } catch {}
        if (ready) break;
        await delay(100);
      }
      assert.equal(ready, true, output);
    } finally {
      const exited = new Promise(resolve => child.once('exit', resolve));
      if (child.exitCode === null) { child.kill(); await exited; }
    }
  }, { timeout: 15000 });
}
