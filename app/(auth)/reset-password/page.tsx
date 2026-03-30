'use client';

import { useState, useEffect, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
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
      toast({
        title: 'Invalid reset link. Please request a new one.',
        variant: 'destructive',
      });
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
      toast({ title: result.message || 'Password updated successfully' });
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Reset failed. The link may have expired.');
      toast({
        title: err instanceof Error ? err.message : 'Reset failed. The link may have expired.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="rounded-sm p-6 sm:p-8"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.95)' }}>
          Set new password
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Choose a strong password for your CARSI account
        </p>
      </div>

      {done ? (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: '#00FF88' }}>
            {message} Redirecting to sign in…
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
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
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              placeholder="Repeat your new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
              disabled={!token}
            />
          </div>
          {message && (
            <p className="text-sm" style={{ color: isError ? '#FF4444' : 'rgba(255,255,255,0.5)' }}>
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full rounded-sm py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#ed9d24' }}
          >
            {isLoading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      )}

      <div className="mt-5 text-center text-sm">
        <Link
          href="/login"
          className="font-medium underline decoration-white/20 underline-offset-4 transition-colors duration-150 hover:text-white hover:decoration-white/50"
          style={{ color: '#00F5FF' }}
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
