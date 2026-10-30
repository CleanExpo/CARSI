/**
 * Authority pages (/for/<industry>): six noindex drafts. Slice 3 of the CARSI Authority Machine.
 * A page is indexable and in the sitemap only when its registry entry is `approved`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/industries/IndustryRecommendedCourses', () => ({
  IndustryRecommendedCourses: () => null,
}));
vi.mock('@/lib/server/public-courses-list', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/public-courses-list')>()),
  getPublishedCourseSlugsFromDatabase: vi.fn(async () => []),
}));
vi.mock('@/lib/server/professional-directory', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/server/professional-directory')>()),
  getProfessionalDirectoryStatus: vi.fn(async () => ({
    live: false,
    listingCount: 0,
    source: 'none',
  })),
}));

import sitemap from '../../../app/sitemap';
import { buildAuthorityMetadata } from './authority-metadata';
import {
  approvedAuthorityPages,
  authorityPages,
  authoritySitemapPaths,
  validateAuthorityPage,
  type AuthorityPageEntry,
} from './authority-pages';
import { AuthorityPageView } from '@/components/industries/AuthorityPageView';

const ROOT = join(__dirname, '..', '..', '..');
const catalogue = (
  JSON.parse(readFileSync(join(ROOT, 'data', 'seed', 'courses-catalog.json'), 'utf8')) as {
    courses: Array<{ slug: string; status: string }>;
  }
).courses;
const liveSlugs = new Set(catalogue.filter((c) => c.status === 'published').map((c) => c.slug));

const EXPECTED_SLUGS = [
  'nsw-builders',
  'insurance-claims-staff',
  'facility-managers',
  'healthcare-facilities',
  'property-and-strata-managers',
  'commercial-cleaning-contractors',
];

function approved(entry: AuthorityPageEntry): AuthorityPageEntry {
  return { ...entry, status: 'approved', approvedBy: 'Phill', approvedAt: '2026-10-29' };
}

describe('registry', () => {
  it('holds exactly the six industries and every one defaults to draft', () => {
    expect(authorityPages.map((p) => p.slug).sort()).toEqual([...EXPECTED_SLUGS].sort());
    for (const p of authorityPages) {
      expect(p.status, p.slug).toBe('draft');
      expect(p.approvedBy, p.slug).toBeNull();
      expect(p.approvedAt, p.slug).toBeNull();
    }
    expect(approvedAuthorityPages()).toEqual([]);
  });

  it('every linked course is a published course in the catalogue', () => {
    for (const p of authorityPages) {
      expect(p.bundle.publishedSlugs.length, p.slug).toBeGreaterThan(0);
      expect(new Set(p.bundle.publishedSlugs).size, p.slug).toBe(p.bundle.publishedSlugs.length);
      for (const slug of p.bundle.publishedSlugs) {
        expect(liveSlugs.has(slug), `${p.slug} -> ${slug}`).toBe(true);
      }
    }
  });

  it('planned modules carry no price and are marked not built', () => {
    for (const p of authorityPages) {
      for (const m of p.bundle.plannedModules) {
        expect(m.status).toBe('not_built');
        expect(Object.keys(m).sort()).toEqual(['minutes', 'status', 'title']);
      }
    }
  });

  it('every claim is an O-tagged, dated, https-sourced entry', () => {
    for (const p of authorityPages) {
      expect(p.claims.length, p.slug).toBeGreaterThan(0);
      for (const c of p.claims) {
        expect(c.tag, `${p.slug}: ${c.text}`).toBe('O');
        expect(c.sourceUrl, `${p.slug}: ${c.text}`).toMatch(/^https:\/\//);
        expect(c.lastVerified, `${p.slug}: ${c.text}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(c.text.length).toBeGreaterThan(20);
      }
    }
  });
});

describe('noindex gate', () => {
  it('a draft is noindex,nofollow', () => {
    for (const p of authorityPages) {
      expect(buildAuthorityMetadata(p).robots).toEqual({ index: false, follow: false });
    }
  });

  it('only an approved entry becomes indexable', () => {
    const robots = buildAuthorityMetadata(approved(authorityPages[0])).robots;
    expect(robots).toEqual({ index: true, follow: true });
  });

  it('every page file exports the registry-driven metadata (noindex while draft)', async () => {
    for (const p of authorityPages) {
      const file = join(ROOT, 'app', '(public)', 'for', p.slug, 'page.tsx');
      expect(existsSync(file), file).toBe(true);
      const mod = (await import(
        /* @vite-ignore */ `../../../app/(public)/for/${p.slug}/page`
      )) as { metadata: { robots: unknown } };
      expect(mod.metadata.robots, p.slug).toEqual({ index: false, follow: false });
    }
  });
});

describe('sitemap', () => {
  it('lists no /for/ URL while all are draft', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.filter((u) => u.includes('/for/'))).toEqual([]);
  });

  it('lists exactly the approved entries', () => {
    const pages = [approved(authorityPages[1]), authorityPages[0]];
    expect(authoritySitemapPaths(pages)).toEqual([`/for/${authorityPages[1].slug}`]);
    expect(authoritySitemapPaths(authorityPages)).toEqual([]);
  });
});

