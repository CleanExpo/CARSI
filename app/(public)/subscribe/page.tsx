'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api/client';

const PRO_FEATURES = [
  'All 111+ IICRC-approved courses',
  'Unlimited CEC credits',
  'Water Restoration Technician (WRT) courses',
  'Carpet Cleaning Technician (CCT) courses',
  'Odour Control Technician (OCT) courses',
  'Applied Structural Drying (ASD) courses',
  'Carpet Repair & Reinstallation (CRT) courses',
  'PDF certificates for every course',
  'IICRC CEC tracking dashboard',
  'Direct CEC reporting to IICRC',
  'XP leaderboard & streak tracker',
  'Priority email support',
];

export default function SubscribePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    if (!user) {
      window.location.href = '/login?next=/subscribe';
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<{ url: string }>('/api/lms/subscription/checkout', {
        plan: 'pro',
        success_url: `${window.location.origin}/subscribe/success`,
        cancel_url: `${window.location.origin}/subscribe`,
      });
      window.location.href = data.url;
    } catch {
      setError('Could not start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Calculate monthly equivalent
  const yearlyPrice = 795;
  const monthlyEquivalent = Math.round(yearlyPrice / 12);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <div className="flex w-full max-w-lg flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            7-day free trial
          </span>
          <h1 className="mt-4 text-3xl font-bold text-foreground">CARSI Pro</h1>
          <p className="mt-2 text-muted-foreground">Full access to all IICRC courses and CEC credits</p>
        </div>

        {/* Pricing card */}
        <div className="flex flex-col gap-6 rounded-lg border border-primary/20 bg-primary/5 p-8">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-foreground">${yearlyPrice}</span>
              <span className="text-muted-foreground">AUD / year</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              That&apos;s just ${monthlyEquivalent}/month · GST included
            </p>
          </div>

          <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 text-primary">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Opening checkout…' : 'Start 7-Day Free Trial'}
            </button>
            <p className="text-center text-xs text-muted-foreground/50">
              Card required. No charge for 7 days. Cancel anytime.
            </p>
          </div>

          {error && <p className="rounded-lg bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>}
        </div>

        {/* Value proposition */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-center text-sm text-muted-foreground">
            <span className="font-semibold text-foreground/90">Compare:</span> Individual IICRC courses
            cost $50–$150 each. With CARSI Pro, complete unlimited courses for one annual fee.
          </p>
        </div>

        {/* Legal links */}
        <p className="text-center text-xs leading-relaxed text-muted-foreground/50">
          By subscribing, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-muted-foreground">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-muted-foreground">
            Privacy Policy
          </Link>
          .
          <br />
          Prices in AUD. GST included. Subscription via Stripe — secure payment.
        </p>
      </div>
    </main>
  );
}
