import { NextRequest, NextResponse } from 'next/server';

import { Prisma } from '@/generated/prisma/client';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import { setOnboardingCompletedCookie } from '@/lib/auth/onboarding-cookie';
import {
  buildOnboardingDashboardUrls,
  pathwayDescription,
  pathwayLabel,
  resolveRecommendedPathwayCode,
} from '@/lib/server/onboarding-pathway';
import { prisma } from '@/lib/prisma';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

/**
 * POST onboarding answers. Sets an httpOnly cookie so GET /api/lms/auth/me can
 * return onboarding_completed without a database (local / headless dev).
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.slice(7);
  const claims = await verifySessionToken(token);
  if (!claims) {
    return NextResponse.json({ detail: 'Invalid token' }, { status: 401 });
  }

  const upstream = getUpstreamBaseUrl();
  const bodyText = await request.text();

  if (upstream) {
    const url = `${upstream.replace(/\/$/, '')}/api/lms/auth/onboarding`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: auth,
        'content-type': request.headers.get('content-type') || 'application/json',
      },
      body: bodyText || undefined,
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || 'application/json';
    const buf = await res.arrayBuffer();
    const response = new NextResponse(buf, {
      status: res.status,
      headers: { 'content-type': contentType },
    });
    if (res.ok) {
      setOnboardingCompletedCookie(response, claims.sub);
    }
    return response;
  }

  let raw: Record<string, unknown> = {};
  try {
    raw = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};
  } catch {
    raw = {};
  }
  const disciplinesHeld = Array.isArray(raw.disciplines_held)
    ? (raw.disciplines_held as unknown[]).map((x) => String(x).trim()).filter(Boolean)
    : [];

  const answers = {
    industry: String(raw.industry ?? ''),
    role: String(raw.role ?? ''),
    iicrc_experience: String(raw.iicrc_experience ?? ''),
    primary_goal: String(raw.primary_goal ?? ''),
    disciplines_held: disciplinesHeld,
    renewal_date:
      raw.renewal_date == null || raw.renewal_date === ''
        ? null
        : String(raw.renewal_date),
    resume_reminder_opt_in: String(raw.resume_reminder_opt_in ?? 'none'),
  };

  const pathwayCode = resolveRecommendedPathwayCode(answers);
  const { suggested_courses_url } = buildOnboardingDashboardUrls({
    pathwayCode,
    disciplines: disciplinesHeld.map((d) => d.toUpperCase()),
  });

  if (process.env.DATABASE_URL?.trim()) {
    const reminder =
      answers.resume_reminder_opt_in === 'email'
        ? 'email'
        : answers.resume_reminder_opt_in === 'sms'
          ? 'sms'
          : 'none';

    const data: Prisma.LmsUserUpdateInput = {
      onboardingCompletedAt: new Date(),
      onboarding: answers as Prisma.InputJsonValue,
      resumeReminderOptIn: reminder,
    };

    if (typeof answers.renewal_date === 'string' && answers.renewal_date.length >= 8) {
      const d = new Date(`${answers.renewal_date}T12:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) {
        data.iicrcExpiryDate = d;
      }
    }

    try {
      await prisma.lmsUser.update({
        where: { id: claims.sub },
        data,
      });
    } catch (e) {
      console.error('[onboarding] persist failed', e);
    }
  }

  const response = NextResponse.json({
    recommended_pathway: pathwayCode,
    pathway_label: pathwayLabel(pathwayCode),
    pathway_description: pathwayDescription(pathwayCode, answers.primary_goal),
    suggested_courses_url,
  });
  setOnboardingCompletedCookie(response, claims.sub);
  return response;
}
