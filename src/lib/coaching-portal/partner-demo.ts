import type { CoachingPortalWorkspace } from '@/lib/coaching-portal/types';
import type { CoachingOnboardingSnapshot } from '@/lib/coaching-portal/onboarding-snapshot';

/**
 * Seeded demo accounts live on this reserved, non-deliverable domain (RFC 2606 `.invalid`), so
 * no reset or marketing email can ever reach a real inbox. Client-safe: no Node imports here.
 */
export const PARTNER_DEMO_EMAIL_DOMAIN = 'demo.carsi.invalid';

export function isPartnerDemoEmail(email: string | null | undefined): boolean {
  return (email ?? '').trim().toLowerCase().endsWith(`@${PARTNER_DEMO_EMAIL_DOMAIN}`);
}

/**
 * GP-637: THE demo member. One home for every fact about the sample business, used by both the
 * public walkthrough page and the seed (src/lib/coaching-portal/partner-demo-seed.ts), so a
 * prospect sees the same person and business on the guide and in the live demo login.
 * Client-safe: no Node imports here. No PII: a fictional, clearly-labelled sample.
 */
export const PARTNER_DEMO_MEMBER = {
  fullName: 'Jordan Demo',
  email: `partner.demo.member@${PARTNER_DEMO_EMAIL_DOMAIN}`,
  firstName: 'Jordan',
} as const;

/** Sessions are labelled with this coach until GP-632 chapters exist. */
export const PARTNER_DEMO_COACH_NAME = 'Demo Coach';

export const PARTNER_DEMO_PROFILE = {
  businessName: 'Demo Restoration Co. (sample data)',
  industry: 'Water damage and carpet restoration',
  location: 'Austin, Texas (sample)',
  serviceAreas: 'Austin metro and surrounding counties',
  yearsInBusiness: '3–5 years',
  businessSize: 'Owner-operator with a small crew',
  employeeCount: '5',
  mainServices: 'Water damage mitigation, carpet cleaning, odour control',
  website: `https://${PARTNER_DEMO_EMAIL_DOMAIN}`,
  googleBusinessUrl: '',
  facebookUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  xUrl: '',
  socialNotes: 'Sample business for partner demonstrations only.',
  challenges:
    'Insurance-referred jobs are steady but margins are thin; quotes for retail cleaning go cold after the first visit.',
  shortTermGoals: 'Book one more direct (non-insurance) job each week within 90 days.',
  longTermVision:
    'A second crew run by a trained lead, with the owner out of the van three days a week.',
};

export const PARTNER_DEMO_STATEMENTS = {
  problemStatement: 'Retail quotes go cold after the first visit and the owner is the bottleneck.',
  goalStatement:
    'One more direct job booked every week, and a crew lead trained within six months.',
  extraNotes: 'Partner demo member (GP-637). Sample data only.',
};

export const PARTNER_DEMO_ASSESSMENT_ANSWERS: Record<string, string> = {
  owner_role: 'Owner, estimator and lead technician',
  typical_week:
    'Mornings on site, afternoons quoting and chasing insurers, invoices on Sunday night.',
  years_operating: '3–5 years',
  revenue_band: '$500k–$1M',
  profitability: 'Modest profit',
  revenue_notes: 'Cash flow dips when insurers pay late (45–60 days).',
  lead_sources: 'Two insurance panels, Google Business Profile, repeat property managers.',
  website_url: PARTNER_DEMO_PROFILE.website,
  google_business_url: 'Listed (sample)',
  facebook_url: 'Not used',
  instagram_url: 'Not used',
  linkedin_url: 'Owner profile only',
  tiktok_url: 'Not used',
  youtube_url: 'Not used',
  x_url: 'Not used',
  social_notes: 'Sample business: no real listings.',
  marketing_efforts: 'Panel relationships and occasional Google posts; no follow-up system.',
  enquiry_process: 'Phone answered by the owner when free; voicemail otherwise.',
  conversion_challenges: 'Retail quotes are sent and never followed up.',
  ops_strengths: 'Fast mitigation response and good drying records.',
  ops_pain: 'Owner is the bottleneck for every estimate and every customer call.',
  tools_used: 'Job management app, spreadsheet for quotes, phone camera for moisture photos.',
  automation_interest: 'Quote follow-up reminders and a weekly cash-flow snapshot.',
  top_priorities: '1. Quote follow-up rhythm. 2. Train a crew lead. 3. Weekly numbers.',
  success_12m: 'A second crew running without the owner on site.',
};

export const PARTNER_DEMO_WORKSPACE: CoachingPortalWorkspace = {
  horizontalSummary:
    'This quarter: lift direct (non-insurance) bookings and get the owner off the tools for quoting.',
  directionSummary:
    'Build a quote-to-booking rhythm first, then train a crew lead so a second van can run.',
  sessionPrepNotes:
    'Bring the quote log, last month’s cash-flow snapshot and the crew-lead shortlist.',
  monthlyActions: [],
};

/** Static copy for the public page; the seed builds its own with dates relative to "now". */
export const PARTNER_DEMO_ONBOARDING_SNAPSHOT: CoachingOnboardingSnapshot = {
  version: 1,
  submittedAtIso: '2026-10-15T02:00:00.000Z',
  member: { fullName: PARTNER_DEMO_MEMBER.fullName, email: PARTNER_DEMO_MEMBER.email },
  profile: PARTNER_DEMO_PROFILE,
  assessmentResponses: PARTNER_DEMO_ASSESSMENT_ANSWERS,
  statements: PARTNER_DEMO_STATEMENTS,
};

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
  /** Linear tickets that light the step up (coming steps only), as named in the run sheet. */
  tickets?: string[];
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
    shows:
      'The member’s home: plan focus, next action and next session, with the Demo mode banner.',
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
    shows:
      'CARSI courses picked from the assessment gaps, with live course progress, above the resource library.',
  },
  {
    title: 'Ask my coach assistant and marketing pack',
    segment: null,
    minutes: 0.5,
    advantage: 'A3 assistant and A7 marketing pack',
    status: 'coming',
    shows:
      'Coming: grounded answers from the coach’s own material, and a marketing pack per member.',
    tickets: ['GP-630', 'GP-634'],
  },
  {
    title: 'Your chapter and the Hall',
    segment: null,
    minutes: 1,
    advantage: 'A5 chapters and A9 TradeHall',
    status: 'coming',
    shows: 'Coming: the coach’s own chapter, members and currency, and the Hall seminar room.',
    tickets: ['GP-632', 'GP-636'],
  },
];
