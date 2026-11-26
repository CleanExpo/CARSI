import { WATER_DAMAGE_HAZARD_LESSON_ID } from '@/lib/lms/append-interactive-pilot';
import type { InteractiveLearningOffer } from '@/lib/lms/interactive-learning-catalog';
import type {
  LearnerActivityNudge,
  LearnerLearningJourneyPayload,
  LearnerPathwayStep,
  LearnerSkillGapInsight,
} from '@/types/learner-learning-journey';
import type { RenewalCourseSuggestion } from '@/types/renewal';

export type EnrollmentProgressRow = {
  id: string;
  course_slug: string;
  course_title: string;
  iicrc_discipline: string | null;
  completion_percentage: number;
  last_lesson_id: string | null;
  all_lessons_complete: boolean;
};

export type QuizGapRow = {
  quiz_id: string;
  quiz_title: string;
  course_slug: string;
  course_title: string;
  score_percent: number;
  passed: boolean;
  lesson_id: string | null;
};

export type NextLessonRow = {
  course_slug: string;
  course_title: string;
  lesson_id: string;
  lesson_title: string;
  content_type: string;
  has_interactive: boolean;
};

/** Discipline follow-ons commonly taken after fundamentals (catalog metadata, not certification claims). */
const PATHWAY_AFTER: Record<string, string[]> = {
  WRT: ['AMRT', 'ASD', 'FSRT'],
  WATER: ['AMRT', 'ASD'],
  AMRT: ['ASD', 'FCT'],
  ASD: ['AMRT'],
  FSRT: ['OCT'],
  OCT: ['ASD'],
};

export function disciplineLabel(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const d = raw.trim().toUpperCase();
  if (d === 'WRT' || d === 'WATER') return 'Water damage restoration';
  if (d === 'FSRT' || d === 'FIRE') return 'Fire and smoke restoration';
  if (d === 'AMRT' || d === 'MICROBIAL' || d === 'MOULD') return 'Mould remediation';
  if (d === 'ASD') return 'Applied structural drying';
  if (d === 'OCT') return 'Odour control';
  if (d === 'UFT') return 'Carpet and fabric care';
  return raw.trim();
}

export function buildPathwayNext(args: {
  completedDisciplines: string[];
  enrolledSlugs: Set<string>;
  completedSlugs: Set<string>;
  courseBySlug: Map<string, { title: string; discipline: string | null }>;
}): LearnerPathwayStep | null {
  const completed = new Set(args.completedDisciplines.map((d) => d.toUpperCase()));
  for (const disc of completed) {
    const nextCodes = PATHWAY_AFTER[disc] ?? [];
    for (const code of nextCodes) {
      for (const [slug, meta] of args.courseBySlug) {
        if (args.enrolledSlugs.has(slug) || args.completedSlugs.has(slug)) continue;
        const cd = meta.discipline?.toUpperCase() ?? '';
        if (cd === code) {
          return {
            slug,
            title: meta.title,
            reason: `Builds on your ${disciplineLabel(disc) ?? disc} training — a logical next discipline for restoration practice.`,
          };
        }
      }
    }
  }
  return null;
}

