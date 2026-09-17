/**
 * WS1-E1 ships DARK. The entire individual-membership feature (purchasing,
 * status surfaces, and the `/pricing` re-enable) is gated behind a single env
 * flag so it can be shipped to production without changing any user-visible
 * behaviour until the founder flips it on.
 *
 * Default (flag absent/off) = the current WS0 "coming soon" behaviour, exactly.
 * Rollback = set the flag off.
 *
 * The entitlement GATE (server-side access checks) is intentionally NOT gated by
 * this flag: when the flag is off nobody can subscribe, so `getEntitlements`
 * simply returns "not entitled" and gating is a no-op. Gating the gate itself
 * would be a fail-open footgun.
 */

function envTrue(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** True when the individual annual membership feature is live. */
export function subscriptionsEnabled(): boolean {
  return envTrue(process.env.SUBSCRIPTIONS_ENABLED);
}

/**
 * True when Teams seat plans AND the organisation monthly plan are live.
 *
 * Needs BOTH `SUBSCRIPTIONS_ENABLED` and `TEAMS_SUBSCRIPTIONS_ENABLED`. The
 * yearly membership can therefore go on sale by itself, while Teams and org
 * stay "coming soon" until their own switch is flipped. Turning off
 * `SUBSCRIPTIONS_ENABLED` still turns everything off. Every Teams and org
 * surface (checkout, enrol, seat expansion, status, invite accept, the
 * onboarding org path and the Teams cards on /pricing) reads this, never
 * `subscriptionsEnabled()` alone.
 */
export function teamSubscriptionsEnabled(): boolean {
  return subscriptionsEnabled() && envTrue(process.env.TEAMS_SUBSCRIPTIONS_ENABLED);
}
