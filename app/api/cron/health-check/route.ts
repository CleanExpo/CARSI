import { NextResponse } from 'next/server';

import { requireCron } from '@/lib/server/cron-auth';
import { getBackendOrigin, getHealthCheckPath } from '@/lib/env/public-url';
import { logger } from '@/lib/logger';

/**
 * Health Check Cron Job
 *
 * Runs every 5 minutes
 * Pings this app's health endpoint (or an explicit upstream base URL).
 */
export async function GET(request: Request) {
  try {
    const denied = requireCron(request);
    if (denied) return denied;

    const backendUrl = getBackendOrigin();
    const healthPath = getHealthCheckPath();

    const backendStart = Date.now();
    const backendResponse = await fetch(`${backendUrl}${healthPath}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const backendLatency = Date.now() - backendStart;
    const backendHealthy = backendResponse.ok;

    const allHealthy = backendHealthy;

    logger.info('Health check cron', {
      backend: backendHealthy ? 'healthy' : 'unhealthy',
      backendLatency: `${backendLatency}ms`,
      timestamp: new Date().toISOString(),
    });

    if (!allHealthy) {
      logger.error('Health check failed! Backend is not responding.');
    }

    return NextResponse.json({
      success: true,
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks: {
        backend: {
          healthy: backendHealthy,
          latency: backendLatency,
          url: `${backendUrl}${healthPath}`,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Health check cron error', error);
    logger.error('CRITICAL: Health check cron failed to execute!');

    return NextResponse.json(
      {
        success: false,
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}
