'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsError(true);
      setMessage('Invalid reset link. Please request a new one.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setIsError(true);
      setMessage('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const result = await authApi.confirmPasswordReset(token, password);
      setMessage(result.message);
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Reset failed. The link may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-bold text-foreground">
          Set new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password for your CARSI account
        </p>
      </div>

      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-green-500">
            {message} Redirecting to sign in…
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              disabled={!token}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="Repeat your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
              disabled={!token}
            />
          </div>
          {message && (
            <p className={`text-sm ${isError ? 'text-destructive' : 'text-muted-foreground'}`}>
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#ed9d24' }}
          >
            {isLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}

      <div className="mt-5 text-center text-sm">
        <Link
          href="/login"
          className="font-medium text-primary underline decoration-white/20 underline-offset-4 transition-colors duration-150 hover:text-white hover:decoration-white/50"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
