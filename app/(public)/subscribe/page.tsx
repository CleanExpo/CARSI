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
      if (!data.url?.trim()) {
        setError(
          'Subscription checkout needs the LMS backend. Set BACKEND_URL, or use a deployed environment with Stripe billing.'
        );
        return;
      }
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
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 py-16 text-white">
      <div className="flex w-full max-w-lg flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block rounded-full border border-[#00F5FF]/30 bg-[#00F5FF]/10 px-3 py-1 text-xs font-medium text-[#00F5FF]">
            7-day free trial
          </span>
          <h1 className="mt-4 font-mono text-3xl font-bold text-white">CARSI Pro</h1>
          <p className="mt-2 text-white/60">Full access to all IICRC courses and CEC credits</p>
        </div>

        {/* Pricing card */}
        <div className="flex flex-col gap-6 rounded-sm border border-[#00F5FF]/20 bg-[#00F5FF]/5 p-8">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-5xl font-bold text-white">${yearlyPrice}</span>
              <span className="font-mono text-white/40">AUD / year</span>
            </div>
            <p className="mt-2 text-sm text-white/50">
              That&apos;s just ${monthlyEquivalent}/month · GST included
            </p>
          </div>

          <ul className="flex flex-col gap-3 text-sm text-white/70">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 text-[#00F5FF]">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full rounded-sm bg-[#00F5FF] py-3 font-mono text-sm font-semibold text-[#050505] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Opening checkout…' : 'Start 7-Day Free Trial'}
            </button>
            <p className="text-center text-xs text-white/30">
              Card required. No charge for 7 days. Cancel anytime.
            </p>
          </div>

          {error && <p className="rounded-sm bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>}
        </div>

        {/* Value proposition */}
        <div className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-center text-sm text-white/50">
            <span className="font-semibold text-white/70">Compare:</span> Individual IICRC courses
            cost $50–$150 each. With CARSI Pro, complete unlimited courses for one annual fee.
          </p>
        </div>

        {/* Legal links */}
        <p className="text-center text-xs leading-relaxed text-white/20">
          By subscribing, you agree to our{' '}
          <Link href="/terms" className="underline hover:text-white/40">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-white/40">
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
