import { NextResponse } from 'next/server';

import { requireCron } from '@/lib/server/cron-auth';
import { resolveAnthropicConfig } from '@/lib/server/anthropic-client';
import {
  parseOptimizeCronSearch,
  startOptimizeCoursesCron,
} from '@/lib/server/optimize-courses-cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manual only. Returns immediately so Cloudflare cannot 524.
 * Work continues on the web service. One email at the end.
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
  const { started } = startOptimizeCoursesCron({ limit });
  if (!started) {
    return NextResponse.json({
      ok: true,
      started: false,
      alreadyRunning: true,
      timestamp: new Date().toISOString(),
    });
  }
  return NextResponse.json(
    {
      ok: true,
      started: true,
      detail: 'Optimising paid courses in the background. You will get one email when it finishes.',
      timestamp: new Date().toISOString(),
    },
    { status: 202 }
  );
}
