import { NextResponse } from 'next/server';

import { requireCron } from '@/lib/server/cron-auth';
import { OptimizeCourseError } from '@/lib/server/optimize-course-content';
import {
  parseOptimizeCronSearch,
  runOptimizeCoursesCron,
} from '@/lib/server/optimize-courses-cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Sequential catalogue optimiser. Each hit processes the next pending course
 * (7–10 modules, 3–4 paragraphs) and writes it to the database.
 * Schedule hourly with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: true, processed: 0, reason: 'no_database' });
  }

  const { limit, force } = parseOptimizeCronSearch(new URL(request.url));
  try {
    const result = await runOptimizeCoursesCron({ limit, force });
    return NextResponse.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (e) {
    if (e instanceof OptimizeCourseError) {
      return NextResponse.json({ ok: false, detail: e.message }, { status: e.status });
    }
    console.error('[cron/optimize-course-content]', e);
    return NextResponse.json({ ok: false, detail: 'Cron failed' }, { status: 500 });
  }
}
