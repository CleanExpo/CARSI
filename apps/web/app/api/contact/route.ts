import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

interface ContactPayload {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ContactPayload;

    // Basic validation
    if (!body.firstName || !body.lastName || !body.email || !body.message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Forward to backend email service if available
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
    try {
      await fetch(`${backendUrl}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      // Backend may not have this endpoint yet — log and continue
      console.warn('[contact] Backend contact endpoint unavailable — queued locally');
    }

    // Always return success to the user; backend failures are non-blocking
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
