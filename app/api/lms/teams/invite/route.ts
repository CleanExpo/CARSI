import { type NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { addCourseTeamMemberByEmail } from '@/lib/server/team-member-provision';
import { countTeamSeatsUsed, generateInviteToken, repairAndGetTeamForUser } from '@/lib/server/teams';

/** POST /api/lms/teams/invite — owner/admin adds a member by email with selected courses. */
export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let body: { email?: string; role?: string; course_slugs?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = body.role === 'admin' ? 'admin' : 'member';
  const courseSlugs = Array.isArray(body.course_slugs)
    ? body.course_slugs.filter((s): s is string => typeof s === 'string')
    : [];

  if (!email || !email.includes('@')) {
    return NextResponse.json({ detail: 'Valid email required' }, { status: 400 });
  }

  try {
    const team = await repairAndGetTeamForUser(claims.sub);
    if (!team) {
      return NextResponse.json({ detail: 'No team found' }, { status: 404 });
    }

    const membership = team.members.find((m) => m.userId === claims.sub);
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
    }

    if (courseSlugs.length > 0) {
      const owner = await prisma.lmsUser.findUnique({
        where: { id: claims.sub },
        select: { fullName: true, email: true },
      });
      const inviterName =
        owner?.fullName?.trim() || owner?.email?.split('@')[0] || 'Your team owner';

      const result = await addCourseTeamMemberByEmail({
        ownerId: claims.sub,
        inviterName,
        email,
        appOrigin: request.nextUrl.origin,
        courseSlugs,
      });

      const courseLabel =
        result.courses.length === 1
          ? result.courses[0]
          : `${result.courses.length} courses`;

      return NextResponse.json({
        email: result.email,
        account_created: result.account_created,
        courses: result.courses,
        message: `Added ${result.email}. Email sent with access to ${courseLabel} only.`,
      });
    }

    const seatsUsed = await countTeamSeatsUsed(team.id);
    const pending = team.invites.length;
    if (seatsUsed + pending >= team.seatLimit) {
      return NextResponse.json({ detail: 'No seats available' }, { status: 409 });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const token = generateInviteToken();

    const invite = await prisma.lmsTeamInvite.create({
      data: {
        teamId: team.id,
        email,
        role,
        token,
        expiresAt,
      },
    });

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      invite_url: `${appUrl}/teams/join?token=${token}`,
      expires_at: invite.expiresAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'TEAM_FULL' || msg === 'COURSE_SEATS_FULL') {
      return NextResponse.json(
        { detail: 'No seats left for one or more selected courses' },
        { status: 409 },
      );
    }
    if (msg === 'NO_SEATS_FOR_COURSE') {
      return NextResponse.json(
        { detail: 'Selected course is not on your team seat plan' },
        { status: 403 },
      );
    }
    if (msg === 'NOT_TEAM_PURCHASE_COURSE') {
      return NextResponse.json(
        { detail: 'Only team-purchased courses can be assigned on a course team plan' },
        { status: 403 },
      );
    }
    if (msg === 'ALREADY_MEMBER') {
      return NextResponse.json({ detail: 'This person is already on your team' }, { status: 409 });
    }
    if (msg === 'NO_COURSES_SELECTED') {
      return NextResponse.json({ detail: 'Select at least one course' }, { status: 400 });
    }
    if (msg === 'OWNER_NOT_ENROLLED') {
      return NextResponse.json(
        { detail: 'You can only assign courses you are enrolled in' },
        { status: 403 },
      );
    }
    console.error('[teams/invite]', e);
    return NextResponse.json({ detail: 'Failed to add team member' }, { status: 500 });
  }
}
