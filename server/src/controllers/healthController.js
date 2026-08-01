import { getDatabaseStatus } from '../config/database.js';
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

export function getReadiness(_req, res) {
  const database = getDatabaseStatus();
  const ready = database === 'connected';
  return res.status(ready ? 200 : 503).json({
    success: ready,
    message: ready ? 'Duothan Banking API is ready' : 'Duothan Banking API is not ready',
    data: { status: ready ? 'ready' : 'not_ready', database, timestamp: new Date().toISOString() },
    errors: [],
  });
}
