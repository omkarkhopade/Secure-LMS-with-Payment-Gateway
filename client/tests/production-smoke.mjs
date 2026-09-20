import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Only generated local data and disabled providers are used by this check.
Object.assign(process.env, {
  NODE_ENV: 'production',
  CLIENT_URL: 'https://forma.test',
  VERCEL: '',
  JWT_SECRET: 'isolated-production-browser-secret-at-least-32-characters',
  RAZORPAY_KEY_ID: '',
  RAZORPAY_KEY_SECRET: '',
  RAZORPAY_WEBHOOK_SECRET: '',
  STRIPE_SECRET_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
  CLOUDINARY_CLOUD_NAME: '',
  CLOUDINARY_API_KEY: '',
  CLOUDINARY_API_SECRET: '',
  MONGOMS_DOWNLOAD_DIR: resolve('../.mongodb-binaries'),
  UPLOAD_PATH: resolve('test-uploads'),
});
let repl, server, browser;
try {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGO_URI = repl.getUri();
  await mongoose.connect(process.env.MONGO_URI);
  const { User } = await import('../../models/user.model.js');
  const { Course } = await import('../../models/course.model.js');
  const { CoursePurchase } = await import('../../models/coursePurchase.model.js');
  const { CourseProgress } = await import('../../models/courseProgress.js');
  await Promise.all(
    [User, Course, CoursePurchase, CourseProgress].map((model) => model.createIndexes()),
  );
  await mongoose.connection.db
    .collection('ratelimits')
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  const teacher = await User.create({
    name: 'Test Instructor',
    email: 'teacher@example.test',
    password: 'Testing123!',
    role: 'instructor',
  });
  const course = await Course.create({
    title: 'Production smoke course',
    category: 'Development',
    price: 149,
    courseType: 'external',
    externalUrl: 'https://example.com/course',
    instructor: teacher._id,
    isPublished: true,
  });
  await mongoose.disconnect();
  const { default: handler } = await import('../../api/index.js');
  server = createServer(handler).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const upstream = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.platform === 'win32' ? { channel: 'msedge' } : {});
  const context = await browser.newContext({ colorScheme: 'dark' });
  // Test a secure public origin while forwarding all requests to the local server.
  // No DNS lookup or request is sent to this test domain or payment providers.
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://forma.test') return route.abort();
    const response = await route.fetch({ url: upstream + url.pathname + url.search });
    await route.fulfill({ response });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('https://forma.test/signup');
  await page.getByLabel('Full name').fill('Test Learner');
  await page.getByLabel('Email address').fill('learner@example.test');
  await page.getByLabel('Password', { exact: true }).fill('Testing123!');
  await page.getByRole('button', { name: 'Create your account', exact: true }).click();
  await page.waitForURL('**/learning');
  const session = (await context.cookies()).find((cookie) => cookie.name === 'token');
  assert.ok(session?.secure && session?.httpOnly);
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.getByLabel('Color theme').selectOption('light');
  await page.reload();
  await page.getByRole('heading', { name: 'Keep going, Test.' }).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.goto(`https://forma.test/course-detail/${course._id}`);
  await page.getByRole('heading', { name: 'Production smoke course' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Open course website' }).count(), 0);
  await page.evaluate(() => {
    window.Razorpay = class {};
  });
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Pay with Razorpay' }).click();
  await page.getByRole('alert').filter({ hasText: 'temporarily unavailable' }).waitFor();
  assert.equal(await CoursePurchase.countDocuments(), 0);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL('https://forma.test/');
  await page.goto('https://forma.test/account');
  await page.waitForURL('**/signin?next=*');
  assert.deepEqual(errors, []);
  console.log(
    'Production UI smoke passed: built React, real Express/MongoDB, secure session, theme persistence, paid-link protection, disabled checkout, logout.',
  );
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  if (repl) await repl.stop();
}
