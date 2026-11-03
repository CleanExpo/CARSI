/**
 * Coaching chapters (GP-632). Pure helpers: no database, no env reads, so routing and
 * pricing rules can be tested directly. The server module loads the coach record.
 */
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import type { CoachingActionStatus } from '@/lib/coaching-portal/types';
import {
  carsiCoachingMonthlyPriceCents,
  carsiCoachingProductName,
} from '@/lib/marketing/carsi-coaching-monthly';

export type CoachRecord = {
  id: string;
  userId: string | null;
  displayName: string;
  chapterSlug: string;
  chapterName: string;
  currency: string;
  monthlyPriceCents: number | null;
  stripePriceId: string | null;
  notificationEmail: string;
  /** Chapter accent colour (#rrggbb); null uses the CARSI brand. */
  brandColour: string | null;
  /** Chapter logo (https image URL, a real uploaded asset); null shows the chapter name only. */
  logoUrl: string | null;
  isDefault: boolean;
  isDemo: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CoachNotificationEmailInvalidError extends Error {
  constructor(chapterSlug: string) {
    super(`coach_notification_email_invalid:${chapterSlug}`);
    this.name = 'CoachNotificationEmailInvalidError';
  }
}

/**
 * Who receives a member's coach emails (onboarding packet, session prep, growth quote).
 * No coach, or the default coach, keeps today's founder routing exactly. A partner coach
 * with an unusable address throws: their member's data must never go to another chapter.
 */
export function coachNotifyRecipients(
  coach: CoachRecord | null,
  defaultRecipients: string[]
): string[] {
  if (!coach || coach.isDefault) return defaultRecipients;
  const email = coach.notificationEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) throw new CoachNotificationEmailInvalidError(coach.chapterSlug);
  return [email];
}

/** First name used in member-facing copy ("so Phill can prepare"). */
export function coachFirstName(coach: CoachRecord | null): string {
  const name = coach?.displayName.trim() || DEFAULT_COACHING_COACH.displayName;
  return name.split(/\s+/)[0] || 'your coach';
}

/** The chapter has no usable price: none set, or a currency we cannot label correctly. */
export class CoachPriceMissingError extends Error {
  constructor(chapterSlug: string, reason = 'coach_price_missing') {
    super(`${reason}:${chapterSlug}`);
    this.name = 'CoachPriceMissingError';
  }
}

/**
 * Chapter currencies whose Stripe amounts are in hundredths, so `amount / 100` is the
 * price a member sees. Zero-decimal and three-decimal currencies (JPY, KWD, ...) are
 * refused until labelling handles them, so a label can never understate the charge.
 */
export const COACH_CURRENCIES = ['aud', 'usd', 'nzd', 'cad', 'gbp', 'eur', 'sgd'] as const;

/** A partner chapter's own monthly price. Never borrows the AUD default amount. */
function partnerPriceCents(coach: CoachRecord): number {
  if (coach.monthlyPriceCents == null || coach.monthlyPriceCents <= 0) {
    throw new CoachPriceMissingError(coach.chapterSlug);
  }
  partnerCurrency(coach);
  return coach.monthlyPriceCents;
}

function partnerCurrency(coach: CoachRecord): string {
  const currency = coach.currency.trim().toLowerCase();
  if (!(COACH_CURRENCIES as readonly string[]).includes(currency)) {
    throw new CoachPriceMissingError(coach.chapterSlug, 'coach_currency_unsupported');
  }
  return currency;
}

const DEFAULT_DESCRIPTION =
  'Monthly business coaching: LMS roadmap, progress tracking, and a live owner session with Phill McGurk.';

export type CoachCheckoutLineItem =
  | { quantity: 1; price: string }
  | {
      quantity: 1;
      price_data: {
        currency: string;
        unit_amount: number;
        recurring: { interval: 'month' };
        product_data: { name: string; description: string };
      };
    };

/**
 * The Stripe line item for a member's monthly coaching. A coach's own Stripe price wins;
 * otherwise the coach's currency and amount; otherwise today's AUD default.
 */
