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

export const PARTNER_DEMO_WALKTHROUGH_STEPS = [
  { title: 'Onboarding profile', segment: '/onboarding/profile', minutes: 2 },
  { title: 'Business assessment', segment: '/onboarding/assessment', minutes: 2 },
  { title: 'Submit brief to coach', segment: '/onboarding/submit', minutes: 2 },
  { title: 'Growth plan', segment: '/plan', minutes: 2 },
  { title: 'Monthly actions', segment: '/actions', minutes: 1 },
  { title: 'Session prep', segment: '/sessions', minutes: 1 },
] as const;
