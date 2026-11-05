/** Parse `{ detail?: string }` from marketing-pack API responses for member UI. */
export function marketingPackErrorFromResponse(
  status: number,
  body: { detail?: string } | null | undefined
): string {
  const detail = typeof body?.detail === 'string' ? body.detail.trim() : '';
  if (detail) return detail;
  if (status === 401) return 'Sign in to view your marketing pack.';
  if (status === 429) return 'Your pack was built recently. Wait a few minutes and try again.';
  if (status === 400) return 'Complete your business profile before building a pack.';
  if (status === 404) return 'No marketing pack found yet.';
  return 'Something went wrong. Please try again shortly.';
}
