import { createHmac, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import { getSessionSecretBytes } from '@/lib/auth/jwt-secret';
import { prisma } from '@/lib/prisma';
import { extractQuizIdFromLesson } from '@/lib/lms/quiz-from-lesson';
import { parseLessonResources } from '@/lib/lms/lesson-resources';
import {
  CHECKPOINT_MAX_BYTES, CHECKPOINT_UUID, CheckpointError, parseCheckpointInput, parseStoredCheckpoint,
  type CheckpointInput, type CheckpointResponse, type LessonCheckpoint, type LessonCheckpointContent,
} from '@/lib/lms/lesson-checkpoint';
import { ACCESS_GRANTING_STATUS_LIST } from '@/lib/server/enrollment-access';
import { withSerializationRetry } from '@/lib/server/db-tx';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

type Context = {
  enrollmentId: string; courseId: string; moduleId: string; lessonId: string;
  courseSlug: string; courseTitle: string;
  title: string; contentType: string; contentBody: string | null; resources: Prisma.JsonValue | null;
  orderIndex: number; isPreview: boolean; durationMinutes: number | null;
};
type Question = {
  id: string; questionText: string; options: Prisma.JsonValue; correctIndex: number;
  orderIndex: number; points: number;
};
type Quiz = {
  id: string; courseId: string; title: string; passPercentage: number;
  timeLimitMinutes: number | null; attemptsAllowed: number;
};
type Graph = { context: Context; quiz: Quiz | null; questions: Question[]; kind: 'reading' | 'video' | 'quiz' };

function unavailable(): never { throw new CheckpointError(503); }

async function loadGraph(tx: Prisma.TransactionClient, studentId: string, lessonId: string): Promise<Graph> {
  // These locks serialize checkpoints with entitlement revocation and native content edits.
  const rows = await tx.$queryRaw<Context[]>`
    SELECT e.id AS "enrollmentId", c.id AS "courseId", m.id AS "moduleId", l.id AS "lessonId",
      c.slug AS "courseSlug", c.title AS "courseTitle",
      l.title, l.content_type AS "contentType", l.content_body AS "contentBody", l.resources,
      l.order_index AS "orderIndex", l.is_preview AS "isPreview", l.duration_minutes AS "durationMinutes"
    FROM lms_lessons l JOIN lms_modules m ON m.id = l.module_id
    JOIN lms_courses c ON c.id = m.course_id
    JOIN lms_enrollments e ON e.course_id = c.id
    WHERE l.id = ${lessonId}::uuid AND e.student_id = ${studentId}::uuid
      AND e.status IN (${Prisma.join([...ACCESS_GRANTING_STATUS_LIST])})
    FOR UPDATE OF e, c, m, l`;
  if (rows.length !== 1) throw new CheckpointError(404);
  const context = rows[0];
  if (Buffer.byteLength(JSON.stringify(context)) > 1024 * 1024) return unavailable();
  const resources = parseLessonResources(context.resources);
  const associations = new Set<string>();
  if (context.contentType === 'quiz') {
    const id = extractQuizIdFromLesson(context.contentType, context.contentBody, []);
    if (!id || !CHECKPOINT_UUID.test(id)) return unavailable();
    associations.add(id.toLowerCase());
  }
  for (const resource of resources) {
    if (!resource.url?.startsWith('quiz:')) continue;
    const id = extractQuizIdFromLesson('', null, [resource]);
    if (!id || !CHECKPOINT_UUID.test(id)) return unavailable();
    associations.add(id.toLowerCase());
  }
  if (associations.size > 1) return unavailable();
  const quizId = associations.values().next().value as string | undefined;
  if (!quizId) {
    const kind = context.contentType === 'text' ? 'reading' : context.contentType === 'video' ? 'video' : null;
    if (!kind) return unavailable();
    return { context, quiz: null, questions: [], kind };
  }
  const quizzes = await tx.$queryRaw<Quiz[]>`
    SELECT id, course_id AS "courseId", title, pass_percentage AS "passPercentage",
      time_limit_minutes AS "timeLimitMinutes", attempts_allowed AS "attemptsAllowed"
    FROM lms_quizzes WHERE id = ${quizId}::uuid FOR UPDATE`;
  if (quizzes.length !== 1 || quizzes[0].courseId !== context.courseId) return unavailable();
  const quiz = quizzes[0];
  if (!Number.isInteger(quiz.passPercentage) || quiz.passPercentage < 0 || quiz.passPercentage > 100 ||
      !Number.isInteger(quiz.attemptsAllowed) || quiz.attemptsAllowed < 1 ||
      (quiz.timeLimitMinutes !== null && (!Number.isInteger(quiz.timeLimitMinutes) || quiz.timeLimitMinutes < 1))) return unavailable();
  const questions = await tx.$queryRaw<Question[]>`
    SELECT id, question_text AS "questionText", options, correct_index AS "correctIndex",
      order_index AS "orderIndex", points FROM lms_quiz_questions
    WHERE quiz_id = ${quizId}::uuid ORDER BY order_index, id LIMIT 201 FOR UPDATE`;
  if (!questions.length || questions.length > 200 ||
      Buffer.byteLength(JSON.stringify(questions)) > 1024 * 1024) return unavailable();
  const orders = new Set<number>();
  for (const question of questions) {
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 20 ||
        question.options.some((option) => typeof option !== 'string' &&
          (!option || typeof option !== 'object' || Array.isArray(option) || typeof option.text !== 'string')) ||
        !Number.isInteger(question.orderIndex) || question.orderIndex < 0 || orders.has(question.orderIndex) ||
        !Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= question.options.length ||
        !Number.isInteger(question.points) || question.points < 1) return unavailable();
    orders.add(question.orderIndex);
  }
  return { context, quiz, questions, kind: 'quiz' };
}

