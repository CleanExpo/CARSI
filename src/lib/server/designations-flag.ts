/**
 * The CARSI designation experience ships DARK. The `/designations` surface, its
 * nav link and the pathway UI are gated behind a single env flag so the whole
 * feature can ship to production with no user-visible change until the founder
 * flips it on.
 *
 * Default (flag absent/off) = the feature is invisible (routes 404, nav link
 * hidden). Rollback = set the flag off. Mirrors `subscriptionsEnabled()`.
 */

function envTrue(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** True when the CARSI Southern Hemisphere designation experience is live. */
export function designationsEnabled(): boolean {
  return envTrue(process.env.DESIGNATIONS_ENABLED);
}
