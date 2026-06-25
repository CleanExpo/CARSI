import { NextRequest, NextResponse } from 'next/server';

import { getAdminSessionOrNull } from '@/lib/admin/admin-session';
import {
  adminDeleteCourse,
  adminGetCourse,
  adminUpdateCourse,
  courseToAdminDto,
  parseAdminCourseWriteBody,
  type AdminCourseWriteInput,
} from '@/lib/admin/admin-courses-service';

type Ctx = { params: Promise<{ id: string }> };

function parseBody(body: unknown): AdminCourseWriteInput | null {
  return parseAdminCourseWriteBody(body);
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
