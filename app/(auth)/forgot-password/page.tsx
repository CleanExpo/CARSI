'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const result = await authApi.requestPasswordReset(email);
      const successText = result.message || 'A password reset link has been sent to your email.';
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
          Reset password
        </h1>
        <p className="text-sm text-slate-600">
          Enter your email address and we&apos;ll send you a reset link
        </p>
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
          />
        </div>
        {message && (
          <p
            className="text-sm"
            style={{ color: isError ? 'hsl(var(--destructive))' : '#334155' }}
          >
            {message}
            {isError && message.includes('No account found') && (
              <>
                {' '}
                <Link href="/register" className="underline underline-offset-2">
                  Create an account
                </Link>
              </>
            )}
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
