/**
 * Maps first-session onboarding answers to a recommended discipline-area code and dashboard links.
 * Kept free of Prisma so it can run in the onboarding API route and tests.
 *
 * Licence (CLAUDE.md "CARSI designation rule"): the codes below are catalogue filter keys only.
 * Rendered copy names a discipline AREA and never brands the recommendation with an IICRC
 * Registered-Training-School designation title or acronym, and never implies a CARSI course
 * builds toward an IICRC certification. Pinned by onboarding-pathway.test.ts.
 */

export type OnboardingAnswersInput = {
  industry?: string;
  role?: string;
  iicrc_experience?: string;
  /** IICRC codes the learner holds or targets, e.g. WRT, AMRT */
  disciplines_held?: string[];
  primary_goal?: string;
};

const PATHWAY_LABELS: Record<string, string> = {
  WRT: 'Water damage restoration',
  ASD: 'Applied structural drying',
  CRT: 'Carpet repair and reinstallation',
  AMRT: 'Microbial remediation',
  FSRT: 'Fire and smoke restoration',
  OCT: 'Odour control',
  CCT: 'Commercial carpet cleaning',
};

/** Lower-case the first letter so a label reads naturally mid-sentence. */
function inSentence(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}

function normalizeDisciplines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const x of raw) {
    const s = String(x).trim().toUpperCase();
    if (/^[A-Z]{2,5}$/.test(s)) out.add(s);
  }
  return [...out];
}

/**
 * Pick a single pathway code for marketing copy; prefer learner-selected disciplines, then goal/heuristics.
 */
export function resolveRecommendedPathwayCode(input: OnboardingAnswersInput): string {
  const held = normalizeDisciplines(input.disciplines_held);
  if (held.length > 0) {
    const priority = ['WRT', 'AMRT', 'FSRT', 'ASD', 'CRT', 'OCT', 'CCT'];
    for (const p of priority) {
      if (held.includes(p)) return p;
    }
    return held[0];
  }

  const goal = input.primary_goal ?? '';
  const industry = input.industry ?? '';

  if (goal === 'cec_renewal') return 'WRT';
  if (goal === 'new_cert') return 'WRT';
  if (goal === 'career_change') return 'WRT';

  if (industry === 'healthcare' || industry === 'government') return 'AMRT';
  if (industry === 'construction') return 'ASD';

  return 'WRT';
}

export function pathwayLabel(code: string): string {
  return PATHWAY_LABELS[code] ?? code;
}

export function buildOnboardingDashboardUrls(args: {
  pathwayCode: string;
  disciplines: string[];
}): { suggested_courses_url: string; pathways_url: string } {
  const d = args.disciplines.length > 0 ? args.disciplines[0] : args.pathwayCode;
  const suggested_courses_url = `/dashboard/courses?discipline=${encodeURIComponent(d)}`;
  return {
    suggested_courses_url,
    pathways_url: '/dashboard/pathways',
  };
}

export function pathwayDescription(pathwayCode: string, goal?: string): string {
  const g = goal ?? '';
  const area = inSentence(pathwayLabel(pathwayCode));
  if (g === 'cec_renewal') {
    return `We prioritised ${area} courses, a strong fit for continuing education credits toward a certification you already hold. You can switch discipline areas anytime in the catalogue.`;
  }
  if (g === 'career_change') {
    return `Starting with ${area} builds the practical foundations Australian restoration employers look for. Every CARSI credential is CARSI-issued; it is not an IICRC certification.`;
  }
  return `Based on your selections, ${area} is a practical place to start. Browse the catalogue anytime to explore every discipline area.`;
}
