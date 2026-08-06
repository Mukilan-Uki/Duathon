import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
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
  app.use(
    morgan(
      env.NODE_ENV === 'production'
        ? ':remote-addr - :method :safe-url HTTP/:http-version :status :res[content-length] - :response-time ms'
        : 'dev',
    ),
  );
}
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    // Authentication and other sensitive routes have dedicated lower limits.
    // This general ceiling also covers dashboard and notification polling.
    limit: 1000,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
);
app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;
