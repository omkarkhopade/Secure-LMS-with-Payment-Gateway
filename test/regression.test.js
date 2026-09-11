import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import nock from 'nock';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { v2 as cloudinary } from 'cloudinary';

Object.assign(process.env, {
  NODE_ENV: 'test', JWT_SECRET: 'test-secret-that-is-longer-than-thirty-two-characters',
  CLIENT_URL: 'http://localhost:5173', STRIPE_SECRET_KEY: 'sk_test_local', STRIPE_WEBHOOK_SECRET: 'whsec_local',
  RAZORPAY_KEY_ID: 'rzp_test_local', RAZORPAY_KEY_SECRET: 'local-razorpay-secret', RAZORPAY_WEBHOOK_SECRET: 'local-webhook-secret',
  CLOUDINARY_CLOUD_NAME: 'test-cloud', CLOUDINARY_API_KEY: '123', CLOUDINARY_API_SECRET: 'test-secret',
  MONGOMS_DOWNLOAD_DIR: resolve('../.mongodb-binaries'), UPLOAD_PATH: resolve('test-uploads'), MAX_FILE_SIZE: '1024', TRUST_PROXY_HOPS: '0',
});
const { createApp } = await import('../app.js');
const { User } = await import('../models/user.model.js');
const { Course } = await import('../models/course.model.js');
const { Lecture } = await import('../models/lecture.model.js');
const { CoursePurchase } = await import('../models/coursePurchase.model.js');
const { CourseProgress } = await import('../models/courseProgress.js');
const { fulfillPurchase, minorUnits, validSignature } = await import('../services/purchase.js');
const { validateEnv } = await import('../config/env.js');
const { cookieOptions } = await import('../utils/generateToken.js');
const { default: connectDB } = await import('../database/db.js');
let repl, server, base, buyer, outsider, teacher, course, lectures;
const cookie = user => `token=${jwt.sign({ userId: String(user._id), tokenVersion: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
async function request(path, { method = 'GET', user, body, headers = {} } = {}) {
  const response = await fetch(base + path, { method, signal: AbortSignal.timeout(45000), headers: { ...(user && { Cookie: cookie(user) }), ...(method !== 'GET' && { Origin: process.env.CLIENT_URL }), ...(body !== undefined && { 'Content-Type': 'application/json' }), ...headers }, ...(body !== undefined && { body: typeof body === 'string' ? body : JSON.stringify(body) }) });
  return { status: response.status, headers: response.headers, body: await response.json() };
}
before(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.MONGO_URI = repl.getUri();
  await connectDB();
  await Promise.all([User, Course, Lecture, CoursePurchase, CourseProgress].map(m => m.init()));
  [buyer, outsider, teacher] = await User.create([
    { name: 'Buyer', email: 'buyer@example.com', password: 'Testing123!' },
    { name: 'Outsider', email: 'outsider@example.com', password: 'Testing123!' },
    { name: 'Teacher', email: 'teacher@example.com', password: 'Testing123!', role: 'instructor' },
  ]);
  lectures = await Lecture.create([1, 2, 3].map(n => ({ title: `Lecture ${n}`, publicId: `lecture-${n}`, videoUrl: `https://example.com/private-${n}.mp4`, isPreview: n === 1, order: n })));
  course = await Course.create({ title: 'Course (literal)', category: 'development', price: 499.99, thumbnail: 'https://example.com/image.png', instructor: teacher._id, isPublished: true, lectures: lectures.map(l => l._id) });
  server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  nock.disableNetConnect();
  nock.enableNetConnect('127.0.0.1');
}, { timeout: 180000 });
after(async () => {
  nock.cleanAll(); nock.enableNetConnect();
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (repl) await repl.stop();
});

