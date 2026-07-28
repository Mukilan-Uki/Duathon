import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage';
import ProfilePage from '../pages/customer/ProfilePage';
import AccountsPage from '../pages/customer/AccountsPage';
import BeneficiariesPage from '../pages/customer/BeneficiariesPage';
import ReceiptPage from '../pages/customer/ReceiptPage';
import TransactionDetailsPage from '../pages/customer/TransactionDetailsPage';
import TransactionHistoryPage from '../pages/customer/TransactionHistoryPage';
import TransferPage from '../pages/customer/TransferPage';
import AccountReviewPage from '../pages/employee/AccountReviewPage';
import HomePage from '../pages/HomePage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
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
        <Route element={<ProtectedRoute roles={['customer']} />}>
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="beneficiaries" element={<BeneficiariesPage />} />
          <Route path="transfer" element={<TransferPage />} />
          <Route path="transactions" element={<TransactionHistoryPage />} />
          <Route path="transactions/:transactionId" element={<TransactionDetailsPage />} />
          <Route path="transactions/:transactionId/receipt" element={<ReceiptPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['employee', 'admin']} />}>
          <Route path="account-reviews" element={<AccountReviewPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
