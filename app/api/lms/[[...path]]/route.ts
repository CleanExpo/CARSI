/**
 * Catch-all for `/api/lms/*` not implemented as a dedicated route.
 * Returns minimal JSON stubs so optional LMS UI calls do not 404.
 */

import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: Promise<{ path?: string[] }> };

function inferDisciplineFromCourseSlug(slug: string): string {
  const s = slug.toLowerCase();
  if (/(odou?r|odor|deodor|smell|air-quality)/.test(s)) return 'OCT';
  if (/(water|flood|moisture|wrt|drying|psychrom)/.test(s)) return 'WRT';
  if (/(mould|mold|microbial|amrt|bio)/.test(s)) return 'AMRT';
  if (/(fire|smoke|soot|fsrt)/.test(s)) return 'FSRT';
  if (/(carpet.*repair|crt|\bcrt\b)/.test(s)) return 'CRT';
  if (/(carpet.*clean|commercial.*clean|cct)/.test(s)) return 'CCT';
  if (/(structural.*dry|asd\b)/.test(s)) return 'ASD';
  return 'WRT';
}

const HUB_KEYWORDS: Record<string, string[]> = {
  OCT: [
    'Odour control technician',
    'Deodorisation specialist',
    'Indoor air quality',
    'Restoration technician',
  ],
  WRT: ['Water damage technician', 'Restoration technician', 'Flood response'],
  AMRT: ['Mould remediation technician', 'Microbial remediation'],
  FSRT: ['Fire restoration technician', 'Smoke damage specialist'],
  CRT: ['Carpet repair technician', 'Flooring restoration'],
  CCT: ['Commercial carpet cleaning', 'Carpet cleaning technician'],
  ASD: ['Structural drying technician', 'Water restoration'],
};

async function localStub(method: string, segments: string[]): Promise<NextResponse | null> {
  const key = segments.join('/');

  if (
    method === 'GET' &&
    segments[0] === 'hub' &&
    segments[1] === 'course-context' &&
    segments.length >= 3
  ) {
    const slug = segments.slice(2).join('/');
    const discipline = inferDisciplineFromCourseSlug(slug);
    const job_keywords = HUB_KEYWORDS[discipline] ?? HUB_KEYWORDS.WRT;
    return NextResponse.json({
      discipline,
      job_keywords,
      related_disciplines: [discipline],
      pathway_name: `IICRC ${discipline} training pathway`,
    });
  }

  // subscription/status and subscription/checkout are now REAL routes
  // (app/api/lms/subscription/status/route.ts + .../checkout/route.ts, WS1-E1
  // GP-441) and shadow this catch-all. The status route returns the WS0
  // "no subscription" payload when SUBSCRIPTIONS_ENABLED is off, so behaviour is
  // unchanged until the feature is switched on.

  // gamification/me/level — handled by app/api/lms/gamification/me/level/route.ts (real DB XP)

  // subscription/portal is now a REAL route
  // (app/api/lms/subscription/portal/route.ts, GP-458) that shadows this
  // catch-all: it opens the Stripe Customer Portal for the signed-in member and
  // returns 503 while SUBSCRIPTIONS_ENABLED is off (unchanged dark behaviour).

  // notifications/me, notifications/me/read-all, notifications/:id/read are now real routes
  // under app/api/lms/notifications/** (Phase A) — they shadow this catch-all.

  // notes/me + notes/:lessonId are now real DB-backed routes under app/api/lms/notes/** (GP-459) —
  // they shadow this catch-all. The former in-memory notesStore stub was removed.

  return null;
}

function notConfiguredResponse(): NextResponse {
  return NextResponse.json(
    { detail: 'This LMS endpoint is not implemented in this app build.' },
    { status: 503 }
  );
}

async function handle(method: string, ctx: Ctx): Promise<NextResponse> {
  const { path = [] } = await ctx.params;

  const stub = await localStub(method, path);
  if (stub) return stub;

  return notConfiguredResponse();
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  return handle('GET', ctx);
}

export async function POST(_request: NextRequest, ctx: Ctx) {
  return handle('POST', ctx);
}

export async function PATCH(_request: NextRequest, ctx: Ctx) {
  return handle('PATCH', ctx);
}

export async function PUT(_request: NextRequest, ctx: Ctx) {
  return handle('PUT', ctx);
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  return handle('DELETE', ctx);
}
