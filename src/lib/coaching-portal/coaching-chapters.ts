/**
 * GP-632 (A5) — in-repo chapter registry until a `coaching_chapters` table ships.
 * Source of truth for coach display, currency, and checkout eligibility (not Stripe ids).
 */
import { carsiCoachingMonthlyPriceCents } from '@/lib/marketing/carsi-coaching-monthly';

export const DEFAULT_COACHING_CHAPTER_SLUG = 'carsi-business-coaching';
export const DEFAULT_COACHING_COACH_ID = 'coach-phill-mcgurk';
export const DEFAULT_COACHING_COACH_NAME = 'Phill McGurk';
export const DEFAULT_COACHING_COACH_HEADLINE =
  'Business growth coaching for Australian cleaning and restoration owners';

export type CoachingChapterCurrency = 'AUD' | 'USD';

export type CoachingChapterDefinition = {
  slug: string;
  title: string;
  currency: CoachingChapterCurrency;
  priceCents: number;
  /** When true, marketing copy may say GST included (AU chapters). */
  gstInclusive: boolean;
  coachUserId: string;
  coachDisplayName: string;
  headline: string;
  notificationEmail: string;
  allowCheckout: boolean;
  isDemo?: boolean;
};

/** Demo US chapter — draft in docs/coaching/partner-demo-chapter-DRAFT.md; no live Stripe. */
export const DEMO_US_CHAPTER_SLUG = 'demo-us';

const CARSI_CHAPTER: CoachingChapterDefinition = {
  slug: DEFAULT_COACHING_CHAPTER_SLUG,
  title: 'CARSI Business Coaching',
  currency: 'AUD',
  priceCents: carsiCoachingMonthlyPriceCents,
  gstInclusive: true,
  coachUserId: DEFAULT_COACHING_COACH_ID,
  coachDisplayName: DEFAULT_COACHING_COACH_NAME,
  headline: DEFAULT_COACHING_COACH_HEADLINE,
  notificationEmail: 'phill.mcgurk@gmail.com',
  allowCheckout: true,
};

const DEMO_US_CHAPTER: CoachingChapterDefinition = {
  slug: DEMO_US_CHAPTER_SLUG,
  title: 'Demo US chapter (sample)',
  currency: 'USD',
  priceCents: 349_00,
  gstInclusive: false,
  coachUserId: 'coach-demo-us',
  coachDisplayName: 'Demo Coach',
  headline: 'Sample chapter for partner demonstrations — USD pricing, no live checkout',
  notificationEmail: `ops@${'demo.carsi.invalid'}`,
  allowCheckout: false,
  isDemo: true,
};

export const COACHING_CHAPTERS: readonly CoachingChapterDefinition[] = [
  CARSI_CHAPTER,
  DEMO_US_CHAPTER,
] as const;

export function getCoachingChapter(
  slug: string | null | undefined
): CoachingChapterDefinition | null {
  const key = slug?.trim().toLowerCase();
  if (!key) return null;
  return COACHING_CHAPTERS.find((c) => c.slug === key) ?? null;
}

export function getCoachingChapterByCoachId(
  coachUserId: string | null | undefined
): CoachingChapterDefinition | null {
  const key = coachUserId?.trim();
  if (!key) return null;
  return COACHING_CHAPTERS.find((c) => c.coachUserId === key) ?? null;
}

export function formatChapterPriceLabel(chapter: CoachingChapterDefinition): string {
  const dollars = chapter.priceCents / 100;
  const symbol = chapter.currency === 'AUD' ? '$' : 'US$';
  const base =
    dollars % 1 === 0 ? `${symbol}${dollars.toFixed(0)}` : `${symbol}${dollars.toFixed(2)}`;
  const gst = chapter.gstInclusive ? ' (GST inclusive)' : '';
  return `${base}/month${gst}`;
}

export function listCoachingChapterOptions(): {
  slug: string;
  title: string;
  coachUserId: string;
  coachDisplayName: string;
  priceLabel: string;
  allowCheckout: boolean;
  isDemo: boolean;
}[] {
  return COACHING_CHAPTERS.map((c) => ({
    slug: c.slug,
    title: c.title,
    coachUserId: c.coachUserId,
    coachDisplayName: c.coachDisplayName,
    priceLabel: formatChapterPriceLabel(c),
    allowCheckout: c.allowCheckout,
    isDemo: Boolean(c.isDemo),
  }));
}
