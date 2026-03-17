'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api/client';

const PLAN_DETAILS = {
  foundation: {
    name: 'Foundation Membership',
    price: '$44',
    period: 'AUD / month',
    color: '#2490ed',
    features: [
      'All Free Library resources',
      'Policies & Procedures',
      'Donning & Doffing PPE',
      'Microbe Clean Basic Understanding',
      'Level 1 Mould Remediation',
      'Starting a Business course',
      'Moisture Meter Course',
      'Carpet Cleaning Basics',
      'Safety Data Sheets Course',
      'ToolBox Meetings Assistance',
    ],
  },
  growth: {
    name: 'Growth Membership',
    price: '$99',
    period: 'AUD / month',
    color: '#00F5FF',
    features: [
      'Everything in Foundation',
      'NeoSan Labs Product Course',
      'Social Media Marketing',
      'Admin Course (valued at $275)',
      'Level 2 Mould Remediation',
      'Asthma & Allergy Course',
      'ALL Introduction To courses ($500+ value)',
      'IICRC CEC tracking dashboard',
      'XP leaderboard & streak tracker',
      'PDF certificate wallet',
    ],
  },
} as const;

type Plan = keyof typeof PLAN_DETAILS;

export default function SubscribePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const rawPlan = searchParams.get('plan');
  const plan: Plan = rawPlan === 'foundation' ? 'foundation' : 'growth';
  const details = PLAN_DETAILS[plan];

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
        plan,
        success_url: `${window.location.origin}/subscribe/success`,
        cancel_url: `${window.location.origin}/subscribe?plan=${plan}`,
      });
      window.location.href = data.url;
    } catch {
      setError('Could not start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 py-16 text-white">
      <div className="flex w-full max-w-lg flex-col gap-8">
        {/* Plan switcher */}
        <div className="flex gap-2 rounded-sm border border-white/[0.08] p-1">
          <Link
            href="/subscribe?plan=foundation"
            className="flex-1 rounded-sm px-4 py-2 text-center text-sm font-medium transition-colors"
            style={
              plan === 'foundation'
                ? { background: '#2490ed', color: '#fff' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            Foundation · $44/mo
          </Link>
          <Link
            href="/subscribe?plan=growth"
            className="flex-1 rounded-sm px-4 py-2 text-center text-sm font-medium transition-colors"
            style={
              plan === 'growth'
                ? { background: '#00F5FF', color: '#050505' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
          >
            Growth · $99/mo
          </Link>
        </div>

        {/* Pricing card */}
        <div
          className="flex flex-col gap-6 rounded-sm border p-8"
          style={{
            borderColor: `${details.color}33`,
            background: `${details.color}08`,
          }}
        >
          <div>
            <h1 className="font-mono text-2xl font-bold text-white">{details.name}</h1>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono text-5xl font-bold text-white">{details.price}</span>
              <span className="font-mono text-white/40">{details.period}</span>
            </div>
            <p className="mt-1 text-xs text-white/30">
              GST included · 7-day free trial · Cancel anytime
            </p>
          </div>

          <ul className="flex flex-col gap-3 text-sm text-white/70">
            {details.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0" style={{ color: details.color }}>
                  ✓
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full rounded-sm py-3 font-mono text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={
                plan === 'growth'
                  ? { background: '#00F5FF', color: '#050505' }
                  : { background: '#2490ed', color: '#fff' }
              }
            >
              {loading ? 'Opening checkout…' : 'Start 7-Day Free Trial'}
            </button>
            <p className="text-center text-xs text-white/30">
              Card required. No charge for 7 days. Cancel anytime.
            </p>
          </div>

          {error && <p className="rounded-sm bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>}
        </div>

        <p className="text-center text-xs leading-relaxed text-white/20">
          Prices in AUD. GST included. Billed monthly. Subscription via Stripe — secure payment.
          <br />
          <Link href="/pricing" className="underline hover:text-white/40">
            Compare all plans
          </Link>
        </p>
      </div>
    </main>
  );
}
