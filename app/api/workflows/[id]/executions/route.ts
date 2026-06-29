import { NextRequest, NextResponse } from 'next/server';

import { getUpstreamBaseUrl, upstreamNotConfigured } from '@/lib/server/upstream-api';
import { authorizeWorkflowRequest, withForwardedAuth } from '@/lib/server/workflow-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeWorkflowRequest(request);
  if (!auth.ok) return auth.response;

  const BACKEND_URL = getUpstreamBaseUrl();
  if (!BACKEND_URL) return upstreamNotConfigured();

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';

    const response = await fetch(`${BACKEND_URL}/api/workflows/${id}/executions?limit=${limit}`, {
      headers: withForwardedAuth(auth.authorization),
    });
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching execution history:', error);
    return NextResponse.json({ error: 'Failed to fetch execution history' }, { status: 500 });
  }
}
