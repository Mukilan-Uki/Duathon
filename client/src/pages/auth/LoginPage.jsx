import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import AuthCard from '../../components/forms/AuthCard';
import FormField from '../../components/forms/FormField';
import { useAuth } from '../../hooks/useAuth';
import { getApiError } from '../../utils/apiError';
import { loginSchema } from '../../validations/authSchemas';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const submit = async (values) => {
    setApiError('');
    try {
      const response = await login(values);
      const role = response.data.user.role;
      const roleHome =
        role === 'customer'
          ? '/dashboard'
          : role === 'employee'
            ? '/employee/dashboard'
            : '/admin/dashboard';
      navigate(location.state?.from?.pathname || roleHome, { replace: true });
    } catch (error) {
      setApiError(getApiError(error, 'Unable to sign in'));
    }
  };

  return (
    <AuthCard
      eyebrow="Secure access"
      title="Welcome back"
      description="Sign in to continue to your protected banking profile."
      footer={
        <>
          New to Duothan Bank?{' '}
          <Link className="font-semibold text-bank-700" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        {apiError && <Alert>{apiError}</Alert>}
        <FormField
          label="Email address"
          type="email"
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          error={errors.password?.message}
        />
        <div className="text-right">
          <Link className="text-sm font-medium text-bank-700" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
        <button
          className="w-full rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthCard>
  );
}
