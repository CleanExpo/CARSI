import { type NextRequest, NextResponse } from 'next/server';

import { getStripeClient } from '@/lib/api/stripe';
import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { serializeTeamForClient } from '@/lib/server/team-api-serialize';
import { fulfillCourseCheckoutForUser } from '@/lib/server/team-course-purchase';
import { repairAndGetTeamForUser } from '@/lib/server/teams';

async function findStripeCheckoutSessionForUser(userId: string): Promise<string | null> {
  const enrollment = await prisma.lmsEnrollment.findFirst({
    where: {
      studentId: userId,
      paymentReference: { startsWith: 'cs_' },
    },
    orderBy: { enrolledAt: 'desc' },
    select: { paymentReference: true },
  });
  const ref = enrollment?.paymentReference?.trim();
  return ref && ref.startsWith('cs_') ? ref : null;
}

/**
 * POST /api/lms/teams/activate-purchase
 * Ensures a course team purchase is provisioned (Stripe session) and returns the team.
 */
export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  let body: { session_id?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const explicitSessionId =
    typeof body.session_id === 'string' && body.session_id.trim().length > 0;
  let sessionId = explicitSessionId ? body.session_id!.trim() : '';

  try {
    let existing = await repairAndGetTeamForUser(claims.sub);

    if (!sessionId) {
      sessionId = (await findStripeCheckoutSessionForUser(claims.sub)) ?? '';
    }

    if (sessionId && process.env.STRIPE_SECRET_KEY?.trim()) {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return NextResponse.json({ detail: 'Payment not completed' }, { status: 400 });
      }

      const purchaseMode = session.metadata?.purchase_mode === 'team' ? 'team' : 'self';
      if (purchaseMode !== 'team') {
        if (explicitSessionId) {
          return NextResponse.json({ detail: 'Not a team purchase session' }, { status: 400 });
        }
      } else {
        const email = (
          session.customer_email ??
          session.customer_details?.email ??
          ''
        )
          .trim()
          .toLowerCase();
        if (email && claims.email && email !== claims.email.toLowerCase()) {
          return NextResponse.json(
            {
              detail:
                'This payment was made with a different email. Sign in with that email or contact support.',
            },
            { status: 403 },
          );
        }

        const slug = session.metadata?.course_slug?.trim().toLowerCase();
        const seatsMeta = session.metadata?.team_seat_count;
        const teamSeatCount = seatsMeta ? Number.parseInt(seatsMeta, 10) : undefined;
        if (!slug || !teamSeatCount || teamSeatCount < 2) {
          return NextResponse.json({ detail: 'Invalid team checkout session' }, { status: 400 });
        }

        await fulfillCourseCheckoutForUser({
          claims,
          courseSlug: slug,
          paymentReference: sessionId,
          purchaseMode: 'team',
          teamSeatCount,
        });
      }
    }

    existing = await repairAndGetTeamForUser(claims.sub);
    if (!existing) {
      return NextResponse.json({
        team: null,
        detail: 'No team found for this account yet. If you just paid, wait a moment and refresh.',
      });
    }

    return NextResponse.json({
      team: await serializeTeamForClient(existing, claims.sub),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'ALREADY_ON_TEAM') {
      return NextResponse.json(
        { detail: 'You already belong to another team as a member.' },
        { status: 409 },
      );
    }
    console.error('[teams/activate-purchase]', e);
    return NextResponse.json({ detail: 'Failed to activate team purchase' }, { status: 500 });
  }
}