export function buildActivityNudges(args: {
  enrollments: EnrollmentProgressRow[];
  nextLessons: NextLessonRow[];
  liveOffers: InteractiveLearningOffer[];
  focusCourseSlug?: string;
}): LearnerActivityNudge[] {
  const nudges: LearnerActivityNudge[] = [];
  const enrolledSlugs = new Set(args.enrollments.map((e) => e.course_slug));

  for (const offer of args.liveOffers) {
    if (!enrolledSlugs.has(offer.courseSlug)) continue;
    if (args.focusCourseSlug && offer.courseSlug !== args.focusCourseSlug) continue;
    const enr = args.enrollments.find((e) => e.course_slug === offer.courseSlug);
    if (!enr || enr.all_lessons_complete) continue;
    const lessonId = getPilotLessonQuery(offer);
    if (!lessonId) continue;
    nudges.push({
      id: `interactive-${offer.experienceId}`,
      kind: 'interactive',
      title: offer.heroTitle ?? offer.teaser.slice(0, 72),
      reason: `${offer.disciplineLabel} practice — work through scenarios before marking the module complete.`,
      href: `/dashboard/learn/${encodeURIComponent(offer.courseSlug)}?lesson=${encodeURIComponent(lessonId)}`,
      course_slug: offer.courseSlug,
      course_title: offer.courseTitle,
      discipline_label: offer.disciplineLabel,
    });
  }

  for (const row of args.nextLessons) {
    if (args.focusCourseSlug && row.course_slug !== args.focusCourseSlug) continue;
    const kind = row.content_type === 'quiz' ? 'quiz' : row.has_interactive ? 'interactive' : 'lesson';
    const reason =
      kind === 'quiz'
        ? 'Knowledge check — review the module, then attempt the quiz when you are ready.'
        : kind === 'interactive'
          ? 'This lesson includes hands-on restoration practice. Complete the activities, then mark the lesson done.'
          : 'Continue your enrolled course — pick up where you left off.';
    nudges.push({
      id: `next-${row.lesson_id}`,
      kind,
      title: row.lesson_title,
      reason,
      href: `/dashboard/learn/${encodeURIComponent(row.course_slug)}?lesson=${encodeURIComponent(row.lesson_id)}`,
      course_slug: row.course_slug,
      course_title: row.course_title,
      discipline_label: null,
    });
    if (nudges.length >= 4) break;
  }

  return dedupeNudges(nudges).slice(0, 4);
}

function getPilotLessonQuery(offer: InteractiveLearningOffer): string {
  if (offer.courseSlug === 'water-damage-restoration-fundamentals') {
    return WATER_DAMAGE_HAZARD_LESSON_ID;
  }
  return '';
}

function dedupeNudges(items: LearnerActivityNudge[]): LearnerActivityNudge[] {
  const seen = new Set<string>();
  return items.filter((n) => {
    if (seen.has(n.href)) return false;
    seen.add(n.href);
    return true;
  });
}

export function buildSkillGaps(rows: QuizGapRow[], limit = 3): LearnerSkillGapInsight[] {
  const candidates = rows
    .filter((r) => !r.passed || r.score_percent < 80)
    .sort((a, b) => a.score_percent - b.score_percent);
  return candidates.slice(0, limit).map((r) => ({
    id: `gap-${r.quiz_id}-${r.score_percent}`,
    course_slug: r.course_slug,
    course_title: r.course_title,
    quiz_title: r.quiz_title,
    score_percent: r.score_percent,
    reason:
      r.score_percent < 70
        ? 'Revisit the module and retry the knowledge check — focus on inspection and documentation steps.'
        : 'A refresher on this module will tighten your field judgement before the next assessment.',
    href: r.lesson_id
      ? `/dashboard/learn/${encodeURIComponent(r.course_slug)}?lesson=${encodeURIComponent(r.lesson_id)}`
      : `/dashboard/learn/${encodeURIComponent(r.course_slug)}`,
  }));
}

export function journeyHeadline(args: {
  skillGaps: LearnerSkillGapInsight[];
  activityNudges: LearnerActivityNudge[];
  pathway: LearnerPathwayStep | null;
}): string | null {
  if (args.skillGaps.length > 0) {
    return `Strengthen ${args.skillGaps[0].course_title} before moving on — we have practice and quiz targets ready.`;
  }
  if (args.activityNudges.some((n) => n.kind === 'interactive')) {
    return 'Hands-on practice is available in your current courses — scenarios reflect real Australian job-site decisions.';
  }
  if (args.pathway) {
    return `Next in your restoration pathway: ${args.pathway.title}.`;
  }
  if (args.activityNudges.length > 0) {
    return 'Pick up your next lesson or knowledge check to keep momentum.';
  }
  return null;
}

export function assembleLearnerJourney(args: {
  courseRecommendations: RenewalCourseSuggestion[];
  activityNudges: LearnerActivityNudge[];
  skillGaps: LearnerSkillGapInsight[];
  pathwayNext: LearnerPathwayStep | null;
}): LearnerLearningJourneyPayload {
  const headline = journeyHeadline({
    skillGaps: args.skillGaps,
    activityNudges: args.activityNudges,
    pathway: args.pathwayNext,
  });
  return {
    course_recommendations: args.courseRecommendations,
    activity_nudges: args.activityNudges,
    skill_gaps: args.skillGaps,
    pathway_next: args.pathwayNext,
    headline,
  };
}