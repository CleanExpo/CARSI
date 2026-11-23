/**
 * GP-628 / Coaching advantage A1 — structured coach brief from the onboarding packet.
 * Pure composition + validation; persistence and model calls live in server module.
 */
import type { CoachingOnboardingSnapshot } from '@/lib/coaching-portal/onboarding-snapshot';

export type CoachBriefSection = {
  heading: string;
  body: string;
};

export type OnboardingCoachBrief = {
  version: 1;
  generatedAt: string;
  source: 'model' | 'fallback';
  model: string | null;
  memberName: string;
  businessName: string;
  summary: string;
  sections: CoachBriefSection[];
  /** Suggested first-month focus — coach edits before publishing plan. */
  suggestedFocusTitle: string;
  suggestedFocusDescription: string;
  draftActions: { title: string; rationale: string }[];
};

const MAX_SECTIONS = 8;
const MAX_ACTIONS = 5;

export function composeFallbackCoachBrief(snapshot: CoachingOnboardingSnapshot): OnboardingCoachBrief {
  const businessName = snapshot.profile.businessName.trim() || snapshot.member.fullName;
  const problem = snapshot.statements.problemStatement.trim();
  const goal = snapshot.statements.goalStatement.trim();
  const industry = snapshot.profile.industry.trim();
  const location = snapshot.profile.location.trim();

  const sections: CoachBriefSection[] = [
    {
      heading: 'Situation',
      body: `${businessName} (${industry || 'trade'}) in ${location || 'their market'}. ${problem}`,
    },
    {
      heading: 'Member-stated goal',
      body: goal,
    },
    {
      heading: 'What they bring',
      body: [
        snapshot.profile.mainServices.trim(),
        snapshot.profile.yearsInBusiness ? `Years operating: ${snapshot.profile.yearsInBusiness}` : '',
        snapshot.profile.challenges.trim(),
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
    {
      heading: 'Marketing & visibility snapshot',
      body: [
        snapshot.profile.website ? `Website: ${snapshot.profile.website}` : 'No website listed.',
        snapshot.profile.googleBusinessUrl
          ? `Google Business Profile: ${snapshot.profile.googleBusinessUrl}`
          : 'GBP not linked yet.',
      ].join('\n'),
    },
  ];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: 'fallback',
    model: null,
    memberName: snapshot.member.fullName,
    businessName,
    summary: `New coaching member — prioritise ${goal.slice(0, 120)}${goal.length > 120 ? '…' : ''}`,
    sections,
    suggestedFocusTitle: 'First 30 days: quote-to-booking rhythm',
    suggestedFocusDescription:
      'Agree a simple follow-up habit on retail quotes, protect owner time for sales calls, and set one marketing fix before the first monthly session.',
    draftActions: [
      {
        title: 'Define quote follow-up within 48 hours',
        rationale: 'Directly addresses the stated problem of quotes going cold.',
      },
      {
        title: 'Complete Google Business Profile checklist',
        rationale: 'Low-cost visibility win while technical marketing work is scoped.',
      },
      {
        title: 'Book first monthly coaching session',
        rationale: 'Locks accountability and session receipt cadence.',
      },
    ].slice(0, MAX_ACTIONS),
  };
}

export function parseCoachBriefJson(raw: string | null | undefined): OnboardingCoachBrief | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as OnboardingCoachBrief;
    if (o?.version !== 1 || typeof o.summary !== 'string') return null;
    return o;
  } catch {
    return null;
  }
}

export function validateCoachBrief(brief: OnboardingCoachBrief): boolean {
  if (brief.sections.length > MAX_SECTIONS) return false;
  if (brief.draftActions.length > MAX_ACTIONS) return false;
  if (brief.summary.length > 2_000) return false;
  return brief.sections.every((s) => s.heading.length <= 120 && s.body.length <= 4_000);
}

export type CoachBriefModelInput = {
  snapshot: CoachingOnboardingSnapshot;
};

/** Messages for OpenRouter — coach-only brief, no credential claims. */
export function buildCoachBriefMessages(input: CoachBriefModelInput): {
  system: string;
  user: string;
} {
  const snap = input.snapshot;
  return {
    system:
      'You write concise coach briefs for CARSI Business Coaching (Australian cleaning and restoration owners). ' +
      'Use Australian English. Never guarantee outcomes, income, or credentials. Output valid JSON only.',
    user: JSON.stringify({
      task: 'coach_brief_v1',
      member: snap.member,
      problem: snap.statements.problemStatement,
      goal: snap.statements.goalStatement,
      profile: snap.profile,
      assessment: snap.assessmentResponses,
    }),
  };
}