import { getStripeClient } from '@/lib/api/stripe';
import {
  CoachingPriceChangedError,
  coachCharge,
  coachCheckoutLineItem,
  sameCharge,
  stripePriceMatchesCharge,
  type CoachCharge,
} from '@/lib/coaching-portal/coaches';
import { DEFAULT_COACHING_CHAPTER_SLUG } from '@/lib/coaching-portal/coach-routing';
import { getCoachForMember } from '@/lib/server/carsi-coaching-coaches';

export const CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE = 'carsi-coaching-monthly';

export type CreateCarsiCoachingMonthlyCheckoutInput = {
  userId: string;
  contactEmail: string;
  contactName?: string;
  appOrigin: string;
  successUrl: string;
  cancelUrl: string;
  /** The charge the member was shown; checkout refuses to bill anything else. */
  expectedCharge: CoachCharge;
};

export async function createCarsiCoachingMonthlyCheckoutSession(
  input: CreateCarsiCoachingMonthlyCheckoutInput
): Promise<{ checkout_url: string; checkout_session_id: string }> {
  const stripe = getStripeClient();
  // A member assigned to a partner chapter pays that chapter's price; everyone else pays the AUD default.
  const coach = await getCoachForMember(input.userId);
  const charge = coachCharge(coach);
  if (!sameCharge(charge, input.expectedCharge)) throw new CoachingPriceChangedError();

  const lineItem = coachCheckoutLineItem(coach);
  if ('price' in lineItem) {
    const price = await stripe.prices.retrieve(lineItem.price);
    if (!stripePriceMatchesCharge(price, charge)) {
      throw new Error(`coach_stripe_price_mismatch:${coach?.chapterSlug ?? DEFAULT_COACHING_CHAPTER_SLUG}`);
    }
  }

  const stripeSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: input.contactEmail,
    client_reference_id: input.userId,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: {
      source: CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE,
      carsi_user_id: input.userId,
      coach_chapter: coach?.chapterSlug ?? DEFAULT_COACHING_CHAPTER_SLUG,
      contact_name: (input.contactName ?? '').trim().slice(0, 120),
      contact_email: input.contactEmail.trim().toLowerCase().slice(0, 200),
    },
    subscription_data: {
      metadata: {
        source: CARSI_COACHING_MONTHLY_CHECKOUT_SOURCE,
        carsi_user_id: input.userId,
      },
    },
    line_items: [lineItem],
  });

  const url = stripeSession.url;
  if (!url) throw new Error('NO_CHECKOUT_URL');
  return { checkout_url: url, checkout_session_id: stripeSession.id };
}
