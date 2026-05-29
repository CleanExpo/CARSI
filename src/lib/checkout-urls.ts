/**
 * Build same-origin URLs for Stripe Checkout return navigation.
 * Post-purchase `next` targets first lesson when possible (Phase 1).
 */
export function buildCourseCheckoutUrls(
  origin: string,
  slug: string,
  learnNextPath?: string | null,
  options?: { teamSeats?: number },
) {
  const base = origin.replace(/\/$/, '');
  const encodedSlug = encodeURIComponent(slug);
  const nextPath = learnNextPath?.startsWith('/') ? learnNextPath : '/dashboard/student';
  const next = encodeURIComponent(nextPath);

  if (options?.teamSeats && options.teamSeats >= 2) {
    const seats = encodeURIComponent(String(options.teamSeats));
    const course = encodeURIComponent(slug);
    return {
      success_url: `${base}/dashboard/team?session_id={CHECKOUT_SESSION_ID}&from_purchase=1&course=${course}&seats=${seats}`,
      cancel_url: `${base}/courses/${encodedSlug}`,
      learn_next_path: `/dashboard/team?from_purchase=1&course=${course}&seats=${seats}`,
    };
  }

  return {
    success_url: `${base}/courses/${encodedSlug}/payment-success?session_id={CHECKOUT_SESSION_ID}&next=${next}`,
    cancel_url: `${base}/courses/${encodedSlug}`,
    learn_next_path: nextPath,
  };
}
