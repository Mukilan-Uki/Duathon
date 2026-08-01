import 'dotenv/config';
import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Account from '../models/Account.js';
import SystemSetting from '../models/SystemSetting.js';
import User from '../models/User.js';

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
  await Account.findOneAndUpdate(
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
    { upsert: true, runValidators: true },
  );
  await Account.findOneAndUpdate(
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
    { upsert: true, runValidators: true },
  );

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

  console.info('DEVELOPMENT ONLY: demo users, two funded accounts, and transfer limits are ready.');
  console.info(people.map((person) => person.email).join('\n'));
}

try {
  await seed();
} finally {
  await disconnectDatabase();
}
