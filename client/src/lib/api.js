const base = (import.meta.env?.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}
export async function api(path, { body, signal, ...options } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), body instanceof FormData ? 120000 : 20000);
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(`${base}${path}`, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
      headers: {
        ...(body && !(body instanceof FormData) && { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
      ...(body !== undefined && { body: body instanceof FormData ? body : JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (
        response.status === 401 &&
        !path.startsWith('/user/sign') &&
        path !== '/user/change-password'
      )
        window.dispatchEvent(new Event('session-expired'));
      throw new ApiError(
        data.message || 'We could not complete your request. Please try again.',
        response.status,
        data.errors,
      );
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError || signal?.aborted) throw error;
    if (error.name === 'AbortError')
      throw new ApiError('This is taking longer than expected. Please try again.', 408);
    throw new ApiError('We cannot reach the server right now. Please try again in a moment.', 0);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
export async function allPages(path, signal) {
  const records = [];
  for (let page = 1; page <= 100; page++) {
    const result = await api(`${path}${path.includes('?') ? '&' : '?'}page=${page}&limit=100`, {
      signal,
    });
    records.push(...result.data);
    if (result.data.length < 100) return records;
  }
  return records;
}
