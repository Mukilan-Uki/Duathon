import {
  broadcastNotification,
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from '../services/notificationService.js';
import {
  flagTransaction,
  listAuditLogs,
  listSuspiciousActivities,
  listSystemSettings,
  updateInvestigation,
  upsertSystemSetting,
} from '../services/operationsService.js';
import { successResponse } from '../utils/apiResponse.js';

const metadata = (req) => ({ ip: req.ip, userAgent: req.get('user-agent') || '' });

export async function notifications(req, res) {
  return successResponse(res, { data: await listNotifications(req.user._id, req.query) });
}

export async function unreadNotifications(req, res) {
  return successResponse(res, {
    data: await listNotifications(req.user._id, { ...req.query, unreadOnly: true }),
  });
}

export async function readNotification(req, res) {
  const notification = await markNotificationRead(req.user._id, req.params.notificationId);
  return successResponse(res, { message: 'Notification marked as read', data: { notification } });
}

export async function readAllNotifications(req, res) {
  const updated = await markAllNotificationsRead(req.user._id);
  return successResponse(res, { message: 'All notifications marked as read', data: { updated } });
}

export async function removeNotification(req, res) {
  await deleteNotification(req.user._id, req.params.notificationId);
  return successResponse(res, { message: 'Notification deleted' });
}

export async function broadcast(req, res) {
  const sent = await broadcastNotification(req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Announcement broadcast successfully',
    data: { sent },
  });
}

export async function preferences(req, res) {
  const notificationPreferences = await updateNotificationPreferences(req.user._id, req.body);
  return successResponse(res, {
    message: 'Notification preferences updated',
    data: { notificationPreferences },
  });
}

export async function audits(req, res) {
  return successResponse(res, { data: await listAuditLogs(req.query) });
}

export async function suspicious(req, res) {
  return successResponse(res, {
    data: { activities: await listSuspiciousActivities(req.query.status) },
  });
}

export async function flag(req, res) {
  const activity = await flagTransaction(
    req.params.transactionId,
    req.user,
    req.body.reason,
    metadata(req),
  );
  return successResponse(res, {
    statusCode: 201,
    message: 'Transaction flagged for investigation',
    data: { activity },
  });
}

export async function investigate(req, res) {
  const activity = await updateInvestigation(
    req.params.activityId,
    req.user,
    req.body,
    metadata(req),
  );
  return successResponse(res, { message: 'Investigation updated', data: { activity } });
}

export async function settings(req, res) {
  return successResponse(res, { data: { settings: await listSystemSettings() } });
}

export async function saveSetting(req, res) {
  const setting = await upsertSystemSetting(req.user, req.body, metadata(req));
  return successResponse(res, { message: 'System setting saved', data: { setting } });
}
