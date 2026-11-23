import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CARSI_ABN_ENV,
  CARSI_SELLER_LEGAL_NAME,
  TaxInvoiceConfigError,
  buildTaxInvoice,
  formatAudCents,
  gstFromGstInclusiveCents,
  isValidAbn,
  readCarsiAbn,
  tryBuildTaxInvoice,
} from '@/lib/billing/tax-invoice';
import { renderTaxInvoiceSection } from '@/lib/server/email-templates';

// SYNTHETIC, TEST-ONLY ABN. It passes the ABR checksum and belongs to no one we
// know of. It is never CARSI's ABN; the real one is read from CARSI_ABN at run time.
const TEST_ONLY_ABN = '10000000000';
const env = (abn?: string) => ({ [CARSI_ABN_ENV]: abn }) as NodeJS.ProcessEnv;

// A fixed instant: 21/11/2026 22:30 UTC is 22/11/2026 08:30 in Brisbane.
const ISSUED_AT = new Date('2026-11-21T22:30:00.000Z');

afterEach(() => {
  vi.restoreAllMocks();
});

describe('gstFromGstInclusiveCents (Phill 22/11/2026: fixed 10% line)', () => {
  it('a $29 GST-inclusive price carries $2.64 GST', () => {
    expect(gstFromGstInclusiveCents(2900)).toBe(264);
  });

  it('a $99 GST-inclusive price carries $9.00 GST', () => {
    expect(gstFromGstInclusiveCents(9900)).toBe(900);
  });

  it('rounds total / 11 to the nearest cent', () => {
    expect(gstFromGstInclusiveCents(79500)).toBe(7227); // 7227.27
    expect(gstFromGstInclusiveCents(2200)).toBe(200);
    expect(gstFromGstInclusiveCents(5)).toBe(0); // 0.45
    expect(gstFromGstInclusiveCents(6)).toBe(1); // 0.545
  });

  it('refuses non-integer or negative cents', () => {
    expect(() => gstFromGstInclusiveCents(29.5)).toThrow(RangeError);
    expect(() => gstFromGstInclusiveCents(-100)).toThrow(RangeError);
    expect(() => gstFromGstInclusiveCents(Number.NaN)).toThrow(RangeError);
  });
});

describe('formatAudCents', () => {
  it('always shows dollars and cents', () => {
    expect(formatAudCents(264)).toBe('$2.64');
    expect(formatAudCents(900)).toBe('$9.00');
    expect(formatAudCents(79500)).toBe('$795.00');
  });
});

describe('ABN config', () => {
  it('accepts a checksum-valid ABN and formats it', () => {
    expect(isValidAbn(TEST_ONLY_ABN)).toBe(true);
    expect(readCarsiAbn(env('10 000 000 000'))).toBe('10 000 000 000');
  });

  it.each([
    ['unset', undefined],
    ['empty', ''],
    ['the old Terms page wording', 'ABN to be confirmed'],
    ['documentation sample digits (fail the checksum)', '12 345 678 901'],
    ['all zeros', '00000000000'],
    ['too short', '1000000000'],
    ['letters', 'XX XXX XXX XXX'],
  ])('rejects %s', (_label, value) => {
    expect(readCarsiAbn(env(value))).toBeNull();
  });
});

describe('buildTaxInvoice', () => {
  it('refuses to build without a valid ABN, so no placeholder can render', () => {
    expect(() =>
      buildTaxInvoice({ item: 'Course', totalCents: 2900, issuedAt: ISSUED_AT }, env())
    ).toThrow(TaxInvoiceConfigError);
    expect(() =>
      buildTaxInvoice(
        { item: 'Course', totalCents: 2900, issuedAt: ISSUED_AT },
        env('ABN to be confirmed')
      )
    ).toThrow(TaxInvoiceConfigError);
  });

  it('carries seller, ABN, Brisbane date, item, total and GST', () => {
    const inv = buildTaxInvoice(
      { item: 'Water Damage Restoration', totalCents: 9900, issuedAt: ISSUED_AT },
      env(TEST_ONLY_ABN)
    );
    expect(inv).toEqual({
      sellerName: CARSI_SELLER_LEGAL_NAME,
      abn: '10 000 000 000',
      issuedOn: '22 November 2026',
      item: 'Water Damage Restoration',
      totalCents: 9900,
      gstCents: 900,
    });
  });

  it('tryBuildTaxInvoice returns null and logs when the ABN is missing', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      tryBuildTaxInvoice({ item: 'Course', totalCents: 2900, issuedAt: ISSUED_AT }, env())
    ).toBeNull();
    expect(err).toHaveBeenCalledWith(expect.stringContaining('CARSI_ABN'));
  });

  it('tryBuildTaxInvoice returns null for no charge', () => {
    expect(
      tryBuildTaxInvoice({ item: 'Course', totalCents: 0, issuedAt: ISSUED_AT }, env(TEST_ONLY_ABN))
    ).toBeNull();
    expect(
      tryBuildTaxInvoice(
        { item: 'Course', totalCents: null, issuedAt: ISSUED_AT },
        env(TEST_ONLY_ABN)
      )
    ).toBeNull();
  });
});

describe('renderTaxInvoiceSection', () => {
  const inv = buildTaxInvoice(
    { item: 'Water Damage <Restoration>', totalCents: 2900, issuedAt: ISSUED_AT },
    env(TEST_ONLY_ABN)
  );
  const { html, text } = renderTaxInvoiceSection(inv);

  it.each([
    ['html', html],
    ['text', text],
  ])('%s carries every tax invoice field', (_label, body) => {
    expect(body).toContain('Tax invoice');
    expect(body).toContain('CARSI Pty Ltd');
    expect(body).toContain('ABN 10 000 000 000');
    expect(body).toContain('22 November 2026');
    expect(body).toContain('$29.00');
    expect(body).toContain('$2.64');
    expect(body).toMatch(/GST included/);
  });

  it('escapes the item in html', () => {
    expect(html).toContain('Water Damage &lt;Restoration&gt;');
    expect(text).toContain('Water Damage <Restoration>');
  });

  it('refuses to render an invoice whose ABN is not valid', () => {
    expect(() => renderTaxInvoiceSection({ ...inv, abn: 'ABN to be confirmed' })).toThrow(
      TaxInvoiceConfigError
    );
  });
});