function contentVersion(graph: Graph): string {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) return unavailable();
  const { enrollmentId: _enrollmentId, ...lesson } = graph.context;
  void _enrollmentId;
  return createHmac('sha256', getSessionSecretBytes())
    .update('carsi:lesson-checkpoint:content:v1\0')
    .update(JSON.stringify({ lesson, quiz: graph.quiz, questions: graph.questions }))
    .digest('hex');
}

function validateDraft(input: Pick<CheckpointInput, 'position' | 'answers'>, graph: Graph, status: 400 | 503): void {
  if (input.position.kind !== graph.kind || (graph.kind === 'quiz' && input.position.value >= graph.questions.length) ||
      (graph.kind !== 'quiz' && Object.keys(input.answers).length > 0)) throw new CheckpointError(status);
  for (const [id, answer] of Object.entries(input.answers)) {
    const question = graph.questions.find((candidate) => candidate.id === id);
    if (!question || !Array.isArray(question.options) || answer >= question.options.length) throw new CheckpointError(status);
  }
}

async function response(tx: Prisma.TransactionClient, studentId: string, graph: Graph,
  version: string, checkpoint: LessonCheckpoint | null): Promise<CheckpointResponse> {
  const stale = checkpoint !== null && checkpoint.contentVersion !== version;
  if (checkpoint && !stale) validateDraft(checkpoint, graph, 503);
  const attempts = graph.quiz ? await tx.$queryRaw<{
    id: string; scorePercent: number; passed: boolean; createdAt: Date; contentVersion: string | null;
  }[]>`SELECT id, score_percent AS "scorePercent", passed, created_at AS "createdAt", content_version AS "contentVersion"
    FROM lms_quiz_attempts WHERE quiz_id = ${graph.quiz.id}::uuid
      AND student_id = ${studentId}::uuid AND passed = TRUE
    ORDER BY COALESCE(content_version = ${version}, FALSE) DESC, created_at DESC, id DESC LIMIT 1` : [];
  const counts = graph.quiz ? await tx.$queryRaw<{ count: number }[]>`SELECT COUNT(*)::int AS count
    FROM lms_quiz_attempts WHERE quiz_id = ${graph.quiz.id}::uuid AND student_id = ${studentId}::uuid` : [];
  const { context, quiz, questions } = graph;
  const content: LessonCheckpointContent = {
    lesson: { id: context.lessonId, title: context.title, content_type: context.contentType,
      content_body: context.contentBody,
      drive_file_id: context.contentType === 'drive_file' && context.contentBody ? context.contentBody.trim() : null,
      duration_minutes: context.durationMinutes ?? null,
      is_preview: context.isPreview, order_index: context.orderIndex, course_id: context.courseId },
    resources: parseLessonResources(context.resources),
    course: { id: context.courseId, slug: context.courseSlug, title: context.courseTitle },
    quiz: quiz ? { id: quiz.id, title: quiz.title, pass_percentage: quiz.passPercentage,
      time_limit_minutes: quiz.timeLimitMinutes, attempts_allowed: quiz.attemptsAllowed,
      attempts_used: counts[0].count,
      questions: questions.map((question) => ({ id: question.id, question_text: question.questionText,
        question_type: 'single_choice', options: (question.options as Prisma.JsonArray).map((option) =>
          ({ text: typeof option === 'string' ? option : (option as { text: string }).text })),
        order_index: question.orderIndex, points: question.points })) } : null,
  };
  const attempt = attempts[0];
  return { content, contentVersion: version, revision: checkpoint?.revision ?? 0, stale,
    checkpoint: stale ? null : checkpoint,
    passedAttempt: attempt ? { id: attempt.id, scorePercent: attempt.scorePercent, passed: attempt.passed,
      createdAt: attempt.createdAt.toISOString(), versionVerified: attempt.contentVersion === version } : null };
}

