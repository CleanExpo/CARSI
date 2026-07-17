import { NextRequest, NextResponse } from 'next/server';

import { getPublishedCourseDetailBySlugFromDatabase } from '@/lib/server/public-courses-list';

type Params = { params: Promise<{ slug: string }> };

/**
 * GET /api/lms/courses/[slug] — published course detail, same source of truth as the
 * `/courses/[slug]` page. Without this handler the path fell through to the
 * `[[...path]]` catch-all's 503 stub, which the DigitalOcean edge renders as an
 * HTML 504 (GP-518) — including for slugs that do not exist, which masked the 404.
 */
export async function GET(_request: NextRequest, context: Params) {
  const { slug: raw } = await context.params;
  const slug = raw?.trim().toLowerCase() ?? '';
  if (!slug) {
    return NextResponse.json({ detail: 'slug required' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  try {
    const course = await getPublishedCourseDetailBySlugFromDatabase(slug);
    if (!course) {
      return NextResponse.json({ detail: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json(course);
  } catch (e) {
    console.error('[lms-course-detail]', e);
    return NextResponse.json({ detail: 'Failed to load course' }, { status: 500 });
  }
}
