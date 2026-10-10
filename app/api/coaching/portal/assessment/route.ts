import { NextRequest, NextResponse } from 'next/server';

import {
  COACHING_ASSESSMENT_SECTIONS,
  emptyAssessmentResponses,
  parseAssessmentResponsesJson,
} from '@/lib/coaching-portal/assessment-schema';
import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { requireCoachingPortalEditor } from '@/lib/server/carsi-coaching-portal-gate';

async function requireEntitledEditor(request: NextRequest) {
  const gate = await requireCoachingPortalEditor(request);
  if ('error' in gate) return { error: gate.error };
  const claims = gate.claims;

  const submitted = await prisma.carsiCoachingAssessment.findFirst({
    where: { userId: claims.sub, status: { in: ['submitted', 'reviewed'] } },
    select: { id: true },
  });
  if (submitted) {
    return {
      error: NextResponse.json(
        { detail: 'Your assessment has been submitted. Contact support to start a new one.' },
        { status: 409 }
      ),
    };
  }

  return { claims };
}

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const [draft, latestSubmitted] = await Promise.all([
    prisma.carsiCoachingAssessment.findFirst({
      where: { userId: claims.sub, status: 'draft' },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.carsiCoachingAssessment.findFirst({
      where: { userId: claims.sub, status: { in: ['submitted', 'reviewed'] } },
      orderBy: { submittedAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    draft: draft
      ? {
          id: draft.id,
          responses: parseAssessmentResponsesJson(draft.responsesJson),
          updatedAt: draft.updatedAt.toISOString(),
        }
      : null,
    submitted: latestSubmitted
      ? {
          id: latestSubmitted.id,
          status: latestSubmitted.status,
          responses: parseAssessmentResponsesJson(latestSubmitted.responsesJson),
          submittedAt: latestSubmitted.submittedAt?.toISOString() ?? null,
          reviewedAt: latestSubmitted.reviewedAt?.toISOString() ?? null,
          customerVisibleFeedback: latestSubmitted.customerVisibleFeedback,
        }
      : null,
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireEntitledEditor(request);
  if (gate.error) return gate.error;
  const claims = gate.claims!;

  const body = (await request.json().catch(() => null)) as {
    responses?: Record<string, string>;
  } | null;
  if (!body?.responses || typeof body.responses !== 'object') {
    return NextResponse.json({ detail: 'Invalid responses.' }, { status: 400 });
  }

  const merged = { ...emptyAssessmentResponses(), ...body.responses };
  const responsesJson = JSON.stringify(merged);

  const existing = await prisma.carsiCoachingAssessment.findFirst({
    where: { userId: claims.sub, status: 'draft' },
    orderBy: { updatedAt: 'desc' },
  });

  const row = existing
    ? await prisma.carsiCoachingAssessment.update({
        where: { id: existing.id },
        data: { responsesJson },
      })
    : await prisma.carsiCoachingAssessment.create({
        data: {
          userId: claims.sub,
          status: 'draft',
          responsesJson,
        },
      });

  return NextResponse.json({
    id: row.id,
    responses: parseAssessmentResponsesJson(row.responsesJson),
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireEntitledEditor(request);
  if (gate.error) return gate.error;
  const claims = gate.claims!;

  const draft = await prisma.carsiCoachingAssessment.findFirst({
    where: { userId: claims.sub, status: 'draft' },
    orderBy: { updatedAt: 'desc' },
  });
  if (!draft) {
    return NextResponse.json(
      { detail: 'Complete the assessment before submitting.' },
      { status: 400 }
    );
  }

  const responses = parseAssessmentResponsesJson(draft.responsesJson);
  const requiredIds = COACHING_ASSESSMENT_SECTIONS.flatMap((s) =>
    s.fields.filter((f) => !f.optional).map((f) => f.id)
  );
  const missing = requiredIds.filter((id) => !responses[id]?.trim());
  if (missing.length > 0) {
    return NextResponse.json(
      {
        detail: 'Please answer all questions before submitting.',
        missingFieldIds: missing,
      },
      { status: 400 }
    );
  }

  const row = await prisma.carsiCoachingAssessment.update({
    where: { id: draft.id },
    data: { status: 'submitted', submittedAt: new Date() },
  });

  return NextResponse.json({
    id: row.id,
    submittedAt: row.submittedAt?.toISOString(),
  });
}
