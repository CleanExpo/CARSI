import { CheckpointRequestError } from '@/lib/lms/checkpoint-controller';
import type { InteractiveProgressSnapshot } from '@/lib/lms/interactive-progress';
import {
  parseInteractiveProgressDocument,
  type InteractiveProgressDocument,
} from '@/lib/lms/interactive-progress-store';

async function learnerJson<T>(
  url: string,
  userId: string,
  method: 'GET' | 'PUT',
  body?: unknown
): Promise<T> {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(url, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    signal: timeout,
    headers: {
      'x-carsi-learner-id': userId,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!response.ok) {
    let detail = '';
    try {
      const json = (await response.json()) as { detail?: unknown };
      if (typeof json.detail === 'string') detail = json.detail;
    } catch {
      /* ignore */
    }
    throw new CheckpointRequestError(response.status, detail || undefined);
  }
  return response.json() as Promise<T>;
}

export async function fetchLessonInteractiveProgress(
  lessonId: string,
  userId: string
): Promise<InteractiveProgressDocument> {
  const data = await learnerJson<{ byExperience?: unknown }>(
    `/api/lms/lessons/${encodeURIComponent(lessonId)}/interactive-progress`,
    userId,
    'GET'
  );
  return parseInteractiveProgressDocument(data.byExperience);
}

export async function putLessonInteractiveProgress(
  lessonId: string,
  userId: string,
  experienceId: string,
  snapshot: InteractiveProgressSnapshot
): Promise<InteractiveProgressDocument> {
  const data = await learnerJson<{ byExperience?: unknown }>(
    `/api/lms/lessons/${encodeURIComponent(lessonId)}/interactive-progress`,
    userId,
    'PUT',
    { experienceId, snapshot }
  );
  return parseInteractiveProgressDocument(data.byExperience);
}

/** Flush the latest local snapshot before lesson completion (GP-432 evidence). */
export async function flushInteractiveProgressForLesson(args: {
  lessonId: string;
  userId: string;
  experienceId: string;
  snapshot: InteractiveProgressSnapshot;
}): Promise<void> {
  await putLessonInteractiveProgress(args.lessonId, args.userId, args.experienceId, args.snapshot);
}
