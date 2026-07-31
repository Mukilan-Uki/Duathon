import 'dotenv/config';
import bcrypt from 'bcrypt';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Account from '../models/Account.js';
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
    email: 'customer.demo@duothan.local',
    firstName: 'Demo',
    lastName: 'Customer',
    role: 'customer',
    phoneNumber: '+94770000001',
  },
  {
    email: 'employee.demo@duothan.local',
    firstName: 'Demo',
    lastName: 'Employee',
    role: 'employee',
    phoneNumber: '+94770000002',
  },
  {
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
    users[person.role] = await User.findOneAndUpdate(
      { email: person.email },
      {
        $set: {
          ...person,
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

  console.info('Demo users and customer savings account are ready.');
  console.info(people.map((person) => person.email).join('\n'));
}

try {
  await seed();
} finally {
  await disconnectDatabase();
}
