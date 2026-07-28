import { env } from '../config/env.js';
import Account from '../models/Account.js';
import Loan from '../models/Loan.js';
import LoanApplication from '../models/LoanApplication.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';

function sixMonthRange() {
  const months = [];
  const current = new Date();
  current.setUTCDate(1);
  current.setUTCHours(0, 0, 0, 0);
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(current);
    date.setUTCMonth(date.getUTCMonth() - offset);
    months.push({
      key: `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}`,
      label: date.toLocaleString('en', { month: 'short', timeZone: 'UTC' }),
      start: date,
    });
  }
  return months;
}

function normalizeMonthly(rows, valueFields) {
  const months = sixMonthRange();
  const byKey = new Map(rows.map((row) => [`${row._id.year}-${row._id.month}`, row]));
  return months.map((month) => {
    const row = byKey.get(month.key) || {};
    const item = { month: month.label };
    valueFields.forEach((field) => {
      item[field] = row[field] || 0;
    });
    return item;
  });
}

export async function getCustomerDashboard(userId) {
  const startDate = sixMonthRange()[0].start;
  const [accounts, totals, activeLoans, recentTransactions, monthlyRows] = await Promise.all([
    Account.find({ owner: userId }).select('+accountNumber').sort({ createdAt: 1 }),
    Transaction.aggregate([
      { $match: { owner: userId, status: 'completed' } },
      {
        $group: {
          _id: null,
          sentMinor: {
            $sum: { $cond: [{ $eq: ['$direction', 'sent'] }, '$amountMinor', 0] },
          },
          receivedMinor: {
            $sum: { $cond: [{ $eq: ['$direction', 'received'] }, '$amountMinor', 0] },
          },
        },
      },
    ]),
    Loan.find({ borrower: userId, status: 'active' }).sort({ createdAt: -1 }).limit(5),
    Transaction.find({ owner: userId }).sort({ createdAt: -1 }).limit(5),
    Transaction.aggregate([
      {
        $match: {
          owner: userId,
          status: 'completed',
          createdAt: { $gte: startDate },
          direction: { $in: ['sent', 'received'] },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          sentMinor: {
            $sum: { $cond: [{ $eq: ['$direction', 'sent'] }, '$amountMinor', 0] },
          },
          receivedMinor: {
            $sum: { $cond: [{ $eq: ['$direction', 'received'] }, '$amountMinor', 0] },
          },
        },
      },
    ]),
  ]);

  return {
    summary: {
      availableBalanceMinor: accounts
        .filter((account) => account.status === 'active')
        .reduce((sum, account) => sum + account.availableBalanceMinor, 0),
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((account) => account.status === 'active').length,
      sentMinor: totals[0]?.sentMinor || 0,
      receivedMinor: totals[0]?.receivedMinor || 0,
      activeLoans: activeLoans.length,
      outstandingLoansMinor: activeLoans.reduce((sum, loan) => sum + loan.outstandingMinor, 0),
    },
    accounts,
    activeLoans,
    recentTransactions,
    cashFlow: normalizeMonthly(monthlyRows, ['sentMinor', 'receivedMinor']),
  };
}

export async function getEmployeeDashboard(employeeId) {
  const attentionThreshold = Math.floor(env.TRANSFER_MAX_MINOR * 0.8);
  const [
    assignedCustomers,
    pendingAccounts,
    pendingLoans,
    recentTransactionRecords,
    highValueActivity,
    accountStatusRows,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer', assignedEmployee: employeeId }),
    Account.countDocuments({ status: 'pending' }),
    LoanApplication.countDocuments({ status: 'pending' }),
    Transaction.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
    Transaction.find({
      direction: 'sent',
      status: 'completed',
      amountMinor: { $gte: attentionThreshold },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('owner', 'firstName lastName email'),
    Account.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  return {
    summary: {
      assignedCustomers,
      pendingAccounts,
      pendingLoans,
      transactionsLast24Hours: recentTransactionRecords,
      attentionItems: highValueActivity.length,
    },
    highValueActivity,
    accountStatuses: accountStatusRows.map((row) => ({
      status: row._id,
      count: row.count,
    })),
  };
}

export async function getAdminDashboard() {
  const startDate = sixMonthRange()[0].start;
  const [roleRows, totalAccounts, totalTransactions, transferTotals, pendingLoans, monthlyRows] =
    await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Account.countDocuments(),
      Transaction.countDocuments(),
      Transaction.aggregate([
        { $match: { type: 'transfer', direction: 'sent', status: 'completed' } },
        { $group: { _id: null, valueMinor: { $sum: '$amountMinor' } } },
      ]),
      LoanApplication.countDocuments({ status: 'pending' }),
      Transaction.aggregate([
        {
          $match: {
            type: 'transfer',
            direction: 'sent',
            status: 'completed',
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
            valueMinor: { $sum: '$amountMinor' },
          },
        },
      ]),
    ]);
  const roles = Object.fromEntries(roleRows.map((row) => [row._id, row.count]));
  return {
    summary: {
      totalUsers: Object.values(roles).reduce((sum, count) => sum + count, 0),
      totalCustomers: roles.customer || 0,
      totalEmployees: roles.employee || 0,
      totalAdmins: roles.admin || 0,
      totalAccounts,
      totalTransactions,
      transferredValueMinor: transferTotals[0]?.valueMinor || 0,
      pendingLoans,
    },
    usersByRole: roleRows.map((row) => ({ role: row._id, count: row.count })),
    transactionTrend: normalizeMonthly(monthlyRows, ['count', 'valueMinor']),
  };
}
