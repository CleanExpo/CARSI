import { prisma } from '@/lib/prisma';
import { resolveAnthropicConfig } from '@/lib/server/anthropic-client';
import {
  hasOptimizeApplied,
  optimizeAndApplyCourse,
  OptimizeCourseError,
} from '@/lib/server/optimize-course-content';

export type OptimizeCronResult = {
  processed: number;
  skipped: number;
  remaining: number;
  results: Array<{ courseId: string; title: string; moduleCount?: number; error?: string }>;
};

function parseLimit(raw: string | null): number {
  const n = raw ? Number.parseInt(raw, 10) : 1;
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 5);
}

/**
 * One course per default tick so a 5-minute function can finish.
 * Re-runs skip courses already marked in meta.optimizeAppliedAt.
 */
export async function runOptimizeCoursesCron(opts?: {
  limit?: number;
  force?: boolean;
}): Promise<OptimizeCronResult> {
  if (!resolveAnthropicConfig().configured) {
    throw new OptimizeCourseError('ANTHROPIC_API_KEY is not configured', 503);
  }

  const limit = opts?.limit ?? 1;
  const courses = await prisma.lmsCourse.findMany({
    orderBy: { updatedAt: 'asc' },
    select: { id: true, title: true, meta: true },
  });

  const pending = opts?.force ? courses : courses.filter((c) => !hasOptimizeApplied(c.meta));
  const batch = pending.slice(0, limit);
  const results: OptimizeCronResult['results'] = [];

  for (const course of batch) {
    try {
      const done = await optimizeAndApplyCourse(course.id);
      results.push(done);
    } catch (e) {
      results.push({
        courseId: course.id,
        title: course.title,
        error: e instanceof Error ? e.message : 'Optimize failed',
      });
    }
  }

  const remaining = Math.max(0, pending.length - batch.length);
  return {
    processed: results.filter((r) => !r.error).length,
    skipped: courses.length - pending.length,
    remaining,
    results,
  };
}

export function parseOptimizeCronSearch(url: URL): { limit: number; force: boolean } {
  return {
    limit: parseLimit(url.searchParams.get('limit')),
    force: url.searchParams.get('force') === '1',
  };
}
