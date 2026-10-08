import { createHash } from 'node:crypto';

import type { AiCourseCurriculumResult, CurriculumModule } from '@/lib/server/ai-course-curriculum';
import type { CourseWithCurriculum } from '@/lib/server/course-catalog-sync';
import { hasUncredentialledStoredCecIdentity } from '@/lib/server/course-cec-hours';

export const CURRICULUM_FORMAT = 'carsi-curriculum-v1' as const;
export const CURRICULUM_MARKER = 'carsi-curriculum-v1-marker' as const;

export type CurriculumBinding = {
  lessonId: string;
  kind: 'reading' | 'assessment';
  sourceLessonIndex: number;
  quizId?: string;
};
export type CurriculumPersistence = {
  format: typeof CURRICULUM_FORMAT;
  mappingVersion: 1;
  courseId: string;
  modules: { moduleId: string; description: string | null; lessonBindings: CurriculumBinding[] }[];
};

function invalid(): never { throw new Error('INVALID_STRUCTURED_CURRICULUM'); }
function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return invalid();
  return raw as Record<string, unknown>;
}
function keys(raw: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(raw).some((key) => !allowed.includes(key))) invalid();
}
function dense(raw: unknown, minimum = 1): unknown[] {
  if (!Array.isArray(raw) || raw.length < minimum) return invalid();
  for (let index = 0; index < raw.length; index++) {
    if (!Object.hasOwn(raw, index)) invalid();
  }
  return raw;
}
function text(raw: unknown, empty = false): string {
  if (typeof raw !== 'string') return invalid();
  const value = raw.replace(/\r\n?/g, '\n').trim();
  if (!empty && !value) invalid();
  return value;
}
function description(raw: unknown): string | null {
  return raw === undefined || raw === null ? null : text(raw, true);
}
function integer(raw: unknown, minimum: number, maximum = 2147483647): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < minimum || raw > maximum) return invalid();
  return raw;
}

/** Presence, even when malformed, must never fall through to the legacy writer. */
export function hasStructuredModules(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const modules = (raw as Record<string, unknown>).modules;
  return Array.isArray(modules) && modules.some((m) => m !== null && typeof m === 'object' && Object.hasOwn(m, 'lessons'));
}

/** Independent validation of the closed converter-v1 representation; no converter calls. */
export function validateStructuredModules(raw: unknown): CurriculumModule[] {
  return dense(raw).map((value) => {
    const mod = record(value);
    keys(mod, ['title', 'description', 'lessons']);
    if (!Object.hasOwn(mod, 'description') || mod.description === undefined) invalid();
    const lessons = dense(mod.lessons, 2);
    if (lessons.length % 2) invalid();
    const parsed = lessons.map((value, index): CurriculumModule['lessons'][number] => {
      const lesson = record(value);
      const kind = index % 2 === 0 ? 'reading' : 'assessment';
      if (lesson.kind !== kind || lesson.sourceLessonIndex !== Math.floor(index / 2)) invalid();
      keys(lesson, kind === 'reading'
        ? ['kind', 'sourceLessonIndex', 'title', 'textContent']
        : ['kind', 'sourceLessonIndex', 'title', 'quiz']);
      const title = text(lesson.title);
      if (kind === 'reading') {
        // Already escaped HTML from the converter: never reinterpret or re-escape it.
        if (typeof lesson.textContent !== 'string' || !lesson.textContent.trim()) invalid();
        return { kind, sourceLessonIndex: index / 2, title, textContent: lesson.textContent };
      }
      const quiz = record(lesson.quiz);
      keys(quiz, ['passPercentage', 'attemptsAllowed', 'questions']);
      const questions = dense(quiz.questions).map((value) => {
        const question = record(value);
        keys(question, ['questionText', 'options', 'correctIndex', 'points']);
        const options = dense(question.options, 2).map((option) => text(option));
        if (question.points !== 1) invalid();
        return { questionText: text(question.questionText), options,
          correctIndex: integer(question.correctIndex, 0, options.length - 1), points: 1 as const };
      });
      return { kind, sourceLessonIndex: Math.floor(index / 2), title,
        quiz: { passPercentage: integer(quiz.passPercentage, 1, 100),
          attemptsAllowed: integer(quiz.attemptsAllowed, 1), questions } };
    });
    parsed.forEach((lesson, index) => {
      if (index % 2 && lesson.title !== `${parsed[index - 1].title} — Knowledge check`) invalid();
    });
    return { title: text(mod.title), description: description(mod.description), lessons: parsed };
  });
}