test('configuration rejects weak secrets and insecure production origins', () => {
  const env = { MONGO_URI: 'mongodb://localhost/test', JWT_SECRET: 'x'.repeat(40), CLIENT_URL: 'https://example.com', NODE_ENV: 'production' };
  assert.doesNotThrow(() => validateEnv(env));
  assert.throws(() => validateEnv({ ...env, JWT_SECRET: 'short' }));
  assert.throws(() => validateEnv({ ...env, CLIENT_URL: 'http://example.com' }));
  assert.throws(() => validateEnv({ ...env, PORT: '-1' }));
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  assert.equal(cookieOptions().secure, true); process.env.NODE_ENV = previous;
});
test('health reports readiness without infrastructure details', async () => {
  const result = await request('/health');
  assert.equal(result.status, 200); assert.equal(result.body.status, 'OK');
  assert.equal(JSON.stringify(result.body).includes('memoryUsage'), false);
});
test('signup cannot elevate roles and returns a usable session without password data', async () => {
  const result = await request('/api/v1/user/signup', { method: 'POST', body: { name: 'New Student', email: 'new@example.technology', password: 'Testing123!', role: 'admin' } });
  assert.equal(result.status, 200); assert.equal(result.body.user.role, 'student');
  assert.equal(result.body.user.password, undefined);
  const session = result.headers.get('set-cookie').split(';')[0];
  const profile = await request('/api/v1/user/profile', { headers: { Cookie: session } });
  assert.equal(profile.status, 200); assert.equal(profile.body.data.email, 'new@example.technology');
});
test('invalid requests return validation errors without reaching the database', async () => {
  assert.equal((await request('/api/v1/user/signin', { method: 'POST', body: { email: { $ne: null }, password: 'x' } })).status, 400);
  assert.equal((await request('/api/v1/user/signin', { method: 'POST', body: '{' })).status, 400);
  assert.equal((await request('/api/v1/course/published?limit=9999')).status, 400);
  assert.equal((await request('/api/v1/course/search?query=x&query=y')).status, 400);
  assert.equal((await request('/api/v1/course/c/bad-id', { user: buyer })).status, 400);
});
test('cookie writes reject foreign and missing origins', async () => {
  assert.equal((await request('/api/v1/user/profile', { method: 'PATCH', user: buyer, body: { bio: 'test' }, headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await request('/api/v1/user/profile', { method: 'PATCH', user: buyer, body: { bio: 'test' }, headers: { Origin: '' } })).status, 403);
});
test('password change rejects short replacements and invalidates older sessions', async () => {
  assert.equal((await request('/api/v1/user/change-password', { method: 'PATCH', user: outsider, body: { currentPassword: 'Testing123!', newPassword: 'Aa1!' } })).status, 400);
  const changed = await request('/api/v1/user/change-password', { method: 'PATCH', user: outsider, body: { currentPassword: 'Testing123!', newPassword: 'Different123!' } });
  assert.equal(changed.status, 200);
  assert.equal((await request('/api/v1/user/profile', { user: outsider })).status, 401);
  outsider = await User.findById(outsider._id);
});
test('course details and purchase status hide paid media from non-buyers', async () => {
  for (const path of [`/api/v1/course/c/${course._id}`, `/api/v1/purchase/course/${course._id}/detail-with-status`]) {
    const result = await request(path, { user: outsider });
    assert.equal(result.status, 200);
    const data = result.body.data.course || result.body.data;
    assert.ok(data.lectures[0].videoUrl.includes('expires_at='));
    assert.equal(data.lectures[1].videoUrl, undefined);
    assert.equal(data.lectures[0].publicId, undefined);
    assert.equal(data.enrolledStudents, undefined);
  }
});
test('drafts are hidden and search treats regex characters literally', async () => {
  const draft = await Course.create({ title: 'Draft', category: 'test', price: 100, thumbnail: 'image', instructor: teacher._id });
  assert.equal((await request(`/api/v1/course/c/${draft._id}`, { user: outsider })).status, 404);
  const search = await request('/api/v1/course/search?query=%28literal%29&categories=development');
  assert.equal(search.status, 200); assert.equal(search.body.count, 1);
  assert.equal((await request('/api/v1/course/search?query=.*')).body.count, 0);
});
test('only owners can publish courses', async () => {
  assert.equal((await request(`/api/v1/course/c/${course._id}`, { method: 'PATCH', user: outsider, body: { isPublished: false } })).status, 403);
  const otherTeacher = await User.create({ name: 'Other Teacher', email: 'other@example.com', password: 'Testing123!', role: 'instructor' });
  assert.equal((await request(`/api/v1/course/c/${course._id}`, { method: 'PATCH', user: otherTeacher, body: { isPublished: false } })).status, 403);
  assert.equal((await request(`/api/v1/course/c/${course._id}`, { method: 'PATCH', user: teacher, body: { isPublished: true } })).status, 200);
});
test('progress requires purchase and rejects unrelated lecture IDs', async () => {
  assert.equal((await request(`/api/v1/progress/${course._id}`, { user: outsider })).status, 403);
  assert.equal((await request(`/api/v1/progress/${course._id}/lectures/${new mongoose.Types.ObjectId()}`, { method: 'PATCH', user: teacher })).status, 404);
});
test('Stripe webhook rejects missing, forged and stale signatures', async () => {
  const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: {} } });
  assert.equal((await request('/api/v1/purchase/webhook', { method: 'POST', body: payload })).status, 400);
  const stripe = new Stripe('sk_test_local');
  for (const options of [{ secret: 'wrong' }, { secret: process.env.STRIPE_WEBHOOK_SECRET, timestamp: 1 }]) {
    const signature = stripe.webhooks.generateTestHeaderString({ payload, ...options });
    assert.equal((await request('/api/v1/purchase/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': signature } })).status, 400);
  }
});
test('Stripe checkout uses server price and reuses the pending checkout', async () => {
  const create = nock('https://api.stripe.com').post('/v1/checkout/sessions', body => JSON.stringify(body).includes('49999')).reply(200, { id: 'cs_test_paid', url: 'https://checkout.stripe.com/test', status: 'open' });
  const first = await request('/api/v1/purchase/checkout/create-checkout-session', { method: 'POST', user: buyer, body: { courseId: String(course._id), amount: 1 } });
  assert.equal(first.status, 200); assert.ok(create.isDone());
  const retrieve = nock('https://api.stripe.com').get('/v1/checkout/sessions/cs_test_paid').reply(200, { id: 'cs_test_paid', url: 'https://checkout.stripe.com/test', status: 'open' });
  assert.equal((await request('/api/v1/purchase/checkout/create-checkout-session', { method: 'POST', user: buyer, body: { courseId: String(course._id) } })).status, 200);
  assert.ok(retrieve.isDone()); assert.equal(await CoursePurchase.countDocuments({ user: buyer._id, course: course._id }), 1);
});
test('signed Stripe events verify payment status and amount, then fulfill once', async () => {
  const stripe = new Stripe('sk_test_local');
  const session = { id: 'cs_test_paid', mode: 'payment', payment_status: 'paid', amount_total: 49999, currency: 'inr', metadata: { userId: String(buyer._id), courseId: String(course._id) } };
  const send = async overrides => {
    const payload = JSON.stringify({ type: 'checkout.session.completed', data: { object: { ...session, ...overrides } } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET });
    return request('/api/v1/purchase/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': signature } });
  };
  assert.equal((await send({ payment_status: 'unpaid' })).status, 200);
  assert.equal((await CoursePurchase.findOne({ paymentId: session.id })).status, 'pending');
  assert.equal((await send({ amount_total: 1 })).status, 400);
  const duplicates = await Promise.all([send({}), send({}), send({})]);
  assert.deepEqual(duplicates.map(r => r.status), [200, 200, 200]);
  assert.equal((await User.findById(buyer._id)).enrolledCourses.length, 1);
  assert.equal((await Course.findById(course._id)).enrolledStudents.length, 1);
  assert.equal((await Lecture.findById(lectures[1]._id)).isPreview, false);
  assert.equal((await request('/api/v1/purchase', { user: buyer })).body.data[0].title, course.title);
});
test('fulfillment rolls back when the user no longer exists', async () => {
  const purchase = await CoursePurchase.create({ user: new mongoose.Types.ObjectId(), course: course._id, amount: 499.99, paymentMethod: 'stripe', paymentId: 'cs_missing_user' });
  await assert.rejects(() => fulfillPurchase(purchase._id));
  assert.equal((await CoursePurchase.findById(purchase._id)).status, 'pending');
});
test('progress counts all lectures, remains unique under concurrency and resets correctly', async () => {
  const first = await request(`/api/v1/progress/${course._id}/lectures/${lectures[0]._id}`, { method: 'PATCH', user: buyer });
  assert.equal(first.status, 200); assert.equal(first.body.data.completionPercentage, 33); assert.equal(first.body.data.isCompleted, false);
  const results = await Promise.all(lectures.map(l => request(`/api/v1/progress/${course._id}/lectures/${l._id}`, { method: 'PATCH', user: buyer })));
  assert.ok(results.every(r => r.status === 200));
  const progress = await request(`/api/v1/progress/${course._id}`, { user: buyer });
  assert.equal(progress.body.data.completionPercentage, 100); assert.equal(progress.body.data.progress.length, 3);
  assert.equal((await request(`/api/v1/progress/${course._id}/reset`, { method: 'PATCH', user: buyer })).body.data.completionPercentage, 0);
  assert.equal((await request(`/api/v1/progress/${course._id}/complete`, { method: 'PATCH', user: buyer })).body.data.completionPercentage, 100);
});
test('Razorpay verifies order ownership and captured status before enrolling', async () => {
  const purchase = await CoursePurchase.create({ user: outsider._id, course: course._id, amount: 499.99, paymentMethod: 'razorpay', paymentId: 'order_test' });
  const body = { razorpay_order_id: 'order_test', razorpay_payment_id: 'pay_test', razorpay_signature: crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update('order_test|pay_test').digest('hex') };
  assert.equal((await request('/api/v1/razorpay/verify-payment', { method: 'POST', user: buyer, body })).status, 404);
  nock('https://api.razorpay.com').get('/v1/payments/pay_test').reply(200, { id: 'pay_test', order_id: 'order_test', status: 'authorized', amount: 49999, currency: 'INR' });
  assert.equal((await request('/api/v1/razorpay/verify-payment', { method: 'POST', user: outsider, body })).status, 409);
  assert.equal((await CoursePurchase.findById(purchase._id)).status, 'pending');
  nock('https://api.razorpay.com').get('/v1/payments/pay_test').reply(200, { id: 'pay_test', order_id: 'order_test', status: 'captured', amount: 49999, currency: 'INR' });
  assert.equal((await request('/api/v1/razorpay/verify-payment', { method: 'POST', user: outsider, body })).status, 200);
});
test('Razorpay webhook validates original bytes and handles redelivery', async () => {
  const payload = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { order_id: 'order_test', status: 'captured', amount: 49999, currency: 'INR' } } } });
  assert.equal((await request('/api/v1/razorpay/webhook', { method: 'POST', body: payload })).status, 400);
  const signature = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(payload).digest('hex');
  assert.equal((await request('/api/v1/razorpay/webhook', { method: 'POST', body: payload, headers: { 'x-razorpay-signature': signature } })).status, 200);
  assert.equal((await User.findById(outsider._id)).enrolledCourses.length, 1);
});
test('media upload requires instructor role, checks type and enforces file limits', async () => {
  assert.equal((await request('/api/v1/media/upload-video', { method: 'POST' })).status, 401);
  assert.equal((await request('/api/v1/media/upload-video', { method: 'POST', user: buyer })).status, 403);
  assert.equal((await request('/api/v1/media/upload-video', { method: 'POST', user: teacher })).status, 400);
  for (const [type, size, expected] of [['text/html', 20, 400], ['video/mp4', 2048, 413]]) {
    const data = new FormData(); data.set('file', new Blob(['x'.repeat(size)], { type }), 'file.mp4');
    const response = await fetch(base + '/api/v1/media/upload-video', { method: 'POST', headers: { Cookie: cookie(teacher), Origin: process.env.CLIENT_URL }, body: data });
    assert.equal(response.status, expected); await response.arrayBuffer();
  }
  assert.deepEqual(await readdir(process.env.UPLOAD_PATH), []);
});
test('money and signature helpers reject invalid boundary inputs', () => {
  assert.equal(minorUnits(499.99), 49999);
  for (const value of [0, -1, NaN, Infinity, '10', 1.001]) assert.throws(() => minorUnits(value));
  assert.equal(validSignature('payload', 'short', 'secret'), false);
});

