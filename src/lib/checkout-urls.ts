/**
 * Build same-origin URLs for Stripe Checkout return navigation.
 * Post-purchase `next` targets first lesson when possible (Phase 1).
 */
export function buildCourseCheckoutUrls(
  origin: string,
  slug: string,
  learnNextPath?: string | null,
) {
  const base = origin.replace(/\/$/, '');
  const encodedSlug = encodeURIComponent(slug);
  const nextPath = learnNextPath?.startsWith('/') ? learnNextPath : '/dashboard/student';
  const next = encodeURIComponent(nextPath);
  return {
    success_url: `${base}/courses/${encodedSlug}/payment-success?session_id={CHECKOUT_SESSION_ID}&next=${next}`,
    cancel_url: `${base}/courses/${encodedSlug}`,
    learn_next_path: nextPath,
  };
}
