import { NextRequest, NextResponse } from 'next/server';

import {
  coachingProfileMeetsRequired,
  type CoachingBusinessProfileForm,
} from '@/lib/coaching-portal/business-profile';
import { prisma } from '@/lib/prisma';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { requireCoachingPortalEditor } from '@/lib/server/carsi-coaching-portal-gate';

function str(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === 'string' ? (body[key] as string).trim() : '';
}

function profileDataFromBody(
  body: Record<string, unknown>
): Omit<CoachingBusinessProfileForm, never> & { completedAt?: Date } {
  const form: CoachingBusinessProfileForm = {
    businessName: str(body, 'businessName'),
    industry: str(body, 'industry'),
    location: str(body, 'location'),
    serviceAreas: str(body, 'serviceAreas'),
    yearsInBusiness: str(body, 'yearsInBusiness'),
    businessSize: str(body, 'businessSize'),
    employeeCount: str(body, 'employeeCount'),
    mainServices: str(body, 'mainServices'),
    website: str(body, 'website'),
    googleBusinessUrl: str(body, 'googleBusinessUrl'),
    facebookUrl: str(body, 'facebookUrl'),
    instagramUrl: str(body, 'instagramUrl'),
    linkedinUrl: str(body, 'linkedinUrl'),
    tiktokUrl: str(body, 'tiktokUrl'),
    youtubeUrl: str(body, 'youtubeUrl'),
    xUrl: str(body, 'xUrl'),
    socialNotes: str(body, 'socialNotes'),
    challenges: str(body, 'challenges'),
    shortTermGoals: str(body, 'shortTermGoals'),
    longTermVision: str(body, 'longTermVision'),
  };

  const markComplete = body.markComplete === true;
  const completedAt = markComplete || coachingProfileMeetsRequired(form) ? new Date() : undefined;

  return {
    ...form,
    businessName: form.businessName || '',
    industry: form.industry || '',
    location: form.location || '',
    serviceAreas: form.serviceAreas || '',
    yearsInBusiness: form.yearsInBusiness || '',
    businessSize: form.businessSize || '',
    employeeCount: form.employeeCount || '',
    mainServices: form.mainServices || '',
    website: form.website || '',
    googleBusinessUrl: form.googleBusinessUrl || '',
    facebookUrl: form.facebookUrl || '',
    instagramUrl: form.instagramUrl || '',
    linkedinUrl: form.linkedinUrl || '',
    tiktokUrl: form.tiktokUrl || '',
    youtubeUrl: form.youtubeUrl || '',
    xUrl: form.xUrl || '',
    socialNotes: form.socialNotes || '',
    challenges: form.challenges || '',
    shortTermGoals: form.shortTermGoals || '',
    longTermVision: form.longTermVision || '',
    ...(completedAt ? { completedAt } : {}),
  };
}

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });

  const profile = await prisma.carsiCoachingBusinessProfile.findUnique({
    where: { userId: claims.sub },
  });
  return NextResponse.json({ profile });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireCoachingPortalEditor(request);
  if ('error' in gate) return gate.error;
  const claims = gate.claims;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ detail: 'Invalid body.' }, { status: 400 });

  const parsed = profileDataFromBody(body);
  const { completedAt, ...form } = parsed;

  const data = {
    businessName: form.businessName || null,
    industry: form.industry || null,
    location: form.location || null,
    serviceAreas: form.serviceAreas || null,
    yearsInBusiness: form.yearsInBusiness || null,
    businessSize: form.businessSize || null,
    employeeCount: form.employeeCount || null,
    mainServices: form.mainServices || null,
    website: form.website || null,
    googleBusinessUrl: form.googleBusinessUrl || null,
    facebookUrl: form.facebookUrl || null,
    instagramUrl: form.instagramUrl || null,
    linkedinUrl: form.linkedinUrl || null,
    tiktokUrl: form.tiktokUrl || null,
    youtubeUrl: form.youtubeUrl || null,
    xUrl: form.xUrl || null,
    socialNotes: form.socialNotes || null,
    challenges: form.challenges || null,
    shortTermGoals: form.shortTermGoals || null,
    longTermVision: form.longTermVision || null,
    ...(completedAt ? { completedAt } : {}),
  };

  const profile = await prisma.carsiCoachingBusinessProfile.upsert({
    where: { userId: claims.sub },
    create: { userId: claims.sub, ...data, completedAt: completedAt ?? null },
    update: data,
  });

  return NextResponse.json({ profile });
}