test('course creation and lecture uploads persist relationships and authenticated media', async t => {
  let videoOptions;
  t.mock.method(cloudinary.uploader, 'upload', async (path, options) => {
    if (options.resource_type === 'video') videoOptions = options;
    return { secure_url: 'https://example.com/upload', public_id: `test-${options.resource_type}`, format: options.resource_type === 'video' ? 'mp4' : 'png', duration: 30 };
  });
  const post = async (path, data) => {
    const response = await fetch(base + path, { method: 'POST', headers: { Cookie: cookie(teacher), Origin: process.env.CLIENT_URL }, body: data });
    return { status: response.status, body: await response.json() };
  };
  const data = new FormData();
  data.set('title', 'Uploaded Course'); data.set('category', 'test'); data.set('price', '199.99');
  data.set('thumbnail', new Blob(['fake-image'], { type: 'image/png' }), 'image.png');
  const created = await post('/api/v1/course', data);
  assert.equal(created.status, 201); assert.equal(created.body.data.isPublished, false);
  const id = created.body.data._id;
  assert.ok((await User.findById(teacher._id)).createdCourses.some(c => String(c) === id));
  const video = new FormData(); video.set('title', 'Introduction'); video.set('isPreview', 'false');
  video.set('video', new Blob(['fake-video'], { type: 'video/mp4' }), 'video.mp4');
  const added = await post(`/api/v1/course/c/${id}/lectures`, video);
  assert.equal(added.status, 201); assert.equal(added.body.data.isPreview, false);
  assert.equal(videoOptions.type, 'authenticated');
  const stored = await Course.findById(id);
  assert.equal(stored.lectures.length, 1); assert.equal(stored.totalLectures, 1); assert.equal(stored.totalDuration, 30);
});

