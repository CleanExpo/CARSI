'use client';

import Link from 'next/link';
import { useState } from 'react';

import { apiClient, ApiClientError } from '@/lib/api/client';
import type { MembershipDecisionReason } from '@/lib/server/entitlements';

interface CheckoutResponse {
  url?: string;
  checkout_url?: string;
}

/**
 * Membership CTA. When the feature flag is off it renders the exact WS0
 * "coming soon" affordance. When on, it reflects the learner's real status and
 * starts a `mode: 'subscription'` Stripe Checkout for those who need to
 * subscribe or renew. There is one price: A$795/yr. The `?offer=ccw-attendee`
 * A$295 attendee special was removed by the founder on 2026-08-25 (its Stripe
 * coupon was never created, so it had only ever failed closed).
 */
export function SubscribeCta({
  enabled,
  reason,
}: {
  enabled: boolean;
  reason: MembershipDecisionReason | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return (
      <>
        <span
          aria-disabled="true"
          className="flex w-full cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-500"
        >
          Coming soon
        </span>
        <p className="text-center text-xs text-slate-600">
          Yearly membership checkout is not available yet. Buy any course individually below in the
          meantime.
        </p>
      </>
    );
  }

  if (reason === 'active' || reason === 'grace') {
    return <ActiveMembershipActions />;
  }

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.post<CheckoutResponse>(
        '/api/lms/subscription/checkout',
        {}
      );
      const url = data.url ?? data.checkout_url;
      if (url) {
        window.location.href = url;
        return;
      }
      setError('Membership checkout is not available yet. Please try again later.');
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent('/subscribe')}`;
        return;
      }
      const msg =
        err instanceof ApiClientError && err.message
          ? err.message
          : 'Membership purchasing is not yet available.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const label = reason === 'lapsed' ? 'Renew membership' : 'Start membership';
  const priceLabel = '$795 / year';

  return (
    <>
      <button
        type="button"
        onClick={startCheckout}
        disabled={loading}
        className="flex w-full items-center justify-center rounded-lg bg-[#0f5fa8] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? 'Starting…' : `${label} — ${priceLabel}`}
      </button>
      {error ? <p className="text-center text-sm text-red-600">{error}</p> : null}
      <p className="text-center text-xs text-slate-600">
        Secure checkout via Stripe. GST included.
      </p>
    </>
  );
}

function ActiveMembershipActions() {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  async function openPortal() {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const data = await apiClient.post<{ url?: string }>('/api/lms/subscription/portal', {
        return_url: `${window.location.origin}/subscribe`,
      });
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setPortalError('Billing portal is not available yet.');
    } catch (err) {
      setPortalError(
        err instanceof ApiClientError ? err.message : 'Could not open billing portal.'
      );
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <>
      <Link
        href="/dashboard/courses"
        className="flex w-full items-center justify-center rounded-lg bg-[#1b7f48] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Browse your included courses
      </Link>
      <button
        type="button"
        onClick={openPortal}
        disabled={portalLoading}
        className="text-center text-sm text-[#146fc2] underline hover:text-[#0f5fa8] disabled:opacity-60"
      >
        {portalLoading ? 'Opening billing portal…' : 'Manage billing & payment method'}
      </button>
      {portalError ? <p className="text-center text-sm text-red-600">{portalError}</p> : null}
    </>
  );
}
