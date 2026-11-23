import { getInteractiveExperienceById } from '@/lib/lms/interactive-experience-registry';
import { maxXpForExperience } from '@/lib/lms/interactive-progress';

export type InteractiveLearningStatus = 'live' | 'coming-soon';
export type InteractiveLearningDiscipline =
  'water' | 'safety' | 'moisture' | 'microbial' | 'indoor-air' | 'carpet' | 'business';

export interface InteractiveLearningOffer {
  experienceId: string;
  courseSlug: string;
  courseTitle: string;
  discipline: InteractiveLearningDiscipline;
  disciplineLabel: string;
  status: InteractiveLearningStatus;
  teaser: string;
  lessonAnchor?: string;
  /** Shown on the experience hero; defaults from experience title. */
  heroTitle?: string;
  activityCount?: number;
  xpTotal?: number;
  durationLabel?: string;
}

const OFFERS: InteractiveLearningOffer[] = [
  {
    experienceId: 'water-damage-module-3-pilot',
    courseSlug: 'water-damage-restoration-fundamentals',
    courseTitle: 'Water Restoration Practitioner',
    discipline: 'water',
    disciplineLabel: 'Water damage',
    status: 'live',
    lessonAnchor: 'Identify the hazards first',
    heroTitle: 'Practice the job site before you mark the lesson complete',
    teaser:
      'Hazard-led investigation on a flooded garage job — scenarios, hazard map, decisions, and restoration arc.',
    durationLabel: '12–18 min',
  },
  {
    experienceId: 'moisture-instruments-pilot',
    courseSlug: 'moisture-meters-readings-and-dry-standards',
    courseTitle: 'Moisture meters & dry standards',
    discipline: 'moisture',
    disciplineLabel: 'Moisture & drying',
    status: 'coming-soon',
    teaser:
      'Interpret pin and non-invasive readings, set defensible dry goals, and map moisture through a loss.',
  },
  {
    experienceId: 'sewage-category3-pilot',
    courseSlug: 'category-3-sewage-black-water-remediation',
    courseTitle: 'Category 3 sewage remediation',
    discipline: 'microbial',
    disciplineLabel: 'Category 3 / sewage',
    status: 'coming-soon',
    teaser:
      'Containment boundaries, PPE escalation, and waste handling judgement for black-water jobs.',
  },
  {
    experienceId: 'indoor-environment-pilot',
    courseSlug: 'assessing-indoor-environment-conditions',
    courseTitle: 'Assessing indoor environment conditions',
    discipline: 'indoor-air',
    disciplineLabel: 'Indoor environment',
    status: 'coming-soon',
    teaser: 'Psychrometrics and air readings in context — when numbers change the drying plan.',
  },
  {
    experienceId: 'carpet-field-pilot',
    courseSlug: 'ccw-2-day-workshop',
    courseTitle: 'CCW carpet & fibre fundamentals',
    discipline: 'carpet',
    disciplineLabel: 'Carpet & fibre',
    status: 'coming-soon',
    teaser:
      'Fibre identification, chemistry fences, and inspection calls before chemistry touches the job.',
  },
];

export function listInteractiveLearningOffers(): InteractiveLearningOffer[] {
  return OFFERS.map(enrichOffer);
}

export function getInteractiveLearningOffer(experienceId: string): InteractiveLearningOffer | null {
  const raw = OFFERS.find((o) => o.experienceId === experienceId);
  return raw ? enrichOffer(raw) : null;
}

export function getLiveInteractiveLearningOffers(): InteractiveLearningOffer[] {
  return listInteractiveLearningOffers().filter((o) => o.status === 'live');
}

export function getComingSoonInteractiveLearningOffers(): InteractiveLearningOffer[] {
  return listInteractiveLearningOffers().filter((o) => o.status === 'coming-soon');
}

const DISCIPLINE_LABELS: Record<InteractiveLearningDiscipline, string> = {
  water: 'Water damage',
  safety: 'Safety & WHS',
  moisture: 'Moisture & drying',
  microbial: 'Mould & sewage',
  'indoor-air': 'Indoor environment',
  carpet: 'Carpet & fibre',
  business: 'Business skills',
};

export function disciplineFilterLabel(d: InteractiveLearningDiscipline): string {
  return DISCIPLINE_LABELS[d];
}

export function listInteractiveDisciplines(): InteractiveLearningDiscipline[] {
  const set = new Set<InteractiveLearningDiscipline>();
  for (const o of OFFERS) set.add(o.discipline);
  return [...set];
}

function enrichOffer(offer: InteractiveLearningOffer): InteractiveLearningOffer {
  if (offer.status !== 'live') return offer;
  const experience = getInteractiveExperienceById(offer.experienceId);
  if (!experience) return offer;
  return {
    ...offer,
    activityCount: experience.activities.length,
    xpTotal: maxXpForExperience(experience),
    durationLabel: offer.durationLabel ?? '12–20 min',
  };
}

export function interactiveLearningPath(experienceId: string): string {
  return `/interactive-learning/${encodeURIComponent(experienceId)}`;
}
