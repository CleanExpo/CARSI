/**
 * V4 — the /subscribe "Bought separately" anchor must equal the sum of the published paid course
 * prices, read live, and must show nothing when the live catalogue cannot be read.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  rows: [] as { priceAud: { toString(): string }; isFree: boolean }[],
  fail: false,
  lastArgs: null as null | { where?: unknown; take?: number },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    lmsCourse: {
      findMany: vi.fn(async (args: { where?: unknown; take?: number }) => {
        state.lastArgs = args;
        if (state.fail) throw new Error('database unavailable');
        return state.rows;
      }),
    },
  },
}));

import { CATALOGUE_QUERY_CAP, lmsPublishedCourseWhere } from './public-courses-list';
import {
  formatAnchorAud,
  getPaidCatalogueValue,
  sumPaidCoursePrices,
} from './membership-value-anchor';

const decimal = (v: string) => ({ toString: () => v });

/** A fixture catalogue: what a buyer would pay for each course, one at a time. */
const CATALOGUE = [
  { priceAud: decimal('28.97'), isFree: false },
  { priceAud: decimal('29.00'), isFree: false },
  { priceAud: decimal('395.00'), isFree: false },
  { priceAud: decimal('0.00'), isFree: false }, // unpriced: not something anyone pays
  { priceAud: decimal('149.00'), isFree: true }, // free course with a stale price
];
// Hand-computed: 28.97 + 29.00 + 395.00
const EXPECTED_CENTS = 45297;

describe('membership value anchor', () => {
  const prevUrl = process.env.DATABASE_URL;
  const prevPhase = process.env.NEXT_PHASE;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://test';
    delete process.env.NEXT_PHASE;
    state.rows = CATALOGUE;
    state.fail = false;
    state.lastArgs = null;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (prevUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = prevUrl;
    if (prevPhase === undefined) delete process.env.NEXT_PHASE;
    else process.env.NEXT_PHASE = prevPhase;
    vi.restoreAllMocks();
  });

  it('equals the sum of the published paid course prices', async () => {
    const value = await getPaidCatalogueValue();
    expect(value).toEqual({ paidCourseCount: 3, totalCents: EXPECTED_CENTS });
    expect(formatAnchorAud(value!.totalCents)).toBe('$452.97');
  });

  it('reads only published courses, in one bounded read', async () => {
    await getPaidCatalogueValue();
    expect(state.lastArgs?.where).toEqual(lmsPublishedCourseWhere);
    expect(state.lastArgs?.take).toBe(CATALOGUE_QUERY_CAP + 1);
  });

  it('moves when a price changes (never a fixed figure)', async () => {
    state.rows = [...CATALOGUE, { priceAud: decimal('1000.03'), isFree: false }];
    const value = await getPaidCatalogueValue();
    expect(value).toEqual({ paidCourseCount: 4, totalCents: EXPECTED_CENTS + 100003 });
  });

  it('adds 51 prices of $28.97 exactly (cents, not floats)', () => {
    const items = Array.from({ length: 51 }, () => ({ price_aud: 28.97, is_free: false }));
    expect(sumPaidCoursePrices(items)).toEqual({ paidCourseCount: 51, totalCents: 147747 });
  });

  it('fails closed with no database', async () => {
    delete process.env.DATABASE_URL;
    expect(await getPaidCatalogueValue()).toBeNull();
    expect(state.lastArgs).toBeNull();
  });

  it('fails closed during the build-time prerender', async () => {
    process.env.NEXT_PHASE = 'phase-production-build';
    expect(await getPaidCatalogueValue()).toBeNull();
  });

  it('fails closed when the read errors', async () => {
    state.fail = true;
    expect(await getPaidCatalogueValue()).toBeNull();
  });

  it('fails closed when no course is paid', async () => {
    state.rows = [{ priceAud: decimal('49.00'), isFree: true }];
    expect(await getPaidCatalogueValue()).toBeNull();
  });

  it('fails closed when the read may be incomplete', async () => {
    state.rows = Array.from({ length: CATALOGUE_QUERY_CAP + 1 }, () => ({
      priceAud: decimal('10.00'),
      isFree: false,
    }));
    expect(await getPaidCatalogueValue()).toBeNull();
  });
});
