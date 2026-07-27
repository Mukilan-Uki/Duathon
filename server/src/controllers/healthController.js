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