describe('approval guard', () => {
  const now = new Date('2026-11-01T00:00:00Z');

  it('accepts a draft with a clean entry', () => {
    for (const p of authorityPages) expect(validateAuthorityPage(p, now), p.slug).toEqual([]);
  });

  it('rejects approval without approvedBy/approvedAt', () => {
    const e = { ...authorityPages[0], status: 'approved' as const };
    expect(validateAuthorityPage(e, now).join(' ')).toMatch(/approvedBy/);
  });

  it('rejects approval with an empty bundle', () => {
    const e = approved({
      ...authorityPages[0],
      bundle: { ...authorityPages[0].bundle, publishedSlugs: [] },
    });
    expect(validateAuthorityPage(e, now).join(' ')).toMatch(/published course/);
  });

  it('rejects approval with a claim older than 90 days or missing a source', () => {
    const old = approved({
      ...authorityPages[0],
      claims: [{ ...authorityPages[0].claims[0], lastVerified: '2026-06-01' }],
    });
    expect(validateAuthorityPage(old, now).join(' ')).toMatch(/90 days/);
    const noSrc = approved({
      ...authorityPages[0],
      claims: [{ ...authorityPages[0].claims[0], sourceUrl: '' }],
    });
    expect(validateAuthorityPage(noSrc, now).join(' ')).toMatch(/sourceUrl/);
  });

  it('rejects an approved entry linking a course that is not published', () => {
    const e = approved({
      ...authorityPages[0],
      bundle: { ...authorityPages[0].bundle, publishedSlugs: ['no-such-course'] },
    });
    expect(validateAuthorityPage(e, now, liveSlugs).join(' ')).toMatch(/no-such-course/);
  });
});

// Strings that must never appear on any page (spec section 3 and the CARSI licence rules).
const NEVER = [
  /approved CPD/i,
  /counts? toward(s)? (your|their|mandatory) (licence )?CPD/i,
  /earns? (CIP|CPD) points/i,
  /(ANZIIF|AICLA|REIV|REINSW|SCA)[- ]+(endorsed|accredited|approved)/i,
  /endorsed by (ANZIIF|AICLA|REIV|REINSW|SCA)/i,
  /code[- ]compliant/i,
  /meets? (the )?insurer requirements/i,
  /certified mould assessor/i,
  /legal advice/i,
  /satisf(y|ies) disclosure law/i,
  /CARSI (offers|delivers|provides|sells|runs) IICRC (courses|training|certification)/i,
  /IICRC[- ]accredited/i,
  /IICRC[- ]approved/i,
  /IICRC[- ]certified/i,
  // Built from fragments so the repo-wide terminology guards do not flag this list itself.
  new RegExp(['IICRC', 'certification', 'course'].join('\\s+'), 'i'),
  new RegExp(['get', 'IICRC', 'certified'].join('\\s+'), 'i'),
  /\b(WRT|ASD|AMRT|FSRT|CCT|CRT|OCT|TCST|RRT)\b/,
  /\b\d+(\.\d+)?\s*(CEC|CPD)\s*(hours?|points?)/i,
  /\$\s?\d/,
  /\bA\$\d/,
  /testimonial/i,
  /\p{Extended_Pictographic}/u,
];

describe('never-claim strings', () => {
  const rendered = authorityPages.map((p) => ({
    slug: p.slug,
    html: renderToStaticMarkup(createElement(AuthorityPageView, { entry: p })),
  }));

  it('renders every page with substantive content', () => {
    for (const r of rendered) {
      expect(r.html.length, r.slug).toBeGreaterThan(3000);
      expect(r.html, r.slug).toContain('<h1');
    }
  });

  it('no page, registry text or page source contains a never-claim string', () => {
    for (const p of authorityPages) {
      const html = rendered.find((r) => r.slug === p.slug)!.html;
      const src = readFileSync(join(ROOT, 'app', '(public)', 'for', p.slug, 'page.tsx'), 'utf8');
      const registryText = JSON.stringify(p);
      for (const re of NEVER) {
        expect(re.test(html), `${p.slug} html ${re}`).toBe(false);
        expect(re.test(registryText), `${p.slug} registry ${re}`).toBe(false);
        expect(re.test(src), `${p.slug} source ${re}`).toBe(false);
      }
    }
  });

  it('property and strata page says it is not regulated CPD', () => {
    const html = rendered.find((r) => r.slug === 'property-and-strata-managers')!.html;
    expect(html).toMatch(/not regulated (agent )?CPD|not offered as regulated/i);
  });

  it('draft pages show a visible draft banner and name each claim source', () => {
    for (const p of authorityPages) {
      const html = rendered.find((r) => r.slug === p.slug)!.html;
      expect(html).toMatch(/Draft/);
      for (const c of p.claims) expect(html).toContain(c.sourceUrl.replace(/&/g, '&amp;'));
    }
  });
});
