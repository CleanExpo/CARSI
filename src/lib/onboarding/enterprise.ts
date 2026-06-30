/** Umbrella brand for CARSI Maintenance Company B2B onboarding programs. */
export const ONBOARDING_BRAND = 'CARSI Maintenance Company Onboarding';

export const FLOOR_CARE_ONBOARDING_SLUG = 'floor-care-onboarding-operational-readiness';

export type OnboardingPricingMeta = {
  model?: string;
  billingCycle?: string;
  amountAud?: number;
  gst?: string;
  seats?: string;
  note?: string;
};

export type OnboardingCourseMeta = {
  audience?: string;
  program?: string;
  docs?: string;
  brand?: string;
  company?: string;
  pricing?: OnboardingPricingMeta;
};

export type OnboardingPhase = {
  id: string;
  title: string;
  subtitle: string;
  moduleIndexes: number[];
};

/** Four-phase journey for the floor-care program (12 modules, 0-based indexes). */
export const FLOOR_CARE_PHASES: OnboardingPhase[] = [
  {
    id: 'foundation',
    title: 'Foundation & professional standards',
    subtitle: 'Understand the service, sensitive sites, and your safety baseline.',
    moduleIndexes: [0, 1, 2],
  },
  {
    id: 'safety',
    title: 'Safety & workplace readiness',
    subtitle: 'Surfaces, methods, and machinery — work safely before you work fast.',
    moduleIndexes: [3, 4, 5],
  },
  {
    id: 'operations',
    title: 'Floor care operations',
    subtitle: 'Equipment readiness, site control, and professional conduct on every job.',
    moduleIndexes: [6, 7, 8],
  },
  {
    id: 'quality',
    title: 'Quality assurance & continuous improvement',
    subtitle: 'Security, evidence, handover, and final competency assessment.',
    moduleIndexes: [9, 10, 11],
  },
];

export function parseOnboardingMeta(meta: unknown): OnboardingCourseMeta | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null;
  return meta as OnboardingCourseMeta;
}

export function isOnboardingBrand(brand: string | null | undefined): boolean {
  return (brand ?? '').trim() === ONBOARDING_BRAND;
}

export function isOnboardingCategory(category: string | null | undefined): boolean {
  return (category ?? '').trim() === ONBOARDING_BRAND;
}

export function isOnboardingCourse(input: {
  slug?: string | null;
  category?: string | null;
  meta?: unknown;
}): boolean {
  const meta = parseOnboardingMeta(input.meta);
  if (isOnboardingBrand(meta?.brand)) return true;
  if (isOnboardingCategory(input.category)) return true;
  return input.slug === FLOOR_CARE_ONBOARDING_SLUG;
}

export function getPhasesForSlug(slug: string): OnboardingPhase[] {
  if (slug === FLOOR_CARE_ONBOARDING_SLUG) return FLOOR_CARE_PHASES;
  return [];
}

export function formatOnboardingPrice(pricing?: OnboardingPricingMeta | null): string {
  if (!pricing?.amountAud) return 'Organisation subscription';
  const gst = pricing.gst === 'exclusive' ? ' + GST' : '';
  const cycle = pricing.billingCycle === 'monthly' ? '/month' : '';
  const seats = pricing.seats === 'unlimited' ? ' · unlimited learners' : '';
  return `AUD $${pricing.amountAud.toLocaleString('en-AU')}${cycle}${gst}${seats}`;
}

/** Organisation subscription amount from course meta (defaults to floor-care list price). */
export function resolveOnboardingAmountAud(meta?: OnboardingCourseMeta | null): number {
  const amount = meta?.pricing?.amountAud;
  if (typeof amount === 'number' && Number.isFinite(amount) && amount > 0) return amount;
  return 1295;
}

export function getPhaseForModuleIndex(
  moduleIndex: number,
  phases: OnboardingPhase[] = FLOOR_CARE_PHASES
): OnboardingPhase | null {
  return phases.find((p) => p.moduleIndexes.includes(moduleIndex)) ?? null;
}

export type CurriculumModuleShape = {
  id: string;
  title: string;
  order_index: number;
  lessons: Array<{ id: string; completed: boolean }>;
};

export function computeProgressFromModules(modules: CurriculumModuleShape[]): {
  percent: number;
  completedLessons: number;
  totalLessons: number;
  completedModules: number;
  totalModules: number;
  currentModule: CurriculumModuleShape | null;
  nextLessonId: string | null;
} {
  const totalLessons = modules.reduce((s, m) => s + m.lessons.length, 0);
  const completedLessons = modules.reduce(
    (s, m) => s + m.lessons.filter((l) => l.completed).length,
    0
  );
  const completedModules = modules.filter((m) =>
    m.lessons.length > 0 && m.lessons.every((l) => l.completed)
  ).length;
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  let currentModule: CurriculumModuleShape | null = null;
  let nextLessonId: string | null = null;
  for (const mod of modules) {
    const incomplete = mod.lessons.find((l) => !l.completed);
    if (incomplete) {
      currentModule = mod;
      nextLessonId = incomplete.id;
      break;
    }
  }
  if (!currentModule && modules.length > 0) {
    currentModule = modules[modules.length - 1] ?? null;
  }

  return {
    percent,
    completedLessons,
    totalLessons,
    completedModules,
    totalModules: modules.length,
    currentModule,
    nextLessonId,
  };
}