export function coachCheckoutLineItem(coach: CoachRecord | null): CoachCheckoutLineItem {
  // A partner must carry its own amount even with a Stripe price, so the price shown
  // before checkout is the coach's, not a guess.
  if (coach && !coach.isDefault) partnerPriceCents(coach);
  if (coach?.stripePriceId?.trim()) {
    return { quantity: 1, price: coach.stripePriceId.trim() };
  }
  if (!coach || coach.isDefault) {
    return {
      quantity: 1,
      price_data: {
        currency: 'aud',
        unit_amount: carsiCoachingMonthlyPriceCents,
        recurring: { interval: 'month' },
        product_data: { name: carsiCoachingProductName, description: DEFAULT_DESCRIPTION },
      },
    };
  }
  return {
    quantity: 1,
    price_data: {
      currency: partnerCurrency(coach),
      unit_amount: partnerPriceCents(coach),
      recurring: { interval: 'month' },
      product_data: {
        name: coach.chapterName,
        description: `Monthly business coaching with ${coach.displayName}: roadmap, progress tracking and a live owner session.`,
      },
    },
  };
}

/** "$497/month" (USD) or "$495/month" (AUD). GST wording belongs to AU copy only. */
export function coachPriceLabel(coach: CoachRecord | null): string {
  const cents =
    coach && !coach.isDefault ? partnerPriceCents(coach) : carsiCoachingMonthlyPriceCents;
  const currency = coach && !coach.isDefault ? coach.currency.toUpperCase() : 'AUD';
  const dollars = Number.isInteger(cents / 100) ? String(cents / 100) : (cents / 100).toFixed(2);
  const symbol = currency === 'AUD' ? '$' : currency === 'USD' ? 'US$' : `${currency} `;
  return `${symbol}${dollars}/month`;
}

/** The amount and currency a member of this chapter is charged each month. */
export type CoachCharge = { amountCents: number; currency: string };

export function coachCharge(coach: CoachRecord | null): CoachCharge {
  if (!coach || coach.isDefault) {
    return { amountCents: carsiCoachingMonthlyPriceCents, currency: 'aud' };
  }
  return { amountCents: partnerPriceCents(coach), currency: partnerCurrency(coach) };
}

/** The member saw a different price from the one checkout would charge now. */
export class CoachingPriceChangedError extends Error {
  constructor() {
    super('coaching_price_changed');
    this.name = 'CoachingPriceChangedError';
  }
}

export function sameCharge(a: CoachCharge, b: CoachCharge): boolean {
  return a.amountCents === b.amountCents && a.currency.toLowerCase() === b.currency.toLowerCase();
}

/** A coach's Stripe price may only be used when Stripe bills exactly the disclosed charge. */
export function stripePriceMatchesCharge(
  price: {
    active: boolean;
    currency: string;
    unit_amount: number | null;
    recurring: { interval: string; interval_count?: number } | null;
  },
  charge: CoachCharge
): boolean {
  return (
    price.active &&
    price.unit_amount === charge.amountCents &&
    price.currency.toLowerCase() === charge.currency.toLowerCase() &&
    price.recurring?.interval === 'month' &&
    (price.recurring.interval_count ?? 1) === 1
  );
}

/** What a subscribe button must show before it sends a member to Stripe. */
export type CoachPriceDisclosure = CoachCharge & { priceLabel: string; billingNote: string };

export function coachPriceDisclosure(coach: CoachRecord | null): CoachPriceDisclosure {
  const currency = coach && !coach.isDefault ? coach.currency.trim().toUpperCase() : 'AUD';
  return {
    ...coachCharge(coach),
    priceLabel: coachPriceLabel(coach),
    billingNote:
      currency === 'AUD'
        ? 'Secure subscription via Stripe. GST included. Cancel anytime from billing.'
        : `Secure subscription via Stripe, billed in ${currency}. Cancel anytime from billing.`,
  };
}

/** True when a profile with this coach_id belongs to the coach's chapter. */
export function isMemberOfChapter(coach: CoachRecord, memberCoachId: string | null): boolean {
  return coach.isDefault
    ? memberCoachId === null || memberCoachId === coach.id
    : memberCoachId === coach.id;
}

export type MemberOnboardingStatus = 'not_started' | 'profile' | 'assessment' | 'submitted';

export function memberOnboardingStatus(input: {
  profileCompletedAt: Date | null;
  assessmentStatus: string | null;
  onboardingSubmittedAt: Date | null;
}): MemberOnboardingStatus {
  if (input.onboardingSubmittedAt) return 'submitted';
  if (input.assessmentStatus === 'submitted' || input.assessmentStatus === 'reviewed') {
    return 'assessment';
  }
  if (input.profileCompletedAt) return 'profile';
  return 'not_started';
}

export const MEMBER_ONBOARDING_LABEL: Record<MemberOnboardingStatus, string> = {
  not_started: 'Not started',
  profile: 'Profile done',
  assessment: 'Assessment done',
  submitted: 'Packet submitted',
};

