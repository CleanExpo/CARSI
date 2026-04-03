import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  adminDeleteCourse,
  adminGetCourse,
  adminUpdateCourse,
  courseToAdminDto,
  type AdminCourseWriteInput,
} from '@/lib/admin/admin-courses-service';

type Ctx = { params: Promise<{ id: string }> };

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

export async function GET(_request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { id } = await ctx.params;
  const course = await adminGetCourse(id);
  if (!course) {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(
    { course: courseToAdminDto(course) },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { id } = await ctx.params;
  const body = parseBody(await request.json().catch(() => null));
  if (!body || body.modules.length === 0) {
    return NextResponse.json(
      { detail: 'title and at least one module with a title are required' },
      { status: 400 }
    );
  }

  try {
    const course = await adminUpdateCourse(id, body);
    return NextResponse.json({ course: courseToAdminDto(course) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'NOT_FOUND') {
      return NextResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    if (msg === 'MODULES_REQUIRED') {
      return NextResponse.json({ detail: 'At least one module is required' }, { status: 400 });
    }
    console.error('[admin/courses PATCH]', e);
    return NextResponse.json({ detail: 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, ctx: Ctx) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ detail: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ detail: 'Database not configured' }, { status: 503 });
  }

  const { id } = await ctx.params;
  try {
    await adminDeleteCourse(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'NOT_FOUND') {
      return NextResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    console.error('[admin/courses DELETE]', e);
    return NextResponse.json({ detail: 'Failed to delete course' }, { status: 500 });
  }
}
