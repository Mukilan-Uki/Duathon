import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import AuthCard from '../../components/forms/AuthCard';
import FormField from '../../components/forms/FormField';
import { authService } from '../../services/authService';
import { getApiError } from '../../utils/apiError';
import { registerSchema } from '../../validations/authSchemas';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const submit = async (values) => {
    setApiError('');
    try {
      await authService.register(values);
      navigate(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch (error) {
      setApiError(getApiError(error, 'Unable to create account'));
    }
  };

  return (
    <AuthCard
      eyebrow="Customer registration"
      title="Create your account"
      description="Your email must be verified before secure access is enabled."
      footer={
        <>
          Already registered?{' '}
          <Link className="font-semibold text-bank-700" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        {apiError && <Alert>{apiError}</Alert>}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            label="First name"
            autoComplete="given-name"
            {...register('firstName')}
            error={errors.firstName?.message}
          />
          <FormField
            label="Last name"
            autoComplete="family-name"
            {...register('lastName')}
            error={errors.lastName?.message}
          />
        </div>
        <FormField
          label="Email address"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <FormField
          label="Phone number"
          type="tel"
          autoComplete="tel"
          placeholder="+94771234567"
          {...register('phoneNumber')}
          error={errors.phoneNumber?.message}
        />
        <FormField
          label="Password"
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthCard>
  );
}