export function countActions(statuses: string[]): { open: number; blocked: number } {
  let open = 0;
  let blocked = 0;
  for (const s of statuses as CoachingActionStatus[]) {
    if (s === 'todo' || s === 'in_progress') open += 1;
    if (s === 'blocked') blocked += 1;
  }
  return { open, blocked };
}

/** Earliest scheduled session in the future, or null. */
export function nextSessionAt(
  sessions: { scheduledAt: Date; status: string }[],
  now: Date
): Date | null {
  let best: Date | null = null;
  for (const s of sessions) {
    if (s.status !== 'scheduled' || s.scheduledAt <= now) continue;
    if (!best || s.scheduledAt < best) best = s.scheduledAt;
  }
  return best;
}

/** What an admin enters to open a partner chapter (GP-632). Revenue share is not part of it. */
export type NewCoachInput = {
  displayName: string;
  chapterSlug: string;
  chapterName: string;
  currency: string;
  monthlyPriceCents: number | null;
  stripePriceId: string | null;
  notificationEmail: string;
  brandColour: string | null;
  logoUrl: string | null;
  userId?: string | null;
};

export type ValidCoachInput = Required<Omit<NewCoachInput, 'userId'>> & { userId: string | null };

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const COLOUR_RE = /^#[0-9a-fA-F]{6}$/;
const STRIPE_PRICE_RE = /^price_[A-Za-z0-9]{1,250}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * Checks a new partner chapter before it is saved. Every partner carries its own price in a
 * supported two-decimal currency (so a label can never understate the charge), a valid coach
 * inbox (so member data cannot go astray), and only a plain colour and an https logo URL (so
 * branding cannot inject markup or scripts).
 */
export function validateNewCoachInput(
  raw: Partial<Record<keyof NewCoachInput, unknown>>
): { ok: true; value: ValidCoachInput } | { ok: false; detail: string } {
  const displayName = optionalText(raw.displayName);
  const chapterName = optionalText(raw.chapterName);
  const chapterSlug = optionalText(raw.chapterSlug)?.toLowerCase() ?? '';
  const currency = optionalText(raw.currency)?.toLowerCase() ?? '';
  const notificationEmail = optionalText(raw.notificationEmail)?.toLowerCase() ?? '';
  const stripePriceId = optionalText(raw.stripePriceId);
  const brandColour = optionalText(raw.brandColour);
  const logoUrl = optionalText(raw.logoUrl);
  const userId = optionalText(raw.userId);
  const cents = raw.monthlyPriceCents;

  if (!displayName || displayName.length > 120) return { ok: false, detail: 'Coach name is required (120 characters max).' };
  if (!chapterName || chapterName.length > 120) return { ok: false, detail: 'Chapter name is required (120 characters max).' };
  if (!SLUG_RE.test(chapterSlug)) {
    return { ok: false, detail: 'Chapter slug: lowercase letters, numbers and dashes only.' };
  }
  if (!(COACH_CURRENCIES as readonly string[]).includes(currency)) {
    return { ok: false, detail: `Currency must be one of ${COACH_CURRENCIES.join(', ').toUpperCase()}.` };
  }
  if (typeof cents !== 'number' || !Number.isInteger(cents) || cents <= 0 || cents > 10_000_000) {
    return { ok: false, detail: 'Monthly price must be a whole number of cents above zero.' };
  }
  if (!EMAIL_RE.test(notificationEmail) || notificationEmail.length > 320) {
    return { ok: false, detail: 'Coach notification email is not valid.' };
  }
  if (stripePriceId && !STRIPE_PRICE_RE.test(stripePriceId)) {
    return { ok: false, detail: 'Stripe price id must start with price_.' };
  }
  if (brandColour && !COLOUR_RE.test(brandColour)) {
    return { ok: false, detail: 'Brand colour must look like #1d3557.' };
  }
  if (logoUrl) {
    let url: URL | null = null;
    try {
      url = new URL(logoUrl);
    } catch {
      url = null;
    }
    if (!url || url.protocol !== 'https:' || logoUrl.length > 500) {
      return { ok: false, detail: 'Logo must be an https image URL.' };
    }
  }
  if (userId && !UUID_RE.test(userId)) return { ok: false, detail: 'Coach login id is not valid.' };

  return {
    ok: true,
    value: {
      displayName,
      chapterSlug,
      chapterName,
      currency,
      monthlyPriceCents: cents,
      stripePriceId,
      notificationEmail,
      brandColour: brandColour?.toLowerCase() ?? null,
      logoUrl,
      userId,
    },
  };
}
