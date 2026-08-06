import Account from '../models/Account.js';
import JuniorAllowance from '../models/JuniorAllowance.js';
import { logger } from '../config/logger.js';
import { transferMoney } from '../services/transactionService.js';

const FREQUENCY_STEP_MS = {
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

async function runDueAllowance(allowance) {
  const destination = await Account.findById(allowance.destinationAccount).select('+accountNumber');
  if (!destination) {
    allowance.status = 'failed';
    allowance.failureReason = 'Destination account not found';
    await allowance.save();
    return;
  }

  const idempotencyKey = `allowance-${allowance._id}-${allowance.nextRunAt.toISOString()}`;
  try {
    await transferMoney(
      allowance.guardian,
      {
        senderAccountId: allowance.sourceAccount,
        receiverAccountNumber: destination.accountNumber,
        amount: allowance.amountMinor,
        description: allowance.description || 'Junior allowance',
      },
      idempotencyKey,
      { ip: 'internal-scheduler', userAgent: 'allowance-scheduler', method: 'JOB' },
      { allowJunior: true },
    );
  } catch (error) {
    allowance.status = 'failed';
    allowance.failureReason = error instanceof Error ? error.message : 'Allowance transfer failed';
    await allowance.save();
    logger.error({ allowanceId: allowance._id.toString(), err: error }, 'Allowance run failed');
    return;
  }

  allowance.lastRunAt = new Date();
  allowance.lastIdempotencyKey = idempotencyKey;
  if (allowance.frequency === 'one_time') {
    allowance.status = 'completed';
  } else {
    allowance.nextRunAt = new Date(
      allowance.nextRunAt.getTime() + FREQUENCY_STEP_MS[allowance.frequency],
    );
  }
  try {
    await allowance.save();
  } catch (error) {
    logger.error(
      { allowanceId: allowance._id.toString(), idempotencyKey, err: error },
      'Allowance transfer succeeded but recording the run failed; investigate before this allowance runs again',
    );
  }
}

export async function runAllowanceScheduler() {
  const due = await JuniorAllowance.find({ status: 'active', nextRunAt: { $lte: new Date() } });
  for (const allowance of due) {
    await runDueAllowance(allowance);
  }
  return due.length;
}

let timer = null;

export function startAllowanceScheduler(intervalMs = 60 * 60 * 1000) {
  if (timer) return timer;
  timer = setInterval(() => {
    runAllowanceScheduler().catch((error) =>
      logger.error({ err: error }, 'Allowance scheduler tick failed'),
    );
  }, intervalMs);
  timer.unref?.();
  return timer;
}

export function stopAllowanceScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
