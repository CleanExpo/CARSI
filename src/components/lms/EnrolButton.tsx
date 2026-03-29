'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/auth-provider';
import { apiClient } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/client';
import { buildCourseCheckoutUrls } from '@/lib/checkout-urls';

interface EnrolButtonProps {
  slug: string;
  priceAud?: number;
  isFree?: boolean;
}

type SubState = 'checking' | 'subscribed' | 'none';

interface SubStatusResponse {
  has_subscription: boolean;
  status: string | null;
}

interface CheckoutResponse {
  enrolled?: boolean;
  checkout_url?: string;
}

export function EnrolButton({ slug, priceAud = 0, isFree = false }: EnrolButtonProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subState, setSubState] = useState<SubState>('checking');

  useEffect(() => {
    if (!user) {
      setSubState('none');
      return;
    }
    apiClient
      .get<SubStatusResponse>('/api/lms/subscription/status')
      .then((data) => {
        const active = data.has_subscription && ['active', 'trialling'].includes(data.status ?? '');
        setSubState(active ? 'subscribed' : 'none');
      })
      .catch(() => setSubState('none'));
  }, [user]);

  const isPaid = !isFree && priceAud > 0;

  function getLabel() {
    if (loading) return 'Processing…';
    if (subState === 'checking') return '…';
    if (subState === 'subscribed') return 'Access Course — Included in Pro';
    return isPaid ? `Enrol — $${priceAud.toFixed(0)} AUD` : 'Enrol Free';
  }

  async function handleEnrol() {
    setLoading(true);
    setError(null);

    const returnTo = pathname && pathname.startsWith('/') ? pathname : `/courses/${slug}`;

    // Re-check auth at click-time to avoid stale in-memory user state.
    const currentUser = user ?? (await authApi.getCurrentUser());
    if (!currentUser) {
      window.location.href = `/register?next=${encodeURIComponent(returnTo)}`;
      setLoading(false);
      return;
    }

    try {
      const { success_url, cancel_url } = buildCourseCheckoutUrls(window.location.origin, slug);
      const data = await apiClient.post<CheckoutResponse>('/api/lms/checkout', {
        slug,
        success_url,
        cancel_url,
        ...(currentUser.email ? { customer_email: currentUser.email } : {}),
      });

      if (data.enrolled) {
        window.location.href = '/student';
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

  return (
    <div>
      <Button
        onClick={handleEnrol}
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
