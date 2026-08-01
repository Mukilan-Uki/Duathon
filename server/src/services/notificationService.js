import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export async function createNotification(input, session) {
  const user = await User.findById(input.recipient)
    .select('notificationPreferences')
    .session(session);
  if (!user || user.notificationPreferences?.[input.type] === false) return null;
  const [notification] = await Notification.create([input], { session });
  return notification;
}

export async function listNotifications(userId, { page, limit, unreadOnly }) {
  const query = { recipient: userId, deletedAt: null };
  if (unreadOnly) query.readAt = null;
  const [notifications, total, unread] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: userId, deletedAt: null, readAt: null }),
  ]);
  return {
    notifications,
    unread,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function markNotificationRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId, deletedAt: null },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  if (!notification) throw new AppError('Notification not found', 404);
  return notification;
}

export async function markAllNotificationsRead(userId) {
  const result = await Notification.updateMany(
    { recipient: userId, deletedAt: null, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return result.modifiedCount;
}

export async function deleteNotification(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { new: true },
  );
  if (!notification) throw new AppError('Notification not found', 404);
}

export async function broadcastNotification({ title, message, audience }) {
  const userQuery = audience === 'all' ? {} : { role: audience };
  const userIds = await User.find(userQuery).distinct('_id');
  if (!userIds.length) return 0;
  await Notification.insertMany(
    userIds.map((recipient) => ({
      recipient,
      type: 'announcement',
      title,
      message,
      targetType: 'SystemAnnouncement',
    })),
    { ordered: false },
  );
  return userIds.length;
}

export async function updateNotificationPreferences(userId, preferences) {
  const updates = Object.fromEntries(
    Object.entries(preferences).map(([key, value]) => [`notificationPreferences.${key}`, value]),
  );
  const user = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true });
  if (!user) throw new AppError('User not found', 404);
  return user.notificationPreferences;
}
