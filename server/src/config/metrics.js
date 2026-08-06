import client from 'prom-client';

export const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const transfersTotal = new client.Counter({
  name: 'duothan_transfers_total',
  help: 'Total money transfers attempted',
  labelNames: ['status'],
  registers: [register],
});

export const failedLoginsTotal = new client.Counter({
  name: 'duothan_failed_logins_total',
  help: 'Total failed login attempts',
  registers: [register],
});

export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const route = req.route?.path ? req.baseUrl + req.route.path : req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestsTotal.inc(labels);
  });
  next();
}
