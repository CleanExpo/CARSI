/**
 * Build same-origin URLs for Stripe Checkout return navigation.
 */
export function buildCourseCheckoutUrls(origin: string, slug: string) {
  const base = origin.replace(/\/$/, '');
  const encodedSlug = encodeURIComponent(slug);
  const next = encodeURIComponent('/dashboard/student');
  return {
    success_url: `${base}/courses/${encodedSlug}/payment-success?session_id={CHECKOUT_SESSION_ID}&next=${next}`,
    cancel_url: `${base}/courses/${encodedSlug}`,
  };
}
