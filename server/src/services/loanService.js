import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Account from '../models/Account.js';
import Loan from '../models/Loan.js';
import LoanApplication from '../models/LoanApplication.js';
import LoanPayment from '../models/LoanPayment.js';
import Transaction from '../models/Transaction.js';
import { AppError } from '../utils/AppError.js';
import { generateLoanNumber, generateLoanPaymentReference } from '../utils/loanReference.js';
import { createAuditLog } from './auditService.js';
import { createNotification } from './notificationService.js';
import { getNumericSetting } from './settingService.js';

const interestRates = {
  personal: () => env.LOAN_PERSONAL_RATE_BPS,
  education: () => env.LOAN_EDUCATION_RATE_BPS,
  home: () => env.LOAN_HOME_RATE_BPS,
  business: () => env.LOAN_BUSINESS_RATE_BPS,
};

function addMonths(date, months) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function calculateLoanTerms(principalMinor, rateBps, months) {
  const numerator = BigInt(principalMinor) * BigInt(rateBps) * BigInt(months);
  const interestMinor = Number((numerator + 119999n) / 120000n);
  const totalRepayableMinor = principalMinor + interestMinor;
  const monthlyInstallmentMinor = Math.ceil(totalRepayableMinor / months);
  if (
    !Number.isSafeInteger(totalRepayableMinor) ||
    !Number.isSafeInteger(monthlyInstallmentMinor)
  ) {
    throw new AppError('Calculated loan amount exceeds supported limits', 422);
  }
  return { interestMinor, totalRepayableMinor, monthlyInstallmentMinor };
}

export async function submitLoanApplication(userId, input) {
  const [loanMinMinor, loanMaxMinor] = await Promise.all([
    getNumericSetting('loan_min_minor', env.LOAN_MIN_MINOR),
    getNumericSetting('loan_max_minor', env.LOAN_MAX_MINOR),
  ]);
  if (input.requestedAmountMinor < loanMinMinor) {
    throw new AppError(`Minimum loan amount is ${loanMinMinor} minor units`, 422);
  }
  if (input.requestedAmountMinor > loanMaxMinor) {
    throw new AppError(`Maximum loan amount is ${loanMaxMinor} minor units`, 422);
  }
  const account = await Account.findOne({
    _id: input.disbursementAccountId,
    owner: userId,
    status: 'active',
  });
  if (!account) throw new AppError('An active owned disbursement account is required', 404);
  if (await LoanApplication.exists({ applicant: userId, status: 'pending' })) {
    throw new AppError('You already have a pending loan application', 409);
  }
  return LoanApplication.create({
    applicant: userId,
    disbursementAccount: account._id,
    loanType: input.loanType,
    requestedAmountMinor: input.requestedAmountMinor,
    purpose: input.purpose,
    repaymentMonths: input.repaymentMonths,
  });
}

export function listCustomerLoanApplications(userId) {
  return LoanApplication.find({ applicant: userId })
    .populate({
      path: 'disbursementAccount',
      select: '+accountNumber accountType status currency',
    })
    .sort({ createdAt: -1 });
}

export function listReviewableLoanApplications(status) {
  const query = status ? { status } : {};
  return LoanApplication.find(query)
    .populate('applicant', 'firstName lastName email')
    .populate({
      path: 'disbursementAccount',
      select: '+accountNumber accountType status currency',
    })
    .populate('reviewedBy', 'firstName lastName')
    .sort({ status: 1, createdAt: 1 });
}

function reviewFingerprint(reviewerId, applicationId, input) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        reviewerId: reviewerId.toString(),
        applicationId,
        decision: input.decision,
        reviewNote: input.reviewNote,
      }),
    )
    .digest('hex');
}

