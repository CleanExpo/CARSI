import { NextResponse } from 'next/server';

import { buildCarsiConnectionStatus } from '@/lib/connections/status';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(buildCarsiConnectionStatus());
}
