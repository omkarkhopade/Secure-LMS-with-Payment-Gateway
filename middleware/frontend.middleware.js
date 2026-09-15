import express from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const clientDirectory = fileURLToPath(new URL('../client/dist/', import.meta.url));

export function frontendMiddleware(directory = clientDirectory) {
  const router = express.Router();
  const index = resolve(directory, 'index.html');
  // Only public build output is served. Source files, uploads and .env stay private.
  router.use(helmet.contentSecurityPolicy({ directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'https:', 'data:', 'blob:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'", 'https://*.razorpay.com'],
    mediaSrc: ["'self'", 'https://res.cloudinary.com', 'blob:'],
    frameSrc: ['https://*.razorpay.com', 'https://checkout.stripe.com'],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
  } }));
  router.use(express.static(directory, {
    index: false, dotfiles: 'deny',
    setHeaders(res, path) {
      res.setHeader('Cache-Control', path.includes(`${resolve(directory, 'assets')}`)
        ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  }));
  router.use((req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method) || !req.accepts('html') ||
        req.path.startsWith('/assets/') || req.path.split('/').some(part => part.startsWith('.')) ||
        extname(req.path) || !existsSync(index)) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(index);
  });
  return router;
}
