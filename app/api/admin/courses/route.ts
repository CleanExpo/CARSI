import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  adminCreateCourse,
  adminListCourses,
  courseToAdminDto,
  type AdminCourseWriteInput,
} from '@/lib/admin/admin-courses-service';

function parseListQuery(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const statusRaw = searchParams.get('status');
  const status =
    statusRaw === 'draft' || statusRaw === 'published' || statusRaw === 'all'
      ? statusRaw
      : 'all';

  let q = searchParams.get('q')?.trim() ?? '';
  if (q.length > 200) q = q.slice(0, 200);

  const sortRaw = searchParams.get('sort');
  const sort =
    sortRaw === 'title' || sortRaw === 'modules' || sortRaw === 'updated' ? sortRaw : 'updated';

  return { status, q: q || undefined, sort };
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
    const { status, q, sort } = parseListQuery(request);
    const courses = await adminListCourses({ status, q, sort });
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

function parseBody(body: unknown): AdminCourseWriteInput | null {
  if (!body || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  if (!title) return null;

  const modulesRaw = Array.isArray(o.modules) ? o.modules : [];
  const modules = modulesRaw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const m = row as Record<string, unknown>;
      const modTitle = typeof m.title === 'string' ? m.title.trim() : '';
      if (!modTitle) return null;
      return {
        id: typeof m.id === 'string' && m.id.trim() ? m.id.trim() : undefined,
        title: modTitle,
        textContent: typeof m.textContent === 'string' ? m.textContent : undefined,
        videoUrl: typeof m.videoUrl === 'string' ? m.videoUrl : undefined,
      };
    })
    .filter(Boolean) as AdminCourseWriteInput['modules'];

  const priceRaw = o.priceAud;
  const priceAud =
    typeof priceRaw === 'number' && Number.isFinite(priceRaw)
      ? priceRaw
      : typeof priceRaw === 'string'
        ? Number.parseFloat(priceRaw)
        : 0;

  return {
    title,
    description: typeof o.description === 'string' ? o.description : undefined,
    thumbnailUrl: typeof o.thumbnailUrl === 'string' ? o.thumbnailUrl : undefined,
    introVideoUrl: typeof o.introVideoUrl === 'string' ? o.introVideoUrl : undefined,
    introThumbnailUrl: typeof o.introThumbnailUrl === 'string' ? o.introThumbnailUrl : undefined,
    slug: typeof o.slug === 'string' ? o.slug : undefined,
    isFree: Boolean(o.isFree),
    priceAud: Number.isFinite(priceAud) ? priceAud : 0,
    published: Boolean(o.published),
    modules,
  };
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
