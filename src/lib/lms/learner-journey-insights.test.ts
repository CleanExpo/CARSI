import { describe, expect, it } from 'vitest';

import { WATER_DAMAGE_HAZARD_LESSON_ID } from '@/lib/lms/append-interactive-pilot';
import { WATER_DAMAGE_INTERACTIVE_PILOT } from '@/lib/lms/interactive-experience-data';

import {
  assembleLearnerJourney,
  buildActivityNudges,
  buildPathwayNext,
  buildSkillGaps,
  journeyHeadline,
} from './learner-journey-insights';

describe('learner-journey-insights', () => {
  it('builds pathway from completed WRT discipline', () => {
    const step = buildPathwayNext({
      completedDisciplines: ['WRT'],
      enrolledSlugs: new Set(),
      completedSlugs: new Set(['water-damage-restoration-fundamentals']),
      courseBySlug: new Map([
        ['mould-advanced', { title: 'Applied Microbial', discipline: 'AMRT' }],
      ]),
    });
    expect(step?.slug).toBe('mould-advanced');
    expect(step?.reason).toMatch(/logical next discipline/i);
  });

  it('surfaces skill gaps for low quiz scores', () => {
    const gaps = buildSkillGaps([
      {
        quiz_id: 'q1',
        quiz_title: 'Module check',
        course_slug: 'water-damage-restoration-fundamentals',
        course_title: 'Water Restoration Practitioner',
        score_percent: 62,
        passed: false,
        lesson_id: 'lesson-1',
      },
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].href).toContain('lesson-1');
  });

  it('skips interactive nudges when server marks practice complete', () => {
    const allIds = WATER_DAMAGE_INTERACTIVE_PILOT.activities.map((a) => a.id);
    const nudges = buildActivityNudges({
      enrollments: [
        {
          id: 'e1',
          course_slug: 'water-damage-restoration-fundamentals',
          course_title: 'Water Restoration Practitioner',
          iicrc_discipline: 'WRT',
          completion_percentage: 40,
          last_lesson_id: null,
          all_lessons_complete: false,
        },
      ],
      nextLessons: [],
      liveOffers: [
        {
          experienceId: 'water-damage-module-3-pilot',
          courseSlug: 'water-damage-restoration-fundamentals',
          courseTitle: 'Water Restoration Practitioner',
          discipline: 'water',
          disciplineLabel: 'Water damage',
          status: 'live',
          teaser: 'Hazard-led investigation',
        },
      ],
      interactiveProgressByLessonId: new Map([
        [
          WATER_DAMAGE_HAZARD_LESSON_ID,
          {
            'water-damage-module-3-pilot': {
              activityIndex: 5,
              completedActivityIds: allIds,
              earnedXp: 100,
            },
          },
        ],
      ]),
    });
    expect(nudges.some((n) => n.kind === 'interactive')).toBe(false);
  });

  it('prioritises interactive nudges for enrolled live offers', () => {
    const nudges = buildActivityNudges({
      enrollments: [
        {
          id: 'e1',
          course_slug: 'water-damage-restoration-fundamentals',
          course_title: 'Water Restoration Practitioner',
          iicrc_discipline: 'WRT',
          completion_percentage: 40,
          last_lesson_id: null,
          all_lessons_complete: false,
        },
      ],
      nextLessons: [],
      liveOffers: [
        {
          experienceId: 'water-damage-module-3-pilot',
          courseSlug: 'water-damage-restoration-fundamentals',
          courseTitle: 'Water Restoration Practitioner',
          discipline: 'water',
          disciplineLabel: 'Water damage',
          status: 'live',
          teaser: 'Hazard-led investigation',
          heroTitle: 'Practice the job site',
        },
      ],
      focusCourseSlug: 'water-damage-restoration-fundamentals',
    });
    expect(nudges.some((n) => n.kind === 'interactive')).toBe(true);
  });

  it('assembles headline when skill gaps exist', () => {
    const payload = assembleLearnerJourney({
      courseRecommendations: [],
      activityNudges: [],
      skillGaps: [
        {
          id: 'g1',
          course_slug: 'a',
          course_title: 'Water course',
          quiz_title: 'Quiz',
          score_percent: 60,
          reason: 'Retry',
          href: '/dashboard/learn/a',
        },
      ],
      pathwayNext: null,
    });
    expect(payload.headline).toMatch(/Strengthen/);
    expect(journeyHeadline({ skillGaps: payload.skill_gaps, activityNudges: [], pathway: null })).toMatch(
      /Water course/
    );
  });
});