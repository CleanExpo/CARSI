/**
 * Catch-all for `/api/lms/*` not implemented as a dedicated route.
 * Returns minimal JSON stubs so optional LMS UI calls do not 404.
 */

import { NextRequest, NextResponse } from 'next/server';

type Ctx = { params: Promise<{ path?: string[] }> };

type StubLessonNote = {
  id: string;
  lesson_id: string;
  lesson_title: string;
  module_title: string | null;
  course_title: string;
  course_slug: string;
  content: string | null;
  updated_at: string | null;
};

const notesStore = new Map<string, StubLessonNote>();

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

async function localStub(
  method: string,
  segments: string[],
  request?: NextRequest
): Promise<NextResponse | null> {
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

  if (method === 'GET' && key === 'subscription/status') {
    return NextResponse.json({
      has_subscription: false,
      status: null,
      plan: null,
      current_period_end: null,
      trial_end: null,
    });
  }

  if (method === 'GET' && key === 'gamification/me/level') {
    return NextResponse.json({
      total_xp: 0,
      current_level: 1,
      level_title: 'Getting started',
      current_streak: 0,
      longest_streak: 0,
      xp_to_next_level: 100,
      total_cec_lifetime: 0,
    });
  }

  if (method === 'POST' && key === 'subscription/portal') {
    return NextResponse.json({ url: '' });
  }

  if (method === 'POST' && key === 'subscription/checkout') {
    // Avoid 503 so the client can show a message instead of a generic network error.
    return NextResponse.json({ url: '' });
  }

  if (method === 'GET' && key === 'notifications/me') {
    return NextResponse.json({ notifications: [], unread_count: 0 });
  }

  if (method === 'POST' && key === 'notifications/me/read-all') {
    return NextResponse.json({ ok: true });
  }

  if (method === 'PATCH' && segments[0] === 'notifications' && segments[2] === 'read') {
    return NextResponse.json({ ok: true });
  }

  if (method === 'GET' && key === 'notes/me') {
    const notes = Array.from(notesStore.values()).sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      return tb - ta;
    });
    return NextResponse.json(notes);
  }

  if (method === 'PUT' && segments[0] === 'notes' && segments[1]) {
    const lessonId = segments[1];
    let content = '';
    let courseSlug: string | undefined;
    let courseTitle: string | undefined;
    let lessonTitle: string | undefined;
    let moduleTitle: string | null | undefined;
    try {
      const body = (await request?.json()) as
        | {
            content?: unknown;
            course_slug?: unknown;
            course_title?: unknown;
            lesson_title?: unknown;
            module_title?: unknown;
          }
        | undefined;
      content = typeof body?.content === 'string' ? body.content : '';
      courseSlug =
        typeof body?.course_slug === 'string' && body.course_slug.trim()
          ? body.course_slug
          : undefined;
      courseTitle =
        typeof body?.course_title === 'string' && body.course_title.trim()
          ? body.course_title
          : undefined;
      lessonTitle =
        typeof body?.lesson_title === 'string' && body.lesson_title.trim()
          ? body.lesson_title
          : undefined;
      moduleTitle =
        typeof body?.module_title === 'string' && body.module_title.trim()
          ? body.module_title
          : undefined;
    } catch {
      content = '';
    }

    const now = new Date().toISOString();
    const existing = notesStore.get(lessonId);
    const next: StubLessonNote = {
      id: `stub-note-${lessonId}`,
      lesson_id: lessonId,
      lesson_title: lessonTitle ?? existing?.lesson_title ?? 'Lesson note',
      module_title: moduleTitle ?? existing?.module_title ?? null,
      course_title: courseTitle ?? existing?.course_title ?? 'Course',
      course_slug: courseSlug ?? existing?.course_slug ?? 'course',
      content,
      updated_at: now,
    };
    notesStore.set(lessonId, next);
    return NextResponse.json(next);
  }

  if (method === 'DELETE' && segments[0] === 'notes' && segments[1]) {
    notesStore.delete(segments[1]);
    return NextResponse.json({ ok: true });
  }

  return null;
}

function notConfiguredResponse(): NextResponse {
  return NextResponse.json(
    { detail: 'This LMS endpoint is not implemented in this app build.' },
    { status: 503 }
  );
}

async function handle(method: string, ctx: Ctx, request?: NextRequest): Promise<NextResponse> {
  const { path = [] } = await ctx.params;

  const stub = await localStub(method, path, request);
  if (stub) return stub;

  return notConfiguredResponse();
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  return handle('GET', ctx, _request);
}

export async function POST(request: NextRequest, ctx: Ctx) {
  return handle('POST', ctx, request);
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  return handle('PATCH', ctx, request);
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  return handle('PUT', ctx, request);
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  return handle('DELETE', ctx, request);
}
