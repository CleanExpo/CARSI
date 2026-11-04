/**
 * Authority pages (/for/<industry>): six noindex drafts. Slice 3 of the CARSI Authority Machine.
 * A page is indexable and in the sitemap only when its registry entry is `approved`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Course rows come from a mocked Prisma client fed with the seed catalogue, so the real loader
// (getIndustryCoursesBySlugs) and the real course cards render. `hiddenSlugs` lets a test make
// a configured course disappear from the published list, as it does on the live site today.
const db = vi.hoisted(() => ({
  hiddenSlugs: new Set<string>(),
  fail: false,
  calls: 0,
}));
vi.mock('@/lib/prisma', async () => {
  const { readFileSync: read } = await import('node:fs');
  const { join: j } = await import('node:path');
  const rows = (
    JSON.parse(
      read(j(__dirname, '..', '..', '..', 'data', 'seed', 'courses-catalog.json'), 'utf8')
    ) as {
      courses: Array<Record<string, unknown> & { slug: string; status: string }>;
    }
  ).courses;
  return {
    prisma: {
      lmsCourse: {
        findMany: vi.fn(async (args: { where: { slug?: { in: string[] } } }) => {
          db.calls += 1;
          if (db.fail) throw new Error('database unavailable');
          const wanted = new Set(args.where.slug?.in ?? []);
          return rows.filter(
            (r) => r.status === 'published' && wanted.has(r.slug) && !db.hiddenSlugs.has(r.slug)
          );
        }),
      },
    },
  };
});
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
import { authorityMetadata, buildAuthorityMetadata } from './authority-metadata';
import {
  authorityPages,
  authoritySitemapPaths,
  isAuthorityPagePublishable,
  validateAuthorityPage,
  type AuthorityPageEntry,
} from './authority-pages';
import { AuthorityPage } from '@/components/industries/AuthorityPage';
import { AuthorityPageView } from '@/components/industries/AuthorityPageView';

process.env.DATABASE_URL ||= 'postgresql://test-only-placeholder/none';

const ROOT = join(__dirname, '..', '..', '..');
const catalogue = (
  JSON.parse(readFileSync(join(ROOT, 'data', 'seed', 'courses-catalog.json'), 'utf8')) as {
    courses: Array<{ slug: string; status: string }>;
  }
).courses;
const liveSlugs = new Set(catalogue.filter((c) => c.status === 'published').map((c) => c.slug));
const catalogueBySlug = new Map(
  (catalogue as Array<{ slug: string; priceAud: string; isFree: boolean }>).map((c) => [c.slug, c])
);

const HERO = { src: '/images/for/test-hero.jpg', alt: 'A technician reads a moisture meter' };

/** Render a page the way production does: real loader, real cards. */
async function renderPage(slug: string): Promise<string> {
  return renderToStaticMarkup(await AuthorityPage({ slug }));
}

/** Course slugs linked as cards in the rendered HTML. */
function cardSlugs(html: string): string[] {
  return [...new Set([...html.matchAll(/href="\/courses\/([a-z0-9-]+)"/g)].map((m) => m[1]))];
}

/** The number shown beside "Live courses linked below". */
function liveCountStat(html: string): number {
  const m = html.match(/>(\d+)<\/p><p[^>]*>Live courses linked below/);
  if (!m) throw new Error('live course stat not found');
  return Number(m[1]);
}

const EXPECTED_SLUGS = [
  'nsw-builders',
  'insurance-claims-staff',
  'facility-managers',
  'healthcare-facilities',
  'property-and-strata-managers',
  'commercial-cleaning-contractors',
];

function approved(entry: AuthorityPageEntry): AuthorityPageEntry {
  return {
    ...entry,
    status: 'approved',
    approvedBy: 'Phill',
    approvedAt: '2026-10-29',
    heroImage: HERO,
  };
}

/** Claims re-dated so the 90-day freshness rule does not depend on the day the suite runs. */
function fresh(entry: AuthorityPageEntry): AuthorityPageEntry {
  const today = new Date().toISOString().slice(0, 10);
  return { ...entry, claims: entry.claims.map((c) => ({ ...c, lastVerified: today })) };
}

