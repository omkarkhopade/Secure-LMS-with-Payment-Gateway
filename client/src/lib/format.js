export const money = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2,
  }).format(Number(value || 0));
export function duration(seconds = 0) {
  const minutes = Math.max(0, Math.round(seconds / 60));
  if (!minutes) return 'Self-paced';
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}`.trim()
    : `${minutes}m`;
}
export const initials = (name) =>
  (name || 'Learner')
    .split(' ')
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
export const safeNext = (next) =>
  typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\')
    ? next
    : '/learning';
export const passwordValid = (value) =>
  value.length >= 8 &&
  new TextEncoder().encode(value).length <= 72 &&
  /[A-Z]/.test(value) &&
  /[a-z]/.test(value) &&
  /[0-9]/.test(value) &&
  /[!@#$%^&*]/.test(value);
export const imageUrl = (value) =>
  typeof value === 'string' && /^(https?:\/\/|\/(?!\/))/.test(value) ? value : undefined;
