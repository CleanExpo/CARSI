/**
 * GP-199 government-contractor lead magnet ships DARK. The public landing page
 * (`/resources/government-restoration-panels`) and its capture route are gated
 * behind a single env flag so the whole feature can deploy to production without
 * any user-visible change until the founder flips it on. Default (absent/off) =
 * the page 404s and the route rejects. Rollback = set the flag off.
 */

function envTrue(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** True when the GP-199 government-contractor lead magnet is live. */
export function leadMagnetEnabled(): boolean {
  return envTrue(process.env.GP199_GOV_GUIDE_ENABLED);
}
