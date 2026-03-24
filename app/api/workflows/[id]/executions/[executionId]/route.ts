import { NextRequest, NextResponse } from 'next/server';

import { getUpstreamBaseUrl, upstreamNotConfigured } from '@/lib/server/upstream-api';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; executionId: string }> }
) {
  const BACKEND_URL = getUpstreamBaseUrl();
  if (!BACKEND_URL) return upstreamNotConfigured();

  try {
    const { id, executionId } = await params;

    const response = await fetch(`${BACKEND_URL}/api/workflows/${id}/executions/${executionId}`);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching execution detail:', error);
    return NextResponse.json({ error: 'Failed to fetch execution detail' }, { status: 500 });
  }
}
