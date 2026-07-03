import { NextRequest, NextResponse } from 'next/server';

import { lmsCreateCourseDraft } from '@/lib/admin/admin-courses-service';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getPublishedCourseListItemsFromDatabase } from '@/lib/server/public-courses-list';

/**
 * GET /api/lms/courses — published catalogue, same source of truth as the
 * `/courses` page. Without this handler the path fell through to the
 * `[[...path]]` catch-all's 503 stub, which the DigitalOcean edge renders
 * as an HTML 504.
 */
export async function GET() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ items: [], total: 0 });
  }

  try {
    const items = await getPublishedCourseListItemsFromDatabase();
    return NextResponse.json({ items, total: items.length });
  } catch (e) {
    console.error('[lms-courses]', e);
    return NextResponse.json({ detail: 'Failed to load courses' }, { status: 500 });
  }
}

/** POST /api/lms/courses — instructor/admin creates a draft course (New Course page). */
export async function POST(request: NextRequest) {
  const claims = await getSessionClaimsFromRequest(request);
  if (!claims) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }
  if (claims.role !== 'admin' && claims.role !== 'instructor') {
    return NextResponse.json({ detail: 'Forbidden' }, { status: 403 });
  }
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ detail: 'title is required' }, { status: 400 });
  }

  try {
    const course = await lmsCreateCourseDraft({
      title,
      slug: typeof body.slug === 'string' ? body.slug : null,
      description: typeof body.description === 'string' ? body.description : null,
      short_description:
        typeof body.short_description === 'string' ? body.short_description : null,
      price_aud: typeof body.price_aud === 'number' ? body.price_aud : null,
      is_free: typeof body.is_free === 'boolean' ? body.is_free : null,
      level: typeof body.level === 'string' ? body.level : null,
      category: typeof body.category === 'string' ? body.category : null,
      iicrc_discipline:
        typeof body.iicrc_discipline === 'string' ? body.iicrc_discipline : null,
      cec_hours: typeof body.cec_hours === 'number' ? body.cec_hours : null,
    });
    return NextResponse.json(
      { id: course.id, slug: course.slug, title: course.title },
      { status: 201 }
    );
  } catch (e) {
    console.error('[lms-courses:create]', e);
    return NextResponse.json({ detail: 'Failed to create course' }, { status: 500 });
  }
}
