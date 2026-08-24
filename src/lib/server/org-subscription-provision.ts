/**
 * Provisioning for the organisation monthly subscription (WS1-E3, GP-443).
 *
 * An org subscription reuses `LmsTeam` as the organisation container (members
 * link via `LmsTeamMember`). This helper creates (or reuses) that container for
 * an owner and seeds the `LmsOrgSubscription` row in an `incomplete` state so
 * the Stripe subscription created at checkout can carry `carsi_team_id` and the
 * webhook can refresh status/period authoritatively.
 *
 * `seatModel` is always 'unlimited' for this plan — any number of the org's
 * members may enrol in the entitled course category while the subscription is
 * active.
 */

import { ONBOARDING_BRAND } from '@/lib/onboarding/enterprise';
import { ensureContainerTeamForOwner, getTeamForUser } from '@/lib/server/teams';
import { reserveOrgCheckout } from '@/lib/server/membership-checkout-reservation';

const ORG_CONTAINER_TIER = 'org_subscription';

export interface OrgProvisionResult {
  teamId: string;
  created: boolean;
}

/** Thrown-equivalent signal that another org checkout already holds this team. */
export type OrgProvisionOutcome =
  | { ok: true; result: OrgProvisionResult }
  | { ok: false; reason: 'busy' | 'unavailable' };

/**
 * Ensure an org container team + a seeded org subscription row exist for the
 * owner. Idempotent: reuses the owner's existing org container/subscription when
 * present. Throws `ALREADY_ON_TEAM` if the user belongs to a non-owned team
 * (they cannot start an org subscription from someone else's team).
 */
export async function provisionOrgSubscriptionContainer(params: {
  ownerId: string;
  organisationName: string;
  contactEmail: string;
  entitledCategory?: string;
}): Promise<OrgProvisionOutcome> {
  const existing = await getTeamForUser(params.ownerId);
  let teamId: string;
  let created = false;

  if (existing) {
    if (existing.ownerId !== params.ownerId) {
      throw new Error('ALREADY_ON_TEAM');
    }
    teamId = existing.id;
  } else {
    // Atomic find-or-create — `LmsTeam.slug` is unique and derived from the
    // owner, so two concurrent org checkouts converge on ONE container.
    const container = await ensureContainerTeamForOwner({
      ownerId: params.ownerId,
      name: params.organisationName.slice(0, 80) || 'My organisation',
      tier: ORG_CONTAINER_TIER,
    });
    teamId = container.id;
    created = container.created;
  }

  // Claim the checkout. This replaces a plain upsert: the upsert was idempotent
  // on teamId but happily let a SECOND concurrent request carry on to open its
  // own Stripe session for the same team. The reservation seeds the same
  // pre-payment row (entitlement fails closed on it, exactly as `incomplete`
  // did) while also refusing a second live checkout.
  const reservation = await reserveOrgCheckout({
    teamId,
    organisationName: params.organisationName,
    contactEmail: params.contactEmail,
    entitledCategory: params.entitledCategory ?? ONBOARDING_BRAND,
  });
  if (reservation !== 'reserved') {
    return { ok: false, reason: reservation === 'busy' ? 'busy' : 'unavailable' };
  }

  return { ok: true, result: { teamId, created } };
}