describe('registry', () => {
  it('holds exactly the six industries and every one defaults to draft', () => {
    expect(authorityPages.map((p) => p.slug).sort()).toEqual([...EXPECTED_SLUGS].sort());
    for (const p of authorityPages) {
      expect(p.status, p.slug).toBe('draft');
      expect(p.approvedBy, p.slug).toBeNull();
      expect(p.approvedAt, p.slug).toBeNull();
      expect(isAuthorityPagePublishable(p, liveSlugs), p.slug).toBe(false);
    }
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

const NOINDEX = { index: false, follow: false };
const INDEX = { index: true, follow: true };

describe('noindex gate (finding 1: approval validation owns indexability)', () => {
  const ok = fresh(approved(authorityPages[0]));

  it('a draft is noindex,nofollow', () => {
    for (const p of authorityPages) {
      expect(buildAuthorityMetadata(p, liveSlugs).robots).toEqual(NOINDEX);
    }
  });

  it('a valid approved entry with every course published becomes indexable', () => {
    expect(buildAuthorityMetadata(ok, liveSlugs).robots).toEqual(INDEX);
  });

  it('approved status alone is not enough: each failed check keeps the page noindex', () => {
    const broken: Record<string, AuthorityPageEntry> = {
      'no approver': { ...ok, approvedBy: null },
      'no approval date': { ...ok, approvedAt: null },
      'no hero visual': { ...ok, heroImage: null },
      'stale claim': { ...ok, claims: [{ ...ok.claims[0], lastVerified: '2020-01-01' }] },
      'claim without source': { ...ok, claims: [{ ...ok.claims[0], sourceUrl: '' }] },
      'empty bundle': { ...ok, bundle: { ...ok.bundle, publishedSlugs: [] } },
    };
    for (const [why, e] of Object.entries(broken)) {
      expect(buildAuthorityMetadata(e, liveSlugs).robots, why).toEqual(NOINDEX);
    }
  });

  it('an approved entry linking a course that is not published stays noindex', () => {
    const live = new Set(liveSlugs);
    live.delete(ok.bundle.publishedSlugs[0]);
    expect(buildAuthorityMetadata(ok, live).robots).toEqual(NOINDEX);
  });

  it('page metadata reads the live course list for an approved entry', async () => {
    db.hiddenSlugs = new Set();
    expect((await authorityMetadata(ok)).robots).toEqual(INDEX);
    db.hiddenSlugs = new Set([ok.bundle.publishedSlugs[0]]);
    expect((await authorityMetadata(ok)).robots).toEqual(NOINDEX);
    db.hiddenSlugs = new Set();
  });

  it('a failed course read keeps an approved page noindex instead of throwing', async () => {
    db.fail = true;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await authorityMetadata(ok)).robots).toEqual(NOINDEX);
      expect(spy).toHaveBeenCalled();
    } finally {
      db.fail = false;
      spy.mockRestore();
    }
  });

  it('every page file uses the registry-driven metadata (noindex while draft, no DB read)', async () => {
    for (const p of authorityPages) {
      const file = join(ROOT, 'app', '(public)', 'for', p.slug, 'page.tsx');
      expect(existsSync(file), file).toBe(true);
      const mod = (await import(/* @vite-ignore */ `../../../app/(public)/for/${p.slug}/page`)) as {
        generateMetadata: () => Promise<{ robots: unknown }>;
      };
      const before = db.calls;
      expect((await mod.generateMetadata()).robots, p.slug).toEqual(NOINDEX);
      expect(db.calls, `${p.slug} draft metadata must not query the database`).toBe(before);
    }
  });
});

describe('sitemap', () => {
  it('lists no /for/ URL while all are draft', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.filter((u) => u.includes('/for/'))).toEqual([]);
  });

  it('lists exactly the approved entries that pass validation', () => {
    const good = fresh(approved(authorityPages[1]));
    const noApprover = { ...fresh(approved(authorityPages[2])), approvedBy: null };
    const pages = [good, noApprover, authorityPages[0]];
    expect(authoritySitemapPaths(liveSlugs, pages)).toEqual([`/for/${good.slug}`]);
    expect(authoritySitemapPaths(new Set(), pages)).toEqual([]);
    expect(authoritySitemapPaths(liveSlugs)).toEqual([]);
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

  // Review round 1 found two required items that passed while absent or not real. Each
  // required approval item is now checked for presence and validity; one row per item.
  it('rejects approval when any required item is absent or not real', () => {
    const ok = fresh(approved(authorityPages[0]));
    expect(validateAuthorityPage(ok, new Date(), liveSlugs)).toEqual([]);
    const broken: Record<string, [AuthorityPageEntry, RegExp]> = {
      'no claims at all': [{ ...ok, claims: [] }, /claim/],
      'blank approver': [{ ...ok, approvedBy: '  ' }, /approvedBy/],
      'approval date not a date': [{ ...ok, approvedAt: 'soon' }, /approvedAt/],
      'approval date in the future': [{ ...ok, approvedAt: '2999-01-01' }, /approvedAt/],
      'remote hero image': [
        { ...ok, heroImage: { ...HERO, src: 'https://example.com/a.jpg' } },
        /hero/,
      ],
      'hero outside /images/for/': [
        { ...ok, heroImage: { ...HERO, src: '/og-image.png' } },
        /hero/,
      ],
      'claim not https': [
        { ...ok, claims: [{ ...ok.claims[0], sourceUrl: 'http://x.example' }] },
        /sourceUrl/,
      ],
    };
    for (const [why, [entry, re]] of Object.entries(broken)) {
      const problems = validateAuthorityPage(entry, new Date(), liveSlugs);
      expect(problems.join(' '), why).toMatch(re);
      expect(buildAuthorityMetadata(entry, liveSlugs).robots, why).toEqual(NOINDEX);
      expect(authoritySitemapPaths(liveSlugs, [entry]), why).toEqual([]);
    }
  });

  it('every hero image named in the registry is a committed file under public/', () => {
    const missing = (pages: AuthorityPageEntry[]) =>
      pages
        .filter((p) => p.heroImage)
        .map((p) => p.heroImage!.src)
        .filter((src) => !existsSync(join(ROOT, 'public', src)));
    expect(missing(authorityPages)).toEqual([]);
    // Control: the same check fires for a path that is not committed.
    expect(missing([approved(authorityPages[0])])).toEqual([HERO.src]);
  });

  it('rejects approval without a hero visual and alt text', () => {
    expect(
      validateAuthorityPage({ ...approved(authorityPages[0]), heroImage: null }, now).join(' ')
    ).toMatch(/hero/);
    const noAlt = { ...approved(authorityPages[0]), heroImage: { ...HERO, alt: ' ' } };
    expect(validateAuthorityPage(noAlt, now).join(' ')).toMatch(/hero/);
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

/** The price a card must show, read from the catalogue (never typed in the registry). */
function cataloguePriceLabel(slug: string): string {
  const c = catalogueBySlug.get(slug)!;
  const n = Number(c.priceAud);
  return c.isFree || n === 0 ? 'Free' : `$${n.toFixed(0)}`;
}

describe('never-claim strings', () => {
  let rendered: { slug: string; html: string }[] = [];
  beforeAll(async () => {
    db.hiddenSlugs = new Set();
    rendered = await Promise.all(
      authorityPages.map(async (p) => ({ slug: p.slug, html: await renderPage(p.slug) }))
    );
  });

  it('renders the real course cards for every linked course (finding 2)', () => {
    for (const p of authorityPages) {
      const html = rendered.find((r) => r.slug === p.slug)!.html;
      expect(cardSlugs(html).sort(), p.slug).toEqual([...p.bundle.publishedSlugs].sort());
    }
  });

  it('each card shows the catalogue price, and no other dollar amount appears (finding 2)', () => {
    for (const p of authorityPages) {
      let html = rendered.find((r) => r.slug === p.slug)!.html;
      for (const slug of p.bundle.publishedSlugs) {
        const label = cataloguePriceLabel(slug);
        // The card runs from its first link to the first link of a different course.
        const start = html.indexOf(`href="/courses/${slug}"`);
        const rest = html.slice(start);
        const next = rest.search(new RegExp(`href="/courses/(?!${slug}")`));
        const card = next === -1 ? rest : rest.slice(0, next);
        expect(card, `${p.slug} -> ${slug} price`).toContain(label);
      }
      for (const slug of p.bundle.publishedSlugs)
        html = html.split(cataloguePriceLabel(slug)).join('');
      expect(/\$\s?\d/.test(html), `${p.slug}: a dollar amount not from the catalogue`).toBe(false);
    }
  });

  it('the live-course count equals the cards shown, even when a course is unpublished (finding 3)', async () => {
    for (const r of rendered) expect(liveCountStat(r.html), r.slug).toBe(cardSlugs(r.html).length);
    const p = authorityPages[0];
    db.hiddenSlugs = new Set([p.bundle.publishedSlugs[0]]);
    try {
      const html = await renderPage(p.slug);
      expect(cardSlugs(html)).not.toContain(p.bundle.publishedSlugs[0]);
      expect(liveCountStat(html)).toBe(p.bundle.publishedSlugs.length - 1);
    } finally {
      db.hiddenSlugs = new Set();
    }
  });

  it('shows the hero visual only when the entry has one', () => {
    const p = authorityPages[0];
    const without = renderToStaticMarkup(
      createElement(AuthorityPageView, { entry: p, courses: [] })
    );
    expect(without).not.toContain(HERO.alt);
    const withHero = renderToStaticMarkup(
      createElement(AuthorityPageView, { entry: { ...p, heroImage: HERO }, courses: [] })
    );
    expect(withHero).toContain(`alt="${HERO.alt}"`);
  });

  it('carries no unsourced generalisation from the review (findings 4 and 5)', () => {
    const UNSOURCED = [/looks dry/i, /often the first/i, /\b(often|usually|typically|commonly)\b/i];
    for (const p of authorityPages) {
      const { claims: _sourced, ...copy } = p;
      const text = JSON.stringify(copy);
      for (const re of UNSOURCED) expect(re.test(text), `${p.slug} ${re}`).toBe(false);
    }
  });

  it('renders every page with substantive content', () => {
    for (const r of rendered) {
      expect(r.html.length, r.slug).toBeGreaterThan(3000);
      expect(r.html, r.slug).toContain('<h1');
    }
  });

  it('no page (course cards included), registry text or page source contains a never-claim string', () => {
    for (const p of authorityPages) {
      let html = rendered.find((r) => r.slug === p.slug)!.html;
      // Catalogue prices are the one permitted dollar figure; they are checked above.
      for (const slug of p.bundle.publishedSlugs)
        html = html.split(cataloguePriceLabel(slug)).join('');
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
