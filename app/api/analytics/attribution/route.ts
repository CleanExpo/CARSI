import { NextRequest } from 'next/server';

import { applyRateLimit, clientIpFrom } from '@/lib/rate-limit';
import {
  readAttributionJourneyId,
  tryRecordAttributedStage,
} from '@/lib/server/event-attribution';

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const journeyId = readAttributionJourneyId(request);
  if (!journeyId) return new Response(null, { status: 204 });

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return new Response(null, { status: 415 });
  }

  const ip = clientIpFrom(
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip'),
  );
  // A client can mint fresh journey cookies through public registration, so the
  // abuse window must be keyed by the non-self-asserted client IP, not journey.
  const rateLimit = applyRateLimit(ip, RATE_LIMIT, RATE_WINDOW_MS);
  if (!rateLimit.ok) {
    return new Response(null, {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) },
    });
  }

  const body = (await request.json().catch(() => ({}))) as { courseSlug?: unknown };
  const courseSlug = typeof body.courseSlug === 'string' ? body.courseSlug.trim() : '';
  if (!courseSlug || courseSlug.length > 200) {
    return new Response(null, { status: 400 });
  }

  await tryRecordAttributedStage(journeyId, 'course_view', { courseSlug });
  return new Response(null, { status: 204 });
}
