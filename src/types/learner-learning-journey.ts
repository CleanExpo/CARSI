import type { RenewalCourseSuggestion } from '@/types/renewal';

export type LearnerActivityNudge = {
  id: string;
  kind: 'interactive' | 'quiz' | 'lesson';
  title: string;
  reason: string;
  href: string;
  course_slug: string;
  course_title: string;
  discipline_label: string | null;
};

export type LearnerSkillGapInsight = {
  id: string;
  course_slug: string;
  course_title: string;
  quiz_title: string;
  score_percent: number;
  reason: string;
  href: string;
};

export type LearnerPathwayStep = {
  title: string;
  slug: string;
  reason: string;
};

export interface LearnerLearningJourneyPayload {
  course_recommendations: RenewalCourseSuggestion[];
  activity_nudges: LearnerActivityNudge[];
  skill_gaps: LearnerSkillGapInsight[];
  pathway_next: LearnerPathwayStep | null;
  /** Human-readable summary for the learner home rail. */
  headline: string | null;
}

export const EMPTY_LEARNER_LEARNING_JOURNEY: LearnerLearningJourneyPayload = {
  course_recommendations: [],
  activity_nudges: [],
  skill_gaps: [],
  pathway_next: null,
  headline: null,
};