// Isolated browser-test fixtures. This file is never imported into the application.
import http from 'node:http';
import { createServer } from 'vite';
const student = {
  _id: '111111111111111111111111',
  name: 'Alex Morgan',
  email: 'learner@forma.test',
  role: 'student',
  bio: 'Always curious.',
  avatar: '',
};
const teacher = {
  _id: '222222222222222222222222',
  name: 'Jordan Lee',
  email: 'instructor@forma.test',
  role: 'instructor',
  bio: 'Making complex ideas feel approachable.',
  avatar: '',
};
const courseId = (n) => String(n).padStart(24, '0');
const seeds = [
  [
    'React, from first principles',
    'Development',
    1499,
    'beginner',
    'Learn to think in components. Build interfaces with clarity and confidence.',
  ],
  [
    'Design that tells a story',
    'Design',
    1299,
    'beginner',
    'Bring intention to every layout, type choice, and visual detail.',
  ],
  [
    'A practical guide to better business',
    'Business',
    1899,
    'intermediate',
    'Turn a good idea into a thoughtful, sustainable plan.',
  ],
  [
    'JavaScript beyond the basics',
    'Development',
    1999,
    'intermediate',
    'Go deeper into the language behind the web.',
  ],
  [
    'The foundations of visual identity',
    'Design',
    999,
    'beginner',
    'Create a visual identity with a clear point of view.',
  ],
  [
    'Make your next idea happen',
    'Business',
    2499,
    'advanced',
    'A focused approach to taking ideas from a notebook to the real world.',
  ],
];
let courses, users, purchases, progress;
function reset() {
  courses = seeds.map(([title, category, price, level, subtitle], i) => ({
    _id: courseId(i + 1),
    title,
    category,
    price,
    level,
    subtitle,
    description: `${subtitle}\n\nWork through focused lessons, understand the thinking behind each decision, and make space to practice. This course is designed to build confidence through a clear, considered approach.`,
    thumbnail: '',
    instructor: { ...teacher },
    isPublished: true,
    enrolledStudents: [],
    totalLectures: 3,
    totalDuration: 5400 + i * 1200,
    lectures: [
      'A new way to think',
      'Putting ideas into practice',
      'Build something of your own',
    ].map((title, j) => ({
      _id: courseId(100 + i * 10 + j),
      title,
      duration: 1200 + j * 300,
      isPreview: j === 0,
      videoUrl: '',
      order: j + 1,
    })),
  }));
  users = new Map([
    ['student', { ...student }],
    ['instructor', { ...teacher }],
  ]);
  purchases = new Map([
    ['student', new Set([courseId(1)])],
    ['instructor', new Set()],
  ]);
  progress = new Map();
}
reset();
const respond = (res, status, data, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify(data));
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const path = url.pathname.replace('/api/v1', '');
    if (path === '/__test/reset') {
      reset();
      return respond(res, 200, { success: true });
    }
    const token = /fixture=([^;]+)/.exec(req.headers.cookie || '')?.[1];
    const user = users.get(token);
    let body = {};
    if (!['GET', 'HEAD'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const buffer = Buffer.concat(chunks);
      if ((req.headers['content-type'] || '').includes('multipart/form-data'))
        body = Object.fromEntries(
          await new Response(buffer, {
            headers: { 'Content-Type': req.headers['content-type'] },
          }).formData(),
        );
      else if (buffer.length) body = JSON.parse(buffer.toString());
    }
    if (path === '/user/signin' || path === '/user/signup') {
      if (body.password === 'Wrong123!')
        return respond(res, 401, { message: 'Invalid email or password' });
      const key = body.email === teacher.email ? 'instructor' : 'student';
      if (path === '/user/signup')
        users.set(key, { ...student, name: body.name, email: body.email });
      return respond(
        res,
        200,
        { user: users.get(key), success: true },
        { 'Set-Cookie': `fixture=${key}; HttpOnly; Path=/; SameSite=Lax` },
      );
    }
    if (path === '/user/signout')
      return respond(res, 200, { success: true }, { 'Set-Cookie': 'fixture=; Max-Age=0; Path=/' });
    const publicList = ['/course/published', '/course/search'].includes(path);
    const detailMatch = /^\/course\/c\/([a-z0-9]+)$/.exec(path);
    if (!user && !publicList && !(detailMatch && req.method === 'GET'))
      return respond(res, 401, { message: 'Please sign in' });
    if (path === '/user/profile') {
      if (req.method === 'PATCH')
        Object.assign(user, {
          name: body.name || user.name,
          email: body.email || user.email,
          bio: body.bio ?? user.bio,
        });
      return respond(res, 200, { data: user });
    }
    if (path === '/user/change-password') return respond(res, 200, { user });
    if (publicList || (path === '/course' && req.method === 'GET')) {
      let list = courses.filter((c) =>
        path === '/course' ? c.instructor._id === user._id : c.isPublished,
      );
      const query = url.searchParams.get('query')?.toLowerCase();
      const category = url.searchParams.get('categories');
      const level = url.searchParams.get('level');
      if (query)
        list = list.filter((c) => `${c.title} ${c.subtitle}`.toLowerCase().includes(query));
      if (category) list = list.filter((c) => c.category === category);
      if (level) list = list.filter((c) => c.level === level);
      if (url.searchParams.get('sortBy') === 'price-low') list.sort((a, b) => a.price - b.price);
      if (url.searchParams.get('sortBy') === 'price-high') list.sort((a, b) => b.price - a.price);
      const page = Number(url.searchParams.get('page') || 1),
        limit = Number(url.searchParams.get('limit') || 20);
      const total = list.length;
      return respond(res, 200, {
        data: list.slice((page - 1) * limit, page * limit),
        count: total,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    }
    if (path === '/course' && req.method === 'POST') {
      const course = {
        _id: courseId(courses.length + 1),
        ...body,
        thumbnail: '',
        price: Number(body.price),
        instructor: { ...user },
        isPublished: false,
        enrolledStudents: [],
        lectures: [],
        totalLectures: 0,
        totalDuration: 0,
      };
      courses.push(course);
      return respond(res, 201, { data: course });
    }
    if (detailMatch) {
      const course = courses.find((c) => c._id === detailMatch[1]);
      if (!course) return respond(res, 404, { message: 'Course not found' });
      if (req.method === 'PATCH') {
        Object.assign(course, body);
        if ('price' in body) course.price = Number(body.price);
      }
      return respond(res, 200, { data: course });
    }
    const lectureMatch = /^\/course\/c\/([a-z0-9]+)\/lectures$/.exec(path);
    if (lectureMatch) {
      const course = courses.find((c) => c._id === lectureMatch[1]);
      const lecture = {
        _id: courseId(500 + course.lectures.length),
        title: body.title,
        description: body.description,
        isPreview: body.isPreview === 'true',
        duration: 120,
        videoUrl: '',
      };
      course.lectures.push(lecture);
      course.totalLectures++;
      course.totalDuration += 120;
      return respond(res, 201, { data: lecture });
    }
    if (path === '/purchase')
      return respond(res, 200, { data: courses.filter((c) => purchases.get(token)?.has(c._id)) });
    const statusMatch = /^\/purchase\/course\/([a-z0-9]+)\/detail-with-status$/.exec(path);
    if (statusMatch)
      return respond(res, 200, {
        data: {
          course: courses.find((c) => c._id === statusMatch[1]),
          isPurchased: purchases.get(token)?.has(statusMatch[1]),
        },
      });
    if (path === '/purchase/checkout/create-checkout-session')
      return respond(res, 503, { message: 'Stripe payments are not configured' });
    if (path === '/razorpay/create-order')
      return respond(res, 200, {
        keyId: 'rzp_test_fixture',
        order: { id: 'order_fixture', amount: 149900, currency: 'INR' },
      });
    if (path === '/razorpay/verify-payment') {
      purchases.get(token).add(courseId(2));
      return respond(res, 200, { success: true });
    }
    const match = /^\/progress\/([a-z0-9]+)(?:\/lectures\/([a-z0-9]+))?$/.exec(path);
    if (match) {
      if (!purchases.get(token)?.has(match[1]) && user.role !== 'instructor')
        return respond(res, 403, { message: 'Purchase this course to access progress' });
      const course = courses.find((c) => c._id === match[1]);
      const key = `${token}:${course._id}`;
      const done = progress.get(key) || new Set();
      if (match[2]) {
        done.add(match[2]);
        progress.set(key, done);
      }
      return respond(res, 200, {
        data: {
          courseDetails: course,
          progress: [...done].map((lecture) => ({ lecture, isCompleted: true })),
          completionPercentage: Math.round((done.size / course.lectures.length) * 100),
          isCompleted: done.size === course.lectures.length,
        },
      });
    }
    return respond(res, 404, { message: 'Route not found' });
  } catch {
    respond(res, 500, { message: 'Fixture request failed' });
  }
});
await new Promise((resolve) => server.listen(18000, '127.0.0.1', resolve));
const vite = await createServer({
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:18000', changeOrigin: true } },
  },
});
await vite.listen();
console.log('Isolated UI fixtures: http://localhost:5174 (not connected to your database)');
const close = async () => {
  await vite.close();
  server.close();
  process.exit(0);
};
process.on('SIGINT', close);
process.on('SIGTERM', close);
