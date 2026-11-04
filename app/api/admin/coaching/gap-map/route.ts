import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import type { LearningGapArea } from '@/lib/coaching-portal/learning-path';
import {
  GapMapValidationError,
  getGapMapView,
  resetGapMapEntry,
  saveGapMapEntry,
} from '@/lib/server/carsi-coaching-gap-map';
import { isUuidParam } from '@/lib/server/uuid-param';

export const dynamic = 'force-dynamic';

/**
 * GP-633 coach-editable gap-to-course map. Admin (coach) only.
 * GET  → every chapter's gap areas with their courses, and the published courses to pick from
 * POST → { op: 'save', chapterSlug, area, courseIds } or { op: 'reset', chapterSlug, area }
 */
export async function GET() {
  if (!(await getAdminSessionOrNull())) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(await getGapMapView());
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSessionOrNull())) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const chapterSlug = typeof body?.chapterSlug === 'string' ? body.chapterSlug : '';
  const area = (typeof body?.area === 'string' ? body.area : '') as LearningGapArea;

  try {
    if (body?.op === 'save') {
      const raw = body.courseIds;
      if (
        !Array.isArray(raw) ||
        raw.length > 50 ||
        !raw.every((v) => typeof v === 'string' && isUuidParam(v))
      ) {
        return NextResponse.json(
          { detail: 'courseIds must be a course id list.' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        await saveGapMapEntry({ chapterSlug, area, courseIds: raw as string[] })
      );
    }
    if (body?.op === 'reset') {
      return NextResponse.json(await resetGapMapEntry({ chapterSlug, area }));
    }
  } catch (e) {
    if (e instanceof GapMapValidationError) {
      return NextResponse.json({ detail: e.message }, { status: 400 });
    }
    throw e;
  }
  return NextResponse.json({ detail: 'Unknown op.' }, { status: 400 });
}
