/**
 * Backlog row 19 (NZ locale pass). CARSI serves Australia and New Zealand (DECISIONS #35) from
 * one set of en-AU pages. Open Graph must declare en_AU with en_NZ as an alternate locale, and
 * every page that replaces the root `openGraph` must carry both (Next does not deep-merge it).
 *
 * The root layout goes through Next's own Open Graph resolver, so the test fails exactly when
 * Next would emit no `og:locale:alternate` tag.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it, vi } from 'vitest';
import { resolveOpenGraph } from 'next/dist/lib/metadata/resolvers/resolve-opengraph';

import { courseMetadata } from './course-marketing';
import { OG_ALTERNATE_LOCALES, OG_LOCALE, OG_LOCALE_FIELDS, SITE_LANG } from './locale';

vi.setConfig({ testTimeout: 30_000 });

vi.mock('next/font/google', () => ({
  Outfit: () => ({ variable: 'font-display' }),
  Plus_Jakarta_Sans: () => ({ variable: 'font-sans' }),
}));

const ROOT = join(__dirname, '../../..');

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue;
      out.push(...sourceFiles(path));
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

describe('site locale: en-AU pages, also meant for New Zealand', () => {
  it('declares en-AU as the page language and en_NZ as the only alternate locale', () => {
    expect(SITE_LANG).toBe('en-AU');
    expect(OG_LOCALE).toBe('en_AU');
    expect(OG_ALTERNATE_LOCALES).toEqual(['en_NZ']);
    expect(OG_LOCALE_FIELDS).toEqual({ locale: 'en_AU', alternateLocale: ['en_NZ'] });
  });

  it('the root layout Open Graph resolves to en_AU with an en_NZ alternate', async () => {
    const { metadata } = await import('../../../app/layout');
    const resolved = await resolveOpenGraph(
      metadata.openGraph as never,
      metadata.metadataBase as URL,
      Promise.resolve('/about'),
      { isStaticMetadataRouteFile: false, trailingSlash: false } as never,
      null
    );
    expect(resolved?.locale).toBe('en_AU');
    expect(resolved?.alternateLocale).toEqual(['en_NZ']);
  });

  it('course marketing metadata carries the en_NZ alternate', () => {
    const meta = courseMetadata({
      slug: 'no-such-course',
      url: 'https://carsi.com.au/courses/no-such-course',
      fallbackTitle: 'A course',
    });
    expect(meta.openGraph).toMatchObject({ locale: 'en_AU', alternateLocale: ['en_NZ'] });
  });

  it('no page writes an Open Graph locale literal: each spreads OG_LOCALE_FIELDS', () => {
    const files = [...sourceFiles(join(ROOT, 'app')), ...sourceFiles(join(ROOT, 'src'))];
    expect(files.length).toBeGreaterThan(100);
    const literal = /\blocale:\s*['"]en_[A-Z]{2}['"]/;
    const offenders = files
      .filter((file) => !file.endsWith(join('src', 'lib', 'seo', 'locale.ts')))
      .filter((file) => literal.test(readFileSync(file, 'utf8')))
      .map((file) => relative(ROOT, file));
    expect(offenders).toEqual([]);

    const spreading = files.filter((file) =>
      readFileSync(file, 'utf8').includes('...OG_LOCALE_FIELDS')
    );
    const rel = spreading.map((file) => relative(ROOT, file));
    for (const expected of [
      'app/layout.tsx',
      'app/(public)/courses/[slug]/page.tsx',
      'app/(public)/pathways/[slug]/page.tsx',
      'app/(public)/resources/page.tsx',
      'app/(public)/resources/government-restoration-panels/page.tsx',
      'src/lib/seo/course-marketing.ts',
    ]) {
      expect(rel).toContain(expected);
    }
  });
});
