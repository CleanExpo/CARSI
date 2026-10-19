import { describe, expect, it, vi } from 'vitest';

import { PROFESSIONAL_DIRECTORY_STUB } from './professional-directory.stub';
import {
  getProfessionalDirectoryStatus,
  getVerifiedProfessionals,
  isProfessionalDirectoryLive,
} from './professional-directory';

describe('professional-directory', () => {
  it('is not live without PROFESSIONAL_DIRECTORY_LIVE=true', () => {
    expect(isProfessionalDirectoryLive({})).toBe(false);
    expect(isProfessionalDirectoryLive({ PROFESSIONAL_DIRECTORY_LIVE: 'false' })).toBe(false);
  });

  it('returns no listings when directory is not live', async () => {
    const listings = await getVerifiedProfessionals({});
    expect(listings).toEqual([]);
  });

  it('returns no listings even when live flag is set until NRPG sync ships', async () => {
    const listings = await getVerifiedProfessionals({ PROFESSIONAL_DIRECTORY_LIVE: 'true' });
    expect(listings).toEqual([]);
  });

  it('reports honest status when gated', async () => {
    await expect(getProfessionalDirectoryStatus({})).resolves.toEqual({
      live: false,
      listingCount: 0,
      source: 'none',
    });
  });

  it('keeps stub fixtures out of the runtime module', () => {
    expect(PROFESSIONAL_DIRECTORY_STUB[0]?.name).toBeTruthy();
    expect(PROFESSIONAL_DIRECTORY_STUB.some((p) => 'nrpg_member_id' in p)).toBe(false);
  });
});

describe('professional-directory search indexing while it is a coming-soon gate', () => {
  async function loadSitemapUrls(env: Record<string, string | undefined>): Promise<string[]> {
    const saved = { ...process.env };
    try {
      for (const [k, v] of Object.entries(env)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
      delete process.env.DATABASE_URL;
      vi.resetModules();
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
      const { default: sitemap } = await import('../../../app/sitemap');
      return (await sitemap()).map((entry) => entry.url);
    } finally {
      vi.unstubAllGlobals();
      process.env = saved;
    }
  }

  it('the sitemap omits /professional-directory until it has verified listings, and lists the CEC hub', async () => {
    const off = await loadSitemapUrls({ PROFESSIONAL_DIRECTORY_LIVE: undefined });
    expect(off.some((u) => u.endsWith('/professional-directory'))).toBe(false);
    expect(off.some((u) => u.endsWith('/iicrc-cec-courses'))).toBe(true);
    expect(off.some((u) => u.endsWith('/courses'))).toBe(true);

    // The flag alone is not enough (review P1, 18/10/2026): with no verified listings the page is
    // still the noindex coming-soon gate, so listing it in the sitemap contradicted its robots tag.
    // The listings-present case is covered in src/lib/seo/sitemap-real-pages.test.ts.
    const flagOnly = await loadSitemapUrls({ PROFESSIONAL_DIRECTORY_LIVE: 'true' });
    expect(flagOnly.some((u) => u.endsWith('/professional-directory'))).toBe(false);
  });

  it('the coming-soon page is noindex; nothing else changes', async () => {
    delete process.env.PROFESSIONAL_DIRECTORY_LIVE;
    vi.resetModules();
    const { generateMetadata } = await import('../../../app/(public)/professional-directory/page');
    const meta = await generateMetadata();
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.canonical).toBe('https://carsi.com.au/professional-directory');
  });
});
