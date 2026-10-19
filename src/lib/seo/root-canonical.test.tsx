/**
 * The root layout's metadata is inherited by every route that does not set its own. It used to
 * set `alternates.canonical` (and `openGraph.url`) to the absolute site URL, so 26 live pages
 * (/about, /contact, /privacy, /terms, 18 /industries/* pages …) told Google they were duplicates
 * of the homepage. A relative `./` is resolved by Next against the CURRENT pathname, so each
 * inheriting page gets a self-referencing canonical instead.
 *
 * Resolution goes through Next's own resolvers so the test fails exactly when Next would emit
 * the homepage for an inner page.
 */
import { describe, expect, it, vi } from 'vitest';
import { resolveAlternates } from 'next/dist/lib/metadata/resolvers/resolve-basics';
import { resolveAbsoluteUrlWithPathname } from 'next/dist/lib/metadata/resolvers/resolve-url';

vi.setConfig({ testTimeout: 30_000 });

vi.mock('next/font/google', () => ({
  Outfit: () => ({ variable: 'font-display' }),
  Plus_Jakarta_Sans: () => ({ variable: 'font-sans' }),
}));

const ctx = { trailingSlash: false } as never;

async function rootMetadata() {
  const { metadata } = await import('../../../app/layout');
  return metadata;
}

describe('root layout canonical is inherited as a self-reference', () => {
  it.each(['/about', '/industries/childcare', '/privacy'])(
    'resolves the inherited canonical for %s to that page, not the homepage',
    async (pathname) => {
      const metadata = await rootMetadata();
      const base = metadata.metadataBase as URL;
      const resolved = await resolveAlternates(metadata.alternates as never, base, pathname, ctx);
      expect(resolved?.canonical?.url).toBe(`${base.origin}${pathname}`);
    }
  );

  it('still resolves to the bare origin on the homepage', async () => {
    const metadata = await rootMetadata();
    const base = metadata.metadataBase as URL;
    const resolved = await resolveAlternates(metadata.alternates as never, base, '/', ctx);
    expect(resolved?.canonical?.url).toBe(base.origin);
  });

  it('resolves the inherited og:url for an inner page to that page', async () => {
    const metadata = await rootMetadata();
    const base = metadata.metadataBase as URL;
    const og = metadata.openGraph as { url?: string };
    expect(og.url).toBeDefined();
    expect(resolveAbsoluteUrlWithPathname(og.url as string, base, '/contact', ctx)).toBe(
      `${base.origin}/contact`
    );
  });
});
