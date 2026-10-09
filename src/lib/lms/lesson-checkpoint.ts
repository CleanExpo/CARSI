import type { LessonResource } from '@/lib/lms/lesson-resources';

export type LessonPosition = { kind: 'reading' | 'video' | 'quiz'; value: number };

export type LessonCheckpointContent = {
  lesson: {
    id: string; title: string; content_type: string; content_body: string | null;
    drive_file_id: string | null; duration_minutes: number | null; is_preview: boolean; order_index: number; course_id: string;
  };
  resources: LessonResource[];
  course: { id: string; slug: string; title: string };
  quiz: null | {
    id: string; title: string; pass_percentage: number; time_limit_minutes: number | null;
    attempts_allowed: number; attempts_used: number;
    questions: {
      id: string; question_text: string; question_type: 'single_choice'; options: { text: string }[];
      order_index: number; points: number;
    }[];
  };
};

export type LessonCheckpoint = {
  version: 1;
  revision: number;
  contentVersion: string;
  position: LessonPosition;
  answers: Record<string, number>;
};

export type CheckpointInput = {
  expectedRevision: number;
  contentVersion: string;
  position: LessonPosition;
  answers: Record<string, number>;
  reset?: boolean;
};

export type CheckpointResponse = {
  content: LessonCheckpointContent;
  contentVersion: string;
  revision: number;
  stale: boolean;
  checkpoint: LessonCheckpoint | null;
  passedAttempt: null | {
    id: string;
    scorePercent: number;
    passed: boolean;
    createdAt: string;
    versionVerified: boolean;
  };
};

export const CHECKPOINT_MAX_BYTES = 64 * 1024;
export const CHECKPOINT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CheckpointError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 503) {
    super('Checkpoint unavailable');
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function keys(value: Record<string, unknown>, required: string[], optional: string[] = []): boolean {
  return required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => required.includes(key) || optional.includes(key));
}

export function parseCheckpointInput(value: unknown): CheckpointInput {
  const invalid = () => { throw new CheckpointError(400); };
  if (!object(value) || !keys(value, ['expectedRevision', 'contentVersion', 'position', 'answers'], ['reset'])) return invalid();
  if (!Number.isSafeInteger(value.expectedRevision) || (value.expectedRevision as number) < 0 ||
      typeof value.contentVersion !== 'string' || !/^[0-9a-f]{64}$/.test(value.contentVersion)) return invalid();
  if (!object(value.position) || !keys(value.position, ['kind', 'value'])) return invalid();
  const { kind, value: position } = value.position;
  const maximum = kind === 'reading' ? 10000 : kind === 'video' ? 86400000 : kind === 'quiz' ? 199 : -1;
  if (!Number.isSafeInteger(position) || (position as number) < 0 || (position as number) > maximum) return invalid();
  if (!object(value.answers) || Object.keys(value.answers).length > 200 ||
      Object.entries(value.answers).some(([id, answer]) => !CHECKPOINT_UUID.test(id) ||
        !Number.isSafeInteger(answer) || (answer as number) < 0 || (answer as number) >= 20)) return invalid();
  if (Object.hasOwn(value, 'reset') && typeof value.reset !== 'boolean') return invalid();
  return value as CheckpointInput;
}

export function parseStoredCheckpoint(value: unknown): LessonCheckpoint | null {
  if (value === null) return null;
  try {
    if (!object(value) || !keys(value, ['version', 'revision', 'contentVersion', 'position', 'answers']) ||
        value.version !== 1 || !Number.isSafeInteger(value.revision) || (value.revision as number) < 1) throw new Error();
    parseCheckpointInput({ expectedRevision: value.revision, contentVersion: value.contentVersion,
      position: value.position, answers: value.answers });
    return value as LessonCheckpoint;
  } catch {
    throw new CheckpointError(503);
  }
}
