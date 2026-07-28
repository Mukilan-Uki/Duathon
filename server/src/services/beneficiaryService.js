import Account from '../models/Account.js';
import Beneficiary from '../models/Beneficiary.js';
import { AppError } from '../utils/AppError.js';

export async function addBeneficiary(userId, input) {
  const account = await Account.findOne({ accountNumber: input.accountNumber })
    .select('+accountNumber')
    .populate('owner', 'firstName lastName');

  if (!account || account.status !== 'active') {
    throw new AppError('A valid active beneficiary account was not found', 404);
  }
  if (account.owner._id.toString() === userId.toString()) {
    throw new AppError('You cannot save your own account as a beneficiary', 422);
  }
  if (await Beneficiary.exists({ owner: userId, beneficiaryAccount: account._id })) {
    throw new AppError('This beneficiary account is already saved', 409);
  }

  return Beneficiary.create({
    owner: userId,
    beneficiaryAccount: account._id,
    accountNumber: account.accountNumber,
    accountName: `${account.owner.firstName} ${account.owner.lastName}`,
    nickname: input.nickname,
  });
}

export function listBeneficiaries(userId) {
  return Beneficiary.find({ owner: userId })
    .populate('beneficiaryAccount', 'accountType status currency')
    .sort({ nickname: 1, createdAt: -1 });
}

export async function removeBeneficiary(userId, beneficiaryId) {
  const beneficiary = await Beneficiary.findOneAndDelete({
    _id: beneficiaryId,
    owner: userId,
  });
  if (!beneficiary) throw new AppError('Beneficiary not found', 404);
}
