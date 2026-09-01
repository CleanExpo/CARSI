import { createHash, randomBytes } from 'crypto';

import { prisma } from '@/lib/prisma';
import { teamSeatLimitForTier, type TeamBundleTierId } from '@/lib/lms/pricing-tiers';

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'team'
  );
}

export async function createUniqueTeamSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let n = 0;
  while (await prisma.lmsTeam.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

/**
 * Container tiers for subscription-backed teams (WS1-E2/E3). These are NOT
 * per-course pricing tiers — the authoritative seat limit lives on the seat
 * subscription (E2) or is unlimited (E3), so the team seat_limit starts at 0
 * and is set by the subscription webhook.
 */
export type TeamContainerTier = 'teams_subscription' | 'org_subscription';
export type TeamBundleTierArg = TeamBundleTierId | TeamContainerTier;

/**
 * Deterministic slug for a subscription CONTAINER team (teams / org).
 *
 * `LmsTeam.ownerId` is not unique and `LmsTeamMember` is keyed `[teamId,
 * userId]`, so nothing at the database level stops one user owning two teams —
 * the "one team per user" rule was enforced only by a read, which two concurrent
 * checkouts pass together. Deriving the slug from the owner turns
 * `LmsTeam.slug @unique` into the arbiter: the second create raises P2002
 * instead of quietly producing a second container to bill separately.
 *
 * Hashed rather than embedding the raw id, because slugs appear in URLs.
 */
export function containerTeamSlug(tier: TeamContainerTier, ownerId: string): string {
  const digest = createHash('sha256').update(`${tier}:${ownerId}`).digest('hex').slice(0, 16);
  return `${tier === 'org_subscription' ? 'org' : 'team'}-${digest}`;
}

/**
 * Find-or-create the owner's container team, atomically.
 *
 * Returns the existing team when the owner already has one (including teams
 * created before deterministic slugs, which are found by membership first), and
 * otherwise creates it. A losing racer's P2002 resolves to the winner's row, so
 * both requests end up on ONE team.
 *
 * The ownership re-check after a collision is not paranoia: a hash collision
 * between two different owners would otherwise silently drop the loser into a
 * stranger's team. On collision the caller falls back to a non-deterministic
 * slug, which costs only the race protection for that astronomically rare pair.
 */
export async function ensureContainerTeamForOwner(params: {
  ownerId: string;
  name: string;
  tier: TeamContainerTier;
}): Promise<{ id: string; created: boolean }> {
  const slug = containerTeamSlug(params.tier, params.ownerId);

  try {
    const team = await prisma.lmsTeam.create({
      data: {
        name: params.name.trim() || 'My team',
        slug,
        ownerId: params.ownerId,
        bundleTier: params.tier,
        seatLimit: 0,
        members: { create: { userId: params.ownerId, role: 'owner' } },
      },
      select: { id: true },
    });
    return { id: team.id, created: true };
  } catch (error) {
    if ((error as { code?: unknown }).code !== 'P2002') throw error;
  }

  const existing = await prisma.lmsTeam.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });

  if (existing?.ownerId === params.ownerId) {
    return { id: existing.id, created: false };
  }

  // Slug collision across different owners — fall back to the historical
  // non-deterministic path rather than joining someone else's team.
  const created = await createTeamForOwner({
    ownerId: params.ownerId,
    name: params.name,
    bundleTier: params.tier,
  });
  return { id: created.id, created: true };
}

export async function createTeamForOwner(params: {
  ownerId: string;
  name: string;
  bundleTier: TeamBundleTierArg;
}): Promise<{ id: string; slug: string }> {
  const slug = await createUniqueTeamSlug(params.name);
  // Container tiers derive their seat limit from the subscription, not the tier.
  const seatLimit =
    params.bundleTier === 'teams_subscription' || params.bundleTier === 'org_subscription'
      ? 0
      : teamSeatLimitForTier(params.bundleTier);

  const team = await prisma.lmsTeam.create({
    data: {
      name: params.name.trim(),
      slug,
      ownerId: params.ownerId,
      bundleTier: params.bundleTier,
      seatLimit,
      members: {
        create: { userId: params.ownerId, role: 'owner' },
      },
    },
    select: { id: true, slug: true },
  });

  return team;
}

export function generateInviteToken(): string {
  return randomBytes(24).toString('hex');
}

export async function countTeamSeatsUsed(teamId: string): Promise<number> {
  return prisma.lmsTeamMember.count({ where: { teamId } });
}

function teamInclude() {
  return {
    members: {
      include: {
        user: { select: { id: true, email: true, fullName: true } },
      },
    },
    invites: {
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' as const },
    },
  };
}

export async function getTeamForUser(userId: string) {
  const membership = await prisma.lmsTeamMember.findFirst({
    where: { userId },
    include: {
      team: {
        include: teamInclude(),
      },
    },
  });
  return membership?.team ?? null;
}

/** Membership row missing after checkout — attach owner to their course-purchase team. */
export async function repairAndGetTeamForUser(userId: string) {
  const direct = await getTeamForUser(userId);
  if (direct) return direct;

  const ownedCourseTeam = await prisma.lmsTeam.findFirst({
    where: { ownerId: userId, bundleTier: 'course_purchase' },
  });
  if (!ownedCourseTeam) return null;

  await prisma.lmsTeamMember.upsert({
    where: {
      teamId_userId: { teamId: ownedCourseTeam.id, userId },
    },
    create: { teamId: ownedCourseTeam.id, userId, role: 'owner' },
    update: { role: 'owner' },
  });

  return getTeamForUser(userId);
}
