'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api/client';

type SubscribePlanId = 'foundation' | 'growth' | 'pro';

const PLAN_OPTIONS: Record<
  SubscribePlanId,
  {
    name: string;
    price: number;
    suffix: string;
    helper: string;
    checkoutPlan: string;
  }
> = {
  foundation: {
    name: 'Monthly membership',
    price: 44,
    suffix: 'AUD / month',
    helper: 'Flexible monthly access · GST included · cancel anytime',
    checkoutPlan: 'foundation',
  },
  growth: {
    name: 'Growth monthly membership',
    price: 99,
    suffix: 'AUD / month',
    helper: 'Monthly access with extra recognition tools · GST included',
    checkoutPlan: 'growth',
  },
  pro: {
    name: 'Yearly membership',
    price: 795,
    suffix: 'AUD / year',
    helper: 'That is about $66/month · GST included',
    checkoutPlan: 'pro',
  },
};

const PRO_FEATURES = [
  '100% access to all published CARSI courses',
  'Beginner, intermediate, and advanced levels',
  'IICRC CEC accredited courses where stated',
  'CEC tracking for completed eligible courses',
  'Water Restoration Technician (WRT) courses',
  'Carpet Cleaning Technician (CCT) courses',
  'Odour Control Technician (OCT) courses',
  'Applied Structural Drying (ASD) courses',
  'Carpet Repair & Reinstallation (CRT) courses',
  'PDF certificates for every course',
  'IICRC CEC tracking dashboard',
  'Monthly activity recognition (anonymous by default) & streak tracker',
  'Priority email support',
];

export default function SubscribePage() {
  const { user } = useAuth();
  const [selectedPlanId, setSelectedPlanId] = useState<SubscribePlanId>('pro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedPlan = PLAN_OPTIONS[selectedPlanId];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    if (plan === 'foundation' || plan === 'growth') {
      setSelectedPlanId(plan);
    }
  }, []);

  async function handleSubscribe() {
    if (!user) {
      window.location.href = '/login?next=/subscribe';
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<{ url: string }>('/api/lms/subscription/checkout', {
        plan: selectedPlan.checkoutPlan,
        success_url: `${window.location.origin}/subscribe/success`,
        cancel_url: `${window.location.origin}/subscribe`,
      });
      if (!data.url?.trim()) {
        setError(
          'Subscription billing checkout is not available in this deployment. Stripe subscription routes are not wired yet.'
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f6f8fb] px-4 py-16 text-slate-900">
      <div className="flex w-full max-w-lg flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block rounded-full border border-[#b8dbfb] bg-white px-3 py-1 text-xs font-semibold text-[#146fc2] shadow-sm">
            7-day free trial
          </span>
          <h1 className="mt-4 text-3xl font-bold text-slate-950">{selectedPlan.name}</h1>
          <p className="mt-2 text-slate-600">
            Monthly or yearly membership unlocks 100% access to all published courses.
          </p>
        </div>

        {/* Pricing card */}
        <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-slate-950">${selectedPlan.price}</span>
              <span className="text-slate-500">{selectedPlan.suffix}</span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{selectedPlan.helper}</p>
            <p className="mt-3 rounded-lg border border-[#f2cf8f] bg-[#fff8ed] px-3 py-2 text-sm font-medium text-[#7a3500]">
              Membership is best for clients planning multiple courses, refreshing knowledge across
              levels, or maintaining CECs over time.
            </p>
          </div>

          <ul className="flex flex-col gap-3 text-sm text-slate-700">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0 text-[#146fc2]">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full rounded-lg bg-[#0f5fa8] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Opening checkout…' : 'Start 7-Day Free Trial'}
            </button>
            <p className="text-center text-xs text-slate-500">
              Card required. No charge for 7 days. Cancel anytime.
            </p>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        {/* Value proposition */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-center text-sm text-slate-600">
            <span className="font-semibold text-slate-900">Compare:</span> Individual courses are
            useful for one-off needs. Membership is designed for clients who want multiple courses
            and full catalogue flexibility.
          </p>
        </div>

        {/* Legal links */}
        <p className="text-center text-xs leading-relaxed text-slate-500">
          By subscribing, you agree to our{' '}
          <Link href="/terms" className="font-medium text-[#146fc2] underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="font-medium text-[#146fc2] underline">
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
