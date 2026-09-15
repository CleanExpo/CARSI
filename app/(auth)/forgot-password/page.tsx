'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import { isSafeInternalPath, isUsableRecoveryEmail } from '@/lib/auth/guest-recovery-path';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const prefill = searchParams.get('email') ?? '';
  const paidLockout = searchParams.get('paid') === '1';
  const nextPath = searchParams.get('next');
  const safeNext = nextPath && isSafeInternalPath(nextPath) ? nextPath : null;

  const [email, setEmail] = useState(() =>
    isUsableRecoveryEmail(prefill) ? prefill.trim().toLowerCase() : '',
  );
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const result = await authApi.requestPasswordReset(email, safeNext);
      const successText = result.message || 'If an account exists for that email, a password reset link has been sent.';
      setMessage(successText);
      setIsError(false);
      toast({ title: successText });
    } catch (err) {
      const errorText = err instanceof Error ? err.message : 'Failed to send reset link';
      setMessage(errorText);
      setIsError(true);
      toast({
        title: errorText,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200 sm:p-8"
      style={{
        border: '1px solid rgba(15,23,42,0.05)',
      }}
    >
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-bold text-slate-950">
          Set or reset your password
        </h1>
        {paidLockout ? (
          <p className="rounded-md border border-[#f2cf8f] bg-[#fff8ed] px-3 py-2 text-sm text-[#7a3500]">
            Your course is already paid. Set a password here — you will not be charged again.
            {safeNext ? ' After you set it, sign in and the course will open.' : ''}
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Enter your email address and we&apos;ll send you a link to set or reset your password.
            Use this if you bought a course as a guest and never chose one.
          </p>
        )}
        <p className="text-xs font-semibold tracking-wide text-[#146fc2]">
          IICRC CEC Accredited restoration courses
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        {message && (
          <p
            className="text-sm"
            style={{ color: isError ? 'hsl(var(--destructive))' : '#334155' }}
          >
            {message}
            {!isError ? ' Check junk if it is not in your inbox within a few minutes.' : null}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="min-h-12 w-full rounded-lg py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: '#9a4a00' }}
        >
          {isLoading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-5 text-center text-sm">
        <Link
          href="/login"
          className="font-semibold text-[#146fc2] underline decoration-[#146fc2]/25 underline-offset-4 transition-colors duration-150 hover:text-[#0f5fa8]"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
