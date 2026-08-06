import mongoose from 'mongoose';
import { getDatabaseStatus } from '../config/database.js';
import { env } from '../config/env.js';
import { successResponse } from '../utils/apiResponse.js';

export function getHealth(_req, res) {
  return successResponse(res, {
    message: 'Duothan Banking API is healthy',
    data: {
      status: 'ok',
      database: getDatabaseStatus(),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
}

async function pingDatabase() {
  const database = getDatabaseStatus();
  if (database !== 'connected') return false;
  try {
    await mongoose.connection.db.admin().ping();
    return true;
  } catch {
    return false;
  }
}

function smtpConfigured() {
  return Boolean(env.SMTP_HOST);
}

export async function getReadiness(_req, res) {
  const database = getDatabaseStatus();
  const databaseUp = await pingDatabase();
  const smtp = smtpConfigured();
  const ready = databaseUp && (env.NODE_ENV !== 'production' || smtp);

  return res.status(ready ? 200 : 503).json({
    success: ready,
    message: ready ? 'Duothan Banking API is ready' : 'Duothan Banking API is not ready',
    data: {
      status: ready ? 'ready' : 'not_ready',
      database,
      databaseUp,
      smtpConfigured: smtp,
      timestamp: new Date().toISOString(),
    },
    errors: [],
  });
}
