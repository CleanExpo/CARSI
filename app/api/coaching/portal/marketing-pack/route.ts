import { NextRequest, NextResponse } from 'next/server';

import {
  hasMinimumMarketingVoice,
  MARKETING_PROFILE_REQUIRED_MESSAGE,
} from '@/lib/coaching-portal/marketing-pack/voice-gate';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import {
  defaultMarketingPackDeps,
  generateMarketingPack,
  getLatestMarketingPackForUser,
  loadMarketingInputsForUser,
  MARKETING_PACK_COOLDOWN_MS,
} from '@/lib/server/carsi-coaching-marketing-pack';
import { requireCoachingPortalEditor } from '@/lib/server/carsi-coaching-portal-gate';

export const dynamic = 'force-dynamic';
/** One site fetch (8s total deadline) plus database writes fits well inside this. */
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) return NextResponse.json({ detail: 'Sign in required.' }, { status: 401 });
  const pack = await getLatestMarketingPackForUser(claims.sub);
  return NextResponse.json({ pack });
}

/** GP-634: member builds (or rebuilds) their marketing pack from their assessment and profile. */
export async function POST(request: NextRequest) {
  const gate = await requireCoachingPortalEditor(request);
  if ('error' in gate) return gate.error;
  const userId = gate.claims.sub;

  const latest = await getLatestMarketingPackForUser(userId);
  if (latest) {
    const ageMs = Date.now() - new Date(latest.generatedAt).getTime();
    if (ageMs < MARKETING_PACK_COOLDOWN_MS) {
      const waitMin = Math.ceil((MARKETING_PACK_COOLDOWN_MS - ageMs) / 60000);
      return NextResponse.json(
        {
          detail: `Your pack was just built. You can rebuild it in ${waitMin} minute${waitMin === 1 ? '' : 's'}.`,
        },
        { status: 429 }
      );
    }
  }

  const inputs = await loadMarketingInputsForUser(userId);
  if (!hasMinimumMarketingVoice(inputs.voice)) {
    return NextResponse.json({ detail: MARKETING_PROFILE_REQUIRED_MESSAGE }, { status: 400 });
  }

  try {
    await generateMarketingPack(userId, inputs, defaultMarketingPackDeps);
  } catch (err) {
    console.error(
      '[coaching marketing-pack] generation failed',
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { detail: 'We could not build your pack just now. Please try again shortly.' },
      { status: 500 }
    );
  }
  const pack = await getLatestMarketingPackForUser(userId);
  return NextResponse.json({ pack });
}
