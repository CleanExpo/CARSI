import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { getUpstreamBaseUrl } from '@/lib/server/upstream-api';

/**
 * Daily Agent Report Cron Job
 *
 * Runs daily at 9:00 AM (0 9 * * *)
 * Fetches yesterday's agent activity summary from an optional upstream API.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const upstream = getUpstreamBaseUrl();
    if (!upstream) {
      logger.info('Daily report cron: skipped (no upstream API)');
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'no_upstream',
        timestamp: new Date().toISOString(),
      });
    }

    const base = upstream.replace(/\/$/, '');
    const response = await fetch(`${base}/api/agents/performance/trends?days=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.BACKEND_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('Upstream report fetch failed', errorData);
      return NextResponse.json({ error: 'Upstream report failed' }, { status: 500 });
    }

    const trends = await response.json();

    const report = {
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      trends,
    };

    logger.info('Daily report generated', { report });

    return NextResponse.json({
      success: true,
      report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Daily report cron error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
