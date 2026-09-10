import express from 'express';
import upload from '../utils/multer.js';
import { uploadMedia } from '../utils/cloudinary.js';
import { isAuthenticated, restrictTo } from '../middleware/auth.middleware.js';
import { AppError, catchAsync } from '../middleware/error.middleware.js';
const router = express.Router();
router.post('/upload-video', isAuthenticated, restrictTo('instructor'), upload.single('file'), catchAsync(async (req, res) => {
  if (!req.file) throw new AppError('Video file is required', 400);
  const result = await uploadMedia(req.file.path, 'video');
  res.json({ success: true, data: { publicId: result.public_id, duration: result.duration, format: result.format } });
}));
export default router;
