import {
  listCustomerLoanApplications,
  listCustomerLoans,
  listLoanPayments,
  listReviewableLoanApplications,
  payLoan,
  reviewLoanApplication,
  submitLoanApplication,
} from '../services/loanService.js';
import { successResponse } from '../utils/apiResponse.js';

function metadata(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') || '' };
}

export async function apply(req, res) {
  const application = await submitLoanApplication(req.user._id, req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Loan application submitted successfully',
    data: { application },
  });
}

export async function myApplications(req, res) {
  const applications = await listCustomerLoanApplications(req.user._id);
  return successResponse(res, { data: { applications } });
}

export async function staffApplications(req, res) {
  const applications = await listReviewableLoanApplications(req.query.status);
  return successResponse(res, { data: { applications } });
}

export async function review(req, res) {
  const result = await reviewLoanApplication(
    req.params.applicationId,
    req.user,
    req.body,
    metadata(req),
  );
  return successResponse(res, {
    message:
      req.body.decision === 'approve'
        ? 'Loan approved and disbursed successfully'
        : 'Loan application rejected',
    data: result,
  });
}

export async function myLoans(req, res) {
  const loans = await listCustomerLoans(req.user._id);
  return successResponse(res, { data: { loans } });
}

export async function payments(req, res) {
  const loanPayments = await listLoanPayments(req.user._id, req.params.loanId);
  return successResponse(res, { data: { payments: loanPayments } });
}

export async function makePayment(req, res) {
  const result = await payLoan(
    req.user._id,
    req.params.loanId,
    req.body,
    req.idempotencyKey,
    metadata(req),
  );
  return successResponse(res, {
    statusCode: result.duplicate ? 200 : 201,
    message: result.duplicate ? 'Loan payment already completed' : 'Loan payment completed',
    data: result,
  });
}
