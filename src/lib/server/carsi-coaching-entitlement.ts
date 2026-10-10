import {
  CHECKOUT_RESERVATION_STATUS,
  decideMembershipEntitlement,
  type MembershipSubscriptionInput,
} from '@/lib/server/entitlements';

/** Active coaching subscribers may use the Business Coaching Portal. */
export function decideCoachingPortalEntitlement(
  sub: MembershipSubscriptionInput | null,
  now: Date = new Date()
): { entitled: boolean; reason: string } {
  const decision = decideMembershipEntitlement(sub, now);
  if (decision.entitled) {
    return { entitled: true, reason: decision.reason };
  }

  // Paid-through access: canceled at period end but still inside the billing window.
  if (sub?.status && sub.currentPeriodEnd) {
    const status = sub.status.toLowerCase().trim();
    if (status !== CHECKOUT_RESERVATION_STATUS) {
      const end = sub.currentPeriodEnd.getTime();
      if (!Number.isNaN(end) && end > now.getTime()) {
        if (status === 'canceled' || status === 'cancelled') {
          return { entitled: true, reason: 'active' };
        }
      }
    }
  }

  return { entitled: false, reason: decision.reason };
}
