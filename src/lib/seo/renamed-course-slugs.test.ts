import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { RENAMED_COURSE_SLUGS, renamedCourseRedirect, renamedCourseSlug } from './renamed-course-slugs';

const REPO_ROOT = join(__dirname, '..', '..', '..');
const DESIGNATION_SLUG = /(?:^|-)(?:wrt|asd|amrt|fsrt|cct|tcst|rrt)(?:-|$)|applied-structural-drying|technician/;

describe('renamed course slugs', () => {
  it('maps every designation-branded slug to a clean one', () => {
    expect(Object.keys(RENAMED_COURSE_SLUGS).length).toBeGreaterThan(0);
    for (const [from, to] of Object.entries(RENAMED_COURSE_SLUGS)) {
      expect(DESIGNATION_SLUG.test(from)).toBe(true);
      expect(DESIGNATION_SLUG.test(to)).toBe(false);
      // A target that is itself renamed would chain redirects.
      expect(RENAMED_COURSE_SLUGS[to]).toBeUndefined();
    }
  });

  it('resolves an old slug, case- and whitespace-insensitively, and nothing else', () => {
    expect(renamedCourseSlug('wrt-water-damage-essentials')).toBe('water-damage-essentials');
    expect(renamedCourseSlug(' ASD-Structural-Drying-Core ')).toBe('structural-drying-core');
    expect(renamedCourseSlug('water-damage-essentials')).toBeNull();
    expect(renamedCourseSlug('constructor')).toBeNull();
  });

  describe('renamedCourseRedirect — decided by the database, never by a static rule', () => {
    const OLD = 'wrt-water-damage-essentials';
    const NEW = 'water-damage-essentials';
    const db =
      (rows: Record<string, boolean | null>) =>
      async (slug: string): Promise<boolean | null> =>
        slug in rows ? rows[slug] : false;
    const req = (path: string) => new NextRequest(`https://www.carsi.com.au${path}`);

    it('301s once the old row is gone and the new row exists, keeping sub-path and query', async () => {
      const res = await renamedCourseRedirect(req(`/courses/${OLD}?ref=iicrc`), db({ [NEW]: true }));
      expect(res?.status).toBe(301);
      expect(res?.headers.get('location')).toBe(`https://www.carsi.com.au/courses/${NEW}?ref=iicrc`);
      const sub = await renamedCourseRedirect(req(`/dashboard/courses/${OLD}/lessons/abc`), db({ [NEW]: true }));
      expect(sub?.headers.get('location')).toBe(`https://www.carsi.com.au/dashboard/courses/${NEW}/lessons/abc`);
      const learn = await renamedCourseRedirect(req(`/dashboard/learn/${OLD}`), db({ [NEW]: true }));
      expect(learn?.headers.get('location')).toBe(`https://www.carsi.com.au/dashboard/learn/${NEW}`);
    });

    it('serves the old slug untouched while the database still holds it (before the data edit)', async () => {
      expect(await renamedCourseRedirect(req(`/courses/${OLD}`), db({ [OLD]: true }))).toBeNull();
    });

    it('never redirects to a slug that does not exist yet', async () => {
      expect(await renamedCourseRedirect(req(`/courses/${OLD}`), db({}))).toBeNull();
    });

    it('fails open when the database cannot be asked', async () => {
      expect(await renamedCourseRedirect(req(`/courses/${OLD}`), db({ [OLD]: null, [NEW]: true }))).toBeNull();
    });

    it('does not query the database for a course that was never renamed', async () => {
      let calls = 0;
      const counting = async () => {
        calls++;
        return false;
      };
      expect(await renamedCourseRedirect(req('/courses/introduction-to-water-damage-principles'), counting)).toBeNull();
      expect(await renamedCourseRedirect(req(`/about/${OLD}`), counting)).toBeNull();
      expect(calls).toBe(0);
    });
  });

  it('covers every slug renamed in the seed catalogue (review round 4)', () => {
    expect(renamedCourseSlug('amrt-microbial-remediation-core')).toBe('microbial-remediation-core');
    expect(renamedCourseSlug('carpet-cleaning-technician-fundamentals')).toBe('carpet-cleaning-fundamentals');
  });

  it('redirects the AMRT seed slug only once the database holds the new one', async () => {
    const req = new NextRequest('https://www.carsi.com.au/courses/amrt-microbial-remediation-core');
    const before = async (slug: string) => slug === 'amrt-microbial-remediation-core';
    const after = async (slug: string) => slug === 'microbial-remediation-core';
    expect(await renamedCourseRedirect(req, before)).toBeNull();
    const res = await renamedCourseRedirect(req, after);
    expect(res?.status).toBe(301);
    expect(res?.headers.get('location')).toBe('https://www.carsi.com.au/courses/microbial-remediation-core');
  });

  it('keeps the SEO card under the new slug only, where the course has one', () => {
    for (const [from, to] of Object.entries(RENAMED_COURSE_SLUGS)) {
      if (!existsSync(join(REPO_ROOT, 'data/seo/course-cards', `${to}.json`)) &&
          !existsSync(join(REPO_ROOT, 'data/seo/course-cards', `${from}.json`))) continue;
      expect(existsSync(join(REPO_ROOT, 'data/seo/course-cards', `${to}.json`))).toBe(true);
      expect(existsSync(join(REPO_ROOT, 'data/seo/course-cards', `${from}.json`))).toBe(false);
    }
  });
});
