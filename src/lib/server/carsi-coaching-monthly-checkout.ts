import { getStripeClient } from '@/lib/api/stripe';
import {
  carsiCoachingMonthlyPriceCents,
  carsiCoachingProductName,
} from '@/lib/marketing/carsi-coaching-monthly';

export const CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE = 'carsi-coaching-monthly';

export type CreateCarsiCoachingMonthlyCheckoutInput = {
  userId: string;
  contactEmail: string;
  contactName?: string;
  appOrigin: string;
  successUrl: string;
  cancelUrl: string;
};

export async function createCarsiCoachingMonthlyCheckoutSession(
  input: CreateCarsiCoachingMonthlyCheckoutInput
): Promise<{ checkout_url: string; checkout_session_id: string }> {
  const stripe = getStripeClient();

  const stripeSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: input.contactEmail,
    client_reference_id: input.userId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      source: CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE,
      carsi_user_id: input.userId,
      contact_name: (input.contactName ?? '').trim().slice(0, 120),
      contact_email: input.contactEmail.trim().toLowerCase().slice(0, 200),
    },
    subscription_data: {
      metadata: {
        source: CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE,
        carsi_user_id: input.userId,
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'aud',
          unit_amount: carsiCoachingMonthlyPriceCents,
          recurring: { interval: 'month' as const },
          product_data: {
            name: carsiCoachingProductName,
            description:
              'Monthly business coaching: LMS roadmap, progress tracking, and a live owner session with Phill McGurk.',
          },
        },
      },
    ],
  });

  const url = stripeSession.url;
  if (!url) throw new Error('NO_CHECKOUT_URL');
  return { checkout_url: url, checkout_session_id: stripeSession.id };
}
