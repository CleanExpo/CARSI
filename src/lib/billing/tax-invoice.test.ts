import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CARSI_ABN_ENV,
  CARSI_SELLER_LEGAL_NAME,
  TAX_INVOICE_BUYER_IDENTITY_THRESHOLD_CENTS,
  TaxInvoiceBuyerIdentityError,
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
// A Checkout session Stripe reports as paid, for the amount charged in cents.
/** The payer as Stripe Checkout records them; the owner takes the Buyer from here only. */
type Customer = {
  name?: string | null;
  business_name?: string | null;
  tax_ids?: Array<{ type: string; value: string | null }>;
};
const paid = (amount_total: number | null, customer_details?: Customer) => ({
  payment_status: 'paid',
  amount_total,
  customer_details,
});
const auAbn = (value: string) => [{ type: 'au_abn', value }];

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
      buildTaxInvoice(
        { item: 'Course', checkout: paid(2900), issuedAt: ISSUED_AT },
        env()
      )
    ).toThrow(TaxInvoiceConfigError);
    expect(() =>
      buildTaxInvoice(
        { item: 'Course', checkout: paid(2900), issuedAt: ISSUED_AT },
        env('ABN to be confirmed')
      )
    ).toThrow(TaxInvoiceConfigError);
  });

  it('carries seller, ABN, Brisbane date, item, total and GST', () => {
    const inv = buildTaxInvoice(
      {
        item: 'Water Damage Restoration',
        checkout: paid(9900),
        issuedAt: ISSUED_AT,
      },
      env(TEST_ONLY_ABN)
    );
    expect(inv).toEqual({
      sellerName: CARSI_SELLER_LEGAL_NAME,
      abn: '10 000 000 000',
      buyerIdentity: null,
      buyerAbn: null,
      issuedOn: '22 November 2026',
      item: 'Water Damage Restoration',
      totalCents: 9900,
      gstCents: 900,
    });
  });

  it('tryBuildTaxInvoice returns null and logs when the ABN is missing', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      tryBuildTaxInvoice(
        { item: 'Course', checkout: paid(2900), issuedAt: ISSUED_AT },
        env()
      )
    ).toBeNull();
    expect(err).toHaveBeenCalledWith(expect.stringContaining('CARSI_ABN'));
  });

  it('tryBuildTaxInvoice returns null for no charge', () => {
    expect(
      tryBuildTaxInvoice(
        { item: 'Course', checkout: paid(0), issuedAt: ISSUED_AT },
        env(TEST_ONLY_ABN)
      )
    ).toBeNull();
    expect(
      tryBuildTaxInvoice(
        { item: 'Course', checkout: paid(null), issuedAt: ISSUED_AT },
        env(TEST_ONLY_ABN)
      )
    ).toBeNull();
  });
});

describe('renderTaxInvoiceSection', () => {
  const inv = buildTaxInvoice(
    {
      item: 'Water Damage <Restoration>',
      checkout: paid(2900),
      issuedAt: ISSUED_AT,
    },
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

// ATO: a tax invoice for a sale of $1,000 or more (GST inclusive) must show the
// buyer's identity or ABN. Literal cents here, so these fail on the behaviour and
// not on a missing export.
describe('buyer identity on tax invoices of $1,000 or more (GP-761 review P1)', () => {

  it('the threshold is $1,000.00 GST inclusive', () => {
    expect(TAX_INVOICE_BUYER_IDENTITY_THRESHOLD_CENTS).toBe(100000);
  });

  it('at exactly $1,000.00 with no buyer identity the invoice is NOT ISSUED and logged', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      tryBuildTaxInvoice(
        { item: 'Team purchase', checkout: paid(100000), issuedAt: ISSUED_AT },
        env(TEST_ONLY_ABN)
      )
    ).toBeNull();
    expect(err).toHaveBeenCalledWith(expect.stringContaining('NOT ISSUED'));
    expect(() =>
      buildTaxInvoice(
        { item: 'Team purchase', checkout: paid(100000), issuedAt: ISSUED_AT },
        env(TEST_ONLY_ABN)
      )
    ).toThrow(TaxInvoiceBuyerIdentityError);
  });

  it('blank or whitespace buyer fields and an invalid buyer ABN are not an identity', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      tryBuildTaxInvoice(
        {
          item: 'Team purchase',
          checkout: paid(150000, { name: '  ', business_name: '', tax_ids: auAbn('12345678901') }),
          issuedAt: ISSUED_AT,
        },
        env(TEST_ONLY_ABN)
      )
    ).toBeNull();
  });

  it('at exactly $1,000.00 with a buyer name the invoice is issued with a Buyer row', () => {
    const inv = tryBuildTaxInvoice(
      {
        item: 'Team purchase',
        checkout: paid(100000, { name: ' Sam Lee ' }),
        issuedAt: ISSUED_AT,
      },
      env(TEST_ONLY_ABN)
    );
    expect(inv).not.toBeNull();
    expect(inv!.buyerIdentity).toBe('Sam Lee');
    const { html, text } = renderTaxInvoiceSection(inv!);
    expect(text).toContain('Buyer: Sam Lee');
    expect(html).toContain('>Buyer</td>');
    expect(html).toContain('Sam Lee');
  });

  it('the business name is the identity when given, with the buyer ABN shown', () => {
    const inv = buildTaxInvoice(
      {
        item: 'Team purchase',
        checkout: paid(250000, { name: 'Sam Lee', business_name: 'Lee Restorations Pty Ltd', tax_ids: auAbn('20000000190') }),
        issuedAt: ISSUED_AT,
      },
      env(TEST_ONLY_ABN)
    );
    expect(inv.buyerIdentity).toBe('Lee Restorations Pty Ltd');
    expect(inv.buyerAbn).toBe('20 000 000 190');
    const { text } = renderTaxInvoiceSection(inv);
    expect(text).toContain('Buyer: Lee Restorations Pty Ltd');
    expect(text).toContain('Buyer ABN: 20 000 000 190');
  });

  it('a valid buyer ABN alone is enough at or above the threshold', () => {
    const inv = buildTaxInvoice(
      {
        item: 'Team purchase',
        checkout: paid(100000, { tax_ids: auAbn('20000000190') }),
        issuedAt: ISSUED_AT,
      },
      env(TEST_ONLY_ABN)
    );
    expect(inv.buyerIdentity).toBeNull();
    expect(renderTaxInvoiceSection(inv).text).toContain('Buyer ABN: 20 000 000 190');
  });

  it('at $999.99 with no buyer identity the invoice is still issued, with no Buyer row', () => {
    const inv = tryBuildTaxInvoice(
      { item: 'Team purchase', checkout: paid(99999), issuedAt: ISSUED_AT },
      env(TEST_ONLY_ABN)
    );
    expect(inv).not.toBeNull();
    expect(renderTaxInvoiceSection(inv!).text).not.toContain('Buyer');
  });

  it('refuses to render an invoice of $1,000 or more that carries no buyer identity', () => {
    const inv = buildTaxInvoice(
      {
        item: 'Team purchase',
        checkout: paid(100000, { name: 'Sam Lee' }),
        issuedAt: ISSUED_AT,
      },
      env(TEST_ONLY_ABN)
    );
    expect(() =>
      renderTaxInvoiceSection({ ...inv, buyerIdentity: null, buyerAbn: null })
    ).toThrow();
  });
});