async function findReviewedApplication(reviewerId, applicationId, key, fingerprint, session) {
  const query = LoanApplication.findOne({
    _id: applicationId,
    reviewedBy: reviewerId,
    reviewIdempotencyKey: key,
  }).select('+reviewIdempotencyKey +reviewRequestHash');
  if (session) query.session(session);
  const application = await query;
  if (application && application.reviewRequestHash !== fingerprint) {
    throw new AppError('This idempotency key was already used for another request', 409);
  }
  return application;
}

export async function reviewLoanApplication(
  applicationId,
  reviewer,
  input,
  metadata,
  idempotencyKey,
) {
  const fingerprint = reviewFingerprint(reviewer._id, applicationId, input);
  const existing = await findReviewedApplication(
    reviewer._id,
    applicationId,
    idempotencyKey,
    fingerprint,
  );
  if (existing) {
    return {
      application: existing,
      loan: existing.approvedLoan ? await Loan.findById(existing.approvedLoan) : null,
      duplicate: true,
    };
  }

  try {
    return await runReviewTransaction(
      applicationId,
      reviewer,
      input,
      metadata,
      idempotencyKey,
      fingerprint,
    );
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await findReviewedApplication(
        reviewer._id,
        applicationId,
        idempotencyKey,
        fingerprint,
      );
      if (duplicate) {
        return {
          application: duplicate,
          loan: duplicate.approvedLoan ? await Loan.findById(duplicate.approvedLoan) : null,
          duplicate: true,
        };
      }
    }
    throw error;
  }
}

