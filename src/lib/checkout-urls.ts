/**
 * Build same-origin URLs for Stripe Checkout return navigation.
 */
export function buildCourseCheckoutUrls(origin: string, slug: string) {
  const base = origin.replace(/\/$/, '');
  const encodedSlug = encodeURIComponent(slug);
  return {
    success_url: `${base}/courses/${encodedSlug}/payment-success?next=${encodeURIComponent('/student')}`,
    cancel_url: `${base}/courses/${encodedSlug}`,
  };
}
