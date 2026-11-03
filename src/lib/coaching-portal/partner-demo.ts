import type { CoachingPortalWorkspace } from '@/lib/coaching-portal/types';
import type { CoachingOnboardingSnapshot } from '@/lib/coaching-portal/onboarding-snapshot';
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';

/** GP-637 — read-only sample data for partner demos (no PII). */
export const PARTNER_DEMO_MEMBER = {
  fullName: 'Alex Demo',
  email: 'demo.member@example.carsi.test',
  firstName: 'Alex',
} as const;

export const PARTNER_DEMO_WORKSPACE: CoachingPortalWorkspace = {
  horizontalSummary:
    'Focus this quarter: lift average job value on residential carpet cleans and tighten follow-up after quotes.',
  directionSummary:
    'Build a repeatable quote-to-booking rhythm, then test one upsell on every residential job for four weeks.',
  sessionPrepNotes:
    'Bring last month’s job list, top three objections from quotes, and one competitor ad you keep seeing.',
  monthlyActions: [
    { id: 'demo-1', title: 'Script a 60-second quote follow-up call', status: 'in_progress' },
    { id: 'demo-2', title: 'List three add-ons to offer on every residential job', status: 'todo' },
    { id: 'demo-3', title: 'Review Google Business profile with fresh photos', status: 'done' },
  ],
};

export const PARTNER_DEMO_ONBOARDING_SNAPSHOT: CoachingOnboardingSnapshot = {
  version: 1,
  submittedAtIso: '2026-10-15T02:00:00.000Z',
  member: { fullName: PARTNER_DEMO_MEMBER.fullName, email: PARTNER_DEMO_MEMBER.email },
  profile: {
    businessName: 'Demo Carpet & Restoration Pty Ltd',
    industry: 'Commercial cleaning',
    location: 'Perth, WA',
    serviceAreas: 'Perth metro',
    yearsInBusiness: '3–5 years',
    businessSize: 'Owner-operator with 2 technicians',
    employeeCount: '3',
    mainServices: 'Carpet cleaning, water damage assist',
    website: 'https://example.carsi.test',
    googleBusinessUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    linkedinUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
    xUrl: '',
    socialNotes: '',
    challenges: 'Quotes stalling after the first visit; hard to stand out against low-price competitors.',
    shortTermGoals: 'Raise conversion on quotes sent this month.',
    longTermVision: 'Stable $40k/month with two vans and a trained second-in-charge.',
  },
  assessmentResponses: {},
  statements: {
    problemStatement: 'Quotes go cold after the first visit.',
    goalStatement: 'Add one booked job per week.',
    extraNotes: 'Partner demo snapshot (GP-637).',
  },
};

export const PARTNER_DEMO_COACH = DEFAULT_COACHING_COACH;

/**
 * Seeded demo accounts live on this reserved, non-deliverable domain (RFC 2606 `.invalid`), so
 * no reset or marketing email can ever reach a real inbox. Client-safe: no Node imports here.
 */
export const PARTNER_DEMO_EMAIL_DOMAIN = 'demo.carsi.invalid';

export function isPartnerDemoEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase().endsWith(`@${PARTNER_DEMO_EMAIL_DOMAIN}`);
}

export type PartnerDemoWalkthroughStep = {
  title: string;
  /** Portal segment under /dashboard/coaching; null while the screen is still being built. */
  segment: string | null;
  minutes: number;
  /** The coaching advantage this step proves to a prospect coach. */
  advantage: string;
  status: 'live' | 'coming';
  /** What the prospect sees on the screen, in one sentence. */
  shows: string;
  /** Linear ticket that lights the step up (coming steps only). */
  ticket?: string;
};

/**
 * GP-637 ten-step run sheet, in the order a prospect coach should see it. Mirrors
 * docs/coaching/partner-demo-runsheet.md (a test keeps the two in step).
 */
export const PARTNER_DEMO_WALKTHROUGH_STEPS: readonly PartnerDemoWalkthroughStep[] = [
  {
    title: 'Member home',
    segment: '/',
    minutes: 1,
    advantage: 'One workspace per member',
    status: 'live',
    shows: 'The member’s home: plan focus, next action and next session, with the Demo mode banner.',
  },
  {
    title: 'Business profile',
    segment: '/onboarding/profile',
    minutes: 1,
    advantage: 'Structured onboarding',
    status: 'live',
    shows: 'The business profile the member filled in before the first session.',
  },
  {
    title: 'Business assessment',
    segment: '/onboarding/assessment',
    minutes: 1,
    advantage: 'Evidence before the first call',
    status: 'live',
    shows: 'Every assessment answer, plus the coach’s review feedback.',
  },
  {
    title: 'Onboarding packet',
    segment: '/onboarding/packet',
    minutes: 1,
    advantage: 'A1 onboarding brief (frozen packet today)',
    status: 'live',
    shows: 'The frozen packet the coach receives. The AI-written brief arrives with A1.',
  },
  {
    title: 'Growth plan',
    segment: '/plan',
    minutes: 1,
    advantage: 'Coach-approved plan',
    status: 'live',
    shows: 'The approved plan focus, direction and latest guidance.',
  },
  {
    title: 'Action board',
    segment: '/actions',
    minutes: 1.5,
    advantage: 'Dated commitments with coach feedback',
    status: 'live',
    shows: 'Six actions in every state: done, in progress, to do and blocked.',
  },
  {
    title: 'Sessions',
    segment: '/sessions',
    minutes: 1.5,
    advantage: 'Every session ends in decisions',
    status: 'live',
    shows: 'Last session’s decisions and next session’s prep notes.',
  },
  {
    title: 'Learning path and resources',
    segment: '/resources',
    minutes: 0.5,
    advantage: 'A6 prescribed learning path',
    status: 'live',
    shows: 'The resource library today. Modules assigned from assessment gaps arrive with A6 (GP-633).',
  },
  {
    title: 'Ask my coach assistant and marketing pack',
    segment: null,
    minutes: 0.5,
    advantage: 'A3 assistant and A7 marketing pack',
    status: 'coming',
    shows: 'Coming: grounded answers from the coach’s own material, and a marketing pack per member.',
    ticket: 'GP-630',
  },
  {
    title: 'Your chapter and the Hall',
    segment: null,
    minutes: 1,
    advantage: 'A5 chapters and A9 TradeHall',
    status: 'coming',
    shows: 'Coming: the coach’s own chapter, members and currency, and the Hall seminar room.',
    ticket: 'GP-632',
  },
];
