import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(async (): Promise<unknown[]> => []),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: { lmsCourse: { findMany } },
}));

import { getPublishedCourseListItemsFromDatabase } from './public-courses-list';
import { formatCurrentCecHoursLabel, formatLmsCourseCecHoursLabel } from './course-cec-hours';
import { getCecApprovalEntries, selectCurrentCecCourses } from '@/lib/seed/cec-approvals';

/**
 * GP-653. The catalogue resolved CEC hours from the approvals registry without reading
 * `expiresAt`, so a lapsed approval kept its "N CECs" label and its place under the
 * "IICRC CEC" tab, while the /courses hero count (selectCurrentCecCourses) dropped it.
 * Public listings must show CEC hours only for an approval in force today.
 */

const EARLIEST = [...getCecApprovalEntries()]
  .filter((e) => e.status === 'approved' && e.expiresAt)
  .sort((a, b) => String(a.expiresAt).localeCompare(String(b.expiresAt)))[0];
const EXPIRES = new Date(`${EARLIEST.expiresAt}T00:00:00Z`);
const DAY_BEFORE = new Date(EXPIRES.getTime() - 24 * 3600 * 1000);
const SAME_HOURS_LATER = new Date(EXPIRES.getTime() + 1000);

function row(slug: string) {
  return {
    id: slug,
    slug,
    title: slug,
    shortDescription: null,
    description: null,
    priceAud: { toString: () => '29' },
    isFree: false,
    iicrcDiscipline: null,
    thumbnailUrl: null,
    level: null,
    category: null,
    tags: [],
    status: 'published',
    cecHours: null,
    durationHours: null,
    updatedAt: new Date('2026-10-18T00:00:00Z'),
    instructor: null,
    _count: { modules: 1 },
    modules: [{ _count: { lessons: 1 } }],
  };
}

// Every approved registry slug, so the expired ones and the ones still in force are both present.
const ROWS = getCecApprovalEntries()
  .filter((e) => e.status === 'approved')
  .map((e) => row(e.slug));

beforeEach(() => {
  findMany.mockReset();
  findMany.mockResolvedValue(ROWS);
  process.env.DATABASE_URL = 'postgres://test:test@127.0.0.1:5432/test';
  delete process.env.NEXT_PHASE;
});

afterEach(() => {
  vi.useRealTimers();
});

async function catalogueAt(now: Date) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
  const items = await getPublishedCourseListItemsFromDatabase();
  const labelled = items
    .filter((c) => Boolean(c.cec_hours?.trim()))
    .map((c) => c.slug)
    .sort();
  const hero = selectCurrentCecCourses(items)
    .map((c) => c.course.slug)
    .sort();
  return { labelled, hero };
}

describe('public catalogue CEC hours follow approval expiry (GP-653)', () => {
  it('the earliest-expiring course is labelled the day before it lapses', async () => {
    const { labelled } = await catalogueAt(DAY_BEFORE);
    expect(labelled).toContain(EARLIEST.slug);
  });

  it('once an approval lapses its course loses the CEC label, so it leaves the IICRC CEC tab', async () => {
    const { labelled } = await catalogueAt(SAME_HOURS_LATER);
    expect(labelled).not.toContain(EARLIEST.slug);
  });

  it('the labelled courses equal the hero count set before and after the expiry', async () => {
    for (const now of [DAY_BEFORE, SAME_HOURS_LATER]) {
      const { labelled, hero } = await catalogueAt(now);
      expect(labelled, now.toISOString()).toEqual(hero);
    }
    const before = await catalogueAt(DAY_BEFORE);
    const after = await catalogueAt(SAME_HOURS_LATER);
    expect(after.labelled.length).toBeLessThan(before.labelled.length);
  });

  it('formatCurrentCecHoursLabel is null after expiry; the certificate resolver keeps the approved hours', () => {
    const course = { slug: EARLIEST.slug, cecHours: null };
    expect(formatCurrentCecHoursLabel(course, DAY_BEFORE)).not.toBeNull();
    expect(formatCurrentCecHoursLabel(course, SAME_HOURS_LATER)).toBeNull();
    // Certificates and credentials record hours earned while the approval was in force.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(SAME_HOURS_LATER);
    expect(formatLmsCourseCecHoursLabel(course)).not.toBeNull();
  });
});
