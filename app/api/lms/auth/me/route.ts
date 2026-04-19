import { NextRequest, NextResponse } from 'next/server';

import { Prisma } from '@/generated/prisma/client';
import type { IicrcCertificationEntry, User } from '@/lib/api/auth';
import { hasCompletedOnboarding, setOnboardingCompletedCookie } from '@/lib/auth/onboarding-cookie';
import { verifySessionToken } from '@/lib/auth/session-jwt';
import { parseIicrcCertifications } from '@/lib/server/iicrc-profile-json';
import { prisma } from '@/lib/prisma';

async function requireClaims(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return { error: NextResponse.json({ detail: 'Unauthorized' }, { status: 401 }) };
  }
  const token = auth.slice(7);
  const claims = await verifySessionToken(token);
  if (!claims) {
    return { error: NextResponse.json({ detail: 'Invalid token' }, { status: 401 }) };
  }
  return { claims };
}

/**
 * LMS profile for apiClient.getCurrentUser — same JWT as /api/auth/login cookies.
 */
export async function GET(request: NextRequest) {
  const result = await requireClaims(request);
  if ('error' in result) return result.error;
  const { claims } = result;

  let displayName = claims.full_name;
  let theme_preference = 'dark';
  let iicrc_member_number: string | null = null;
  let iicrc_expiry_date: string | null = null;
  let iicrc_card_image_url: string | null = null;
  let iicrc_certifications: IicrcCertificationEntry[] | null = null;

  let dbOnboardingDone = false;
  let resume_reminder: 'none' | 'email' | 'sms' | null = null;

  if (process.env.DATABASE_URL?.trim()) {
    const row = await prisma.lmsUser.findUnique({
      where: { id: claims.sub },
      select: {
        fullName: true,
        themePreference: true,
        iicrcMemberNumber: true,
        iicrcExpiryDate: true,
        iicrcCardImageUrl: true,
        iicrcCertifications: true,
        onboardingCompletedAt: true,
        resumeReminderOptIn: true,
      },
    });
    if (row?.fullName?.trim()) displayName = row.fullName.trim();
    if (row?.themePreference) theme_preference = row.themePreference;
    iicrc_member_number = row?.iicrcMemberNumber ?? null;
    if (row?.iicrcExpiryDate) {
      iicrc_expiry_date = row.iicrcExpiryDate.toISOString().slice(0, 10);
    }
    iicrc_card_image_url = row?.iicrcCardImageUrl ?? null;
    iicrc_certifications = parseIicrcCertifications(row?.iicrcCertifications ?? null);
    dbOnboardingDone = row?.onboardingCompletedAt != null;
    const v = row?.resumeReminderOptIn?.toLowerCase();
    if (v === 'email' || v === 'sms' || v === 'none') resume_reminder = v;
  }

  const user: User = {
    id: claims.sub,
    email: claims.email,
    full_name: displayName,
    roles: [claims.role],
    theme_preference,
    is_active: true,
    is_verified: true,
    onboarding_completed: dbOnboardingDone || hasCompletedOnboarding(request, claims.sub),
    resume_reminder_opt_in: resume_reminder,
    iicrc_member_number,
    iicrc_expiry_date,
    iicrc_card_image_url,
    iicrc_certifications,
  };
  return NextResponse.json(user);
}

/**
 * Profile updates (e.g. theme). Persisted on `lms_users` when DATABASE_URL is set.
 */
