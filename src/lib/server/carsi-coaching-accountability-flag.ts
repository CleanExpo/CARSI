/**
 * GP-635 accountability on autopilot. Two switches, both OFF unless exactly "true":
 * - `CARSI_COACHING_ACCOUNTABILITY_ENABLED`: the portal check-in, progress view and the
 *   coach's accountability view. Off means the routes answer 404 and nothing renders.
 * - `CARSI_COACHING_ACCOUNTABILITY_EMAILS_ENABLED`: lets the scheduled run actually send
 *   nudges and coach alerts. It has no effect unless the feature flag is also on; with it
 *   off the scheduled run is a dry run that sends nothing and records nothing.
 */
export function isCarsiCoachingAccountabilityEnabled(): boolean {
  return process.env.CARSI_COACHING_ACCOUNTABILITY_ENABLED === 'true';
}

export function isCarsiCoachingAccountabilityEmailEnabled(): boolean {
  return (
    isCarsiCoachingAccountabilityEnabled() &&
    process.env.CARSI_COACHING_ACCOUNTABILITY_EMAILS_ENABLED === 'true'
  );
}
