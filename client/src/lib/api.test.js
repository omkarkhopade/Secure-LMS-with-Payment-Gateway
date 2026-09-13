import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from './api';
import { safeNext, passwordValid } from './format';
afterEach(() => vi.unstubAllGlobals());
describe('API boundary', () => {
  it('sends cookie credentials and JSON', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true })));
    vi.stubGlobal('fetch', fetch);
    await api('/user/signin', { method: 'POST', body: { email: 'test@example.com' } });
    expect(fetch.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":"test@example.com"}',
    });
  });
  it('leaves the multipart boundary to the browser', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    const body = new FormData();
    body.set('name', 'Alex');
    await api('/user/profile', { method: 'PATCH', body });
    expect(fetch.mock.calls[0][1].body).toBe(body);
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Content-Type');
  });
  it('retains server validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: 'Invalid course', errors: ['price'] }), {
          status: 400,
        }),
      ),
    );
    await expect(api('/course')).rejects.toMatchObject({
      status: 400,
      message: 'Invalid course',
      errors: ['price'],
    });
  });
  it('makes connection failures actionable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api('/course')).rejects.toBeInstanceOf(ApiError);
  });
});
describe('account input safety', () => {
  it.each(['https://evil.test', '//evil.test', '/\\evil.test', null])(
    'rejects external next destinations %s',
    (next) => expect(safeNext(next)).toBe('/learning'),
  );
  it('preserves local return paths', () =>
    expect(safeNext('/course-detail/123?lecture=4')).toBe('/course-detail/123?lecture=4'));
  it('matches server password length and complexity constraints', () => {
    expect(passwordValid('Secure123!')).toBe(true);
    expect(passwordValid('password')).toBe(false);
    expect(passwordValid('Secure123!' + 'a'.repeat(64))).toBe(false);
  });
});

it('an incorrect current password does not expire the browser session', async () => {
  const expired = vi.fn();
  window.addEventListener('session-expired', expired);
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ message: 'Current password is incorrect' }), { status: 401 }),
      ),
  );
  await expect(
    api('/user/change-password', {
      method: 'PATCH',
      body: { currentPassword: 'incorrect', newPassword: 'NewSecure123!' },
    }),
  ).rejects.toMatchObject({ status: 401 });
  expect(expired).not.toHaveBeenCalled();
  window.removeEventListener('session-expired', expired);
});