async function runReviewTransaction(
  applicationId,
  reviewer,
  input,
  metadata,
  idempotencyKey,
  fingerprint,
) {
  return mongoose.connection.transaction(
    async (session) => {
      const inside = await findReviewedApplication(
        reviewer._id,
        applicationId,
        idempotencyKey,
        fingerprint,
        session,
      );
      if (inside) {
        return {
          application: inside,
          loan: inside.approvedLoan
            ? await Loan.findById(inside.approvedLoan).session(session)
            : null,
          duplicate: true,
        };
      }

      const application = await LoanApplication.findById(applicationId).session(session);
      if (!application) throw new AppError('Loan application not found', 404);
      if (application.status !== 'pending') {
        throw new AppError('Only pending loan applications can be reviewed', 409);
      }

      const now = new Date();
      const before = { status: application.status, reviewNote: application.reviewNote };
      application.status = input.decision === 'approve' ? 'approved' : 'rejected';
      application.reviewNote = input.reviewNote;
      application.reviewedBy = reviewer._id;
      application.reviewedAt = now;
      application.reviewIdempotencyKey = idempotencyKey;
      application.reviewRequestHash = fingerprint;

      if (input.decision === 'reject') {
        await application.save({ session });
        await createAuditLog({
          actor: reviewer._id,
          action: 'LOAN_APPLICATION_REJECTED',
          targetType: 'LoanApplication',
          targetId: application._id,
          before,
          after: { status: application.status, reviewNote: application.reviewNote },
          metadata,
          session,
        });
        await createNotification(
          {
            recipient: application.applicant,
            type: 'loan',
            title: 'Loan application declined',
            message: `Your ${application.loanType} loan application was not approved.`,
            targetType: 'LoanApplication',
            targetId: application._id,
          },
          session,
        );
        return { application, loan: null, duplicate: false };
      }

      const account = await Account.findOne({
        _id: application.disbursementAccount,
        owner: application.applicant,
        status: 'active',
      })
        .select('+accountNumber')
        .session(session);
      if (!account) throw new AppError('The disbursement account is not active', 409);

      const rateBps = interestRates[application.loanType]();
      const terms = calculateLoanTerms(
        application.requestedAmountMinor,
        rateBps,
        application.repaymentMonths,
      );
      const loanNumber = generateLoanNumber();
      const creditedAccount = await Account.findOneAndUpdate(
        { _id: account._id, status: 'active' },
        {
          $inc: {
            ledgerBalanceMinor: application.requestedAmountMinor,
            availableBalanceMinor: application.requestedAmountMinor,
          },
        },
        { new: true, session },
      ).select('+accountNumber');
      if (!creditedAccount) throw new AppError('The disbursement account is not active', 409);

      const [loan] = await Loan.create(
        [
          {
            borrower: application.applicant,
            application: application._id,
            disbursementAccount: account._id,
            loanNumber,
            loanType: application.loanType,
            principalMinor: application.requestedAmountMinor,
            interestRateBps: rateBps,
            interestMinor: terms.interestMinor,
            totalRepayableMinor: terms.totalRepayableMinor,
            outstandingMinor: terms.totalRepayableMinor,
            paidMinor: 0,
            monthlyInstallmentMinor: terms.monthlyInstallmentMinor,
            repaymentMonths: application.repaymentMonths,
            disbursedAt: now,
            nextPaymentDueAt: addMonths(now, 1),
          },
        ],
        { session },
      );

      application.approvedLoan = loan._id;
      await application.save({ session });
      await Transaction.create(
        [
          {
            owner: application.applicant,
            account: account._id,
            reference: `${loanNumber}-DISB`,
            transferReference: loanNumber,
            type: 'deposit',
            direction: 'credit',
            amountMinor: application.requestedAmountMinor,
            currency: account.currency,
            status: 'completed',
            description: `${application.loanType} loan disbursement`,
            balanceAfterMinor: creditedAccount.availableBalanceMinor,
            counterpartyAccountNumber: 'DUOTHAN-LOANS',
          },
        ],
        { session },
      );
      await createAuditLog({
        actor: reviewer._id,
        action: 'LOAN_APPROVED_AND_DISBURSED',
        targetType: 'Loan',
        targetId: loan._id,
        before: {
          applicationStatus: 'pending',
          accountBalanceMinor: account.availableBalanceMinor,
        },
        after: {
          applicationStatus: 'approved',
          accountBalanceMinor: creditedAccount.availableBalanceMinor,
          loanNumber,
          totalRepayableMinor: terms.totalRepayableMinor,
        },
        metadata,
        session,
      });
      await createNotification(
        {
          recipient: application.applicant,
          type: 'loan',
          title: 'Loan approved',
          message: `Your ${application.loanType} loan was approved and disbursed.`,
          targetType: 'Loan',
          targetId: loan._id,
        },
        session,
      );
      return { application, loan, duplicate: false };
    },
    { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
  );
}

export function listCustomerLoans(userId) {
  return Loan.find({ borrower: userId })
    .populate({
      path: 'disbursementAccount',
      select: '+accountNumber accountType status currency',
    })
    .sort({ createdAt: -1 });
}

export function listLoanPayments(userId, loanId) {
  return LoanPayment.find({ borrower: userId, loan: loanId })
    .sort({ createdAt: -1 })
    .select('-requestHash -idempotencyKey');
}

function paymentFingerprint(userId, loanId, input) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        userId: userId.toString(),
        loanId,
        sourceAccountId: input.sourceAccountId,
        amountMinor: input.amountMinor,
      }),
    )
    .digest('hex');
}

async function findPayment(userId, key, fingerprint, session) {
  const query = LoanPayment.findOne({ borrower: userId, idempotencyKey: key }).select(
    '+idempotencyKey +requestHash',
  );
  if (session) query.session(session);
  const payment = await query;
  if (payment && payment.requestHash !== fingerprint) {
    throw new AppError('This idempotency key was already used for another request', 409);
  }
  return payment;
}

