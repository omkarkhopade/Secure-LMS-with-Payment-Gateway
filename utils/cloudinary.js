import { v2 as cloudinary } from 'cloudinary';
import { unlink } from 'node:fs/promises';
import { AppError } from '../middleware/error.middleware.js';
function configure() {
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY || process.env.API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET });
}
export async function uploadMedia(file, resourceType = 'image') {
  configure();
  try {
    return await cloudinary.uploader.upload(file, { resource_type: resourceType, timeout: 60000, allowed_formats: resourceType === 'image' ? ['jpg', 'png', 'webp'] : ['mp4', 'webm', 'mov'], ...(resourceType === 'video' && { type: 'authenticated' }) });
  } catch { throw new AppError('Media service is unavailable', 502); }
  finally { await unlink(file).catch(() => {}); }
}
export async function deleteMediaFromCloudinary(publicId) {
  configure();
  if (!publicId || publicId.startsWith('http')) return;
  await cloudinary.uploader.destroy(publicId);
}
export async function deleteVideoFromCloudinary(publicId) {
  configure();
  await cloudinary.uploader.destroy(publicId, { resource_type: 'video', type: 'authenticated' });
}
export function videoDeliveryUrl(lecture) {
  configure();
  // Time-limited delivery for authenticated assets. Existing public assets require migration.
  return cloudinary.utils.private_download_url(lecture.publicId, lecture.videoFormat || 'mp4', { resource_type: 'video', type: 'authenticated', expires_at: Math.floor(Date.now() / 1000) + 300, attachment: false });
}
