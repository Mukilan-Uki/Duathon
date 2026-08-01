import 'dotenv/config';
import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Account from '../models/Account.js';
import AuditLog from '../models/AuditLog.js';
import FamilyGoal from '../models/FamilyGoal.js';
import FamilyGroup from '../models/FamilyGroup.js';
import JuniorAllowance from '../models/JuniorAllowance.js';
import JuniorProfile from '../models/JuniorProfile.js';
import JuniorTransactionRequest from '../models/JuniorTransactionRequest.js';
import LoanApplication from '../models/LoanApplication.js';
import Notification from '../models/Notification.js';
import SystemSetting from '../models/SystemSetting.js';
import Transaction from '../models/Transaction.js';
import TrustedDevice from '../models/TrustedDevice.js';
import User from '../models/User.js';
import { deviceTokenHash } from '../services/trustedDeviceService.js';

const confirmed = process.argv.includes('--confirm-demo-data');
const password = process.env.DEMO_SEED_PASSWORD;

if (!confirmed) {
  throw new Error('Pass --confirm-demo-data to acknowledge that demo records will be created');
}
if (process.env.NODE_ENV === 'production') {
  throw new Error('Demo data cannot be seeded when NODE_ENV=production');
}
if (!password || password.length < 12) {
  throw new Error('Set DEMO_SEED_PASSWORD to at least 12 characters before seeding');
}

const people = [
  {
    key: 'junior',
    email: 'junior.demo@duothan.local',
    firstName: 'Demo',
    lastName: 'Junior',
    role: 'customer',
    phoneNumber: '+94770000005',
    dateOfBirth: new Date('2012-04-10'),
  },
  {
    key: 'customer',
    email: 'customer.demo@duothan.local',
    firstName: 'Demo',
    lastName: 'Customer',
    role: 'customer',
    phoneNumber: '+94770000001',
    dateOfBirth: new Date('1990-01-15'),
  },
  {
    key: 'customer2',
    email: 'customer2.demo@duothan.local',
    firstName: 'Second',
    lastName: 'Customer',
    role: 'customer',
    phoneNumber: '+94770000004',
    dateOfBirth: new Date('1992-06-20'),
  },
  {
    key: 'employee',
    email: 'employee.demo@duothan.local',
    firstName: 'Demo',
    lastName: 'Employee',
    role: 'employee',
    phoneNumber: '+94770000002',
  },
  {
    key: 'admin',
    email: 'admin.demo@duothan.local',
    firstName: 'Demo',
    lastName: 'Administrator',
    role: 'admin',
    phoneNumber: '+94770000003',
  },
];

