import { randomBytes } from 'crypto';

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

export async function createTeamForOwner(params: {
  ownerId: string;
  name: string;
  bundleTier: TeamBundleTierId;
}): Promise<{ id: string; slug: string }> {
  const slug = await createUniqueTeamSlug(params.name);
  const seatLimit = teamSeatLimitForTier(params.bundleTier);

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
