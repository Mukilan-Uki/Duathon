import SuspiciousActivity from '../models/SuspiciousActivity.js';

const OPEN_STATUSES = ['open', 'investigating'];

export async function recordSecuritySignal({ userId, category, reason }) {
  if (!userId) return null;
  const existing = await SuspiciousActivity.findOne({
    customer: userId,
    category,
    status: { $in: OPEN_STATUSES },
  });
  if (existing) return existing;
  return SuspiciousActivity.create({
    customer: userId,
    category,
    reason,
    source: 'automatic',
  });
}

export async function flagAutomaticTransaction({ transaction, customer, category, reason, session }) {
  const [activity] = await SuspiciousActivity.create(
    [
      {
        transaction,
        customer,
        category,
        reason,
        source: 'automatic',
      },
    ],
    { session },
  );
  return activity;
}