// GP-761 review round 2 P1: a tax invoice is issued only for a Checkout session
// Stripe reports as paid. The owner reads payment_status itself; callers pass the
// session through. Literal objects here, so these fail on the behaviour.
describe('a tax invoice needs a paid Checkout session (GP-761 review round 2 P1)', () => {
  const customer_details = { name: 'Sam Lee' };

  it.each(['unpaid', 'no_payment_required', null])(
    'payment_status %s: NOT ISSUED and logged, even with an amount',
    (payment_status) => {
      const err = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(
        tryBuildTaxInvoice(
          {
            item: 'Coaching (monthly)',
            checkout: { payment_status, amount_total: 9900, customer_details },
            issuedAt: ISSUED_AT,
          },
          env(TEST_ONLY_ABN)
        )
      ).toBeNull();
      expect(err).toHaveBeenCalledWith(expect.stringContaining('NOT ISSUED'));
      expect(err).toHaveBeenCalledWith(expect.stringContaining('not paid'));
    }
  );

  it('buildTaxInvoice refuses an unpaid session with a not-paid error', () => {
    expect(() =>
      buildTaxInvoice(
        {
          item: 'Coaching (monthly)',
          checkout: { payment_status: 'unpaid', amount_total: 9900, customer_details },
          issuedAt: ISSUED_AT,
        },
        env(TEST_ONLY_ABN)
      )
    ).toThrow(/not paid/);
  });

  it('a paid session is issued for the amount Stripe charged', () => {
    const inv = tryBuildTaxInvoice(
      {
        item: 'Coaching (monthly)',
        checkout: { payment_status: 'paid', amount_total: 9900, customer_details },
        issuedAt: ISSUED_AT,
      },
      env(TEST_ONLY_ABN)
    );
    expect(inv?.totalCents).toBe(9900);
    expect(inv?.gstCents).toBe(900);
  });
});

// GP-761 review round 4 P1 (founder ruling 23/11/2026): the Buyer is decided by the
// tax-invoice owner from the Checkout customer only. TaxInvoiceInput has no buyer field
// (production callers are type-checked; test files are not), and the builder must ignore
// anything else a caller passes: this case fails if it ever reads an input buyer.
describe('the Buyer comes from the Checkout customer only (GP-761 review round 4)', () => {
  it('an input buyer is ignored and cannot change the Buyer', () => {
    const withStrayBuyer = {
      item: 'Owner Circle',
      checkout: paid(2900, { name: 'Bob Payer' }),
      issuedAt: ISSUED_AT,
      buyer: { name: 'Alice Attendee', businessName: 'Attendee Co', abn: null },
    };
    const inv = buildTaxInvoice(withStrayBuyer, env(TEST_ONLY_ABN));
    expect(inv.buyerIdentity).toBe('Bob Payer');
  });

  it('a Checkout business name and AU ABN are the Buyer and Buyer ABN; other tax ids are ignored', () => {
    const inv = buildTaxInvoice(
      {
        item: 'Owner Circle',
        checkout: paid(2900, {
          name: 'Bob Payer',
          business_name: 'Payer Pty Ltd',
          tax_ids: [{ type: 'nz_gst', value: '20000000190' }, ...auAbn('20000000190')],
        }),
        issuedAt: ISSUED_AT,
      },
      env(TEST_ONLY_ABN)
    );
    expect(inv.buyerIdentity).toBe('Payer Pty Ltd');
    expect(inv.buyerAbn).toBe('20 000 000 190');
  });
});
