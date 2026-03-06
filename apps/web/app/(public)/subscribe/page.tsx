'use client';

import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

async function startCheckout(userId: string): Promise<string> {
  const resp = await fetch(`${API}/api/lms/subscription/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body: JSON.stringify({
      success_url: `${window.location.origin}/subscribe/success`,
      cancel_url: `${window.location.origin}/subscribe`,
    }),
  });
  if (!resp.ok) throw new Error('Failed to create checkout session');
  const data = await resp.json();
  return data.url;
}

export default function SubscribePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const userId = localStorage.getItem('carsi_user_id') ?? '';
      const url = await startCheckout(userId);
      window.location.href = url;
    } catch {
      setError('Could not start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 py-16 text-white">
      <div className="flex w-full max-w-lg flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <h1 className="font-mono text-3xl font-bold text-white">CARSI Professional</h1>
          <p className="text-sm leading-relaxed text-white/60">
            Unlimited access to all CARSI courses. One subscription — every restoration discipline.
            Required for NRPG membership.
          </p>
        </div>

        {/* Pricing card */}
        <div className="flex flex-col gap-6 rounded-sm border border-white/[0.08] bg-zinc-900/50 p-8">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-5xl font-bold text-white">$795</span>
            <span className="font-mono text-white/40">AUD / year</span>
          </div>

          <ul className="flex flex-col gap-3 text-sm text-white/70">
            {[
              'All published CARSI courses — unlimited access',
              'IICRC CEC tracking dashboard',
              'Professional Identity Hub',
              'Monthly XP leaderboard',
              'NRPG membership prerequisite',
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-400">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full rounded-sm bg-cyan-600 py-3 font-mono text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
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
          Prices in AUD. GST included. Billed annually. Subscription via Stripe — secure payment.
        </p>
      </div>
    </main>
  );
}
