import { NextResponse } from 'next/server';

import { buildCarsiConnectionStatus } from '@/lib/connections/status';
import { requireCron } from '@/lib/server/cron-auth';

export const dynamic = 'force-dynamic';

/** Mission Control poll — not a public manifest (GP-573). */
export async function GET(request: Request) {
  const denied = requireCron(request);
  if (denied) return denied;
  return NextResponse.json(buildCarsiConnectionStatus());
}
