import {
  addBeneficiary,
  listBeneficiaries,
  removeBeneficiary,
} from '../services/beneficiaryService.js';
import { successResponse } from '../utils/apiResponse.js';

export async function create(req, res) {
  const beneficiary = await addBeneficiary(req.user._id, req.body);
  return successResponse(res, {
    statusCode: 201,
    message: 'Beneficiary saved successfully',
    data: { beneficiary },
  });
}

export async function list(req, res) {
  const beneficiaries = await listBeneficiaries(req.user._id);
  return successResponse(res, { data: { beneficiaries } });
}

export async function remove(req, res) {
  await removeBeneficiary(req.user._id, req.params.beneficiaryId);
  return successResponse(res, { message: 'Beneficiary removed successfully' });
}