export async function PATCH(request: NextRequest) {
  const result = await requireClaims(request);
  if ('error' in result) return result.error;
  const { claims } = result;

  const patch = (await request.json().catch(() => ({}))) as Partial<User> & {
    iicrc_expiry_date?: string | null;
  };

  const update: Prisma.LmsUserUpdateInput = {};
  if (typeof patch.theme_preference === 'string') {
    update.themePreference = patch.theme_preference;
  }
  if (typeof patch.full_name === 'string') {
    const t = patch.full_name.trim();
    if (t.length > 0) update.fullName = t;
  }
  if (typeof patch.iicrc_member_number === 'string') {
    update.iicrcMemberNumber = patch.iicrc_member_number;
  }
  if (patch.iicrc_member_number === null) {
    update.iicrcMemberNumber = null;
  }
  if (typeof patch.iicrc_card_image_url === 'string') {
    update.iicrcCardImageUrl = patch.iicrc_card_image_url;
  }
  if (patch.iicrc_card_image_url === null) {
    update.iicrcCardImageUrl = null;
  }
  if (Array.isArray(patch.iicrc_certifications)) {
    update.iicrcCertifications = patch.iicrc_certifications as Prisma.InputJsonValue;
  }
  if (patch.iicrc_certifications === null) {
    update.iicrcCertifications = Prisma.JsonNull;
  }
  if (typeof patch.iicrc_expiry_date === 'string') {
    const d = new Date(`${patch.iicrc_expiry_date}T12:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) {
      update.iicrcExpiryDate = d;
    }
  }
  if (patch.iicrc_expiry_date === null) {
    update.iicrcExpiryDate = null;
  }
  if (typeof (patch as { resume_reminder_opt_in?: string }).resume_reminder_opt_in === 'string') {
    const v = (patch as { resume_reminder_opt_in: string }).resume_reminder_opt_in.toLowerCase();
    if (v === 'email' || v === 'sms' || v === 'none') {
      update.resumeReminderOptIn = v;
    }
  }

  if (process.env.DATABASE_URL?.trim() && Object.keys(update).length > 0) {
    try {
      await prisma.lmsUser.update({
        where: { id: claims.sub },
        data: update,
      });
    } catch {
      /* user row may not exist */
    }
  }

  let theme_preference = 'dark';
  let iicrc_member_number: string | null = null;
  let iicrc_expiry_date: string | null = null;
  let iicrc_card_image_url: string | null = null;
  let iicrc_certifications: IicrcCertificationEntry[] | null = null;

  let patchDisplayName = claims.full_name;

  let patchResumeReminder: 'none' | 'email' | 'sms' | null = null;
  let patchOnboardingDone = false;

  if (process.env.DATABASE_URL?.trim()) {
    const row = await prisma.lmsUser.findUnique({
      where: { id: claims.sub },
      select: {
        fullName: true,
        themePreference: true,
        iicrcMemberNumber: true,
        iicrcExpiryDate: true,
        iicrcCardImageUrl: true,
        iicrcCertifications: true,
        onboardingCompletedAt: true,
        resumeReminderOptIn: true,
      },
    });
    if (row?.fullName?.trim()) patchDisplayName = row.fullName.trim();
    if (row?.themePreference) theme_preference = row.themePreference;
    iicrc_member_number = row?.iicrcMemberNumber ?? null;
    if (row?.iicrcExpiryDate) {
      iicrc_expiry_date = row.iicrcExpiryDate.toISOString().slice(0, 10);
    }
    iicrc_card_image_url = row?.iicrcCardImageUrl ?? null;
    iicrc_certifications = parseIicrcCertifications(row?.iicrcCertifications ?? null);
    patchOnboardingDone = row?.onboardingCompletedAt != null;
    const rv = row?.resumeReminderOptIn?.toLowerCase();
    if (rv === 'email' || rv === 'sms' || rv === 'none') patchResumeReminder = rv;
  }

  const response = NextResponse.json({
    id: claims.sub,
    email: claims.email,
    full_name: patchDisplayName,
    roles: [claims.role],
    theme_preference,
    is_active: true,
    is_verified: true,
    onboarding_completed:
      patch.onboarding_completed === true
        ? true
        : patchOnboardingDone || hasCompletedOnboarding(request, claims.sub),
    resume_reminder_opt_in: patchResumeReminder,
    iicrc_member_number,
    iicrc_expiry_date,
    iicrc_card_image_url,
    iicrc_certifications,
  } satisfies User);
  if (patch.onboarding_completed === true) {
    setOnboardingCompletedCookie(response, claims.sub);
  }
  return response;
}
