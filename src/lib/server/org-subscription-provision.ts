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

import { prisma } from '@/lib/prisma';
import { ONBOARDING_BRAND } from '@/lib/onboarding/enterprise';
import { createTeamForOwner, getTeamForUser } from '@/lib/server/teams';

const ORG_CONTAINER_TIER = 'org_subscription';

export interface OrgProvisionResult {
  teamId: string;
  created: boolean;
}

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
}): Promise<OrgProvisionResult> {
  const existing = await getTeamForUser(params.ownerId);
  let teamId: string;
  let created = false;

  if (existing) {
    if (existing.ownerId !== params.ownerId) {
      throw new Error('ALREADY_ON_TEAM');
    }
    teamId = existing.id;
  } else {
    const team = await createTeamForOwner({
      ownerId: params.ownerId,
      name: params.organisationName.slice(0, 80) || 'My organisation',
      bundleTier: ORG_CONTAINER_TIER,
    });
    teamId = team.id;
    created = true;
  }

  // Seed the org subscription row in `incomplete` so the entitlement gate denies
  // until Stripe confirms `active`. Idempotent on teamId. Never grants on the
  // pre-payment `incomplete` status (decideMembershipEntitlement fails closed).
  await prisma.lmsOrgSubscription.upsert({
    where: { teamId },
    create: {
      teamId,
      organisationName: params.organisationName.slice(0, 255),
      contactEmail: params.contactEmail.trim().toLowerCase(),
      status: 'incomplete',
      seatModel: 'unlimited',
      entitledCategory: params.entitledCategory ?? ONBOARDING_BRAND,
      stripeSubscriptionId: null,
    },
    update: {
      organisationName: params.organisationName.slice(0, 255),
      contactEmail: params.contactEmail.trim().toLowerCase(),
      ...(params.entitledCategory ? { entitledCategory: params.entitledCategory } : {}),
    },
  });

  return { teamId, created };
}
