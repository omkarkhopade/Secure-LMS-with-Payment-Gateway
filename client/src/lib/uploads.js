const cap = Number(import.meta.env.VITE_MAX_UPLOAD_BYTES || Infinity);
export const imageUploadLimit = Math.min(5 * 1024 * 1024, cap);
export const videoUploadLimit = Math.min(50 * 1024 * 1024, cap);
export const uploadSizeLabel = (bytes) => `${Math.floor(bytes / 1000000)} MB`;
