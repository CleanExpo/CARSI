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
 *
 * The ATO requires a tax invoice for a sale of $1,000 or more (GST inclusive) to
 * show the buyer's identity or ABN
 * (https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/tax-invoices).
 * This file owns that rule too: at or above the threshold, `buildTaxInvoice` throws
 * without a buyer identity, so a non-compliant invoice is never issued.
 *
 * It also owns when an invoice may be issued at all: only for a Checkout session
 * Stripe reports as `payment_status: 'paid'`. Callers pass the session itself
 * (`checkout`), never their own amount or paid check; an `unpaid` session (funds
 * not yet available) or `no_payment_required` gets no invoice.
 */

/** The seller named on CARSI's Stripe account and on every payment and terms line. */
export const CARSI_SELLER_LEGAL_NAME = 'CARSI Pty Ltd';

/** The single config value that holds CARSI's ABN (11 digits, spaces allowed). */
export const CARSI_ABN_ENV = 'CARSI_ABN';

/** Tax invoice dates are CARSI's local date (Queensland), not the server's. */
const INVOICE_TIME_ZONE = 'Australia/Brisbane';

/** GST-inclusive total ($1,000.00) at or above which the invoice must identify the buyer. */
export const TAX_INVOICE_BUYER_IDENTITY_THRESHOLD_CENTS = 100000;

export class TaxInvoiceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaxInvoiceConfigError';
  }
}

/** Thrown when the Checkout session is not paid: no tax invoice without proof of payment. */
export class TaxInvoiceNotPaidError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaxInvoiceNotPaidError';
  }
}

/** Thrown when a tax invoice of $1,000 or more would carry no buyer identity or ABN. */
export class TaxInvoiceBuyerIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TaxInvoiceBuyerIdentityError';
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

/**
 * The best identity a caller has for the person or business that paid. Callers pass
 * raw values (blank is fine; this file trims them). Never pass a greeting fallback
 * such as "there" or an email local part: those are not an identity.
 */
export type TaxInvoiceBuyer = {
  /** The buyer's full name (e.g. Stripe `customer_details.name`). */
  name: string | null | undefined;
  businessName: string | null | undefined;
  /** The buyer's ABN, if collected. Only a checksum-valid ABN is used. */
  abn: string | null | undefined;
};

export type TaxInvoice = {
  sellerName: string;
  abn: string;
  /** Buyer's business name, else full name; null when unknown. */
  buyerIdentity: string | null;
  /** Buyer's ABN formatted "NN NNN NNN NNN"; null when not collected or invalid. */
  buyerAbn: string | null;
  /** Issue date, e.g. "22 November 2026", in CARSI's time zone. */
  issuedOn: string;
  item: string;
  /** GST-inclusive total actually charged, in cents. */
  totalCents: number;
  gstCents: number;
};

/**
 * The Stripe Checkout session the sale was paid through (structural subset of
 * `Stripe.Checkout.Session`; pass the session object itself). The invoice total is
 * its `amount_total`, the GST-inclusive amount charged, in cents.
 */
export type TaxInvoiceCheckout = {
  payment_status?: string | null;
  amount_total?: number | null;
};

export type TaxInvoiceInput = {
  item: string;
  /** Proof of payment: issued only when `payment_status` is 'paid'. */
  checkout: TaxInvoiceCheckout;
  issuedAt: Date;
  buyer: TaxInvoiceBuyer;
};

/** Structural subset of Stripe `Checkout.Session.customer_details`. */
type CheckoutCustomerDetails =
  | {
      name?: string | null;
      business_name?: string | null;
      tax_ids?: Array<{ type: string; value: string | null }> | null;
    }
  | null
  | undefined;

/** The buyer as Stripe Checkout recorded it: name, business name and any AU ABN. */
export function taxInvoiceBuyerFromCheckout(details: CheckoutCustomerDetails): TaxInvoiceBuyer {
  return {
    name: details?.name ?? null,
    businessName: details?.business_name ?? null,
    abn: details?.tax_ids?.find((t) => t.type === 'au_abn')?.value ?? null,
  };
}

