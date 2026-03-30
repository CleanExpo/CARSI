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

    // Persist or forward contact submissions here (e.g. email provider, CRM) when configured.

    // Always return success to the user; failures are non-blocking
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
