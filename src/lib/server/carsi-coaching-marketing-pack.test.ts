import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

const { generateMarketingPack, resolveMarketingInputs } =
  await import('./carsi-coaching-marketing-pack');
const { isBlockedAddress, validatePublicHttpUrl } = await import('./safe-public-fetch');

const weakHtml = readFileSync(
  join(
    __dirname,
    '..',
    'coaching-portal',
    'marketing-pack',
    '__fixtures__',
    'weak-trade-site.html'
  ),
  'utf8'
);

const profile = {
  businessName: 'Downs Carpet Care',
  industry: 'Carpet & upholstery',
  location: 'Toowoomba QLD',
  mainServices: 'Carpet cleaning, rug cleaning',
  website: 'https://old-site.test/',
  googleBusinessUrl: null,
};

function deps(overrides: Record<string, unknown> = {}) {
  const saved: unknown[] = [];
  const proposed: unknown[] = [];
  return {
    saved,
    proposed,
    d: {
      now: () => new Date('2026-11-09T00:00:00Z'),
      fetchSite: vi.fn(async () => ({ ok: true, status: 200, html: weakHtml })),
      generateCalendarText: vi.fn(async () => null as string | null),
      savePack: vi.fn(async (pack: unknown) => {
        saved.push(pack);
        return { id: 'pack-1' };
      }),
      replaceProposedActions: vi.fn(async (_userId: string, actions: unknown[]) => {
        proposed.push(...actions);
        return actions.length;
      }),
      ...overrides,
    },
  };
}

describe('resolveMarketingInputs', () => {
  it('prefers the latest submitted assessment answers over the profile', () => {
    const inputs = resolveMarketingInputs(profile, {
      website_url: 'https://new-site.test/',
      google_business_url: 'https://g.page/r/downs',
    });
    expect(inputs.websiteUrl).toBe('https://new-site.test/');
    expect(inputs.googleBusinessUrl).toBe('https://g.page/r/downs');
    expect(inputs.voice).toEqual({
      businessName: 'Downs Carpet Care',
      trade: 'Carpet & upholstery',
      town: 'Toowoomba QLD',
      services: 'Carpet cleaning, rug cleaning',
    });
  });
});

describe('generateMarketingPack', () => {
  it('produces a review, checklist, 30-day calendar and proposed actions from the template when AI is off', async () => {
    const { d, saved, proposed } = deps();
    const result = await generateMarketingPack('member-1', resolveMarketingInputs(profile, {}), d);
    expect(d.fetchSite).toHaveBeenCalledWith('https://old-site.test/');
    expect(result.packId).toBe('pack-1');
    expect(result.review.fixes.length).toBeGreaterThan(3);
    expect(result.calendar.posts).toHaveLength(30);
    expect(result.calendar.source).toBe('template');
    expect(result.checklist.length).toBeGreaterThanOrEqual(8);
    expect(saved).toHaveLength(1);
    expect(proposed).toHaveLength(result.review.fixes.length);
    expect(result.proposedActionCount).toBe(result.review.fixes.length);
  });

  it('falls back to the template when the AI call throws', async () => {
    const { d } = deps({
      generateCalendarText: vi.fn(async () => {
        throw new Error('timeout');
      }),
    });
    const result = await generateMarketingPack('m', resolveMarketingInputs(profile, {}), d);
    expect(result.calendar.posts).toHaveLength(30);
    expect(result.calendar.source).toBe('template');
  });

  it('records a failed site fetch as unreadable rather than failing the pack', async () => {
    const { d } = deps({
      fetchSite: vi.fn(async () => ({ ok: false, status: 0, html: null, error: 'blocked' })),
    });
    const result = await generateMarketingPack('m', resolveMarketingInputs(profile, {}), d);
    expect(result.review.siteReadable).toBe(false);
    expect(result.calendar.posts).toHaveLength(30);
  });
});

describe('safe public fetch guard', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.9',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '100.64.0.1',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
  ])('blocks private or local address %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(['1.1.1.1', '142.250.70.78', '2606:4700:4700::1111'])(
    'allows public address %s',
    (ip) => {
      expect(isBlockedAddress(ip)).toBe(false);
    }
  );

  it.each([
    ['ftp://example.com/', false],
    ['javascript:alert(1)', false],
    ['http://localhost/', false],
    ['https://user:pw@example.com/', false],
    ['https://example.com:8443/', false],
    ['https://example.com/page', true],
    ['example.com', true],
  ])('validatePublicHttpUrl(%s) ok=%s', (raw, ok) => {
    expect(validatePublicHttpUrl(raw).ok).toBe(ok);
  });
});
