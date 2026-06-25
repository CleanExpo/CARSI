import { NextRequest, NextResponse } from 'next/server';

import {
  ADMIN_BULK_PUBLICATION_MAX_IDS,
  adminBulkDeleteCourses,
  adminBulkSetCoursePublication,
  adminCreateCourse,
  adminListCourses,
  courseToAdminDto,
  parseAdminCourseWriteBody,
  type AdminListCoursesOptions,
} from '@/lib/admin/admin-courses-service';
import { getAdminSessionOrNull } from '@/lib/admin/admin-session';

function parseListQuery(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusRaw = searchParams.get('status');
  const status: NonNullable<AdminListCoursesOptions['status']> =
    statusRaw === 'draft' ||
    statusRaw === 'published' ||
    statusRaw === 'in_review' ||
    statusRaw === 'all'
      ? statusRaw
      : 'all';

  let q = searchParams.get('q')?.trim() ?? '';
  if (q.length > 200) q = q.slice(0, 200);

  const sortRaw = searchParams.get('sort');
  const sort: NonNullable<AdminListCoursesOptions['sort']> =
    sortRaw === 'title' || sortRaw === 'modules' || sortRaw === 'updated' ? sortRaw : 'updated';

  const cecRaw = searchParams.get('cec');
  const cec: NonNullable<AdminListCoursesOptions['cec']> =
    cecRaw === 'missing' ? 'missing' : 'all';

  return { status, q: q || undefined, sort, cec };
}

export async function GET(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  try {
    const { status, q, sort, cec } = parseListQuery(request);
    const courses = await adminListCourses({ status, q, sort, cec });
    return NextResponse.json(
      { courses },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (e) {
    console.error('[admin/courses GET]', e);
    return NextResponse.json({ detail: 'Failed to list courses' }, { status: 500 });
  }
}

function parseBody(body: unknown) {
  return parseAdminCourseWriteBody(body);
}

function parseBulkCourseIds(body: unknown): string[] | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const raw = o.courseIds;
  if (!Array.isArray(raw)) return null;
  const courseIds = raw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
  return courseIds.length > 0 ? courseIds : null;
}

function parseBulkPublicationBody(
  body: unknown
): { courseIds: string[]; published: boolean } | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.published !== 'boolean') return null;
  const courseIds = parseBulkCourseIds(body);
  if (!courseIds) return null;
  return { courseIds, published: o.published };
}

export async function DELETE(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const courseIds = parseBulkCourseIds(await request.json().catch(() => null));
  if (!courseIds) {
    return NextResponse.json(
      { detail: 'Body must include courseIds (non-empty string array)' },
      { status: 400 }
    );
  }

  try {
    const deleted = await adminBulkDeleteCourses(courseIds);
    return NextResponse.json(
      { deleted },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'NO_IDS') {
      return NextResponse.json({ detail: 'No valid course ids' }, { status: 400 });
    }
    if (msg === 'TOO_MANY_IDS') {
      return NextResponse.json(
        { detail: `At most ${ADMIN_BULK_PUBLICATION_MAX_IDS} courses per request` },
        { status: 400 }
      );
    }
    console.error('[admin/courses DELETE]', e);
    return NextResponse.json({ detail: 'Failed to delete courses' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = parseBulkPublicationBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json(
      { detail: 'Body must include courseIds (non-empty string array) and published (boolean)' },
      { status: 400 }
    );
  }

  try {
    const updated = await adminBulkSetCoursePublication(body.courseIds, body.published);
    return NextResponse.json(
      { updated },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'NO_IDS') {
      return NextResponse.json({ detail: 'No valid course ids' }, { status: 400 });
    }
    if (msg === 'TOO_MANY_IDS') {
      return NextResponse.json(
        { detail: `At most ${ADMIN_BULK_PUBLICATION_MAX_IDS} courses per request` },
        { status: 400 }
      );
    }
    console.error('[admin/courses PATCH]', e);
    return NextResponse.json({ detail: 'Failed to update courses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const body = parseBody(await request.json().catch(() => null));
  if (!body || body.modules.length === 0) {
    return NextResponse.json(
      { detail: 'title and at least one module with a title are required' },
      { status: 400 }
    );
  }

  try {
    const course = await adminCreateCourse(body);
    return NextResponse.json({ course: courseToAdminDto(course) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'MODULES_REQUIRED') {
      return NextResponse.json({ detail: 'At least one module is required' }, { status: 400 });
    }
    console.error('[admin/courses POST]', e);
    return NextResponse.json({ detail: 'Failed to create course' }, { status: 500 });
  }
}
