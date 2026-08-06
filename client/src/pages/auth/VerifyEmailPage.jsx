import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '../../components/common/Alert';
import AuthCard from '../../components/forms/AuthCard';
import FormField from '../../components/forms/FormField';
import { authService } from '../../services/authService';
import { getApiError } from '../../utils/apiError';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { email: params.get('email') || '', code: '' },
  });

  const submit = async (values) => {
    setApiError('');
    try {
      await authService.verifyEmail(values);
      navigate('/login', { replace: true, state: { verified: true } });
    } catch (error) {
      setApiError(getApiError(error));
    }
  };

  const resend = async () => {
    const email = getValues('email');
    if (!email) return setApiError('Enter your email address first');
    setApiError('');
    setNotice('');
    try {
      await authService.resendVerification(email);
      setNotice('If verification is pending, a new code has been sent.');
    } catch (error) {
      setApiError(getApiError(error));
    }
  };

  return (
    <AuthCard
      eyebrow="Email verification"
      title="Enter your security code"
      description="Use the six-digit code sent to your registered email address."
      footer={
        <Link className="font-semibold text-bank-700" to="/login">
          Return to sign in
        </Link>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit(submit)} noValidate>
        {apiError && <Alert>{apiError}</Alert>}
        {notice && <Alert type="success">{notice}</Alert>}
        <FormField
          label="Email address"
          type="email"
          {...register('email', { required: 'Email is required' })}
          error={errors.email?.message}
        />
        <FormField
          label="Six-digit code"
          inputMode="numeric"
          maxLength="6"
          {...register('code', {
            required: 'Code is required',
            pattern: { value: /^\d{6}$/, message: 'Enter six digits' },
          })}
          error={errors.code?.message}
        />
        <button
          className="w-full rounded-lg bg-bank-700 px-4 py-3 font-semibold text-white disabled:opacity-60"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Verifying…' : 'Verify email'}
        </button>
        <button
          className="w-full text-sm font-semibold text-bank-700"
          type="button"
          onClick={resend}
        >
          Send a new code
        </button>
      </form>
    </AuthCard>
  );
}
