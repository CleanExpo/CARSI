/**
 * Tax invoice data for every CARSI sale (GP-761).
 *
 * Phill ruled on 22/11/2026: "Fixed 10% line". Prices stay GST-inclusive, and the
 * GST shown on a tax invoice is the GST-inclusive total / 11, rounded to the cent.
 * This file is the one place that rule and the seller details live; every email,
 * page or receipt calls it rather than repeating the arithmetic.
 *
 * The ABN is read from one config value, CARSI_ABN. It is never written into the
 * code. Without a checksum-valid ABN, `buildTaxInvoice` throws: a tax invoice must
 * never go out with placeholder digits.
 */

/** The seller named on CARSI's Stripe account and on every payment and terms line. */
export const CARSI_SELLER_LEGAL_NAME = 'CARSI Pty Ltd';

/** The single config value that holds CARSI's ABN (11 digits, spaces allowed). */
export const CARSI_ABN_ENV = 'CARSI_ABN';

/** Tax invoice dates are CARSI's local date (Queensland), not the server's. */
const INVOICE_TIME_ZONE = 'Australia/Brisbane';

export class TaxInvoiceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaxInvoiceConfigError';
  }
}

/** GST inside a GST-inclusive amount: total / 11, rounded to the cent. */
export function gstFromGstInclusiveCents(totalCents: number): number {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new RangeError(`GST needs a whole, non-negative number of cents; got ${totalCents}`);
  }
  return Math.round(totalCents / 11);
}

const audCents = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Dollars and cents, always two decimals ("$2.64", "$9.00"). The existing
 * formatters round to whole dollars or drop ".00", which cannot show a GST line.
 */
export function formatAudCents(cents: number): string {
  return audCents.format(cents / 100);
}

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

/** The Australian Business Register checksum: 11 digits, weighted sum divisible by 89. */
export function isValidAbn(raw: string | null | undefined): boolean {
  const digits = (raw ?? '').replace(/\s+/g, '');
  if (!/^\d{11}$/.test(digits)) return false;
  const sum = digits
    .split('')
    .map(Number)
    .reduce((acc, d, i) => acc + (i === 0 ? d - 1 : d) * ABN_WEIGHTS[i]!, 0);
  return sum % 89 === 0;
}

function formatAbn(raw: string): string {
  const d = raw.replace(/\s+/g, '');
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8, 11)}`;
}

/** CARSI's ABN formatted "NN NNN NNN NNN", or null when unset or not a valid ABN. */
export function readCarsiAbn(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env[CARSI_ABN_ENV];
  return isValidAbn(raw) ? formatAbn(raw!) : null;
}

export type TaxInvoice = {
  sellerName: string;
  abn: string;
  /** Issue date, e.g. "22 November 2026", in CARSI's time zone. */
  issuedOn: string;
  item: string;
  /** GST-inclusive total actually charged, in cents. */
  totalCents: number;
  gstCents: number;
};

export type TaxInvoiceInput = {
  item: string;
  /** GST-inclusive amount charged, in cents (Stripe `amount_total`). */
  totalCents: number;
  issuedAt: Date;
};

export function formatInvoiceDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: INVOICE_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Throws TaxInvoiceConfigError when CARSI_ABN is unset or not a valid ABN, and
 * RangeError when the amount is not a positive whole number of cents.
 */
export function buildTaxInvoice(
  input: TaxInvoiceInput,
  env: NodeJS.ProcessEnv = process.env
): TaxInvoice {
  const abn = readCarsiAbn(env);
  if (!abn) {
    throw new TaxInvoiceConfigError(
      `${CARSI_ABN_ENV} is unset or not a valid ABN; a tax invoice cannot be issued without it`
    );
  }
  if (!Number.isInteger(input.totalCents) || input.totalCents <= 0) {
    throw new RangeError(`A tax invoice needs a positive charge in cents; got ${input.totalCents}`);
  }
  return {
    sellerName: CARSI_SELLER_LEGAL_NAME,
    abn,
    issuedOn: formatInvoiceDate(input.issuedAt),
    item: input.item,
    totalCents: input.totalCents,
    gstCents: gstFromGstInclusiveCents(input.totalCents),
  };
}

/**
 * For send paths: returns null when nothing was charged, and null with a loud log
 * when the ABN is missing, so the purchase email (which can carry the buyer's
 * set-password link) still goes out without a tax invoice rather than not at all.
 */
export function tryBuildTaxInvoice(
  input: Omit<TaxInvoiceInput, 'totalCents'> & { totalCents: number | null | undefined },
  env: NodeJS.ProcessEnv = process.env
): TaxInvoice | null {
  const { totalCents } = input;
  if (typeof totalCents !== 'number' || !Number.isInteger(totalCents) || totalCents <= 0) {
    return null;
  }
  try {
    return buildTaxInvoice({ ...input, totalCents }, env);
  } catch (e) {
    if (e instanceof TaxInvoiceConfigError) {
      console.error(
        `[tax-invoice] NOT ISSUED for "${input.item}" (${formatAudCents(totalCents)}): ${e.message}`
      );
      return null;
    }
    throw e;
  }
}
