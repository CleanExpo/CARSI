import { createHash } from 'node:crypto';

export class CurriculumValidationError extends Error {
  constructor(readonly path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.name = 'CurriculumValidationError';
  }
}

export interface CurriculumQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
  points: 1;
}

export interface CurriculumReading {
  kind: 'reading';
  sourceLessonIndex: number;
  title: string;
  textContent: string;
}

export interface CurriculumAssessment {
  kind: 'assessment';
  sourceLessonIndex: number;
  title: string;
  quiz: {
    passPercentage: number;
    attemptsAllowed: number;
    questions: CurriculumQuestion[];
  };
}

export interface CurriculumModule {
  title: string;
  description: string | null;
  lessons: (CurriculumReading | CurriculumAssessment)[];
}

export interface AiCourseCurriculumSnapshot {
  format: 'carsi-curriculum-v1';
  course: { title: string; description: string | null };
  modules: CurriculumModule[];
}

export interface AiCourseCurriculumResult {
  snapshot: AiCourseCurriculumSnapshot;
  canonicalJson: string;
  sha256: string;
  modules: CurriculumModule[];
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new CurriculumValidationError(path, 'Expected an object');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string') {
    throw new CurriculumValidationError(path, 'Expected text');
  }
  const normalised = value.replace(/\r\n?/g, '\n').trim();
  if (!allowEmpty && normalised.length === 0) {
    throw new CurriculumValidationError(path, 'Text must not be blank');
  }
  return normalised;
}

function description(value: unknown, path: string): string | null {
  return value === undefined || value === null ? null : text(value, path, true);
}

function array(value: unknown, path: string, minimum: number): unknown[] {
  if (!Array.isArray(value) || value.length < minimum) {
    throw new CurriculumValidationError(path, `Expected an array with at least ${minimum} entries`);
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) {
      throw new CurriculumValidationError(`${path}[${index}]`, 'Sparse arrays are not supported');
    }
  }
  return value;
}

function integer(value: unknown, path: string, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maximum) {
    throw new CurriculumValidationError(path, `Expected an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]!);
}

function paragraphs(value: string): string {
  return value.split(/\n[\t ]*\n+/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

type CanonicalValue = null | string | number | CanonicalValue[] | { [key: string]: CanonicalValue };

function canonicalise(value: CanonicalValue): CanonicalValue {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort()
      .map((key) => [key, canonicalise(value[key])]));
  }
  return value;
}

/** Pure proposal only: no generation, persistence, publication or entitlement changes. */
export function convertAiCourseCurriculum(
  draft: unknown,
  course: unknown,
  policy: unknown,
): AiCourseCurriculumResult {
  const courseInput = object(course, 'course');
  const policyInput = object(policy, 'policy');
  const passPercentage = integer(policyInput.passPercentage, 'policy.passPercentage', 1, 100);
  const attemptsAllowed = integer(policyInput.attemptsAllowed, 'policy.attemptsAllowed', 1, 2147483647);
  const courseSnapshot = {
    title: text(courseInput.title, 'course.title'),
    description: description(courseInput.description, 'course.description'),
  };
  const draftInput = object(draft, 'draft');
  const modules = array(draftInput.modules, 'draft.modules', 1).map((rawModule, moduleIndex) => {
    const modulePath = `draft.modules[${moduleIndex}]`;
    const moduleInput = object(rawModule, modulePath);
    const moduleDescription = description(moduleInput.description, `${modulePath}.description`);
    const moduleOutput: CurriculumModule = {
      title: text(moduleInput.name, `${modulePath}.name`),
      description: moduleDescription,
      lessons: [],
    };
    array(moduleInput.lessons, `${modulePath}.lessons`, 1).forEach((rawLesson, sourceLessonIndex) => {
      const lessonPath = `${modulePath}.lessons[${sourceLessonIndex}]`;
      const lessonInput = object(rawLesson, lessonPath);
      const title = text(lessonInput.title, `${lessonPath}.title`);
      const content = text(lessonInput.content, `${lessonPath}.content`);
      const takeaways = Object.prototype.hasOwnProperty.call(lessonInput, 'key_takeaways')
        ? array(lessonInput.key_takeaways, `${lessonPath}.key_takeaways`, 0)
          .map((value, index) => text(value, `${lessonPath}.key_takeaways[${index}]`))
        : [];
      const questions = array(lessonInput.quiz_questions, `${lessonPath}.quiz_questions`, 1)
        .map((rawQuestion, questionIndex): CurriculumQuestion => {
          const questionPath = `${lessonPath}.quiz_questions[${questionIndex}]`;
          const questionInput = object(rawQuestion, questionPath);
          const options = array(questionInput.options, `${questionPath}.options`, 2)
            .map((value, index) => text(value, `${questionPath}.options[${index}]`));
          return {
            questionText: text(questionInput.question, `${questionPath}.question`),
            options,
            correctIndex: integer(questionInput.correct_index, `${questionPath}.correct_index`, 0, options.length - 1),
            points: 1,
          };
        });
      const prefix = sourceLessonIndex === 0 && moduleDescription ? paragraphs(moduleDescription) : '';
      const list = takeaways.length > 0
        ? `<ul>${takeaways.map((takeaway) => `<li>${escapeHtml(takeaway)}</li>`).join('')}</ul>`
        : '';
      moduleOutput.lessons.push({
        kind: 'reading', sourceLessonIndex, title, textContent: prefix + paragraphs(content) + list,
      }, {
        kind: 'assessment', sourceLessonIndex, title: `${title} — Knowledge check`,
        quiz: { passPercentage, attemptsAllowed, questions },
      });
    });
    return moduleOutput;
  });
  const snapshot: AiCourseCurriculumSnapshot = { format: 'carsi-curriculum-v1', course: courseSnapshot, modules };
  // The closed snapshot shape contains only JSON values, with all optional descriptions explicit.
  const canonicalJson = `${JSON.stringify(canonicalise(snapshot as unknown as CanonicalValue))}\n`;
  return {
    snapshot, canonicalJson, sha256: createHash('sha256').update(canonicalJson, 'utf8').digest('hex'), modules,
  };
}
