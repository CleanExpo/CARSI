import { getStripeClient } from '@/lib/api/stripe';

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
  /**
   * GP-773: the Stripe Price id from resolveOrgAnnualPriceId, which has already checked it is
   * the business owner plan (A$1,295 AUD, yearly, per unit). Required: this checkout never
   * builds an inline price, so nothing can sell the plan at an amount or interval Stripe was
   * not set up with.
   */
  priceId: string;
}): Promise<{ checkout_url: string }> {
  if (!params.priceId?.trim()) throw new Error('NO_VERIFIED_PRICE');

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
    line_items: [{ price: params.priceId, quantity: 1 }],
  });

  const url = session.url;
  if (!url) throw new Error('NO_CHECKOUT_URL');
  return { checkout_url: url };
}
