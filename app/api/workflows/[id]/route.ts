import { NextRequest, NextResponse } from 'next/server';

import { verifySessionToken } from '@/lib/auth/session-jwt';
import { getUpstreamBaseUrl, upstreamNotConfigured } from '@/lib/server/upstream-api';

async function requireAuth(request: NextRequest): Promise<NextResponse | null> {
  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const cookieToken = request.cookies.get('auth_token')?.value;
  const token = bearer || cookieToken;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const claims = await verifySessionToken(token);
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const BACKEND_URL = getUpstreamBaseUrl();
  if (!BACKEND_URL) return upstreamNotConfigured();

  try {
    const { id } = await params;
    const response = await fetch(`${BACKEND_URL}/api/workflows/${id}`);
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json({ error: 'Failed to fetch workflow' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const BACKEND_URL = getUpstreamBaseUrl();
  if (!BACKEND_URL) return upstreamNotConfigured();

  try {
    const { id } = await params;
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/workflows/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const BACKEND_URL = getUpstreamBaseUrl();
  if (!BACKEND_URL) return upstreamNotConfigured();

  try {
    const { id } = await params;
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/workflows/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error patching workflow:', error);
    return NextResponse.json({ error: 'Failed to update workflow' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const BACKEND_URL = getUpstreamBaseUrl();
  if (!BACKEND_URL) return upstreamNotConfigured();

  try {
    const { id } = await params;
    const response = await fetch(`${BACKEND_URL}/api/workflows/${id}`, {
      method: 'DELETE',
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
  }
}
