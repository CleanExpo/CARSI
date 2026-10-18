/**
 * RWR — recurring weekly revenue, the metric GOAL.md runs on (V5):
 *
 *   RWR = (memberships × $795 + seats × seat price) ÷ 52 + 4-week rolling course sales
 *
 * "4-week rolling course sales" is read as a weekly figure, like the rest of the sum: course
 * sales over the last 28 days ÷ 4. The report prints both the 28-day total and the weekly share,
 * so the reading is visible and a change of definition is one constant here.
 *
 * Pure arithmetic in whole cents. Nothing here reads Stripe; `rwr-stripe.ts` does that, so the
 * part that can be quietly wrong is the part these unit tests cover.
 */

/** GOAL.md fixes the membership term at $795 a year, whatever a single invoice was discounted to. */
export const RWR_MEMBERSHIP_ANNUAL_CENTS = 79_500;
export const WEEKS_PER_YEAR = 52;
export const COURSE_SALES_WINDOW_DAYS = 28;
export const COURSE_SALES_WINDOW_WEEKS = 4;

export type SeatLine = {
  /** Seats on one Teams subscription item. */
  seats: number;
  /** What one seat costs per year, in cents (the Stripe unit price, annualised). */
  annualSeatPriceCents: number;
};

export type RwrInputs = {
  /** Active yearly memberships. */
  memberships: number;
  seatLines: SeatLine[];
  /** Paid course sales in the last 28 days, in cents (gross, AUD). */
  courseSalesCents28d: number;
};

export type RwrResult = {
  memberships: number;
  seats: number;
  membershipAnnualCents: number;
  seatAnnualCents: number;
  /** (memberships × $795 + seats × seat price) ÷ 52 */
  recurringWeeklyCents: number;
  courseSalesCents28d: number;
  /** course sales over 28 days ÷ 4 */
  courseSalesWeeklyCents: number;
  rwrWeeklyCents: number;
};

function wholeNonNegative(n: number, what: string): number {
  if (!Number.isInteger(n) || n < 0)
    throw new Error(`RWR input ${what} must be a whole number >= 0 (got ${n})`);
  return n;
}

export function computeRwr(inputs: RwrInputs): RwrResult {
  const memberships = wholeNonNegative(inputs.memberships, 'memberships');
  let seats = 0;
  let seatAnnualCents = 0;
  for (const line of inputs.seatLines) {
    const n = wholeNonNegative(line.seats, 'seats');
    seats += n;
    seatAnnualCents += n * wholeNonNegative(line.annualSeatPriceCents, 'annualSeatPriceCents');
  }
  const courseSalesCents28d = wholeNonNegative(inputs.courseSalesCents28d, 'courseSalesCents28d');

  const membershipAnnualCents = memberships * RWR_MEMBERSHIP_ANNUAL_CENTS;
  const recurringWeekly = (membershipAnnualCents + seatAnnualCents) / WEEKS_PER_YEAR;
  const courseWeekly = courseSalesCents28d / COURSE_SALES_WINDOW_WEEKS;
  return {
    memberships,
    seats,
    membershipAnnualCents,
    seatAnnualCents,
    recurringWeeklyCents: Math.round(recurringWeekly),
    courseSalesCents28d,
    courseSalesWeeklyCents: Math.round(courseWeekly),
    // Rounded once, from the unrounded parts.
    rwrWeeklyCents: Math.round(recurringWeekly + courseWeekly),
  };
}

/**
 * A recurring Stripe unit price as a yearly amount, or null when the interval is unknown (the
 * caller must refuse rather than guess).
 */
export function annualiseUnitAmount(
  unitAmountCents: number,
  interval: string,
  intervalCount = 1
): number | null {
  if (!Number.isFinite(unitAmountCents) || unitAmountCents < 0) return null;
  if (!Number.isInteger(intervalCount) || intervalCount < 1) return null;
  const perYear: Record<string, number> = { year: 1, month: 12, week: 52, day: 365 };
  const n = perYear[interval];
  if (n === undefined) return null;
  return Math.round((unitAmountCents * n) / intervalCount);
}

/** "$1,234.56" — en-AU, AUD. */
export function formatAud(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
