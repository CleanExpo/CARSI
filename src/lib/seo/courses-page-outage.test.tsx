/**
 * Review of feat/seo-app-ready (18/10/2026): when the catalogue read failed, /courses still
 * printed "0 Published courses", "0 beginner, intermediate, and advanced courses" and an empty
 * ItemList — a false zero for a catalogue that is never legitimately empty. A failed read must
 * hide every count on the page: hero, stats, grid and structured data.
 *
 * Renders the real page with the database read throwing and the backend fetch failing.
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CourseListItem } from '@/lib/course-list-item';

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href }, children),
}));

const readDatabase = vi.fn<() => Promise<CourseListItem[]>>();
vi.mock('@/lib/server/public-courses-list', () => ({
  getPublishedCourseListItemsFromDatabase: () => readDatabase(),
}));

import CoursesPage from '../../../app/(public)/courses/page';

const COURSE = {
  id: 'c1',
  slug: 'introduction-to-water-damage-restoration',
  title: 'Introduction to Water Damage Restoration',
  short_description: 'Water damage basics.',
  price_aud: 49,
  is_free: false,
  status: 'published',
} as unknown as CourseListItem;

async function renderPage(): Promise<string> {
  const element = await CoursesPage({ searchParams: Promise.resolve({}) });
  return renderToStaticMarkup(element);
}

function jsonLd(html: string): Array<{ '@type': string }> {
  return Array.from(
    html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
    (m) => JSON.parse(m[1])
  );
}

describe('/courses when the catalogue read fails', () => {
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

  it('outage: states no count in the hero, stats or grid, and says the list is unavailable', async () => {
    readDatabase.mockRejectedValue(new Error('db down'));
    const html = await renderPage();
    expect(html).not.toMatch(/\b0\s+(?:beginner|courses?\b)/);
    expect(html).not.toContain('Published courses');
    expect(html).not.toContain('No courses found');
    expect(html).toContain('The course list could not be loaded right now.');
  });

  it('outage: emits no ItemList or FAQPage structured data', async () => {
    readDatabase.mockRejectedValue(new Error('db down'));
    const types = jsonLd(await renderPage()).map((j) => j['@type']);
    expect(types).not.toContain('ItemList');
    expect(types).not.toContain('FAQPage');
  });

  it('outage: an empty successful read is treated the same way', async () => {
    readDatabase.mockResolvedValue([]);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(JSON.stringify({ items: [], total: 0 }))))
    );
    const html = await renderPage();
    expect(html).not.toContain('Published courses');
    expect(jsonLd(html).map((j) => j['@type'])).not.toContain('ItemList');
  });

  it('available: a real read shows the count, the ItemList and the FAQPage (control)', async () => {
    readDatabase.mockResolvedValue([COURSE]);
    const html = await renderPage();
    expect(html).toContain('Published courses');
    expect(html).toMatch(/1 beginner, intermediate, and advanced course\b/);
    const types = jsonLd(html).map((j) => j['@type']);
    expect(types).toContain('ItemList');
    expect(types).toContain('FAQPage');
    expect(html).not.toContain('The course list could not be loaded right now.');
  });
});
