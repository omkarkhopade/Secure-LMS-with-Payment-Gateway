import multer from 'multer';
import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppError } from '../middleware/error.middleware.js';
const directory = resolve(process.env.UPLOAD_PATH || 'uploads');
mkdirSync(directory, { recursive: true });
const parser = multer({ dest: directory, limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 52428800), files: 1, fields: 12, fieldSize: 16384, parts: 13 }, fileFilter(req, file, cb) {
  const allowed = ['thumbnail', 'avatar'].includes(file.fieldname) ? ['image/jpeg', 'image/png', 'image/webp'] : ['video/mp4', 'video/webm', 'video/quicktime'];
  cb(allowed.includes(file.mimetype) ? null : new AppError('Unsupported media type', 400), allowed.includes(file.mimetype));
} });
export default { single(field) {
  return (req, res, next) => {
    const cleanup = () => { if (req.file?.path) unlink(req.file.path).catch(() => {}); };
    res.once('finish', cleanup); res.once('close', cleanup);
    parser.single(field)(req, res, next);
  };
} };
