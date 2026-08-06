import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { env } from './config/env.js';
import { register, metricsMiddleware } from './config/metrics.js';
import { createRateLimitStore } from './config/rateLimitStore.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { requestLogger } from './middleware/requestLogger.js';
import apiRoutes from './routes/index.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(mongoSanitize());
app.use(hpp());
morgan.token('safe-url', (req) => req.originalUrl.split('?')[0]);
if (env.NODE_ENV !== 'test') {
  app.use(requestLogger);
  app.use(metricsMiddleware);
  if (env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }
}
app.get('/api/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    // Authentication and other sensitive routes have dedicated lower limits.
    // This general ceiling also covers dashboard and notification polling.
    limit: 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: createRateLimitStore('global'),
  }),
);
app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
