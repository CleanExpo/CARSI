/**
 * GP-630 "Ask my coach" assistant. OFF unless `CARSI_COACHING_ASSISTANT_ENABLED` is exactly
 * "true", so production stays off until the owner turns it on.
 */
export function isCarsiCoachingAssistantEnabled(): boolean {
  return process.env.CARSI_COACHING_ASSISTANT_ENABLED === 'true';
}