export async function payLoan(userId, loanId, input, idempotencyKey, metadata) {
  const fingerprint = paymentFingerprint(userId, loanId, input);
  const existing = await findPayment(userId, idempotencyKey, fingerprint);
  if (existing) return { payment: existing, duplicate: true };

  try {
    return await mongoose.connection.transaction(
      async (session) => {
        const inside = await findPayment(userId, idempotencyKey, fingerprint, session);
        if (inside) return { payment: inside, duplicate: true };

        const loan = await Loan.findOne({ _id: loanId, borrower: userId }).session(session);
        if (!loan) throw new AppError('Loan not found', 404);
        if (loan.status !== 'active') throw new AppError('This loan is not active', 409);
        if (input.amountMinor > loan.outstandingMinor) {
          throw new AppError('Payment cannot exceed the outstanding loan balance', 422);
        }

        const account = await Account.findOne({
          _id: input.sourceAccountId,
          owner: userId,
          status: 'active',
        })
          .select('+accountNumber')
          .session(session);
        if (!account) throw new AppError('Payment account not found', 404);

        const debited = await Account.findOneAndUpdate(
          {
            _id: account._id,
            owner: userId,
            status: 'active',
            availableBalanceMinor: { $gte: input.amountMinor },
            ledgerBalanceMinor: { $gte: input.amountMinor },
          },
          {
            $inc: {
              availableBalanceMinor: -input.amountMinor,
              ledgerBalanceMinor: -input.amountMinor,
            },
          },
          { new: true, session },
        ).select('+accountNumber');
        if (!debited) throw new AppError('Insufficient available balance', 422);

        const outstandingAfterMinor = loan.outstandingMinor - input.amountMinor;
        const paidLoan = await Loan.findOneAndUpdate(
          {
            _id: loan._id,
            borrower: userId,
            status: 'active',
            outstandingMinor: loan.outstandingMinor,
          },
          {
            $inc: {
              outstandingMinor: -input.amountMinor,
              paidMinor: input.amountMinor,
            },
            $set: {
              status: outstandingAfterMinor === 0 ? 'paid' : 'active',
              completedAt: outstandingAfterMinor === 0 ? new Date() : null,
              nextPaymentDueAt:
                outstandingAfterMinor === 0 ? loan.nextPaymentDueAt : addMonths(new Date(), 1),
            },
          },
          { new: true, session },
        );
        if (!paidLoan) throw new AppError('Loan changed during payment. Please retry', 409);

        const reference = generateLoanPaymentReference();
        const [payment] = await LoanPayment.create(
          [
            {
              loan: loan._id,
              borrower: userId,
              sourceAccount: account._id,
              reference,
              amountMinor: input.amountMinor,
              outstandingAfterMinor,
              idempotencyKey,
              requestHash: fingerprint,
            },
          ],
          { session },
        );
        await Transaction.create(
          [
            {
              owner: userId,
              account: account._id,
              reference,
              transferReference: loan.loanNumber,
              idempotencyKey,
              requestHash: fingerprint,
              type: 'loan_payment',
              direction: 'debit',
              amountMinor: input.amountMinor,
              currency: account.currency,
              status: 'completed',
              description: `Payment for loan ${loan.loanNumber}`,
              balanceAfterMinor: debited.availableBalanceMinor,
              counterpartyAccountNumber: 'DUOTHAN-LOANS',
            },
          ],
          { session },
        );
        await createAuditLog({
          actor: userId,
          action: 'LOAN_PAYMENT_COMPLETED',
          targetType: 'LoanPayment',
          targetId: payment._id,
          before: {
            accountBalanceMinor: account.availableBalanceMinor,
            outstandingMinor: loan.outstandingMinor,
          },
          after: {
            accountBalanceMinor: debited.availableBalanceMinor,
            outstandingMinor: outstandingAfterMinor,
          },
          metadata,
          session,
        });
        await createNotification(
          {
            recipient: userId,
            type: 'loan',
            title: 'Loan payment received',
            message: `Your payment of ${input.amountMinor} minor units was recorded.`,
            targetType: 'LoanPayment',
            targetId: payment._id,
          },
          session,
        );
        return { payment, loan: paidLoan, duplicate: false };
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } },
    );
  } catch (error) {
    if (error?.code === 11000) {
      const duplicate = await findPayment(userId, idempotencyKey, fingerprint);
      if (duplicate) return { payment: duplicate, duplicate: true };
    }
    throw error;
  }
}
