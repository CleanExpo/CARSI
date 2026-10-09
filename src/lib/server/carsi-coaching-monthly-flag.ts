/**
 * CARSI Business Coaching ($495/mo) — subscription checkout.
 * Default ON when Stripe is configured; set `CARSI_COACHING_MONTHLY_ENABLED=false` to hide checkout.
 */
export function isCarsiCoachingMonthlyEnabled(): boolean {
  const raw = process.env.CARSI_COACHING_MONTHLY_ENABLED;
  if (raw == null) return true;
  const value = raw.trim().toLowerCase();
  if (value === 'false' || value === '0' || value === 'no' || value === 'off') return false;
  return true;
}
