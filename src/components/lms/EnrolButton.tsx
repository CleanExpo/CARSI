'use client';

import { useAuth } from '@/components/auth/auth-provider';
import { CoursePurchaseOptions } from '@/components/lms/CoursePurchaseOptions';
import { GuestEnrolForm } from '@/components/lms/GuestEnrolForm';
import { Button } from '@/components/ui/button';
import { authApi } from '@/lib/api/auth';
import { apiClient, ApiClientError } from '@/lib/api/client';
import { buildCourseCheckoutUrls } from '@/lib/checkout-urls';
import {
  MIN_TEAM_SEATS,
  type CoursePurchaseMode,
  validateTeamSeatCount,
} from '@/lib/checkout-purchase-mode';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface EnrolButtonProps {
  slug: string;
  priceAud?: number;
  isFree?: boolean;
}

type PricingApi = {
  payableAud: number;
  listPriceAud: number;
  hasDiscount?: boolean;
  isFree?: boolean;
};

type SubState = 'checking' | 'subscribed' | 'none';

interface SubStatusResponse {
  has_subscription: boolean;
  status: string | null;
}

interface CheckoutResponse {
  enrolled?: boolean;
  checkout_url?: string;
}

interface ConfirmResponse {
  learn_url?: string;
  team_purchase?: boolean;
}

export function EnrolButton({ slug, priceAud = 0, isFree = false }: EnrolButtonProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subState, setSubState] = useState<SubState>('checking');
  const [pricing, setPricing] = useState<PricingApi | null>(null);
  const [mode, setMode] = useState<'guest' | 'member'>('guest');
  const [purchaseMode, setPurchaseMode] = useState<CoursePurchaseMode>('self');
  const [teamSeats, setTeamSeats] = useState(MIN_TEAM_SEATS);

  useEffect(() => {
    if (!user) {
      setSubState('none');
      setMode('guest');
      return;
    }
    setMode('member');
    apiClient
      .get<SubStatusResponse>('/api/lms/subscription/status')
      .then((data) => {
        // Server is the source of truth for entitlement (active or in grace);
        // has_subscription is already the fail-closed decision.
        setSubState(data.has_subscription ? 'subscribed' : 'none');
      })
      .catch(() => setSubState('none'));
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      setPricing(null);
      return;
    }
    let cancelled = false;
    apiClient
      .get<PricingApi>(`/api/lms/courses/${encodeURIComponent(slug)}/pricing`)
      .then((data) => {
        if (!cancelled) setPricing(data);
      })
      .catch(() => {
        if (!cancelled) setPricing(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, slug]);

  const effectivePrice = pricing?.payableAud ?? priceAud;
  const effectiveFree = pricing != null ? Boolean(pricing.isFree) : isFree;
  const showDiscountHint = Boolean(pricing?.hasDiscount && !pricing.isFree);
  const isPaid = !effectiveFree && effectivePrice > 0;

  function getLabel() {
    if (loading) return 'Processing…';
    if (subState === 'checking') return '…';
    if (subState === 'subscribed') return 'Access Course — Included in Pro';
    if (showDiscountHint && pricing) {
      return isPaid
        ? `Enrol — $${effectivePrice.toFixed(0)} AUD (was $${pricing.listPriceAud.toFixed(0)})`
        : 'Enrol Free';
    }
    if (purchaseMode === 'team' && isPaid) {
      const total = effectivePrice * teamSeats;
      return `Enrol team — $${total.toFixed(0)} AUD (${teamSeats} seats)`;
    }
    return isPaid ? `Enrol — $${effectivePrice.toFixed(0)} AUD` : 'Enrol Free';
  }

  async function handleMemberEnrol() {
    setLoading(true);
    setError(null);

    const returnTo = pathname && pathname.startsWith('/') ? pathname : `/courses/${slug}`;

    const currentUser = user ?? (await authApi.getCurrentUser());
    if (!currentUser) {
      window.location.href = `/login?next=${encodeURIComponent(returnTo)}`;
      setLoading(false);
      return;
    }

    if (purchaseMode === 'team' && isPaid) {
      const seatErr = validateTeamSeatCount(teamSeats);
      if (seatErr) {
        setError(seatErr);
        setLoading(false);
        return;
      }
    }

    // Active member on a self enrolment → included in membership, no charge.
    // The server re-checks entitlement and fails closed; this is only the UX.
    if (subState === 'subscribed' && purchaseMode !== 'team') {
      try {
        const enrolled = await apiClient.post<ConfirmResponse>('/api/lms/subscription/enroll', {
          slug,
        });
        window.location.href = enrolled.learn_url ?? '/dashboard/student';
      } catch (err) {
        const msg =
          err instanceof ApiClientError ? err.message : 'Could not enrol with your membership.';
        setError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const { success_url, cancel_url } = buildCourseCheckoutUrls(
        window.location.origin,
        slug,
        undefined,
        purchaseMode === 'team' ? { teamSeats } : undefined,
      );
      const data = await apiClient.post<CheckoutResponse>('/api/lms/checkout', {
        slug,
        success_url,
        cancel_url,
        purchase_mode: purchaseMode,
        ...(purchaseMode === 'team' ? { team_seat_count: teamSeats } : {}),
        ...(currentUser.email ? { customer_email: currentUser.email } : {}),
      });

      if (data.enrolled) {
        try {
          const confirmed = await apiClient.post<ConfirmResponse>('/api/lms/enrollments/confirm', {
            slug,
          });
          window.location.href = confirmed.learn_url ?? '/dashboard/student';
        } catch (err) {
          const msg =
            err instanceof ApiClientError ? err.message : 'Could not complete free enrolment.';
          setError(msg);
          return;
        }
        return;
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 404) {
        setError('Checkout service is not configured yet. Please contact support.');
      } else if (err instanceof Error && err.message.includes('409')) {
        setError('You are already enrolled in this course.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!user || mode === 'guest') {
    return (
      <div className="space-y-3">
        {user ? (
          <button
            type="button"
            onClick={() => setMode('member')}
            className="text-xs text-[#2490ed] hover:underline"
          >
            Use my signed-in account instead
          </button>
        ) : null}
        <GuestEnrolForm
          slug={slug}
          priceAud={effectivePrice}
          isFree={effectiveFree}
          showTeamOption={isPaid}
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setMode('guest')}
        className="mb-2 text-xs text-white/45 hover:text-[#2490ed]"
      >
        Quick enrol with a different email
      </button>
      {isPaid ? (
        <div className="mb-3">
          <CoursePurchaseOptions
            mode={purchaseMode}
            onModeChange={setPurchaseMode}
            teamSeats={teamSeats}
            onTeamSeatsChange={setTeamSeats}
            unitPriceAud={effectivePrice}
            disabled={loading}
          />
        </div>
      ) : null}
      <Button
        onClick={handleMemberEnrol}
        disabled={loading || subState === 'checking'}
        className="w-full rounded-sm border border-[#ed9d24]/70 bg-[#ed9d24] font-semibold text-[#111111] shadow-[0_10px_24px_rgba(237,157,36,0.32)] transition-all hover:bg-[#f2ad4e] hover:shadow-[0_14px_28px_rgba(237,157,36,0.4)]"
        size="lg"
      >
        {getLabel()}
      </Button>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}
