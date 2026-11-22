/**
 * GP-776 course publish gate. The ledger and visuals checks run for real (the CI checkers'
 * own functions) against a fixture repository root; only the database is mocked.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

const db = vi.hoisted(() => ({
  course: null as null | Record<string, unknown>,
  approvals: [] as Record<string, unknown>[],
  session: { email: 'reviewer@carsi.example' } as { email: string } | null,
}));

const tx = vi.hoisted(() => {
  const clone = <T>(v: T): T => (v == null ? v : structuredClone(v));
  const known = {
    $executeRaw: async () => 1,
    lmsCourse: {
      findUnique: async () => clone(db.course),
      findUniqueOrThrow: async () => clone(db.course),
      // priceAud arrives as a Prisma Decimal, which structuredClone cannot copy; store a number.
      update: async ({ data }: { data: Row }) =>
        Object.assign(db.course!, data, 'priceAud' in data ? { priceAud: Number(data.priceAud) } : {}),
    },
    lmsCourseApproval: {
      create: async ({ data }: { data: Row }) => {
        const row = { id: crypto.randomUUID(), createdAt: new Date(), approvalRef: null, ...data };
        db.approvals.push(row);
        return row;
      },
      findFirst: async ({ where }: { where: Row }) =>
        [...db.approvals].reverse().find((a) => a.courseRef === where.courseRef && a.action === where.action) ?? null,
    },
  };
  // Any other model call made inside the update transaction (module and lesson sync) succeeds
  // without changing the stored course, so only the course row itself can change content here.
  const permissive = (target: Row): Row =>
    new Proxy(target, {
      get(t, model: string) {
        if (model in t) return t[model];
        return new Proxy({}, { get: (_o, method: string) => async () => (String(method).startsWith('findMany') ? [] : {}) });
      },
    });
  return permissive(known as unknown as Row);
});

vi.mock('@/lib/prisma', () => ({
  prisma: new Proxy(
    {},
    {
      get(_t, key: string) {
        if (key === '$transaction') return async (run: (t: unknown) => unknown) => run(tx);
        return (tx as Row)[key];
      },
    }
  ),
}));
vi.mock('@/lib/admin/admin-session', () => ({ getAdminSessionOrNull: async () => db.session }));
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('@/lib/admin/admin-courses-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin/admin-courses-service')>();
  return {
    ...actual,
    adminGetCourse: async () => (db.course ? structuredClone(db.course) : null),
    courseToAdminDto: (c: Row) => ({ id: c.id, status: c.status, published: c.isPublished === true }),
  };
});

const service = await import('@/lib/admin/admin-courses-service');
const gate = await import('@/lib/admin/course-publish-gate');
const workflowRoute = await import('../../../app/api/admin/courses/[id]/workflow/route');
const coursesRoute = await import('../../../app/api/admin/courses/route');
const courseRoute = await import('../../../app/api/admin/courses/[id]/route');

const SLUG = 'demo-gate-course';
const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gp776-gate-'));

const verified = {
  id: 'D-001', claim: 'Drying goals are set from a dry reference.', claim_class: 'technical',
  surface: `course:${SLUG}`, status: 'VERIFIED', feeds: [SLUG],
  source_url: 'https://www.example.gov.au/drying', access_date: '2026-11-01', quote: 'Set drying goals from a dry reference.',
};
const gap = {
  id: 'D-002', claim: 'A claim still being checked.', claim_class: 'technical', surface: `course:${SLUG}`,
  status: 'GAP', feeds: [SLUG], reason: 'No primary source yet', recommended_action: 'substantiate', check_owner: 'Phill',
};

function writeLedger(rows: Row[]) {
  const dir = path.join(root, 'data/courses', SLUG, 'evidence');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'evidence-ledger.jsonl'), rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
}
function writeVisuals() {
  const pub = path.join(root, 'public/courses', SLUG);
  fs.mkdirSync(path.join(pub, 'images'), { recursive: true });
  fs.mkdirSync(path.join(pub, 'diagrams'), { recursive: true });
  fs.writeFileSync(path.join(pub, 'cover.png'), 'png');
  fs.writeFileSync(path.join(pub, 'images/l1.png'), 'png');
  fs.writeFileSync(path.join(pub, 'diagrams/d1.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
}

const GOOD_BODY =
  `<p>Measure the dry reference before setting goals.</p>` +
  `<img src="/courses/${SLUG}/images/l1.png" alt="Meter on a wall">` +
  `<img src="/courses/${SLUG}/diagrams/d1.svg" alt="Drying goal diagram">`;

function course(overrides: Row = {}, body = GOOD_BODY): Row {
  return {
    id: COURSE_ID, slug: SLUG, title: 'Drying goals', description: 'Set drying goals.', shortDescription: null,
    thumbnailUrl: `/courses/${SLUG}/cover.png`, status: 'in_review', isPublished: false, meta: null,
    priceAud: 99, isFree: false, updatedAt: new Date(),
    modules: [{
      id: '22222222-2222-4222-8222-222222222222', title: 'Goals', orderIndex: 0,
      lessons: [{ id: '33333333-3333-4333-8333-333333333333', title: 'Dry reference', contentType: 'text',
        contentBody: body, orderIndex: 0, isPreview: true, resources: null }],
    }],
    quizzes: [],
    ...overrides,
  };
}

const post = (url: string, body: unknown, method = 'POST') =>
  new NextRequest(`https://example.test${url}`, { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
const ctx = { params: Promise.resolve({ id: COURSE_ID }) };
async function workflow(action: string) {
  const res = await workflowRoute.POST(post(`/api/admin/courses/${COURSE_ID}/workflow`, { action }), ctx);
  return { status: res.status, body: (await res.json()) as { blockers?: { check: string; message: string }[] } };
}
function approveCurrent(actorEmail = 'reviewer@carsi.example') {
  db.approvals.push({ id: randomUUID(), courseRef: COURSE_ID, courseSlug: SLUG, action: 'approve', actorEmail,
    contentSha256: gate.courseContentSha256(db.course as never), approvalRef: null, createdAt: new Date() });
}

beforeEach(() => {
  fs.rmSync(path.join(root, 'data'), { recursive: true, force: true });
  fs.rmSync(path.join(root, 'public'), { recursive: true, force: true });
  writeLedger([verified]);
  writeVisuals();
  db.course = course();
  db.approvals = [];
  db.session = { email: 'reviewer@carsi.example' };
  vi.spyOn(process, 'cwd').mockReturnValue(root);
  vi.stubEnv('DATABASE_URL', 'unused-mocked-database');
});
afterAll(() => {
  vi.unstubAllEnvs();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('workflow publish gate', () => {
  it('refuses publish from draft', async () => {
    db.course = course({ status: 'draft' });
    approveCurrent();
    const r = await workflow('publish');
    expect(r.status).toBe(409);
    expect(r.body.blockers?.map((b) => b.check)).toContain('workflow');
    expect(db.course!.status).toBe('draft');
    expect(db.approvals.filter((a) => a.action === 'publish')).toHaveLength(0);
  });

  it('refuses publish while the evidence ledger has an open GAP row', async () => {
    writeLedger([verified, gap]);
    approveCurrent();
    const r = await workflow('publish');
    expect(r.status).toBe(409);
    const evidence = r.body.blockers?.filter((b) => b.check === 'evidence') ?? [];
    expect(evidence).toHaveLength(1);
    expect(evidence[0].message).toMatch(/1 open GAP row \(D-002\)/);
    expect(db.course!.status).toBe('in_review');
  });

  it('refuses publish when the course has no evidence ledger', async () => {
    fs.rmSync(path.join(root, 'data'), { recursive: true, force: true });
    approveCurrent();
    const r = await workflow('publish');
    expect(r.status).toBe(409);
    expect(r.body.blockers?.find((b) => b.check === 'evidence')?.message).toMatch(/No evidence ledger/);
  });

  it('refuses publish when a lesson has no diagram', async () => {
    db.course = course({}, `<p>Body</p><img src="/courses/${SLUG}/images/l1.png" alt="x">`);
    approveCurrent();
    const r = await workflow('publish');
    expect(r.status).toBe(409);
    expect(r.body.blockers?.map((b) => b.check)).toEqual(['visuals']);
    expect(r.body.blockers?.[0].message).toMatch(/no course diagram \(Dry reference\)/);
  });

  it('refuses publish with no approval record', async () => {
    const r = await workflow('publish');
    expect(r.status).toBe(409);
    expect(r.body.blockers?.map((b) => b.check)).toEqual(['approval']);
    expect(db.course!.isPublished).toBe(false);
  });

  it('refuses publish when the content changed after approval', async () => {
    approveCurrent();
    (db.course as Row).title = 'Drying goals (edited)';
    const r = await workflow('publish');
    expect(r.status).toBe(409);
    expect(r.body.blockers?.[0]).toMatchObject({ check: 'approval' });
    expect(r.body.blockers?.[0].message).toMatch(/changed after reviewer@carsi\.example approved it/);
  });

  it('refuses publish when the intro video changed after approval', async () => {
    approveCurrent();
    (db.course as Row).meta = { introVideoUrl: 'https://video.example/new.mp4' };
    const r = await workflow('publish');
    expect(r.status).toBe(409);
    expect(r.body.blockers?.map((b) => b.check)).toEqual(['approval']);
  });

  it('refuses publish when a non-approved course mentions IICRC', async () => {
    db.course = course({}, `${GOOD_BODY}<p>Follow the IICRC S500 drying goals.</p>`);
    approveCurrent();
    const r = await workflow('publish');
    expect(r.status).toBe(409);
    expect(r.body.blockers?.map((b) => b.check)).toEqual(['compliance']);
  });

  it('refuses publish when a non-approved course carries an IICRC discipline', async () => {
    db.course = course({ iicrcDiscipline: 'WRT' });
    approveCurrent();
    const r = await workflow('publish');
    expect(r.status).toBe(409);
    expect(r.body.blockers?.map((b) => b.check)).toEqual(['compliance']);
    expect(r.body.blockers?.[0].message).toMatch(/IICRC discipline field/);
  });

  it('refuses approve outside review', async () => {
    db.course = course({ status: 'draft' });
    const r = await workflow('approve');
    expect(r.status).toBe(409);
    expect(db.approvals).toHaveLength(0);
  });

  it('publishes when every check passes, recording the approver and the publisher', async () => {
    const approved = await workflow('approve');
    expect(approved.status).toBe(200);
    db.session = { email: 'publisher@carsi.example' };
    const r = await workflow('publish');
    expect(r.status).toBe(200);
    expect(db.course).toMatchObject({ status: 'published', isPublished: true });
    const approval = db.approvals.find((a) => a.action === 'approve');
    const published = db.approvals.find((a) => a.action === 'publish');
    expect(approval).toMatchObject({ actorEmail: 'reviewer@carsi.example', courseRef: COURSE_ID, courseSlug: SLUG });
    expect(approval!.contentSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(published).toMatchObject({ actorEmail: 'publisher@carsi.example', approvalRef: approval!.id,
      contentSha256: approval!.contentSha256 });
  });
});

describe('other publish paths', () => {
  it('POST /api/admin/courses refuses published: true and writes nothing', async () => {
    const before = structuredClone(db.course);
    const res = await coursesRoute.POST(post('/api/admin/courses', {
      title: 'AI draft', published: true, isFree: true, priceAud: 0, modules: [{ title: 'M1', textContent: 'Body' }],
    }));
    expect(res.status).toBe(409);
    expect(((await res.json()) as { detail: string }).detail).toMatch(/created as drafts/);
    expect(db.course).toEqual(before);
  });

  it('PATCH cannot publish a draft course', async () => {
    db.course = course({ status: 'draft' });
    const res = await courseRoute.PATCH(post(`/api/admin/courses/${COURSE_ID}`, {
      title: 'Drying goals', published: true, isFree: false, priceAud: 99, modules: [{ title: 'Goals', textContent: 'Body' }],
    }, 'PATCH'), ctx);
    expect(res.status).toBe(409);
    expect(db.course!.status).toBe('draft');
  });

  it('bulk PATCH refuses to publish', async () => {
    const res = await coursesRoute.PATCH(post('/api/admin/courses', { courseIds: [COURSE_ID], published: true }, 'PATCH'));
    expect(res.status).toBe(409);
  });

  it('blocks a content edit to a published course and allows a price-only save', async () => {
    db.course = course({ status: 'published', isPublished: true });
    const base = { published: true, isFree: false, priceAud: 120, thumbnailUrl: `/courses/${SLUG}/cover.png`,
      modules: [{ id: '22222222-2222-4222-8222-222222222222', title: 'Goals', textContent: 'Body' }] };
    await expect(service.adminUpdateCourse(COURSE_ID, { ...base, title: 'Drying goals, rewritten' } as never))
      .rejects.toThrow('PUBLISHED_COURSE_CONTENT_LOCKED');
    db.course = course({ status: 'published', isPublished: true });
    await expect(service.adminUpdateCourse(COURSE_ID, { ...base, title: 'Drying goals', description: 'Set drying goals.' } as never))
      .resolves.toBeTruthy();
  });
});