async function seed() {
  await connectDatabase();
  const passwordHash = await bcrypt.hash(password, 12);
  const users = {};

  for (const person of people) {
    users[person.key] = await User.findOneAndUpdate(
      { email: person.email },
      {
        $set: {
          email: person.email,
          firstName: person.firstName,
          lastName: person.lastName,
          role: person.role,
          phoneNumber: person.phoneNumber,
          dateOfBirth: person.dateOfBirth,
          password: passwordHash,
          accountStatus: 'active',
          isEmailVerified: true,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  await User.updateOne(
    { _id: users.customer._id },
    { $set: { assignedEmployee: users.employee._id } },
  );
  const adminAccount = await Account.findOneAndUpdate(
    { owner: users.customer._id, accountType: 'savings' },
    {
      $setOnInsert: {
        accountNumber: '699900000001',
        branchCode: 'CMB01',
        createdBy: users.admin._id,
        approvedBy: users.admin._id,
        approvedAt: new Date(),
        currency: 'LKR',
        ledgerBalanceMinor: 2500000,
        availableBalanceMinor: 2500000,
        activatedAt: new Date(),
      },
      $set: { status: 'active', reviewedBy: users.admin._id, reviewedAt: new Date() },
    },
    { upsert: true, new: true, runValidators: true },
  );
  const memberAccount = await Account.findOneAndUpdate(
    { owner: users.customer2._id, accountType: 'savings' },
    {
      $setOnInsert: {
        accountNumber: '699900000002',
        branchCode: 'CMB01',
        createdBy: users.admin._id,
        approvedBy: users.admin._id,
        approvedAt: new Date(),
        currency: 'LKR',
        ledgerBalanceMinor: 500000,
        availableBalanceMinor: 500000,
      },
      $set: { status: 'active' },
    },
    { upsert: true, new: true, runValidators: true },
  );

  const juniorAccount = await Account.findOneAndUpdate(
    { owner: users.junior._id, accountType: 'savings' },
    {
      $setOnInsert: {
        accountNumber: '699900000003',
        branchCode: 'CMB01',
        createdBy: users.admin._id,
        approvedBy: users.admin._id,
        approvedAt: new Date(),
        currency: 'LKR',
        ledgerBalanceMinor: 100000,
        availableBalanceMinor: 100000,
      },
      $set: { status: 'active', isJuniorRestricted: true },
    },
    { upsert: true, new: true, runValidators: true },
  );

  const now = new Date();
  const family = await FamilyGroup.findOneAndUpdate(
    { familyCode: 'DEMOFAMILY01' },
    {
      $set: {
        name: 'Demo Family',
        createdBy: users.customer._id,
        status: 'active',
        members: [
          {
            user: users.customer._id,
            role: 'family_admin',
            relationship: 'parent',
            status: 'active',
            permissions: {
              manageJuniorAccounts: true,
              approveJuniorTransactions: true,
              viewJuniorTransactions: true,
              manageFamilyMembers: true,
              createFamilyAnnouncements: true,
            },
            joinedAt: now,
            approvedAt: now,
          },
          {
            user: users.customer2._id,
            role: 'adult_member',
            relationship: 'partner',
            status: 'active',
            invitedBy: users.customer._id,
            joinedAt: now,
            approvedAt: now,
          },
          {
            user: users.junior._id,
            role: 'junior_member',
            relationship: 'child',
            status: 'active',
            invitedBy: users.customer._id,
            joinedAt: now,
            approvedAt: now,
          },
        ],
      },
      $setOnInsert: { familyCode: 'DEMOFAMILY01' },
    },
    { upsert: true, new: true, runValidators: true },
  );
  await FamilyGoal.findOneAndUpdate(
    { family: family._id, title: 'Demo family holiday' },
    {
      $set: {
        description: 'Development-only shared savings example',
        targetAmountMinor: 5000000,
        currentAmountMinor: 250000,
        currency: 'LKR',
        status: 'active',
        createdBy: users.customer._id,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  const juniorProfile = await JuniorProfile.findOneAndUpdate(
    { juniorUser: users.junior._id },
    {
      $set: {
        family: family._id,
        primaryGuardian: users.customer._id,
        guardians: [
          {
            user: users.customer._id,
            relationship: 'parent',
            permissions: {
              manageControls: true,
              manageAllowances: true,
              approveTransactions: true,
              viewTransactions: true,
              manageBeneficiaries: true,
            },
          },
        ],
        dateOfBirth: users.junior.dateOfBirth,
        relationshipToGuardian: 'child',
        status: 'active',
        permissions: {
          canTransfer: true,
          canCreateSavingsGoals: true,
          canRequestBeneficiaries: true,
          canApplyForLoans: false,
        },
        spendingLimits: {
          perTransactionLimitMinor: 50000,
          dailyLimitMinor: 100000,
          weeklyLimitMinor: 300000,
          monthlyLimitMinor: 1000000,
        },
        approvalSettings: {
          requireApprovalAboveMinor: 25000,
          requireApprovalForNewBeneficiary: true,
          requireApprovalForExternalTransfer: true,
          blockCashWithdrawal: true,
          allowedTransactionTypes: ['transfer', 'allowance', 'goal_contribution'],
        },
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  await JuniorAllowance.findOneAndUpdate(
    { juniorProfile: juniorProfile._id, description: 'Demo weekly allowance' },
    {
      $set: {
        guardian: users.customer._id,
        sourceAccount: adminAccount._id,
        destinationAccount: juniorAccount._id,
        amountMinor: 25000,
        frequency: 'weekly',
        nextRunAt: new Date(Date.now() + 7 * 86400000),
        status: 'active',
        description: 'Demo weekly allowance',
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  await JuniorTransactionRequest.findOneAndUpdate(
    { juniorProfile: juniorProfile._id, idempotencyKey: 'demo-junior-request-001' },
    {
      $set: {
        juniorAccount: juniorAccount._id,
        receiverAccount: memberAccount._id,
        amountMinor: 30000,
        description: 'Demo school supplies request',
        requestedBy: users.junior._id,
        status: 'pending',
        expiresAt: new Date(Date.now() + 86400000),
        idempotencyKey: 'demo-junior-request-001',
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  await LoanApplication.findOneAndUpdate(
    { applicant: users.customer2._id, purpose: 'Development-only education loan example' },
    {
      $set: {
        disbursementAccount: memberAccount._id,
        loanType: 'education',
        requestedAmountMinor: 1000000,
        purpose: 'Development-only education loan example',
        repaymentMonths: 12,
        status: 'pending',
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  await TrustedDevice.findOneAndUpdate(
    { user: users.customer._id, deviceIdHash: deviceTokenHash('development-demo-device-token') },
    {
      $set: {
        deviceName: 'Demo trusted laptop',
        deviceType: 'desktop',
        browser: 'Chrome',
        operatingSystem: 'Windows',
        userAgentSummary: 'Chrome on Windows',
        status: 'trusted',
        trustedAt: now,
        trustedUntil: new Date(Date.now() + 90 * 86400000),
        firstSeenAt: now,
        lastSeenAt: now,
        lastLoginIp: '127.0.0.1',
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  await TrustedDevice.findOneAndUpdate(
    { user: users.customer._id, deviceIdHash: deviceTokenHash('development-demo-pending-device') },
    {
      $set: {
        deviceName: 'Demo pending phone',
        deviceType: 'mobile',
        browser: 'Safari',
        operatingSystem: 'Apple',
        userAgentSummary: 'Safari on Apple',
        status: 'pending',
        firstSeenAt: now,
        lastSeenAt: now,
        lastLoginIp: '127.0.0.2',
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  await Notification.findOneAndUpdate(
    { recipient: users.junior._id, title: 'Welcome to Junior Banking' },
    {
      $set: {
        type: 'account',
        title: 'Welcome to Junior Banking',
        message: 'This is a development-only Junior Banking notification.',
        targetType: 'JuniorProfile',
        targetId: juniorProfile._id,
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  if (
    !(await AuditLog.exists({
      actor: users.admin._id,
      action: 'DEMO_DATA_SEEDED',
      targetId: family._id,
    }))
  ) {
    await AuditLog.create({
      actor: users.admin._id,
      action: 'DEMO_DATA_SEEDED',
      targetType: 'FamilyGroup',
      targetId: family._id,
      ipAddress: '127.0.0.1',
      userAgent: 'development-seed',
      after: { developmentOnly: true },
    });
  }

  const transferReference = 'DEMO-TRANSFER-001';
  if (!(await Transaction.exists({ reference: `${transferReference}-D` }))) {
    await Transaction.create([
      {
        owner: users.customer._id,
        senderUser: users.customer._id,
        receiverUser: users.customer2._id,
        senderAccount: adminAccount._id,
        receiverAccount: memberAccount._id,
        senderAccountNumber: '699900000001',
        receiverAccountNumber: '699900000002',
        account: adminAccount._id,
        counterpartyAccount: memberAccount._id,
        counterpartyOwner: users.customer2._id,
        reference: `${transferReference}-D`,
        transferReference,
        type: 'transfer',
        transactionType: 'transfer',
        direction: 'sent',
        amountMinor: 50000,
        amount: 50000,
        status: 'completed',
        description: 'Development-only sample transfer',
        completedAt: now,
        balanceAfterMinor: 2450000,
        counterpartyAccountNumber: '699900000002',
      },
      {
        owner: users.customer2._id,
        senderUser: users.customer._id,
        receiverUser: users.customer2._id,
        senderAccount: adminAccount._id,
        receiverAccount: memberAccount._id,
        senderAccountNumber: '699900000001',
        receiverAccountNumber: '699900000002',
        account: memberAccount._id,
        counterpartyAccount: adminAccount._id,
        counterpartyOwner: users.customer._id,
        reference: `${transferReference}-C`,
        transferReference,
        type: 'transfer',
        transactionType: 'transfer',
        direction: 'received',
        amountMinor: 50000,
        amount: 50000,
        status: 'completed',
        description: 'Development-only sample transfer',
        completedAt: now,
        balanceAfterMinor: 550000,
        counterpartyAccountNumber: '699900000001',
      },
    ]);
  }

  const settings = [
    ['transfer_min_minor', 100, 'Minimum internal transfer amount'],
    ['transfer_max_minor', 100000000, 'Maximum amount per internal transfer'],
    ['transfer_daily_limit_minor', 250000000, 'Maximum daily outgoing transfer amount'],
    ['transfer_max_per_day', 25, 'Maximum outgoing transfers per day'],
  ];
  for (const [key, value, description] of settings) {
    await SystemSetting.findOneAndUpdate(
      { key },
      {
        $set: {
          category: 'transactions',
          value,
          description,
          updatedBy: users.admin._id,
        },
      },
      { upsert: true, runValidators: true },
    );
  }

  console.info(
    'DEVELOPMENT ONLY: role users, family, junior, funded accounts, transfer, loan, devices, notifications, audit, and limits are ready.',
  );
  console.info(people.map((person) => person.email).join('\n'));
}

try {
  await seed();
} finally {
  await disconnectDatabase();
}
