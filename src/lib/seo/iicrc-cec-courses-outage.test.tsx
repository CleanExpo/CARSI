/**
 * Codex review of feat/seo-app-ready-v2 (round 5): with the catalogue unreadable, /iicrc-cec-courses
 * still said "Courses not listed here show no CEC hours, because the IICRC has not approved them"
 * and emitted an empty ItemList. Empty rows there mean an unreadable catalogue, not a lapsed or
 * absent approval. Same outage rule as /courses: only the "not available right now" message.
 *
 * Renders the real page with the database read throwing and the backend fetch failing.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CourseListItem } from '@/lib/course-list-item';
import { getCecApprovalEntries, isCecApprovalCurrent } from '@/lib/seed/cec-approvals';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href }, children),
}));

const readDatabase = vi.fn<() => Promise<CourseListItem[]>>();
vi.mock('@/lib/server/public-courses-list', () => ({
  getPublishedCourseListItemsFromDatabase: () => readDatabase(),
}));

import IicrcCecCoursesPage from '../../../app/(public)/iicrc-cec-courses/page';

const EXPLANATION = 'Courses not listed here show no CEC hours';
const UNAVAILABLE = 'The list is not available right now.';

const approved = getCecApprovalEntries().find(
  (e) => e.status === 'approved' && isCecApprovalCurrent(e)
)!;
const APPROVED_COURSE = {
  id: 'c1',
  slug: approved.slug,
  title: 'An approved course',
  short_description: 'Approved.',
  price_aud: 49,
  is_free: false,
} as unknown as CourseListItem;

async function renderPage(): Promise<string> {
  return renderToStaticMarkup(await IicrcCecCoursesPage());
}

function jsonLdTypes(html: string): string[] {
  return Array.from(
    html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
    (m) => (JSON.parse(m[1]) as { '@type': string })['@type']
  );
}

describe('/iicrc-cec-courses when the catalogue read fails', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', 'postgres://test');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('backend down')))
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    readDatabase.mockReset();
  });

  it('cec outage: shows only the unavailable message, no approval explanation, no list schema', async () => {
    readDatabase.mockRejectedValue(new Error('db down'));
    const html = await renderPage();
    expect(html).toContain(UNAVAILABLE);
    expect(html).not.toContain(EXPLANATION);
    const types = jsonLdTypes(html);
    expect(types).not.toContain('ItemList');
    expect(types).not.toContain('FAQPage');
  });

  it('cec outage: a working read shows the explanation and the list schema (control)', async () => {
    readDatabase.mockResolvedValue([APPROVED_COURSE]);
    const html = await renderPage();
    expect(html).not.toContain(UNAVAILABLE);
    expect(html).toContain(EXPLANATION);
    expect(html).toContain('An approved course');
    expect(jsonLdTypes(html)).toContain('ItemList');
  });

  it('cec outage: a working read with no approved course emits no empty list schema', async () => {
    readDatabase.mockResolvedValue([
      { ...APPROVED_COURSE, slug: 'a-course-with-no-cec-approval', title: 'Unapproved' },
    ]);
    const html = await renderPage();
    expect(html).toContain('No CARSI course has an IICRC CEC approval in force right now.');
    expect(html).toContain(EXPLANATION);
    expect(jsonLdTypes(html)).not.toContain('ItemList');
  });
});
