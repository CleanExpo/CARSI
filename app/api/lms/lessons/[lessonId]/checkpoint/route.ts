import { NextRequest, NextResponse } from 'next/server';
import { CheckpointError, parseCheckpointInput } from '@/lib/lms/lesson-checkpoint';
import { getSessionClaimsFromRequest } from '@/lib/server/auth-from-request';
import { getLessonCheckpoint, readCheckpointJsonBody, saveLessonCheckpoint } from '@/lib/server/lesson-checkpoint';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

type Context = { params: Promise<{ lessonId: string }> };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function handle(request: NextRequest, context: Context, write: boolean) {
  try {
    if (getUpstreamBaseUrl()) throw new CheckpointError(503);
    const claims = await getSessionClaimsFromRequest(request);
    if (!claims || !request.headers.has('x-carsi-learner-id') ||
        request.headers.get('x-carsi-learner-id') !== claims.sub) return json({ detail: 'Unauthorized' }, 401);
    if (!process.env.DATABASE_URL?.trim()) throw new CheckpointError(503);
    const { lessonId } = await context.params;
    const result = write
      ? await saveLessonCheckpoint(claims.sub, lessonId, parseCheckpointInput(await readCheckpointJsonBody(request)))
      : await getLessonCheckpoint(claims.sub, lessonId);
    return json(result);
  } catch (error) {
    const status = error instanceof CheckpointError ? error.status : 503;
    return json({ detail: status === 400 ? 'Invalid checkpoint' : status === 404
      ? 'Lesson not found or access denied' : status === 409 ? 'Checkpoint conflict' : 'Checkpoint unavailable' }, status);
  }
}

export function GET(request: NextRequest, context: Context) {
  return handle(request, context, false);
}

export function PATCH(request: NextRequest, context: Context) {
  return handle(request, context, true);
}
