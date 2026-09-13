import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const id = (n) => String(n).padStart(24, '0');
async function login(page, instructor = false, next = '/learning') {
  await page.goto(`/signin?next=${encodeURIComponent(next)}`);
  await page
    .getByLabel('Email address')
    .fill(instructor ? 'instructor@forma.test' : 'learner@forma.test');
  await page.getByLabel('Password', { exact: true }).fill('Secure123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(next + '$'));
}
test.beforeEach(async ({ request }) => {
  await request.post('/api/v1/__test/reset');
});
test('discovery, saved courses, and persistence', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'React, from first principles' })).toBeVisible();
  await page
    .getByRole('button', { name: 'Save React, from first principles', exact: true })
    .click();
  await page.goto('/saved');
  await expect(page.getByRole('heading', { name: 'React, from first principles' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'React, from first principles' })).toBeVisible();
  await page.getByRole('button', { name: 'Unsave React, from first principles' }).click();
  await expect(page.getByRole('heading', { name: 'React, from first principles' })).toHaveCount(0);
});
test('catalog filters persist in the URL and empty states recover', async ({ page }) => {
  await page.goto('/courses');
  await page.getByRole('button', { name: 'Design', exact: true }).click();
  await expect(page.locator('.course-card')).toHaveCount(2);
  await page.reload();
  await expect(page.locator('.course-card')).toHaveCount(2);
  await page.getByLabel('Search the course library').fill('no-match-xyz');
  await page.getByRole('button', { name: 'Find a course' }).click();
  await expect(
    page.getByRole('heading', { name: 'A different direction, perhaps?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear all filters' }).click();
  await expect(page.locator('.course-card')).toHaveCount(6);
});
test('public enrollment preserves the destination through sign-in', async ({ page }) => {
  await page.goto(`/course-detail/${id(2)}`);
  await page.getByRole('button', { name: 'Sign in to enroll' }).click();
  await expect(page).toHaveURL(/signin\?next=/);
  await page.getByLabel('Email address').fill('learner@forma.test');
  await page.getByLabel('Password', { exact: true }).fill('Wrong123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Invalid email or password');
  await page.getByLabel('Password', { exact: true }).fill('Secure123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/course-detail/${id(2)}$`));
  await page.getByLabel('Stripe', { exact: true }).check();
  await page.getByRole('button', { name: 'Enroll in this course' }).click();
  await expect(page.getByRole('alert')).toContainText('temporarily unavailable');
});
test('learning completion persists and next lesson switches selection', async ({ page }) => {
  await login(page);
  await page.goto(`/course-progress/${id(1)}`);
  await page.getByRole('button', { name: 'Mark as complete' }).click();
  await expect(page.locator('.completion-badge')).toHaveText('33% complete');
  await page.getByRole('button', { name: 'Next lesson' }).click();
  await expect(page.locator('.lesson-detail h2')).toHaveText('Putting ideas into practice');
  await page.reload();
  await expect(page.locator('.completion-badge')).toHaveText('33% complete');
});
test('instructor creates a draft, adds a lesson, and publishes', async ({ page }) => {
  await login(page, true, '/studio/new');
  await page.getByLabel('Course title', { exact: true }).fill('Thoughtful interfaces');
  await page.getByLabel('Category', { exact: true }).fill('Design');
  await page.getByLabel('Course price (INR)').fill('1499');
  await page
    .getByLabel('Course thumbnail', { exact: true })
    .setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from('fixture') });
  await page.getByRole('button', { name: 'Create draft course' }).click();
  await expect(page.locator('.status-label')).toHaveText('Draft');
  await page.getByLabel('Lesson title', { exact: true }).fill('Start with intention');
  await page
    .getByLabel('Lesson video', { exact: true })
    .setInputFiles({ name: 'lesson.mp4', mimeType: 'video/mp4', buffer: Buffer.from('fixture') });
  await page.getByRole('button', { name: 'Add lesson', exact: true }).click();
  await expect(page.locator('.editor-lessons')).toContainText('Start with intention');
  await page.getByRole('button', { name: 'Publish course', exact: true }).click();
  await expect(page.locator('.status-label')).toHaveText('Published');
});
test('profile saves and mismatched passwords remain on the form', async ({ page }) => {
  await login(page, false, '/account');
  await page.getByLabel('Full name').fill('Alex Learner');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.settings-intro h2')).toHaveText('Alex Learner');
  await page.getByLabel('Current password', { exact: true }).fill('Secure123!');
  await page.getByLabel('New password', { exact: true }).fill('NewSecure123!');
  await page.getByLabel('Confirm new password').fill('Different123!');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('alert')).toContainText('do not match');
});
test('mobile layout and navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.course-card')).toHaveCount(3);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await page.getByRole('button', { name: /open navigation/i }).click();
  await page.getByRole('link', { name: 'All courses', exact: true }).click();
  await expect(page).toHaveURL(/courses$/);
  await expect(page.locator('.course-card')).toHaveCount(6);
});
test('key pages pass automated accessibility checks', async ({ page }) => {
  for (const route of ['/', '/signin', `/course-detail/${id(2)}`]) {
    await page.goto(route);
    await expect(
      page
        .locator(
          route === '/'
            ? '.course-card'
            : route === '/signin'
              ? '.auth-form-wrap'
              : '.enrollment-card',
        )
        .first(),
    ).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.map((v) => v.id),
      JSON.stringify(
        result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
        })),
        null,
        2,
      ),
    ).toEqual([]);
  }
});

