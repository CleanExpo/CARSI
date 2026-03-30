import { getStripeClient } from '@/lib/api/stripe';
import { loadWpExportCourses, type WpExportCourse } from '@/lib/wordpress-export-courses';
import { verifySessionToken } from '@/lib/auth/session-jwt';

export function findCourseInExport(slug: string): WpExportCourse | null {
  const rows = loadWpExportCourses();
  if (!rows?.length) return null;
  const target = slug.trim().toLowerCase();
  return rows.find((c) => (c.slug ?? '').trim().toLowerCase() === target) ?? null;
}

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
  course: WpExportCourse;
  success_url: string;
  cancel_url: string;
  customer_email: string;
  /** When set, Stripe webhook can complete enrolment without relying on the client callback alone. */
  student_id?: string;
}): Promise<{ checkout_url: string }> {
  const { slug, course, success_url, cancel_url, customer_email, student_id } = params;

  const priceNum = Number(course.price_aud);
  const unitAmount = Math.round(priceNum * 100);
  if (!Number.isFinite(unitAmount) || unitAmount < 50) {
    throw new Error('INVALID_AMOUNT');
  }

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email,
    success_url,
    cancel_url,
    metadata: {
      course_slug: slug,
      source: 'carsi-next-local-checkout',
      ...(student_id ? { student_id } : {}),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'aud',
          unit_amount: unitAmount,
          product_data: {
            name: course.title || slug,
            description: course.short_description?.slice(0, 500) || undefined,
          },
        },
      },
    ],
  });

  const url = session.url;
  if (!url) throw new Error('NO_CHECKOUT_URL');
  return { checkout_url: url };
}
