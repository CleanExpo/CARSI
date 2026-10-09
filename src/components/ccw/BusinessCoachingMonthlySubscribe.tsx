'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { apiClient, ApiClientError } from '@/lib/api/client';
import {
  carsiCoachingMonthlyPath,
  carsiCoachingMonthlyPriceLabel,
} from '@/lib/marketing/carsi-coaching-monthly';

type CheckoutResponse = { url?: string; checkout_url?: string };

export function BusinessCoachingMonthlySubscribe({
  checkoutEnabled,
  className,
}: {
  checkoutEnabled: boolean;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<CheckoutResponse>('/api/coaching/monthly/checkout', {
        cancel_url: `${window.location.origin}${carsiCoachingMonthlyPath}?checkout=cancelled`,
      });
      const url = data.url ?? data.checkout_url;
      if (url) {
        window.location.href = url;
        return;
      }
      setError('Checkout is not available yet. Email support@carsi.com.au.');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(carsiCoachingMonthlyPath)}`;
        return;
      }
      const msg =
        err instanceof ApiClientError && err.message
          ? err.message
          : 'Checkout is not available yet. Email support@carsi.com.au.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!checkoutEnabled) {
    return (
      <div className={className}>
        <Button type="button" size="lg" className="w-full rounded-xl" variant="secondary" disabled>
          Checkout opening soon
        </Button>
        <p className="mt-3 text-center text-xs text-slate-500">
          Email{' '}
          <a href="mailto:support@carsi.com.au" className="text-[#146fc2] hover:underline">
            support@carsi.com.au
          </a>{' '}
          to join the next intake.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        type="button"
        size="lg"
        variant="gradient"
        className="w-full rounded-xl text-base font-semibold shadow-lg"
        disabled={loading}
        onClick={() => void startCheckout()}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting secure checkout…
          </>
        ) : (
          `Start coaching — ${carsiCoachingMonthlyPriceLabel}`
        )}
      </Button>
      {error ? <p className="mt-3 text-center text-sm text-red-600">{error}</p> : null}
      <p className="mt-3 text-center text-xs text-slate-500">
        Secure subscription via Stripe. GST included. Cancel anytime from billing.
      </p>
    </div>
  );
}
