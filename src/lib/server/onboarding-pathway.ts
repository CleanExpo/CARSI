/**
 * Maps first-session onboarding answers to a recommended IICRC pathway code and dashboard links.
 * Kept free of Prisma so it can run in the onboarding API route and tests.
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
  WRT: 'Water Damage Restoration Technician (WRT)',
  ASD: 'Applied Structural Drying (ASD)',
  CRT: 'Carpet Repair & Reinstallation (CRT)',
  AMRT: 'Applied Microbial Remediation Technician (AMRT)',
  FSRT: 'Fire & Smoke Restoration (FSRT)',
  OCT: 'Odour Control Technician (OCT)',
  CCT: 'Commercial Carpet Cleaning (CCT)',
};

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
  if (g === 'cec_renewal') {
    return `We prioritised ${pathwayLabel(pathwayCode)} — a strong fit for continuing education credits. You can switch disciplines anytime in the catalogue.`;
  }
  if (g === 'career_change') {
    return `Starting with ${pathwayLabel(pathwayCode)} builds foundational credentials recognised across restoration employers in Australia.`;
  }
  return `Based on your selections, ${pathwayLabel(pathwayCode)} is a practical place to start. Browse the catalogue anytime to explore every discipline.`;
}
