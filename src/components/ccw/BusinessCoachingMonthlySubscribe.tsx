'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { apiClient, ApiClientError } from '@/lib/api/client';
import type { CoachPriceDisclosure } from '@/lib/coaching-portal/coaches';
import { carsiCoachingMonthlyPath } from '@/lib/marketing/carsi-coaching-monthly';
import { registerPathWithNext } from '@/lib/membership-signup-path';

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
  // The member's own chapter price. Checkout stays disabled until it is known, so the button
  // never shows one amount while Stripe charges another.
  const [price, setPrice] = useState<CoachPriceDisclosure | null>(null);
  const [priceFailed, setPriceFailed] = useState(false);

  useEffect(() => {
    if (!checkoutEnabled) return;
    let cancelled = false;
    apiClient
      .get<CoachPriceDisclosure>('/api/coaching/monthly/price')
      .then((data) => {
        if (!cancelled) setPrice(data);
      })
      .catch(() => {
        if (!cancelled) setPriceFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [checkoutEnabled]);

  async function startCheckout() {
    if (!price) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<CheckoutResponse>('/api/coaching/monthly/checkout', {
        cancel_url: `${window.location.origin}${carsiCoachingMonthlyPath}?checkout=cancelled`,
        expected_amount_cents: price.amountCents,
        expected_currency: price.currency,
      });
      const url = data.url ?? data.checkout_url;
      if (url) {
        window.location.href = url;
        return;
      }
      setError('Checkout is not available yet. Email support@carsi.com.au.');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        window.location.href = registerPathWithNext(carsiCoachingMonthlyPath);
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
        disabled={loading || !price}
        onClick={() => void startCheckout()}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Starting secure checkout…
          </>
        ) : price ? (
          `Start coaching — ${price.priceLabel}`
        ) : (
          'Loading price…'
        )}
      </Button>
      {error ? <p className="mt-3 text-center text-sm text-red-600">{error}</p> : null}
      {priceFailed ? (
        <p className="mt-3 text-center text-sm text-red-600">
          We could not load your price. Refresh the page or email support@carsi.com.au.
        </p>
      ) : null}
      {price ? (
        <p className="mt-3 text-center text-xs text-slate-500">{price.billingNote}</p>
      ) : null}
    </div>
  );
}
