import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import AuthCard from '../../components/forms/AuthCard';
import FormField from '../../components/forms/FormField';
import { authService } from '../../services/authService';
import { getApiError } from '../../utils/apiError';
import { resetSchema } from '../../validations/authSchemas';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetSchema) });
  const submit = async (values) => {
    setApiError('');
    try {
      await authService.resetPassword(values);
      navigate('/login', { replace: true });
    } catch (error) {
      setApiError(getApiError(error));
    }
  };
  return (
    <AuthCard
      eyebrow="Secure reset"
      title="Choose a new password"
      description="The reset code expires after a short period and can only be used once."
      footer={
        <Link className="font-semibold text-bank-700" to="/forgot-password">
          Request another code
        </Link>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        {apiError && <Alert>{apiError}</Alert>}
        <FormField
          label="Email address"
          type="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <FormField
          label="Six-digit code"
          inputMode="numeric"
          maxLength="6"
          {...register('code')}
          error={errors.code?.message}
        />
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
          error={errors.password?.message}
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />
        <button
          className="w-full rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Updating…' : 'Reset password'}
        </button>
      </form>
    </AuthCard>
  );
}
