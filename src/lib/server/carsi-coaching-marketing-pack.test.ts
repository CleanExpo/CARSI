import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

/**
 * Prisma mock: the top-level client throws on every write, so a write that is not routed
 * through the transaction client fails the test (Codex P1, head 0a953a79: pack and proposed
 * actions must commit together).
 */
const txWrites: string[] = [];
const outsideTx = () => {
  throw new Error('write outside transaction');
};
let failActionCreate = false;
const tx = {
  carsiCoachingMarketingPack: {
    create: vi.fn(async () => {
      txWrites.push('pack');
      return { id: 'pack-tx' };
    }),
  },
  carsiCoachingAction: {
    findMany: vi.fn(async () => []),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    create: vi.fn(async () => {
      if (failActionCreate) throw new Error('action write failed');
      txWrites.push('action');
      return {};
    }),
  },
};
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn(tx)),
    carsiCoachingMarketingPack: { create: outsideTx },
    carsiCoachingAction: {
      findMany: outsideTx,
      deleteMany: outsideTx,
      create: outsideTx,
    },
  },
}));

const { defaultMarketingPackDeps, generateMarketingPack, resolveMarketingInputs } =
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
      persist: vi.fn(async (input: { actions: unknown[] }) => {
        saved.push(input);
        proposed.push(...input.actions);
        return { id: 'pack-1', proposedActionCount: input.actions.length };
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

describe('defaultMarketingPackDeps.persist', () => {
  const pack = {
    review: {
      websiteUrl: null,
      googleBusinessUrl: null,
      siteReadable: false,
      summary: 's',
      checks: [],
      fixes: [],
    },
    checklist: [],
    calendar: { posts: [], source: 'template' as const, rejectedCount: 0 },
    voice: { businessName: 'b', trade: 't', town: 'x', services: 's' },
    generatedAt: '2026-11-09T00:00:00Z',
  };
  const actions = [
    {
      title: 'Fix',
      description: 'd',
      status: 'proposed' as const,
      priority: 'high' as const,
      goalId: 'marketing-pack:gbp-missing',
      sortOrder: 0,
    },
  ];

  it('writes the pack and its proposed actions through one transaction', async () => {
    txWrites.length = 0;
    failActionCreate = false;
    const res = await defaultMarketingPackDeps.persist({ userId: 'u', pack, model: null, actions });
    expect(res).toEqual({ id: 'pack-tx', proposedActionCount: 1 });
    expect(txWrites).toEqual(['pack', 'action']);
  });

  it('propagates an action write failure so the transaction rolls back the pack', async () => {
    txWrites.length = 0;
    failActionCreate = true;
    await expect(
      defaultMarketingPackDeps.persist({ userId: 'u', pack, model: null, actions })
    ).rejects.toThrow('action write failed');
    failActionCreate = false;
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
    // Hex forms of IPv4-mapped / IPv4-compatible addresses (how WHATWG URL normalises them).
    '::ffff:7f00:1',
    '::ffff:a9fe:a9fe',
    '::7f00:1',
    '0:0:0:0:0:ffff:7f00:1',
    '::ffff:0:a00:1',
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
    ['http://[::ffff:127.0.0.1]/', false],
    ['http://[::ffff:169.254.169.254]/', false],
    ['http://2130706433/', false],
    ['http://0x7f.1/', false],
    ['https://example.com/page', true],
    ['example.com', true],
  ])('validatePublicHttpUrl(%s) ok=%s', (raw, ok) => {
    expect(validatePublicHttpUrl(raw).ok).toBe(ok);
  });
});
