import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import ProtectedRoute from './ProtectedRoute';
import RoleProtectedRoute from './RoleProtectedRoute';

const load = (path) => lazy(() => path());
const HomePage = load(() => import('../pages/HomePage'));
const NotFoundPage = load(() => import('../pages/NotFoundPage'));
const LoginPage = load(() => import('../pages/auth/LoginPage'));
const RegisterPage = load(() => import('../pages/auth/RegisterPage'));
const VerifyEmailPage = load(() => import('../pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = load(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = load(() => import('../pages/auth/ResetPasswordPage'));
const ProfilePage = load(() => import('../pages/customer/ProfilePage'));
const CustomerDashboardPage = load(() => import('../pages/customer/CustomerDashboardPage'));
const NotificationsPage = load(() => import('../pages/customer/NotificationsPage'));
const AccountsPage = load(() => import('../pages/customer/AccountsPage'));
const AccountDetailsPage = load(() => import('../pages/customer/AccountDetailsPage'));
const BeneficiariesPage = load(() => import('../pages/customer/BeneficiariesPage'));
const BeneficiaryDetailsPage = load(() => import('../pages/customer/BeneficiaryDetailsPage'));
const LoansPage = load(() => import('../pages/customer/LoansPage'));
const TransferPage = load(() => import('../pages/customer/TransferPage'));
const TransferResultPage = load(() => import('../pages/customer/TransferResultPage'));
const TransactionHistoryPage = load(() => import('../pages/customer/TransactionHistoryPage'));
const TransactionDetailsPage = load(() => import('../pages/customer/TransactionDetailsPage'));
const ReceiptPage = load(() => import('../pages/customer/ReceiptPage'));
const EmployeeDashboardPage = load(() => import('../pages/employee/EmployeeDashboardPage'));
const AccountReviewPage = load(() => import('../pages/employee/AccountReviewPage'));
const LoanReviewPage = load(() => import('../pages/employee/LoanReviewPage'));
const TransactionMonitoringPage = load(() => import('../pages/employee/TransactionMonitoringPage'));
const AdminDashboardPage = load(() => import('../pages/admin/AdminDashboardPage'));
const AdminOperationsPage = load(() => import('../pages/admin/AdminOperationsPage'));

function RouteLoading() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-12 text-slate-600" role="status" aria-live="polite">
      Loading page…
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleProtectedRoute roles={['customer']} />}>
              <Route path="dashboard" element={<CustomerDashboardPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="accounts/:accountId" element={<AccountDetailsPage />} />
              <Route path="beneficiaries" element={<BeneficiariesPage />} />
              <Route path="beneficiaries/:beneficiaryId" element={<BeneficiaryDetailsPage />} />
              <Route path="loans" element={<LoansPage />} />
              <Route path="transfer" element={<TransferPage />} />
              <Route path="transfer/result" element={<TransferResultPage />} />
              <Route path="transactions" element={<TransactionHistoryPage />} />
              <Route path="transactions/:transactionId" element={<TransactionDetailsPage />} />
              <Route path="transactions/:transactionId/receipt" element={<ReceiptPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleProtectedRoute roles={['employee']} />}>
              <Route path="employee/dashboard" element={<EmployeeDashboardPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleProtectedRoute roles={['admin']} />}>
              <Route path="admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="admin/operations" element={<AdminOperationsPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<RoleProtectedRoute roles={['employee', 'admin']} />}>
              <Route path="account-reviews" element={<AccountReviewPage />} />
              <Route path="loan-reviews" element={<LoanReviewPage />} />
              <Route path="transaction-monitoring" element={<TransactionMonitoringPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