function clean(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/** True when a tax invoice of this total must name the buyer (ATO, $1,000 or more). */
export function taxInvoiceNeedsBuyerIdentity(totalCents: number): boolean {
  return totalCents >= TAX_INVOICE_BUYER_IDENTITY_THRESHOLD_CENTS;
}

/** True when the invoice meets the buyer-identity rule for its total. */
export function taxInvoiceBuyerRuleMet(
  invoice: Pick<TaxInvoice, 'totalCents' | 'buyerIdentity' | 'buyerAbn'>
): boolean {
  return (
    !taxInvoiceNeedsBuyerIdentity(invoice.totalCents) ||
    Boolean(clean(invoice.buyerIdentity)) ||
    isValidAbn(invoice.buyerAbn)
  );
}

export function formatInvoiceDate(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: INVOICE_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Throws TaxInvoiceConfigError when CARSI_ABN is unset or not a valid ABN,
 * TaxInvoiceNotPaidError when the Checkout session is not 'paid',
 * TaxInvoiceBuyerIdentityError when a total of $1,000 or more has no buyer name,
 * business name or valid buyer ABN, and RangeError when the amount is not a
 * positive whole number of cents.
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
  const paymentStatus = input.checkout.payment_status;
  if (paymentStatus !== 'paid') {
    throw new TaxInvoiceNotPaidError(
      `the Checkout session is not paid (payment_status ${paymentStatus ?? 'missing'}); no tax invoice without proof of payment`
    );
  }
  const totalCents = input.checkout.amount_total;
  if (typeof totalCents !== 'number' || !Number.isInteger(totalCents) || totalCents <= 0) {
    throw new RangeError(`A tax invoice needs a positive charge in cents; got ${totalCents}`);
  }
  const buyerIdentity = clean(input.buyer.businessName) ?? clean(input.buyer.name);
  const buyerAbn = isValidAbn(input.buyer.abn) ? formatAbn(input.buyer.abn!) : null;
  if (!taxInvoiceBuyerRuleMet({ totalCents, buyerIdentity, buyerAbn })) {
    throw new TaxInvoiceBuyerIdentityError(
      `a tax invoice of ${formatAudCents(TAX_INVOICE_BUYER_IDENTITY_THRESHOLD_CENTS)} or more needs the buyer's name, business name or ABN, and none was given`
    );
  }
  return {
    sellerName: CARSI_SELLER_LEGAL_NAME,
    abn,
    buyerIdentity,
    buyerAbn,
    issuedOn: formatInvoiceDate(input.issuedAt),
    item: input.item,
    totalCents,
    gstCents: gstFromGstInclusiveCents(totalCents),
  };
}

/**
 * For send paths: returns null when nothing was charged, and null with a loud log
 * when the session is not paid, the ABN is missing or a $1,000+ sale has no buyer
 * identity, so the purchase
 * email (which can carry the buyer's set-password link) still goes out without a
 * tax invoice rather than not at all, and no non-compliant invoice is ever sent.
 */
export function tryBuildTaxInvoice(
  input: TaxInvoiceInput,
  env: NodeJS.ProcessEnv = process.env
): TaxInvoice | null {
  const totalCents = input.checkout.amount_total;
  if (typeof totalCents !== 'number' || !Number.isInteger(totalCents) || totalCents <= 0) {
    return null;
  }
  try {
    return buildTaxInvoice(input, env);
  } catch (e) {
    if (
      e instanceof TaxInvoiceConfigError ||
      e instanceof TaxInvoiceNotPaidError ||
      e instanceof TaxInvoiceBuyerIdentityError
    ) {
      console.error(
        `[tax-invoice] NOT ISSUED for "${input.item}" (${formatAudCents(totalCents)}): ${e.message}`
      );
      return null;
    }
    throw e;
  }
}
