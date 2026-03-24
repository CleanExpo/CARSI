import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

/**
 * Cleanup Old Agent Runs Cron Job
 *
 * Runs daily at 2:00 AM (0 2 * * *)
 * Delegates cleanup to an optional upstream HTTP API.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const upstream = getUpstreamBaseUrl();
    if (!upstream) {
      logger.info('Cleanup cron: skipped (no upstream API)');
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'no_upstream',
        timestamp: new Date().toISOString(),
      });
    }

    const base = upstream.replace(/\/$/, '');
    const response = await fetch(`${base}/api/agents/cleanup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.BACKEND_API_KEY}`,
      },
      body: JSON.stringify({ older_than_days: 30 }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Upstream cleanup failed', errorData);
      return NextResponse.json({ error: 'Upstream cleanup failed' }, { status: 500 });
    }

    const result = await response.json();

    logger.info('Cleanup cron: delegated to upstream', { result });

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cleanup cron error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
