import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import AuthCard from '../../components/forms/AuthCard';
import FormField from '../../components/forms/FormField';
import { authService } from '../../services/authService';
import { getApiError } from '../../utils/apiError';

export default function ForgotPasswordPage() {
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const submit = async ({ email }) => {
    setApiError('');
    try {
      const response = await authService.forgotPassword(email);
      setNotice(response.message);
    } catch (error) {
      setApiError(getApiError(error));
    }
  };
  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Reset your password"
      description="We will send a time-limited code when the account is eligible."
      footer={
        <Link className="font-semibold text-bank-700" to="/reset-password">
          Already have a code?
        </Link>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        {notice && <Alert type="success">{notice}</Alert>}
        {apiError && <Alert>{apiError}</Alert>}
        <FormField
          label="Email address"
          type="email"
          {...register('email', { required: 'Email is required' })}
          error={errors.email?.message}
        />
        <button
          className="w-full rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Sending…' : 'Send reset code'}
        </button>
      </form>
    </AuthCard>
  );
}
