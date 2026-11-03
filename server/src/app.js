import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { requireClient } from './middleware/client.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import taskRoutes from './routes/task.routes.js';

// "a.com, b.com" → ['a.com', 'b.com']; any "*" → '*'
export const parseOrigins = (value = '*') => {
  const origins = value
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.length === 0 || origins.includes('*') ? '*' : origins;
};

export const createApp = ({
  corsOrigin = process.env.CORS_ORIGIN,
  rateLimitPerMinute = Number(process.env.RATE_LIMIT_PER_MINUTE) || 300,
  // Behind Render/Netlify's proxy, trust X-Forwarded-For so rate limiting sees the real IP.
  trustProxy = process.env.NODE_ENV === 'production',
} = {}) => {
  const app = express();
  if (trustProxy) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: parseOrigins(corsOrigin) }));
  app.use(express.json({ limit: '100kb' }));
  if (process.env.NODE_ENV === 'production') app.use(morgan('combined'));
  else if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  // 503 when the database is unreachable so platform health checks fail loudly.
  app.get('/api/health', (_req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({ status: connected ? 'ok' : 'degraded', db: connected ? 'connected' : 'disconnected' });
  });

  app.use(
    '/api/tasks',
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitPerMinute,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      handler: (_req, res) => res.status(429).json({ error: { message: 'Too many requests, please slow down.' } }),
    }),
    requireClient,
    taskRoutes,
  );

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
