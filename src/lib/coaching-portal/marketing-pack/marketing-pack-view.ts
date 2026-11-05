import type { ChecklistItem, SiteReview, SocialCalendar } from './types';

/** Visual-centred coaching: stable ids for jump nav, stats and tests. */
export const MARKETING_PACK_SECTION_IDS = {
  downloads: 'mp-downloads',
  checks: 'mp-checks',
  gbp: 'mp-gbp',
  review: 'mp-review',
  checklist: 'mp-checklist',
  calendar: 'mp-calendar',
  support: 'mp-support',
} as const;

export type MarketingPackStat = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone: 'neutral' | 'good' | 'warn';
};

export function marketingPackStats(input: {
  review: SiteReview;
  checklist: ChecklistItem[];
  calendar: SocialCalendar;
}): MarketingPackStat[] {
  const checksPassed = input.review.checks.filter((c) => c.passed).length;
  const checklistDone = input.checklist.filter((i) => i.done).length;
  const checksTotal = input.review.checks.length;
  const checklistTotal = input.checklist.length;

  return [
    {
      id: 'fixes',
      label: 'Priority fixes',
      value: String(input.review.fixes.length),
      hint: 'Ranked for your coach to approve',
      tone: input.review.fixes.length > 0 ? 'warn' : 'good',
    },
    {
      id: 'checks',
      label: 'Site checks passed',
      value: checksTotal ? `${checksPassed}/${checksTotal}` : '—',
      hint: checksTotal ? `${checksTotal - checksPassed} to improve on site` : 'No website read',
      tone: checksTotal && checksPassed === checksTotal ? 'good' : 'neutral',
    },
    {
      id: 'checklist',
      label: 'Checklist done',
      value: `${checklistDone}/${checklistTotal}`,
      hint: 'Local visibility habits',
      tone: checklistDone > 0 ? 'good' : 'neutral',
    },
    {
      id: 'social',
      label: 'Social drafts',
      value: String(input.calendar.posts.length),
      hint: 'Claim-safe templates',
      tone: 'neutral',
    },
  ];
}

export function checklistCompletionPercent(items: ChecklistItem[]): number {
  if (items.length === 0) return 0;
  return Math.round((items.filter((i) => i.done).length / items.length) * 100);
}

export type MarketingPackJumpLink = { id: string; label: string };

export function marketingPackJumpLinks(hasChecks: boolean): MarketingPackJumpLink[] {
  const links: MarketingPackJumpLink[] = [
    { id: MARKETING_PACK_SECTION_IDS.downloads, label: 'Resources' },
  ];
  if (hasChecks) links.push({ id: MARKETING_PACK_SECTION_IDS.checks, label: 'Checks' });
  links.push(
    { id: MARKETING_PACK_SECTION_IDS.review, label: 'Fixes' },
    { id: MARKETING_PACK_SECTION_IDS.checklist, label: 'Checklist' },
    { id: MARKETING_PACK_SECTION_IDS.calendar, label: 'Social' },
    { id: MARKETING_PACK_SECTION_IDS.support, label: 'Help' }
  );
  return links;
}

export const MARKETING_PACK_BUILD_STEPS = [
  'Reading your public home page',
  'Running local-search checks',
  'Assembling your 30-day calendar',
  'Saving fixes for coach review',
] as const;
