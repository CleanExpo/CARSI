import type { CheckoutCourse } from '@/lib/course-list-item';
import { getStripeClient } from '@/lib/api/stripe';
import { verifySessionToken } from '@/lib/auth/session-jwt';

/**
 * Resolve payer email: local HS256 session cookie, backend /me when upstream + Bearer cookie,
 * or explicit `customer_email` from the client (e.g. right after register).
 */
export async function resolveCheckoutEmail(params: {
  authTokenCookie: string | undefined;
  authorizationHeader: string | undefined;
  bodyEmail: string | undefined;
}): Promise<string | null> {
  const { authTokenCookie, authorizationHeader, bodyEmail } = params;

  if (authTokenCookie) {
    const claims = await verifySessionToken(authTokenCookie);
    if (claims?.email) return claims.email;
  }

  const trimmed = bodyEmail?.trim();
  if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return trimmed;

  const bearer = authorizationHeader?.startsWith('Bearer ') ? authorizationHeader.slice(7) : null;
  if (bearer) {
    const c = await verifySessionToken(bearer);
    if (c?.email) return c.email;
  }

  return null;
}

export async function createStripeCheckoutForCourse(params: {
  slug: string;
  course: CheckoutCourse;
  success_url: string;
  cancel_url: string;
  customer_email: string;
  /** When set, Stripe webhook can complete enrolment without relying on the client callback alone. */
  student_id?: string;
  /** Override line item amount in cents (e.g. after admin discount). */
  unit_amount_cents?: number;
  /** Optional Stripe metadata (e.g. discount_id). */
  extra_metadata?: Record<string, string>;
  guest_checkout?: boolean;
  /** Seats for team purchase (line item quantity). */
  quantity?: number;
  purchase_mode?: 'self' | 'team';
  team_seat_count?: number;
  attribution_journey_id?: string;
}): Promise<{ checkout_url: string; checkout_session_id: string }> {
  const {
    slug,
    course,
    success_url,
    cancel_url,
    customer_email,
    student_id,
    unit_amount_cents,
    extra_metadata,
    guest_checkout,
    quantity = 1,
    purchase_mode = 'self',
    team_seat_count,
    attribution_journey_id,
  } = params;

  const priceNum = Number(course.price_aud);
  const unitAmount =
    unit_amount_cents != null && Number.isFinite(unit_amount_cents)
      ? Math.round(unit_amount_cents)
      : Math.round(priceNum * 100);
  if (!Number.isFinite(unitAmount) || unitAmount < 50) {
    throw new Error('INVALID_AMOUNT');
  }

  const seatQty = Math.max(1, Math.min(100, Math.floor(quantity)));
  const isTeam = purchase_mode === 'team' && seatQty > 1;
  const teamSeats = isTeam ? (team_seat_count ?? seatQty) : undefined;

  const stripe = getStripeClient();

  const productName = isTeam
    ? `${course.title || slug} — team (${seatQty} seats)`
    : course.title || slug;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email,
    success_url,
    cancel_url,
    metadata: {
      course_slug: slug,
      source: 'carsi-next-local-checkout',
      purchase_mode: isTeam ? 'team' : 'self',
      ...(teamSeats != null ? { team_seat_count: String(teamSeats) } : {}),
      ...(student_id ? { student_id } : {}),
      ...(guest_checkout ? { guest_checkout: 'true' } : {}),
      ...(attribution_journey_id ? { attribution_journey_id } : {}),
      ...(extra_metadata ?? {}),
    },
    line_items: [
      {
        quantity: seatQty,
        price_data: {
          currency: 'aud',
          unit_amount: unitAmount,
          product_data: {
            name: productName,
            description: isTeam
              ? `${seatQty} learner seats for this course`
              : course.short_description?.slice(0, 500) || undefined,
          },
        },
      },
    ],
  });

  const url = session.url;
  if (!url) throw new Error('NO_CHECKOUT_URL');
  return { checkout_url: url, checkout_session_id: session.id };
}