export function validateStructuredCourse(raw: unknown) {
  const course = record(raw);
  keys(course, ['title', 'description', 'thumbnailUrl', 'introVideoUrl', 'introThumbnailUrl', 'slug',
    'isFree', 'priceAud', 'published', 'cecHours', 'durationHours', 'iicrcDiscipline', 'level', 'category', 'modules']);
  if (!Object.hasOwn(course, 'description') || course.description === undefined) invalid();
  if (course.published !== false || !hasUncredentialledStoredCecIdentity(course) ||
      typeof course.isFree !== 'boolean' || typeof course.priceAud !== 'number' ||
      !Number.isFinite(course.priceAud) || course.priceAud < 0) invalid();
  for (const key of ['thumbnailUrl', 'introVideoUrl', 'introThumbnailUrl', 'slug']) {
    if (course[key] !== undefined && typeof course[key] !== 'string') invalid();
  }
  if (course.level !== undefined && course.level !== null && typeof course.level !== 'string') invalid();
  if (course.category !== undefined && course.category !== null && typeof course.category !== 'string') invalid();
  if (course.durationHours !== undefined && course.durationHours !== null &&
      (typeof course.durationHours !== 'number' || !Number.isFinite(course.durationHours) || course.durationHours < 0)) invalid();
  return { title: text(course.title), description: description(course.description), modules: validateStructuredModules(course.modules) };
}

export function hasCurriculumPersistence(course: CourseWithCurriculum): boolean {
  const meta = course.meta;
  // A malformed resource container must not turn a protected course into a legacy course.
  const visited = new Set<object>();
  const hasMarker = (raw: unknown): boolean => {
    if (raw === null || typeof raw !== 'object' || visited.has(raw)) return false;
    visited.add(raw);
    if ('kind' in raw && raw.kind === CURRICULUM_MARKER) return true;
    return Object.values(raw).some(hasMarker);
  };
  return (!!meta && typeof meta === 'object' && Object.hasOwn(meta, 'curriculumPersistence')) ||
    course.modules.some((module) => module.lessons.some((lesson) => hasMarker(lesson.resources)));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(object).sort().map((key) => [key, canonical(object[key])]));
  }
  return value;
}

