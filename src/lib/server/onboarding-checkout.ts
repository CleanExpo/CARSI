import { getStripeClient } from '@/lib/api/stripe';
import {
  formatOnboardingPrice,
  parseOnboardingMeta,
  resolveOnboardingAmountAud,
} from '@/lib/onboarding/enterprise';

export function buildOnboardingCheckoutUrls(origin: string, slug: string) {
  const base = origin.replace(/\/$/, '');
  const encoded = encodeURIComponent(slug);
  return {
    success_url: `${base}/dashboard/onboarding/${encoded}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/dashboard/onboarding/${encoded}?checkout=cancelled`,
  };
}

export async function createOnboardingStripeCheckout(params: {
  slug: string;
  title: string;
  shortDescription?: string | null;
  meta: unknown;
  customerEmail: string;
  studentId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ checkout_url: string }> {
  const meta = parseOnboardingMeta(params.meta);
  const amountAud = resolveOnboardingAmountAud(meta);
  const unitAmount = Math.round(amountAud * 100);
  if (!Number.isFinite(unitAmount) || unitAmount < 50) {
    throw new Error('INVALID_AMOUNT');
  }

  const billingCycle = meta?.pricing?.billingCycle ?? 'monthly';
  const isMonthly = billingCycle === 'monthly';
  const priceLabel = formatOnboardingPrice(meta?.pricing ?? { amountAud, billingCycle: 'monthly', gst: 'exclusive', seats: 'unlimited' });

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: isMonthly ? 'subscription' : 'payment',
    customer_email: params.customerEmail,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      course_slug: params.slug.trim().toLowerCase(),
      student_id: params.studentId,
      source: 'carsi-onboarding-checkout',
      onboarding: 'true',
      purchase_mode: 'self',
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'aud',
          unit_amount: unitAmount,
          ...(isMonthly
            ? {
                recurring: { interval: 'month' as const },
              }
            : {}),
          product_data: {
            name: params.title,
            description:
              params.shortDescription?.slice(0, 500) ||
              `CARSI Maintenance Company Onboarding — ${priceLabel}`,
          },
        },
      },
    ],
  });

  const url = session.url;
  if (!url) throw new Error('NO_CHECKOUT_URL');
  return { checkout_url: url };
}
