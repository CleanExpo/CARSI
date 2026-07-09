/**
 * Scaffold builders for the course-asset-kit engine (GP-488).
 *
 * Each builder turns a `KitCourse` (delivered lesson content) into an
 * extractive-or-empty scaffold object. The two rules every builder obeys:
 *   1. Text is EXTRACTED from lesson HTML — never invented or summarised.
 *   2. Fields that would require authoring judgement (a question, a script, an
 *      image prompt, speaker notes) are left EMPTY for the truth-gate pass.
 * Every returned object carries the `SCAFFOLD_STATUS` banner.
 */

import {
  extractBullets,
  extractHeadings,
  extractKeyStatements,
  htmlToText,
} from './html-extract';
import { scanText, type BannedPhraseHit } from './iicrc-phrases';
import {
  SCAFFOLD_STATUS,
  type AudioScriptScaffold,
  type FlashcardsScaffold,
  type ImageBriefsScaffold,
  type KitCourse,
  type QuizScaffold,
  type ScaffoldCard,
  type ScaffoldImageBrief,
  type ScaffoldSlide,
  type SlidesScaffold,
} from './types';

const DEFAULT_IMAGE_STYLE =
  'Photoreal, Australian restoration/facility context, calm and professional, ' +
  'natural lighting, no text or logos, metric/AU setting (230 V, AS/NZS).';

/**
 * Flashcards: one deck per module. Each key statement lifted from a lesson
 * becomes a card whose BACK is the extracted statement and whose FRONT is left
 * empty — the question is the part that needs authoring (writing it would be
 * inventing). Every card records its `sourceLessonId`.
 */
export function buildFlashcardsScaffold(course: KitCourse): FlashcardsScaffold {
  return {
    status: SCAFFOLD_STATUS,
    courseSlug: course.slug,
    version: 1,
    decks: course.modules.map((mod) => {
      const cards: ScaffoldCard[] = [];
      for (const lesson of mod.lessons) {
        for (const statement of extractKeyStatements(lesson.contentBody)) {
          cards.push({ front: '', back: statement, sourceLessonId: lesson.id });
        }
      }
      return { module: mod.title, cards };
    }),
  };
}

/**
 * Slides: one deck per module. Each lesson yields one or more slides. The slide
 * title is a lesson heading (or the lesson title when there are none); bullets
 * are extracted list items / paragraph openers; speakerNotes is always empty.
 */
export function buildSlidesScaffold(course: KitCourse): SlidesScaffold {
  return {
    status: SCAFFOLD_STATUS,
    courseSlug: course.slug,
    version: 1,
    decks: course.modules.map((mod) => {
      const slides: ScaffoldSlide[] = [];
      for (const lesson of mod.lessons) {
        const headings = extractHeadings(lesson.contentBody);
        const title = headings[0]?.text ?? lesson.title;
        slides.push({
          title,
          bullets: extractBullets(lesson.contentBody),
          speakerNotes: '',
          sourceLessonId: lesson.id,
        });
      }
      return { module: mod.title, slides };
    }),
  };
}

/**
 * Audio-overview script skeleton: one segment per module. The `topicPrompt` is
 * extractive — built from the delivered module title and its lesson titles — so
 * an author has a factual anchor. The `text` (the two-voice script) is empty.
 */
export function buildAudioScriptScaffold(course: KitCourse): AudioScriptScaffold {
  return {
    status: SCAFFOLD_STATUS,
    courseSlug: course.slug,
    version: 1,
    segments: course.modules.map((mod) => ({
      module: mod.title,
      topicPrompt: [mod.title, ...mod.lessons.map((l) => l.title)].join(' — '),
      text: '',
    })),
  };
}

/**
 * Quiz scaffold: one placeholder question per lesson, each tagged with its
 * `sourceLessonId`. No question text, no options and no correct answer are
 * invented — those are authored against the source lesson in the truth-gate pass.
 */
export function buildQuizScaffold(course: KitCourse): QuizScaffold {
  const questions = course.modules.flatMap((mod) =>
    mod.lessons.map((lesson) => ({
      sourceLessonId: lesson.id,
      questionText: '' as const,
      options: [] as [],
      correctIndex: null,
      points: 1 as const,
    }))
  );
  return {
    status: SCAFFOLD_STATUS,
    courseSlug: course.slug,
    version: 1,
    quizzes: [
      {
        quizId: '',
        title: '',
        passPercentage: 80,
        attemptsAllowed: 3,
        questions,
      },
    ],
  };
}

/**
 * Image briefs: one brief per lesson. `context` is an extractive excerpt of the
 * delivered lesson text (first ~240 chars), `style` is a safe prefilled house
 * style, and `prompt` is empty — the final prompt is authored downstream.
 */
export function buildImageBriefsScaffold(course: KitCourse): ImageBriefsScaffold {
  const briefs: ScaffoldImageBrief[] = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      const text = htmlToText(lesson.contentBody);
      briefs.push({
        module: mod.title,
        sourceLessonId: lesson.id,
        context: text.slice(0, 240),
        style: DEFAULT_IMAGE_STYLE,
        prompt: '',
      });
    }
  }
  return { status: SCAFFOLD_STATUS, courseSlug: course.slug, version: 1, briefs };
}

/**
 * Run the IICRC banned-phrase scanner over ALL text the engine extracts from a
 * course (key statements, bullets, headings, plain body text). Returns every
 * hit, located by lesson id, so a bad phrasing in delivered content surfaces at
 * scaffold time.
 */
export function scanCourseForBannedPhrases(course: KitCourse): BannedPhraseHit[] {
  const hits: BannedPhraseHit[] = [];
  for (const mod of course.modules) {
    for (const lesson of mod.lessons) {
      const where = `${lesson.id} (${lesson.title})`;
      const texts = new Set<string>([
        htmlToText(lesson.contentBody),
        ...extractKeyStatements(lesson.contentBody),
        ...extractBullets(lesson.contentBody, 50),
        ...extractHeadings(lesson.contentBody).map((h) => h.text),
      ]);
      for (const text of texts) {
        hits.push(...scanText(text, where));
      }
    }
  }
  return hits;
}
