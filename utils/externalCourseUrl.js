export function validExternalCourseUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\]/.test(value)) return false;
  try {
    
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && url.hostname.includes('.') && !url.hostname.endsWith('.localhost');
  } catch { return false; }

}
