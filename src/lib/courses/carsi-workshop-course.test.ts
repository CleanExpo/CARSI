/**
 * The CARSI 2-day carpet cleaning workshop course data (roadshow cohort course).
 *
 * Founder directive 20/11/2026: CARSI is the course brand; CCW appears only as a subordinate
 * roadshow-partner credit. The course is unlisted, free and carries no IICRC CECs.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { isPublishedCourseStatus } from '@/lib/server/public-courses-list';

const ROOT = join(__dirname, '..', '..', '..');
const SLUG = 'ccw-2-day-workshop';

type Lesson = { id: string; title: string; contentType: string; contentBody: string; orderIndex: number };
type Module = { id: string; title: string; orderIndex: number; lessons: Lesson[] };
type Course = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  status: string;
  isPublished: boolean;
  isFree: boolean;
  priceAud: string | number;
  cecHours: number;
  iicrcDiscipline: string | null;
  meta: Record<string, unknown>;
  modules: Module[];
};
type Quiz = {
  quizId: string;
  lessonTitle: string;
  questions: { questionText: string; options: string[]; correctIndex: number }[];
};

function load<T>(rel: string): T {
  return JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) as T;
}

const authored = load<{ courses: Course[] }>('data/courses/ccw-2-day-workshop/v1/courses-catalog.json');
const course = authored.courses.find((c) => c.slug === SLUG) as Course;
const seed = load<{ courses: Course[] }>('data/seed/courses-catalog.json');
const quiz = load<{ courseSlug: string; quizzes: Quiz[] }>('data/seed/ccw-2-day-workshop-quiz.json');

const allLessons = () => course.modules.flatMap((m) => m.lessons);
const visibleText = () =>
  [course.title, course.shortDescription, course.description, ...course.modules.map((m) => m.title),
    ...allLessons().flatMap((l) => [l.title, l.contentBody])].join('\n');

describe('CARSI carpet cleaning workshop course data', () => {
  it('exists once under the attendance slug and is CARSI-branded', () => {
    expect(authored.courses.filter((c) => c.slug === SLUG)).toHaveLength(1);
    expect(course.title.startsWith('CARSI')).toBe(true);
    expect(course.title).not.toMatch(/CCW/);
  });

  it('is unlisted, free and carries no CEC or IICRC discipline', () => {
    expect(course.status).toBe('unlisted');
    expect(isPublishedCourseStatus(course.status)).toBe(false);
    expect(course.isPublished).toBe(false);
    expect(course.isFree).toBe(true);
    expect(Number(course.priceAud)).toBe(0);
    expect(course.cecHours).toBe(0);
    expect(course.iicrcDiscipline).toBeNull();
  });

  it('shows CCW only as a subordinate partner credit in the selling copy', () => {
    const selling = `${course.shortDescription}\n${course.description}`;
    for (const field of [course.shortDescription, course.description]) {
      expect((field.match(/\bCCW\b/g) ?? []).length).toBeLessThanOrEqual(1);
    }
    expect(selling).not.toMatch(/CARSI\s*[x×]\s*CCW|CCW\s*\/\s*CARSI/i);
    expect(String(course.meta.partnerCredit ?? '')).toMatch(/partner/i);
  });

  it('has the full 2-day structure plus expansion and close-out modules, each with real lessons', () => {
    expect(course.modules.length).toBeGreaterThanOrEqual(16);
    course.modules.forEach((m, i) => {
      expect(m.orderIndex).toBe(i);
      expect(m.lessons.some((l) => l.contentType === 'text')).toBe(true);
      m.lessons.forEach((l, j) => expect(l.orderIndex).toBe(j));
      for (const l of m.lessons) {
        expect(['text', 'quiz']).toContain(l.contentType);
        if (l.contentType === 'quiz') continue;
        expect(l.contentBody.replace(/<[^>]+>/g, '').trim().length).toBeGreaterThan(200);
        expect(l.contentBody).not.toMatch(/<script|on\w+=|style=/i);
      }
    });
    // Cohort-only course: no lesson is a public preview.
    expect(allLessons().filter((l) => (l as Lesson & { isPreview?: boolean }).isPreview)).toEqual([]);
    const ids = [...course.modules.map((m) => m.id), ...allLessons().map((l) => l.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a knowledge check for every teaching module, each linked from a quiz lesson learners can open', () => {
    expect(quiz.courseSlug).toBe(SLUG);
    expect(quiz.quizzes.length).toBeGreaterThanOrEqual(15);
    // The quiz seeder does not read lessonTitle; a learner only reaches a quiz through a lesson
    // whose resources carry `quiz:<quizId>` (see lesson-checkpoint loadGraph). Check that link.
    type QuizLesson = Lesson & { resources?: { url?: string }[] | null };
    const quizLessons = allLessons().filter((l) => l.contentType === 'quiz') as QuizLesson[];
    const linked = quizLessons.map((l) => {
      const urls = (l.resources ?? []).map((r) => r.url ?? '').filter((u) => u.startsWith('quiz:'));
      expect(urls).toHaveLength(1);
      expect(urls[0]).toBe(`quiz:${l.contentBody}`);
      return l.contentBody;
    });
    expect([...linked].sort()).toEqual(quiz.quizzes.map((q) => q.quizId).sort());
    const titles = new Set(allLessons().map((l) => l.title));
    for (const q of quiz.quizzes) {
      expect(titles.has(q.lessonTitle)).toBe(true);
      expect(q.questions.length).toBeGreaterThanOrEqual(5);
      for (const item of q.questions) {
        expect(item.options).toHaveLength(4);
        expect(item.correctIndex).toBeGreaterThanOrEqual(0);
        expect(item.correctIndex).toBeLessThan(4);
      }
    }
  });

  it('uses no licence-critical IICRC wording or discipline acronyms', () => {
    const text = visibleText();
    expect(text).not.toMatch(/\b(WRT|ASD|AMRT|FSRT|CCT|TCST)\b/);
    // Banned phrases are assembled at runtime so this guard file does not itself trip the
    // repository's IICRC terminology scanners.
    const body = 'IICRC';
    const banned = [
      new RegExp(`${body}[- ]appr` + 'oved', 'i'),
      new RegExp(`${body} Accred` + 'ited(?! ?CEC)', 'i'),
      new RegExp('cert' + 'ified with CARSI', 'i'),
      new RegExp(`${body} cert` + 'ification course', 'i'),
      new RegExp('\\b\\d+(\\.\\d+)?\\s*C' + 'EC(s| hours)?\\b', 'i'),
    ];
    for (const re of banned) expect(text).not.toMatch(re);
  });

  it('is Australian-produced: no US power or US spelling in learner text', () => {
    const text = visibleText().replace(/<[^>]+>/g, ' ');
    expect(text).not.toMatch(/\b(110|115|120)\s?V\b/);
    expect(text).not.toMatch(/\b(color|odor|fiber|center|mold|liter)s?\b/i);
  });

  it('is in the seed catalogue identically, so the existing seeder loads it', () => {
    const seeded = seed.courses.find((c) => c.slug === SLUG);
    expect(seeded).toEqual(course);
  });
});
