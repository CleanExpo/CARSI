/**
 * Owner Circle / business coaching checkout — feature flag.
 * Default ON so small-business sessions are bookable once Stripe is configured.
 * Set `BUSINESS_COACHING_ENABLED=false` to hide APIs and return visitors to support.
 */
export function isBusinessCoachingEnabled(): boolean {
  const raw = process.env.BUSINESS_COACHING_ENABLED;
  if (raw == null) return true;
  const value = raw.trim().toLowerCase();
  if (value === 'false' || value === '0' || value === 'no' || value === 'off') return false;
  return true;
}