/** Observe native rows, rejecting ambiguous ownership, order or associations. No authority implied. */
export function readAdminCourseCurriculum(course: CourseWithCurriculum): AiCourseCurriculumResult {
  const meta = record(course.meta);
  const mapping = record(meta.curriculumPersistence);
  keys(mapping, ['format', 'mappingVersion', 'courseId', 'modules']);
  if (mapping.format !== CURRICULUM_FORMAT || mapping.mappingVersion !== 1 || mapping.courseId !== course.id) invalid();
  const bindings = dense(mapping.modules);
  if (bindings.length !== course.modules.length) invalid();
  const seen = new Set<string>();
  const claimId = (value: unknown) => {
    if (typeof value !== 'string' || !value || seen.has(value)) invalid();
    seen.add(value);
    return value;
  };
  claimId(course.id);
  const usedQuizzes = new Set<string>();
  const modules = [...course.modules].sort((a, b) => a.orderIndex - b.orderIndex).map((module, moduleIndex) => {
    const binding = record(bindings[moduleIndex]);
    keys(binding, ['moduleId', 'description', 'lessonBindings']);
    if (module.orderIndex !== moduleIndex || module.courseId !== course.id || binding.moduleId !== module.id ||
        !Object.hasOwn(binding, 'description') || binding.description === undefined) invalid();
    claimId(module.id);
    const rows = [...module.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
    const lessonBindings = dense(binding.lessonBindings, 2);
    if (rows.length !== lessonBindings.length) invalid();
    const lessons = rows.map((lesson, index) => {
      const link = record(lessonBindings[index]);
      keys(link, ['lessonId', 'kind', 'sourceLessonIndex', 'quizId']);
      if (link.lessonId !== lesson.id || lesson.moduleId !== module.id || lesson.orderIndex !== index || lesson.isPreview !== false) invalid();
      claimId(lesson.id);
      const markers = Array.isArray(lesson.resources) ? lesson.resources.filter((entry) => entry !== null &&
        typeof entry === 'object' && 'kind' in entry && entry.kind === CURRICULUM_MARKER) : [];
      if (markers.length !== 1) invalid();
      const marker = record(markers[0]);
      keys(marker, ['kind', 'mappingVersion', 'courseId', 'moduleId', 'lessonId', 'lessonKind', 'sourceLessonIndex', 'quizId']);
      if (marker.mappingVersion !== 1 || marker.courseId !== course.id || marker.moduleId !== module.id ||
          marker.lessonId !== lesson.id || marker.lessonKind !== link.kind || marker.sourceLessonIndex !== link.sourceLessonIndex ||
          marker.quizId !== link.quizId) invalid();
      const base = { kind: link.kind, sourceLessonIndex: link.sourceLessonIndex, title: lesson.title };
      if (link.kind === 'reading') {
        if (lesson.contentType !== 'text' || Object.hasOwn(link, 'quizId')) invalid();
        return { ...base, textContent: lesson.contentBody };
      }
      if (link.kind !== 'assessment' || lesson.contentType !== 'quiz' || lesson.contentBody !== link.quizId) invalid();
      const quizId = claimId(link.quizId);
      if (usedQuizzes.has(quizId)) invalid();
      usedQuizzes.add(quizId);
      const matches = course.quizzes.filter((quiz) => quiz.id === quizId);
      if (matches.length !== 1) invalid();
      const quiz = matches[0];
      if (quiz.courseId !== course.id || quiz.title !== lesson.title || quiz.timeLimitMinutes !== null) invalid();
      const questions = [...quiz.questions].sort((a, b) => a.orderIndex - b.orderIndex).map((question, questionIndex) => {
        if (question.quizId !== quizId || question.orderIndex !== questionIndex) invalid();
        claimId(question.id);
        const options = dense(question.options, 2).map((value) => {
          const option = record(value);
          keys(option, ['text']);
          return option.text;
        });
        return { questionText: question.questionText, options, correctIndex: question.correctIndex, points: question.points };
      });
      return { ...base, quiz: { passPercentage: quiz.passPercentage, attemptsAllowed: quiz.attemptsAllowed, questions } };
    });
    return { title: module.title, description: binding.description, lessons };
  });
  if (usedQuizzes.size !== course.quizzes.length) invalid();
  const normalised = validateStructuredModules(modules);
  // Native content must already be canonical; silently trimming drift would hide corruption.
  if (JSON.stringify(normalised) !== JSON.stringify(modules)) invalid();
  if (text(course.title) !== course.title || description(course.description) !== course.description) invalid();
  const snapshot = { format: CURRICULUM_FORMAT, course: { title: course.title, description: course.description }, modules: normalised };
  const canonicalJson = `${JSON.stringify(canonical(snapshot))}\n`;
  return { snapshot, modules: normalised, canonicalJson, sha256: createHash('sha256').update(canonicalJson, 'utf8').digest('hex') };
}
