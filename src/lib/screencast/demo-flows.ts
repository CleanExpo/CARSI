/**
 * Authored demo-screencast flows — the creative half of the `demo-screencasts` skill.
 *
 * Each `DemoFlow` is a scripted journey the seeded demo account (`student@carsi.com.au`,
 * enrolled in the first catalogue course) walks while the screen records. A flow paired with
 * a `brandVideoScriptId` (see `src/lib/brand-video-assistant.ts`) gets that script's HeyGen
 * avatar composited as a picture-in-picture corner, with the avatar's voiceover as the audio.
 *
 * `scripts/generate-demo-videos.ts` consumes this file. Authoring guidance lives in
 * `skills/content/demo-screencasts.skill.md`.
 *
 * Routes/IDs below come from the seed snapshot (`scripts/seed-e2e-user.ts` enrols the student
 * in the FIRST course of `data/seed/courses-catalog.json`):
 *   - course slug: air-quality-and-odour-identification-and-deodorisation-essentials
 *   - first lesson: 97be523a-bd68-4c94-9458-e0ddd3c7af95
 * Keep step `wait` dwells summing to roughly the paired narration length so the avatar is
 * never cut off (the FFmpeg composite ends with the narration via `-shortest`).
 */
import { DEMO_FLOWS_VERSION, type DemoFlowsFile } from './demo-flow-types';

const COURSE_SLUG = 'air-quality-and-odour-identification-and-deodorisation-essentials';
const FIRST_LESSON_ID = '97be523a-bd68-4c94-9458-e0ddd3c7af95';

const VIEWPORT_16x9 = { width: 1280, height: 720 } as const;

export const demoFlowsFile: DemoFlowsFile = {
  version: DEMO_FLOWS_VERSION,
  generatedAt: '2026-06-24T00:00:00.000Z',
  flows: [
    {
      // Lesson "how to continue learning" walkthrough — paired with the day-3 retention
      // nudge (~30s). Persists into the first lesson when run with --persist.
      id: 'lesson-player-walkthrough',
      title: 'Continue Learning — resume your first lesson',
      purpose: 'lesson-walkthrough',
      brandVideoScriptId: 'learner-day-three-nudge',
      auth: 'student',
      viewport: VIEWPORT_16x9,
      pip: { corner: 'br', widthPct: 26 },
      lessonId: FIRST_LESSON_ID,
      steps: [
        { action: 'goto', path: '/dashboard/student' },
        { action: 'wait', ms: 4000 },
        { action: 'highlight', selector: 'a[href*="/lessons/"]', label: 'Continue-learning resume link' },
        { action: 'wait', ms: 3000 },
        { action: 'goto', path: `/dashboard/courses/${COURSE_SLUG}` },
        { action: 'wait', ms: 4000 },
        { action: 'scroll', to: 'bottom' },
        { action: 'wait', ms: 3000 },
        { action: 'goto', path: `/dashboard/courses/${COURSE_SLUG}/lessons/${FIRST_LESSON_ID}` },
        { action: 'wait', ms: 5000 },
        { action: 'scroll', to: 'bottom' },
        { action: 'wait', ms: 4000 },
      ],
    },
    {
      // Public product tour for the homepage hero narration (~65s). Guest journey, no login.
      id: 'welcome-public-tour',
      title: 'Welcome to CARSI — public product tour',
      purpose: 'marketing-reel',
      brandVideoScriptId: 'carsi-public-introduction',
      auth: 'guest',
      viewport: VIEWPORT_16x9,
      pip: { corner: 'br', widthPct: 26 },
      steps: [
        { action: 'goto', path: '/' },
        { action: 'wait', ms: 5000 },
        { action: 'scroll', to: 700 },
        { action: 'wait', ms: 4000 },
        { action: 'scroll', to: 'bottom' },
        { action: 'wait', ms: 4000 },
        { action: 'scroll', to: 'top' },
        { action: 'goto', path: '/courses' },
        { action: 'wait', ms: 5000 },
        { action: 'highlight', selector: 'a[href*="/courses/"]', label: 'First course card' },
        { action: 'wait', ms: 4000 },
        { action: 'scroll', to: 'bottom' },
        { action: 'wait', ms: 4000 },
        { action: 'scroll', to: 'top' },
        { action: 'wait', ms: 3000 },
        { action: 'click', selector: 'a[href*="/courses/"]', label: 'Open a course' },
        { action: 'wait', ms: 6000 },
        { action: 'scroll', to: 'bottom' },
        { action: 'wait', ms: 5000 },
      ],
    },
    {
      // Silent dashboard b-roll for hand-editing into the brand videos. No avatar/audio —
      // just clean footage of the authenticated learner experience.
      id: 'dashboard-broll',
      title: 'Learner dashboard b-roll (silent)',
      purpose: 'brand-broll',
      brandVideoScriptId: null,
      auth: 'student',
      viewport: VIEWPORT_16x9,
      pip: { corner: 'br', widthPct: 26 },
      steps: [
        { action: 'goto', path: '/dashboard/student' },
        { action: 'wait', ms: 3000 },
        { action: 'scroll', to: 600 },
        { action: 'wait', ms: 2000 },
        { action: 'scroll', to: 'bottom' },
        { action: 'wait', ms: 2000 },
        { action: 'goto', path: '/dashboard/courses' },
        { action: 'wait', ms: 3000 },
        { action: 'scroll', to: 'bottom' },
        { action: 'wait', ms: 2000 },
      ],
    },
  ],
};
