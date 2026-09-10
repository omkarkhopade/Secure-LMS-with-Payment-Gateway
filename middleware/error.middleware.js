export class AppError extends Error {
  constructor(message, statusCode, details) { super(message); this.statusCode = statusCode; this.isOperational = true; this.details = details; }
}
export const catchAsync = (fn) => (req, res, next) => Promise.resolve().then(() => fn(req, res, next)).catch(next);
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  let status = err.isOperational ? err.statusCode : 500;
  let message = err.isOperational ? err.message : 'Internal server error';
  if (err.code === 11000) { status = 409; message = 'A record with these details already exists'; }
  if (['CastError', 'ValidationError'].includes(err.name)) { status = 400; message = 'Invalid input data'; }
  if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON body'; }
  if (err.type === 'entity.too.large' || err.code === 'LIMIT_FILE_SIZE') { status = 413; message = 'Request is too large'; }
  if (err.name === 'MulterError' && status === 500) { status = 400; message = 'Invalid file upload'; }
  if (status >= 500) console.error(JSON.stringify({ event: 'request_error', method: req.method, path: req.path, name: err.name }));
  res.status(status).json({ success: false, message, ...(err.details && { errors: err.details }) });
}
