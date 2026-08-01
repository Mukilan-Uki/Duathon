import {
  addBeneficiary,
  getBeneficiary,
  listBeneficiaries,
  removeBeneficiary,
  restoreBeneficiary,
  updateBeneficiary,
  verifyBeneficiaryAccount,
} from '../services/beneficiaryService.js';
import { successResponse } from '../utils/apiResponse.js';

function metadata(req) {
  return { ip: req.ip, userAgent: req.get('user-agent') || '' };
}

export async function create(req, res) {
  const beneficiary = await addBeneficiary(req.user._id, req.body, metadata(req));
  return successResponse(res, {
    statusCode: 201,
    message: 'Beneficiary saved successfully',
    data: { beneficiary },
  });
}

export async function verifyAccount(req, res) {
  const verification = await verifyBeneficiaryAccount(req.body.accountNumber);
  return successResponse(res, { data: { verification } });
}

export async function list(req, res) {
  const result = await listBeneficiaries(req.user._id, req.query);
  return successResponse(res, { data: result });
}

export async function details(req, res) {
  const beneficiary = await getBeneficiary(req.user._id, req.params.beneficiaryId);
  return successResponse(res, { data: { beneficiary } });
}

export async function update(req, res) {
  const beneficiary = await updateBeneficiary(
    req.user._id,
    req.params.beneficiaryId,
    req.body,
    metadata(req),
  );
  return successResponse(res, {
    message: 'Beneficiary updated successfully',
    data: { beneficiary },
  });
}

export async function remove(req, res) {
  await removeBeneficiary(req.user._id, req.params.beneficiaryId, metadata(req));
  return successResponse(res, { message: 'Beneficiary removed successfully' });
}

export async function restore(req, res) {
  const beneficiary = await restoreBeneficiary(
    req.user._id,
    req.params.beneficiaryId,
    metadata(req),
  );
  return successResponse(res, {
    message: 'Beneficiary restored successfully',
    data: { beneficiary },
  });
}
