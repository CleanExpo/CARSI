'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const result = await authApi.requestPasswordReset(email);
      setMessage(result.message || 'Check your email for a password reset link.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-bold text-foreground">
          Reset password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a reset link
        </p>
        <p className="text-xs font-medium tracking-wide text-primary">
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
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: '#ed9d24' }}
        >
          {isLoading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

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