export async function getVersionBoundQuizForAttempt(tx: Prisma.TransactionClient, studentId: string,
  lessonId: string, quizId: string, expectedVersion: string) {
  if (getUpstreamBaseUrl() || !process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) return unavailable();
  if (![studentId, lessonId, quizId].every((id) => CHECKPOINT_UUID.test(id))) throw new CheckpointError(404);
  const graph = await loadGraph(tx, studentId, lessonId);
  const version = contentVersion(graph);
  if (!graph.quiz || graph.quiz.id !== quizId || version !== expectedVersion) throw new CheckpointError(409);
  return { quiz: graph.quiz, questions: graph.questions, contentVersion: version };
}

export async function readCheckpointJsonBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new CheckpointError(400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > CHECKPOINT_MAX_BYTES) {
        await reader.cancel();
        throw new CheckpointError(400);
      }
      chunks.push(value);
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    throw new CheckpointError(400);
  } finally {
    reader.releaseLock();
  }
}

async function transact(studentId: string, lessonId: string, input: CheckpointInput | undefined,
  client: PrismaClient): Promise<CheckpointResponse> {
  if (getUpstreamBaseUrl()) return unavailable();
  if (!CHECKPOINT_UUID.test(studentId) || !CHECKPOINT_UUID.test(lessonId)) throw new CheckpointError(404);
  // Configuration is checked before any database operation; never accept the development fallback.
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) return unavailable();
  return withSerializationRetry(() => client.$transaction(async (tx) => {
    const graph = await loadGraph(tx, studentId, lessonId);
    const version = contentVersion(graph);
    const progress = await tx.$queryRaw<{ checkpoint: unknown }[]>`
      SELECT checkpoint FROM lms_lesson_progress WHERE student_id = ${studentId}::uuid
        AND lesson_id = ${lessonId}::uuid FOR UPDATE`;
    const stored = progress[0]?.checkpoint ?? null;
    let checkpoint = parseStoredCheckpoint(stored);
    if (input) {
      const revision = checkpoint?.revision ?? 0;
      if (input.expectedRevision !== revision || input.contentVersion !== version ||
          (checkpoint && checkpoint.contentVersion !== version && !input.reset)) throw new CheckpointError(409);
      if (revision >= Number.MAX_SAFE_INTEGER) throw new CheckpointError(409);
      validateDraft(input, graph, 400);
      if (input.reset && (input.position.value !== 0 || Object.keys(input.answers).length > 0)) throw new CheckpointError(400);
      checkpoint = { version: 1, revision: revision + 1, contentVersion: version,
        position: input.position, answers: input.answers };
      const changed = await tx.$executeRaw`
        INSERT INTO lms_lesson_progress AS p
          (id, student_id, lesson_id, checkpoint, last_accessed_at, updated_at)
        VALUES (${randomUUID()}::uuid, ${studentId}::uuid, ${lessonId}::uuid,
          ${JSON.stringify(checkpoint)}::jsonb, NOW(), NOW())
        ON CONFLICT (student_id, lesson_id) DO UPDATE SET checkpoint = EXCLUDED.checkpoint,
          last_accessed_at = NOW(), updated_at = NOW()
        WHERE p.checkpoint IS NOT DISTINCT FROM ${stored === null ? null : JSON.stringify(stored)}::jsonb`;
      if (changed !== 1) throw new CheckpointError(409);
      const pointerChanged = await tx.$executeRaw`UPDATE lms_enrollments
        SET last_accessed_lesson_id = ${lessonId}::uuid WHERE id = ${graph.context.enrollmentId}::uuid
          AND student_id = ${studentId}::uuid AND status IN (${Prisma.join([...ACCESS_GRANTING_STATUS_LIST])})`;
      if (pointerChanged !== 1) return unavailable();
    }
    return response(tx, studentId, graph, version, checkpoint);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}

export function getLessonCheckpoint(studentId: string, lessonId: string, client: PrismaClient = prisma): Promise<CheckpointResponse> {
  return transact(studentId, lessonId, undefined, client);
}

export function saveLessonCheckpoint(studentId: string, lessonId: string, input: CheckpointInput,
  client: PrismaClient = prisma): Promise<CheckpointResponse> {
  return transact(studentId, lessonId, parseCheckpointInput(input), client);
}
