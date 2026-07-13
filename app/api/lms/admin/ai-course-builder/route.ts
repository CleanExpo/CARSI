import { type NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  AiCourseBuilderError,
  generateCourseDraft,
  parseAiCourseBuilderInput,
} from '@/lib/server/ai-course-builder';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/lms/admin/ai-course-builder (GP-129) — generate AU-original course drafts
 * from a CARSI-authored outline. Rejects any submission containing IICRC standard text
 * before the model is called (licence-critical, CLAUDE.md § "IICRC standards IP + AI use").
 */
export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const input = parseAiCourseBuilderInput(raw);
    const draft = await generateCourseDraft(input);
    return NextResponse.json(draft);
  } catch (err) {
    if (err instanceof AiCourseBuilderError) {
      return NextResponse.json({ detail: err.message, hits: err.detail }, { status: err.status });
    }
    console.error('[lms/admin/ai-course-builder POST]', err);
    return NextResponse.json({ detail: 'Failed to generate course content' }, { status: 500 });
  }
}