test('empty courses report zero completion and invalid upload fields are cleaned', async () => {
  const empty = await Course.create({ title: 'Empty', category: 'test', price: 10, thumbnail: 'image', instructor: teacher._id });
  const result = await request(`/api/v1/progress/${empty._id}/complete`, { method: 'PATCH', user: teacher });
  assert.equal(result.status, 200); assert.equal(result.body.data.isCompleted, false); assert.equal(result.body.data.completionPercentage, 0);
  const data = new FormData(); data.set('thumbnail', new Blob(['fake-image'], { type: 'image/png' }), 'image.png');
  const response = await fetch(base + '/api/v1/course', { method: 'POST', headers: { Cookie: cookie(teacher), Origin: process.env.CLIENT_URL }, body: data });
  assert.equal(response.status, 400); await response.arrayBuffer();
});

test('Razorpay creates an INR order from the course price and reuses it', async () => {
  const target = await Course.create({ title: 'Razorpay Course', category: 'test', price: 250, thumbnail: 'image', instructor: teacher._id, isPublished: true });
  const order = { id: 'order_created', amount: 25000, currency: 'INR', status: 'created' };
  const create = nock('https://api.razorpay.com').post('/v1/orders', body => body.amount === 25000 && body.currency === 'INR').reply(200, order);
  assert.equal((await request('/api/v1/razorpay/create-order', { method: 'POST', user: buyer, body: { courseId: String(target._id), amount: 1 } })).status, 200);
  assert.ok(create.isDone());
  const retrieve = nock('https://api.razorpay.com').get('/v1/orders/order_created').reply(200, order);
  assert.equal((await request('/api/v1/razorpay/create-order', { method: 'POST', user: buyer, body: { courseId: String(target._id) } })).status, 200);
  assert.ok(retrieve.isDone());
});

test('production startup verifies the required unique indexes', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await connectDB();
    await CourseProgress.collection.dropIndex('user_1_course_1');
    await assert.rejects(() => connectDB(), /Required database indexes/);
  } finally {
    process.env.NODE_ENV = previous;
    await CourseProgress.createIndexes();
  }
});

test('visitors can browse published details without receiving paid video URLs or drafts', async () => {
  const result = await request(`/api/v1/course/c/${course._id}`);
  assert.equal(result.status, 200);
  assert.ok(result.body.data.lectures[0].videoUrl);
  assert.equal(result.body.data.lectures[1].videoUrl, undefined);
  assert.equal(result.body.data.lectures[1].publicId, undefined);
  assert.equal(result.body.data.enrolledStudents, undefined);
  const draft = await Course.findOne({ title: 'Draft' });
  assert.equal((await request(`/api/v1/course/c/${draft._id}`)).status, 404);
  assert.equal((await request(`/api/v1/course/c/${course._id}`, { method: 'PATCH', body: { title: 'Hacked' } })).status, 401);
});
