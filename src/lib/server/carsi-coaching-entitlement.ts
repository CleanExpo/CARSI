import {
  decideMembershipEntitlement,
  type MembershipSubscriptionInput,
} from '@/lib/server/entitlements';

/** Active coaching subscribers may use the Business Coaching Portal. */
export function decideCoachingPortalEntitlement(
  sub: MembershipSubscriptionInput | null,
  now: Date = new Date(),
): { entitled: boolean; reason: string } {
  const decision = decideMembershipEntitlement(sub, now);
  return { entitled: decision.entitled, reason: decision.reason };
}
