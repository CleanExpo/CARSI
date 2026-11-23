import { getStripeClient } from '@/lib/api/stripe';
import { BUSINESS_OWNER_PLAN } from '@/lib/lms/membership-prices';
import { formatOnboardingPrice, parseOnboardingMeta } from '@/lib/onboarding/enterprise';

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
  // GP-773: the business owner plan, A$1,295 per YEAR, from the one price source. Course meta
  // (amount, monthly cycle) is not read: the catalogue record is stale and must not set the bill.
  const unitAmount = BUSINESS_OWNER_PLAN.amountCents;
  const priceLabel = formatOnboardingPrice(meta?.pricing ?? { seats: 'unlimited' });

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
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
          currency: BUSINESS_OWNER_PLAN.currency,
          unit_amount: unitAmount,
          recurring: { interval: BUSINESS_OWNER_PLAN.interval },
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
