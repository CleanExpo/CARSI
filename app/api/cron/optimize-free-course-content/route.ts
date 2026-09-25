import { NextResponse } from 'next/server';

import { resolveAnthropicConfig } from '@/lib/server/anthropic-client';
import { requireCron } from '@/lib/server/cron-auth';
import {
  parseOptimizeCronSearch,
  startOptimizeCoursesCron,
} from '@/lib/server/optimize-courses-cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manual only. Free courses. Returns immediately so Cloudflare cannot 524.
 * Paid courses are never touched. One email at the end.
 */
export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json({ ok: true, started: false, reason: 'no_database' });
  }
  if (!resolveAnthropicConfig().configured) {
    return NextResponse.json(
      { ok: false, detail: 'ANTHROPIC_API_KEY is not configured' },
      { status: 503 }
    );
  }

  const { limit } = parseOptimizeCronSearch(new URL(request.url));
  const { started } = startOptimizeCoursesCron({ limit, scope: 'free' });
  if (!started) {
    return NextResponse.json({
      ok: true,
      started: false,
      alreadyRunning: true,
      scope: 'free',
      timestamp: new Date().toISOString(),
    });
  }
  return NextResponse.json(
    {
      ok: true,
      started: true,
      scope: 'free',
      detail:
        'Optimising free courses in the background. Paid courses are skipped. You will get one email when it finishes.',
      timestamp: new Date().toISOString(),
    },
    { status: 202 }
  );
}