test('Razorpay callback requires server verification before opening the classroom', async ({
  page,
}) => {
  await login(page, false, `/course-detail/${id(2)}`);
  await page.evaluate(() => {
    window.Razorpay = class {
      constructor(options) {
        this.options = options;
      }
      on() {}
      close() {}
      open() {
        this.options.handler({
          razorpay_order_id: 'order_fixture',
          razorpay_payment_id: 'pay_fixture',
          razorpay_signature: 'fixture',
        });
      }
    };
  });
  const verification = page.waitForResponse(
    (r) => r.url().endsWith('/razorpay/verify-payment') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Enroll in this course' }).click();
  expect((await verification).ok()).toBe(true);
  await expect(page).toHaveURL(new RegExp(`/course-progress/${id(2)}$`));
  await expect(page.locator('.player-heading h1')).toHaveText('Design that tells a story');
});
test('signup, role restrictions, signout, and header search', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Taylor Learner');
  await page.getByLabel('Email address').fill('taylor@forma.test');
  await page.getByLabel('Password', { exact: true }).fill('Secure123!');
  await page.getByRole('button', { name: 'Create your account', exact: true }).click();
  await expect(page).toHaveURL(/learning$/);
  await page.goto('/studio');
  await expect(page.getByRole('heading', { name: 'A space for instructors.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:5174/');
  await page.getByLabel('Search courses', { exact: true }).fill('JavaScript');
  await page.getByRole('button', { name: 'Submit search' }).click();
  await expect(page.locator('.course-card')).toHaveCount(1);
  await expect(page.locator('.course-card h3')).toHaveText('JavaScript beyond the basics');
});
test('API failure offers a working retry', async ({ page }) => {
  let fail = true;
  await page.route('**/api/v1/course/published?*', (route) =>
    fail
      ? route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Temporarily unavailable' }),
        })
      : route.continue(),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Temporarily unavailable');
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.course-card')).toHaveCount(3);
});
test('authenticated pages have accessible labels and contrast', async ({ page }) => {
  await login(page);
  for (const route of ['/account', `/course-progress/${id(1)}`]) {
    await page.goto(route);
    await expect(
      page.locator(route === '/account' ? '.settings-panels' : '.lesson-detail'),
    ).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
      })),
    ).toEqual([]);
  }
});
