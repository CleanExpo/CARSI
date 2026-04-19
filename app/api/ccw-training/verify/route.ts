import { NextResponse } from 'next/server';

import { verifyCcwPassword } from '@/lib/server/ccw-unlock';

export const dynamic = 'force-dynamic';

/**
 * Password check for CCW participant resources — **no cookies**.
 * Unlock state is held client-side (React state + sessionStorage) after success.
 */
export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!verifyCcwPassword(password)) {
    return NextResponse.json({ ok: false, error: 'Incorrect password.' }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
