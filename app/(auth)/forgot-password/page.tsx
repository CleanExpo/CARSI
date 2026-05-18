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
          Reset password
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Enter your email address and we&apos;ll send you a reset link
        </p>
        <p className="text-xs font-medium tracking-wide" style={{ color: '#2490ed' }}>
          IICRC CEC-approved restoration training
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
            style={{ color: isError ? 'hsl(var(--destructive))' : 'rgba(255,255,255,0.7)' }}
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
          className="w-full rounded-sm py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: '#ed9d24' }}
        >
          {isLoading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

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
